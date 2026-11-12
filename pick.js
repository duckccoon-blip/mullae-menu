// =====================================================
// 🎰 메뉴 랜덤뽑기 — 이 파일은 수정하지 않아도 됩니다
// index.html의 MENU를 그대로 읽어서 뽑음 (품절 메뉴는 자동 제외)
// 슬롯머신처럼 위에서 아래로 메뉴가 쏟아지다가 멈춤
// =====================================================
(() => {
  const ROW = 68;          // 한 칸 높이(px)
  const SPIN_MS = 3800;    // 도는 시간(ms)

  const css = `
  .pk-wrap{padding:28px 20px 40px;text-align:center}
  .pk-hero{font-size:52px;line-height:1}
  .pk-title{font-family:'Noto Serif KR',serif;font-size:24px;margin-top:8px}
  .pk-sub{color:var(--sub);font-size:14px;margin:6px 0 20px}
  .pk-chips{display:flex;gap:8px;margin-bottom:18px;justify-content:center;flex-wrap:wrap}
  .pk-chip{flex-shrink:0;background:none;border:1px solid var(--line);color:var(--sub);padding:8px 14px;border-radius:20px;font-size:14px;font-family:inherit;cursor:pointer}
  .pk-chip.on{border-color:var(--point);color:var(--point)}
  .pk-slot{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px 10px 20px;margin-bottom:16px;transition:border-color .3s}
  .pk-slot.done{border-color:var(--point)}
  .pk-reel{position:relative;height:${ROW * 3}px;overflow:hidden;
    -webkit-mask-image:linear-gradient(transparent,#000 28%,#000 72%,transparent);
            mask-image:linear-gradient(transparent,#000 28%,#000 72%,transparent)}
  .pk-strip{position:absolute;left:0;right:0;top:0;will-change:transform}
  .pk-row{height:${ROW}px;line-height:${ROW}px;font-family:'Noto Serif KR',serif;font-size:clamp(22px,7.5vw,30px);
    color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 14px}
  .pk-row.win{color:var(--point);animation:pkPop .5s ease-out}
  @keyframes pkPop{0%{transform:scale(.8)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
  .pk-band{position:absolute;left:10px;right:10px;top:${ROW}px;height:${ROW}px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);pointer-events:none;transition:border-color .3s}
  .pk-slot.done .pk-band{border-color:var(--point)}
  .pk-info{min-height:76px;padding-top:8px}
  .pk-cat{color:var(--sub);font-size:13px;min-height:20px}
  .pk-price{color:var(--point);font-size:17px;min-height:26px}
  .pk-desc{color:var(--sub);font-size:14px;min-height:20px}
  .pk-info.show{animation:pkFade .4s ease-out}
  @keyframes pkFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .pk-btn{display:block;width:100%;border:1px solid var(--point);background:var(--point);color:var(--bg);border-radius:12px;padding:16px;font-size:17px;font-weight:700;font-family:inherit;cursor:pointer}
  .pk-btn:disabled{opacity:.5}
  .pk-note{color:var(--sub);font-size:13px;margin-top:12px;min-height:20px}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let root = null, ctx = null, timer = 0, cat = "전체", spinning = false;
  const $ = sel => root && root.querySelector(sel);

  function mount(el, context) {
    root = el; ctx = context; cat = "전체"; spinning = false;
    render();
  }
  function unmount() { clearTimeout(timer); root = null; spinning = false; }

  function pool() {
    return ctx.MENU
      .filter(c => cat === "전체" || c.category === cat)
      .flatMap(c => c.items.filter(it => !it.soldout).map(it => ({ ...it, category: c.category })));
  }

  function render() {
    const cats = ["전체", ...ctx.MENU.map(c => c.category)];
    root.innerHTML = `
      <div class="pk-wrap">
        <div class="pk-hero">🎰</div>
        <h2 class="pk-title">메뉴 랜덤뽑기</h2>
        <p class="pk-sub">고민될 땐 운에 맡겨보세요</p>
        <div class="pk-chips">
          ${cats.map(c => `<button class="pk-chip${c === cat ? " on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}
        </div>
        <div class="pk-slot" id="pk-slot">
          <div class="pk-reel">
            <div class="pk-strip" id="pk-strip" style="transform:translateY(${ROW}px)"><div class="pk-row">?</div></div>
            <div class="pk-band"></div>
          </div>
          <div class="pk-info" id="pk-info">
            <div class="pk-cat" id="pk-cat"></div>
            <div class="pk-price" id="pk-price"></div>
            <div class="pk-desc" id="pk-desc">아래 버튼을 눌러 뽑아보세요</div>
          </div>
        </div>
        <button class="pk-btn" id="pk-go">뽑기!</button>
        <p class="pk-note" id="pk-note"></p>
      </div>`;
    root.querySelectorAll(".pk-chip").forEach(b => b.onclick = () => {
      if (spinning) return;
      cat = b.dataset.c; render();
    });
    $("#pk-go").onclick = spin;
  }

  function setInfo(item) {
    $("#pk-cat").textContent = item ? item.category : "";
    $("#pk-price").textContent = item ? ctx.won(item.price) : "";
    $("#pk-desc").textContent = item ? (item.desc || "") : "";
    $("#pk-info").classList.toggle("show", !!item);
  }

  function spin() {
    if (spinning) return;
    const items = pool();
    if (!items.length) { $("#pk-note").textContent = "지금 뽑을 수 있는 메뉴가 없어요"; return; }

    spinning = true;
    const btn = $("#pk-go");
    btn.disabled = true; btn.textContent = "두구두구…";
    $("#pk-note").textContent = "";
    $("#pk-slot").classList.remove("done");
    setInfo(null);

    // 맨 위가 당첨 메뉴, 그 아래로 랜덤 메뉴들 → 띠가 아래로 내려오며 당첨이 가운데에 멈춤
    const pick = items[Math.floor(Math.random() * items.length)];
    const N = 34 + Math.floor(Math.random() * 6);
    const seq = [pick];
    for (let i = 0; i < N; i++) {
      let it;
      do { it = items[Math.floor(Math.random() * items.length)]; }
      while (items.length > 1 && it.name === seq[seq.length - 1].name);
      seq.push(it);
    }

    const strip = $("#pk-strip");
    strip.style.transition = "none";
    strip.innerHTML = seq.map((it, i) => `<div class="pk-row"${i === 0 ? ' id="pk-win"' : ""}>${esc(it.name)}</div>`).join("");
    strip.style.transform = `translateY(${ROW - N * ROW}px)`;   // 맨 아래 항목이 가운데
    void strip.offsetHeight;                                     // 위치 확정 후 애니메이션 시작
    strip.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.72,.18,1)`;
    strip.style.transform = `translateY(${ROW}px)`;              // 당첨 항목이 가운데

    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!root) return;
      const win = $("#pk-win"); if (win) win.classList.add("win");
      $("#pk-slot").classList.add("done");
      setInfo(pick);
      spinning = false;
      btn.disabled = false; btn.textContent = "한 번 더!";
      $("#pk-note").textContent = "이 화면을 직원에게 보여주세요 🥃";
      try { navigator.vibrate && navigator.vibrate(40); } catch (e) {}
    }, SPIN_MS + 80);
  }

  (window.GameModules = window.GameModules || {}).pick = { mount, unmount };
})();
