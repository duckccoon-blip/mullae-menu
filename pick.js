// =====================================================
// 🎰 메뉴 랜덤뽑기 — 이 파일은 수정하지 않아도 됩니다
// index.html의 MENU를 그대로 읽어서 뽑음 (품절 메뉴는 자동 제외)
// =====================================================
(() => {
  const css = `
  .pk-wrap{padding:28px 20px 40px;text-align:center}
  .pk-hero{font-size:52px;line-height:1}
  .pk-title{font-family:'Noto Serif KR',serif;font-size:24px;margin-top:8px}
  .pk-sub{color:var(--sub);font-size:14px;margin:6px 0 20px}
  .pk-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin-bottom:18px;justify-content:center;flex-wrap:wrap}
  .pk-chips::-webkit-scrollbar{display:none}
  .pk-chip{flex-shrink:0;background:none;border:1px solid var(--line);color:var(--sub);padding:8px 14px;border-radius:20px;font-size:14px;font-family:inherit;cursor:pointer}
  .pk-chip.on{border-color:var(--point);color:var(--point)}
  .pk-slot{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px 18px;min-height:170px;display:flex;flex-direction:column;justify-content:center;margin-bottom:16px;transition:border-color .3s}
  .pk-slot.done{border-color:var(--point)}
  .pk-cat{color:var(--sub);font-size:13px;min-height:20px}
  .pk-name{font-family:'Noto Serif KR',serif;font-size:28px;line-height:1.3;margin:6px 0;word-break:keep-all}
  .pk-slot.rolling .pk-name{opacity:.75}
  .pk-slot.done .pk-name{animation:pkPop .5s ease-out;color:var(--point)}
  @keyframes pkPop{0%{transform:scale(.6)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
  .pk-price{color:var(--point);font-size:16px;min-height:24px}
  .pk-desc{color:var(--sub);font-size:14px;margin-top:6px;min-height:20px}
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
          <div class="pk-cat" id="pk-cat"></div>
          <div class="pk-name" id="pk-name">?</div>
          <div class="pk-price" id="pk-price"></div>
          <div class="pk-desc" id="pk-desc">아래 버튼을 눌러 뽑아보세요</div>
        </div>
        <button class="pk-btn" id="pk-go">뽑기!</button>
        <p class="pk-note" id="pk-note"></p>
      </div>`;
    root.querySelectorAll(".pk-chip").forEach(b => b.onclick = () => {
      if (spinning) return;
      cat = b.dataset.c; render();
    });
    root.querySelector("#pk-go").onclick = spin;
  }

  function show(item, final) {
    if (!root) return;
    const q = id => root.querySelector(id);
    q("#pk-name").textContent = item.name;
    q("#pk-cat").textContent = final ? item.category : "";
    q("#pk-price").textContent = final ? ctx.won(item.price) : "";
    q("#pk-desc").textContent = final ? (item.desc || "") : "";
    const slot = q("#pk-slot");
    slot.classList.toggle("rolling", !final);
    slot.classList.toggle("done", !!final);
  }

  function spin() {
    if (spinning) return;
    const items = pool();
    const note = root.querySelector("#pk-note");
    if (!items.length) { note.textContent = "지금 뽑을 수 있는 메뉴가 없어요"; return; }

    spinning = true;
    const btn = root.querySelector("#pk-go");
    btn.disabled = true; btn.textContent = "두구두구…";
    note.textContent = "";
    root.querySelector("#pk-slot").classList.remove("done");

    const pick = items[Math.floor(Math.random() * items.length)];
    let delay = 45, last = -1;

    const tick = () => {
      if (!root) return;
      if (delay > 320 || items.length === 1) {
        show(pick, true);
        spinning = false;
        btn.disabled = false; btn.textContent = "한 번 더!";
        note.textContent = "이 화면을 직원에게 보여주세요 🥃";
        try { navigator.vibrate && navigator.vibrate(40); } catch (e) {}
        return;
      }
      let i;
      do { i = Math.floor(Math.random() * items.length); } while (i === last && items.length > 1);
      last = i;
      show(items[i], false);
      delay *= 1.13;
      timer = setTimeout(tick, delay);
    };
    tick();
  }

  (window.GameModules = window.GameModules || {}).pick = { mount, unmount };
})();
