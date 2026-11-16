// =====================================================
// 🐌 달팽이 경주 (멀티플레이) — 이 파일은 수정하지 않아도 됩니다
// 공개 MQTT 브로커로 같은 방 번호의 폰끼리 실시간 연결
// 승패는 방장 폰에서 완전 랜덤으로 정해져 모두에게 같은 경주가 재생됨
// =====================================================
(() => {
  const BROKER = "wss://broker.hivemq.com:8884/mqtt";
  const NS = "mullae-snail/v1";
  const MAX = 10;
  const COUNTDOWN = 3000;
  const COLORS = ["#e8584f", "#f2a541", "#f5d547", "#7bc96f", "#3fb7b0",
                  "#4f8fe8", "#9b6ce8", "#e86fb4", "#c7a17a", "#dcdcdc"];
  const CHEERS = ["🔥", "👏", "💨", "🍀", "🥃", "😱"];

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const getS = (st, k) => { try { return st.getItem(k); } catch (e) { return null; } };
  const setS = (st, k, v) => { try { st.setItem(k, v); } catch (e) {} };
  const SS = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();

  // 실시간 연결 라이브러리 (이 게임을 열 때만 불러옴)
  if (typeof mqtt === "undefined") {
    const lib = document.createElement("script");
    lib.src = "https://cdn.jsdelivr.net/npm/mqtt@5/dist/mqtt.min.js";
    document.head.appendChild(lib);
  }

  // ---------- 스타일 ----------
  const css = `
  .sn-wrap{padding:28px 20px 40px}
  .sn-hero{font-size:56px;text-align:center;line-height:1}
  .sn-hero span{display:inline-block;transform:scaleX(-1)}
  .sn-title{font-family:'Noto Serif KR',serif;font-size:24px;text-align:center;margin-top:8px}
  .sn-sub{color:var(--sub);font-size:14px;text-align:center;margin:6px 0 24px}
  .sn-msg{color:var(--point);font-size:14px;text-align:center;min-height:21px;margin-bottom:10px}
  .sn-label{display:block;color:var(--sub);font-size:13px;margin-bottom:6px}
  .sn-input{width:100%;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:14px;font-size:16px;font-family:inherit;margin-bottom:12px}
  .sn-input:focus{outline:none;border-color:var(--point)}
  .sn-btn{display:block;width:100%;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:12px;padding:15px;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer}
  .sn-btn.primary{background:var(--point);border-color:var(--point);color:var(--bg)}
  .sn-btn.ghost{background:none;color:var(--sub);font-weight:400;margin-top:10px}
  .sn-btn:disabled{opacity:.4}
  .sn-or{text-align:center;color:var(--sub);font-size:13px;margin:18px 0}
  .sn-row{display:flex;gap:8px}
  .sn-row .sn-input{margin:0;flex:1}
  .sn-row .sn-btn{width:96px;flex-shrink:0}
  .sn-code{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;text-align:center;margin-bottom:20px}
  .sn-code span{color:var(--sub);font-size:13px}
  .sn-code b{display:block;font-size:44px;letter-spacing:.15em;color:var(--point);line-height:1.2}
  .sn-code small{color:var(--sub);font-size:12px}
  .sn-list{margin-bottom:20px}
  .sn-player{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--line)}
  .sn-dot{width:12px;height:12px;border-radius:50%;background:var(--c);flex-shrink:0}
  .sn-player .tag{font-size:11px;color:var(--bg);background:var(--sub);border-radius:4px;padding:1px 6px}
  .sn-player .tag.host{background:var(--point)}
  .sn-wait{color:var(--sub);text-align:center;font-size:14px;margin:8px 0 4px}
  .sn-race{padding:16px 12px 32px;position:relative}
  .sn-count{text-align:center;font-family:'Noto Serif KR',serif;font-size:32px;color:var(--point);height:48px;line-height:48px}
  .sn-track{position:relative;background:#1b1714;border:1px solid var(--line);border-radius:14px;padding:6px 0;overflow:hidden}
  .sn-track::after{content:"";position:absolute;top:0;bottom:0;right:14px;width:8px;background:repeating-linear-gradient(0deg,#f2ebe3 0 8px,#14110f 8px 16px);opacity:.8}
  .sn-lane{position:relative;height:42px;border-bottom:1px dashed #2e2824;padding-right:24px}
  .sn-lane:last-child{border-bottom:0}
  .sn-lane .nm{position:absolute;left:46px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--c);opacity:.85;white-space:nowrap}
  .sn-lane.me .nm{font-weight:700}
  .sn-lane.lead{background:rgba(217,163,91,.08)}
  .sn-snail{position:absolute;left:6px;top:50%;margin-top:-15px;font-size:26px;line-height:30px;will-change:transform}
  .sn-snail i{display:inline-block;font-style:normal;transform:scaleX(-1)}
  .sn-snail::after{content:"";position:absolute;left:4px;right:4px;bottom:-2px;height:3px;border-radius:2px;background:var(--c)}
  .sn-cheers{position:absolute;left:0;right:0;top:56px;height:0;pointer-events:none}
  .sn-cheer{position:absolute;font-size:14px;white-space:nowrap;animation:snUp 1.6s ease-out forwards}
  @keyframes snUp{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-60px)}}
  .sn-cheer-btn{margin-top:16px}
  .sn-note{color:var(--sub);font-size:12px;text-align:center;margin-top:8px}
  .sn-win{text-align:center;margin:8px 0 24px}
  .sn-win .trophy{font-size:64px;animation:snPop .6s ease-out}
  @keyframes snPop{0%{transform:scale(.3)}70%{transform:scale(1.15)}100%{transform:scale(1)}}
  .sn-win h2{font-family:'Noto Serif KR',serif;font-size:26px;margin-top:6px}
  .sn-win p{color:var(--point);margin-top:4px}
  .sn-rank{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--line)}
  .sn-rank .no{width:28px;text-align:center;color:var(--sub)}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- 상태 ----------
  let root = null, client = null, room = null, isHost = false;
  let state = null, players = [], timers = [], raf = 0;
  let screen = "", animating = false, lastRaceId = null, lastCheer = 0;
  let joinSentAt = 0, joinTimer = 0, goneTimer = 0, wakeLock = null;
  const me = { id: "", name: "" };

  const T = suffix => `${NS}/${room}/${suffix}`;
  const $ = sel => root && root.querySelector(sel);

  // ---------- 진입 ----------
  function mount(el) {
    root = el;
    me.id = getS(SS, "snail-id") || uid();
    setS(SS, "snail-id", me.id);
    me.name = getS(LS, "snail-name") || "";
    showEntry();
  }
  function unmount() { leave(); root = null; screen = ""; }

  function showEntry(msg = "") {
    stopAnim(); screen = "entry";
    root.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-hero"><span>🐌</span></div>
        <h2 class="sn-title">달팽이 경주</h2>
        <p class="sn-sub">매장 손님끼리 함께! 1등은 완전 랜덤이에요</p>
        <p class="sn-msg" id="sn-msg">${esc(msg)}</p>
        <label class="sn-label" for="sn-name">닉네임</label>
        <input id="sn-name" class="sn-input" maxlength="8" placeholder="예: 장원영" value="${esc(me.name)}">
        <button id="sn-create" class="sn-btn primary">방 만들기</button>
        <div class="sn-or">또는 방 번호로 참가</div>
        <div class="sn-row">
          <input id="sn-code" class="sn-input" inputmode="numeric" maxlength="4" placeholder="4자리 번호">
          <button id="sn-join" class="sn-btn">참가</button>
        </div>
      </div>`;
    const setMsg = m => { const e = $("#sn-msg"); if (e) e.textContent = m; };
    const takeName = () => {
      const n = $("#sn-name").value.trim().slice(0, 8);
      if (!n) { setMsg("닉네임을 입력해 주세요"); return false; }
      me.name = n; setS(LS, "snail-name", n); return true;
    };
    $("#sn-create").onclick = () => { if (takeName()) createRoom(); };
    $("#sn-join").onclick = () => {
      if (!takeName()) return;
      const code = $("#sn-code").value.trim();
      if (!/^\d{4}$/.test(code)) return setMsg("방 번호 4자리를 입력해 주세요");
      joinRoom(code);
    };
  }

  function showConnecting(text) {
    screen = "connecting";
    root.innerHTML = `<div class="sn-wrap"><div class="sn-hero"><span>🐌</span></div><p class="sn-wait" style="margin-top:20px">${esc(text)}</p></div>`;
  }

  // ---------- 연결 ----------
  function connect(opts, onReady) {
    if (typeof mqtt === "undefined") { showEntry("게임 서버 연결 준비 중이에요. 잠시 후 다시 눌러주세요"); return false; }
    client = mqtt.connect(BROKER, {
      clientId: "mh_" + uid(), clean: true, keepalive: 20,
      connectTimeout: 8000, reconnectPeriod: 2000, ...opts,
    });
    client.on("connect", onReady);           // 재연결 때도 다시 호출됨
    client.on("message", onMessage);
    client.on("error", () => {});
    return true;
  }

  function createRoom() {
    isHost = true;
    room = String(1000 + Math.floor(Math.random() * 9000));
    players = [{ id: me.id, name: me.name, color: COLORS[0] }];
    state = { phase: "lobby" };
    showConnecting("방을 만드는 중…");
    const ok = connect({ will: { topic: T("state"), payload: "", qos: 1, retain: true } }, () => {
      client.subscribe([T("join"), T("leave"), T("cheer")], { qos: 1 });
      publishState(core());
    });
    if (ok) keepAwake();
  }

  function joinRoom(code) {
    isHost = false; room = code; state = null;
    showConnecting(`${code}번 방에 들어가는 중…`);
    const ok = connect({ will: { topic: T("leave"), payload: JSON.stringify({ id: me.id }), qos: 1, retain: false } }, () => {
      client.subscribe([T("state"), T("cheer")], { qos: 1 });
      sendJoin();
    });
    if (!ok) return;
    clearTimeout(joinTimer);
    joinTimer = setTimeout(() => {
      if (!state) { leave(); showEntry("방을 찾을 수 없어요. 번호를 확인해 주세요"); }
    }, 7000);
  }

  function sendJoin() {
    joinSentAt = Date.now();
    client && client.publish(T("join"), JSON.stringify({ id: me.id, name: me.name }), { qos: 1 });
  }

  function leave() {
    stopAnim(); clearTimers();
    clearTimeout(joinTimer); clearTimeout(goneTimer);
    if (client) {
      const c = client; client = null;
      try {
        if (isHost) c.publish(T("state"), "", { qos: 1, retain: true });
        else c.publish(T("leave"), JSON.stringify({ id: me.id }), { qos: 1 });
      } catch (e) {}
      setTimeout(() => { try { c.end(); } catch (e) {} }, 400);
    }
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    state = null; players = []; room = null; isHost = false;
    lastRaceId = null; animating = false;
  }

  async function keepAwake() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isHost && client) keepAwake();
  });

  // ---------- 메시지 ----------
  function onMessage(topic, buf, packet) {
    const kind = topic.split("/").pop();
    const txt = buf.toString();
    if (kind === "cheer") { try { showCheer(JSON.parse(txt)); } catch (e) {} return; }

    if (isHost) {
      let d; try { d = JSON.parse(txt); } catch (e) { return; }
      if (!d || typeof d.id !== "string") return;
      if (kind === "join") {
        const name = String(d.name || "손님").slice(0, 8);
        const ex = players.find(p => p.id === d.id);
        if (ex) { if (ex.name === name) return; ex.name = name; }
        else {
          if (players.length >= MAX) return;
          const used = players.map(p => p.color);
          players.push({ id: d.id, name, color: COLORS.find(c => !used.includes(c)) || COLORS[0] });
        }
        publishState(core());
      } else if (kind === "leave") {
        if (d.id === me.id) return;
        const before = players.length;
        players = players.filter(p => p.id !== d.id);
        if (players.length !== before) publishState(core());
      }
      return;
    }

    if (kind === "state") {
      if (!txt) {                         // 방장 연결 끊김 → 잠시 기다려 봄
        if (!state) return;
        clearTimeout(goneTimer);
        goneTimer = setTimeout(() => { leave(); showEntry("방장이 방을 나갔어요"); }, 20000);
        return;
      }
      let s; try { s = JSON.parse(txt); } catch (e) { return; }
      if (!s || !Array.isArray(s.players)) return;
      clearTimeout(goneTimer); clearTimeout(joinTimer);
      handleState(s, packet && packet.retain);
    }
  }

  function core() {
    const s = state || { phase: "lobby" };
    return { phase: s.phase, raceId: s.raceId, racers: s.racers, cps: s.cps };
  }

  function publishState(s) {
    state = { ...s, players, host: me.id, ts: Date.now() };
    if (client) client.publish(T("state"), JSON.stringify(state), { qos: 1, retain: true });
    handleState(state, false);
  }

  function handleState(s, retained) {
    state = s;
    const inRoom = s.players.some(p => p.id === me.id);
    if (!isHost && !inRoom && Date.now() - joinSentAt > 3000) sendJoin();

    if (s.phase === "lobby") { stopAnim(); showLobby(); return; }

    if (s.phase === "race") {
      if (s.raceId === lastRaceId) { if (screen === "waiting") showWaiting(); return; }
      lastRaceId = s.raceId;
      if (retained && !isHost) { showWaiting(); return; }
      startRace(s);
      return;
    }

    if (s.phase === "result") {
      if (animating) return;              // 애니메이션 끝나면 알아서 결과 표시
      lastRaceId = s.raceId;
      showResult(s);
    }
  }

  // ---------- 화면: 대기실 ----------
  function showLobby() {
    screen = "lobby";
    const list = state.players;
    const full = list.length >= MAX && !list.some(p => p.id === me.id);
    root.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-code"><span>방 번호</span><b>${esc(room)}</b><small>옆 손님에게 이 번호를 알려주세요</small></div>
        <div class="sn-list">
          ${list.map(p => `
            <div class="sn-player" style="--c:${esc(p.color)}">
              <span class="sn-dot"></span><span>${esc(p.name)}</span>
              ${p.id === state.host ? `<span class="tag host">방장</span>` : ""}
              ${p.id === me.id ? `<span class="tag">나</span>` : ""}
            </div>`).join("")}
        </div>
        ${full ? `<p class="sn-wait">방이 꽉 찼어요 (최대 ${MAX}명). 다음 방을 이용해 주세요</p>` : ""}
        ${isHost
          ? `<button id="sn-start" class="sn-btn primary" ${list.length < 2 ? "disabled" : ""}>출발! 🐌 ${list.length}마리</button>
             <p class="sn-wait">${list.length < 2 ? "2명 이상 모이면 출발할 수 있어요" : "모두 모였으면 출발을 눌러주세요"}</p>`
          : `<p class="sn-wait">방장이 출발을 누르면 경주가 시작돼요…</p>`}
        <button id="sn-leave" class="sn-btn ghost">방 나가기</button>
      </div>`;
    const st = $("#sn-start"); if (st) st.onclick = hostStart;
    $("#sn-leave").onclick = () => { leave(); showEntry(); };
  }

  function showWaiting() {
    screen = "waiting";
    root.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-hero"><span>🐌</span></div>
        <p class="sn-wait" style="margin-top:16px">지금 경주가 진행 중이에요!<br>다음 판부터 함께할 수 있어요</p>
        <button id="sn-leave" class="sn-btn ghost">방 나가기</button>
      </div>`;
    $("#sn-leave").onclick = () => { leave(); showEntry(); };
  }

  // ---------- 경주 (방장이 랜덤 생성) ----------
  function makePlan(n) {
    const SEG = 12;
    return Array.from({ length: n }, () => {
      const seg = Array.from({ length: SEG }, () => {
        const r = Math.random();
        if (r < 0.12) return 2.2 + Math.random();   // 멈칫
        if (r > 0.9) return 0.35;                    // 질주
        return 0.6 + Math.random() * 0.8;
      });
      const total = seg.reduce((a, b) => a + b, 0);
      const target = 11000 + Math.random() * 2500;   // 완주 시간(ms) → 이게 곧 순위
      let acc = 0;
      return seg.map(x => Math.round(acc += x / total * target));
    });
  }

  function orderOf(s) {
    return s.racers.map((r, i) => [i, s.cps[i][s.cps[i].length - 1]])
      .sort((a, b) => a[1] - b[1]).map(x => x[0]);
  }

  function hostStart() {
    const racers = players.slice(0, MAX).map(p => ({ ...p }));
    if (racers.length < 2) return;
    const cps = makePlan(racers.length);
    const raceId = uid();
    publishState({ phase: "race", raceId, racers, cps });
    const maxT = Math.max(...cps.map(c => c[c.length - 1]));
    timers.push(setTimeout(() => {
      publishState({ phase: "result", raceId, racers, cps });
    }, COUNTDOWN + maxT + 2500));
  }

  function startRace(s) {
    stopAnim(); animating = true; screen = "race";
    root.innerHTML = `
      <div class="sn-race">
        <div class="sn-count" id="sn-count">3</div>
        <div class="sn-cheers"></div>
        <div class="sn-track">
          ${s.racers.map((r, i) => `
            <div class="sn-lane${r.id === me.id ? " me" : ""}" id="sn-l-${i}" style="--c:${esc(r.color)}">
              <span class="nm">${esc(r.name)}${r.id === me.id ? " (나)" : ""}</span>
              <span class="sn-snail" id="sn-s-${i}"><i>🐌</i></span>
            </div>`).join("")}
        </div>
        <button id="sn-cheer" class="sn-btn sn-cheer-btn">응원하기 📣</button>
        <p class="sn-note">응원은 결과에 영향을 주지 않아요 😉</p>
      </div>`;
    $("#sn-cheer").onclick = cheer;

    const snails = s.racers.map((_, i) => $(`#sn-s-${i}`));
    const lanes = s.racers.map((_, i) => $(`#sn-l-${i}`));
    const countEl = $("#sn-count");
    const runW = () => lanes[0].clientWidth - 24 - snails[0].offsetWidth - 10;
    let W = runW();
    const onResize = () => { W = runW(); };
    window.addEventListener("resize", onResize);

    const pos = (cp, t) => {
      if (t <= 0) return 0;
      for (let k = 0; k < cp.length; k++) {
        if (t < cp[k]) { const a = k ? cp[k - 1] : 0; return (k + (t - a) / (cp[k] - a)) / cp.length; }
      }
      return 1;
    };
    const maxT = Math.max(...s.cps.map(c => c[c.length - 1]));
    const t0 = performance.now();
    let lead = -1;

    const step = now => {
      if (!root || screen !== "race") return;
      const el = now - t0, t = el - COUNTDOWN;
      countEl.textContent = t < 0 ? Math.ceil(-t / 1000) : (t < 900 ? "출발!" : "");
      let li = 0, lp = -1;
      s.cps.forEach((cp, i) => {
        const p = pos(cp, t);
        snails[i].style.transform = `translateX(${p * W}px)`;
        if (p > lp) { lp = p; li = i; }
      });
      if (t > 0 && li !== lead) {
        if (lead >= 0) lanes[lead].classList.remove("lead");
        lanes[li].classList.add("lead"); lead = li;
      }
      if (t < maxT + 700) raf = requestAnimationFrame(step);
      else {
        window.removeEventListener("resize", onResize);
        animating = false;
        showResult(state && state.phase === "lobby" ? null : s);
      }
    };
    raf = requestAnimationFrame(step);
    timers.push(() => window.removeEventListener("resize", onResize));
  }

  function clearTimers() {
    timers.forEach(t => typeof t === "function" ? t() : clearTimeout(t));
    timers = [];
  }

  function stopAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; animating = false;
  }

  // ---------- 응원 ----------
  function cheer() {
    const now = Date.now();
    if (!client || now - lastCheer < 400) return;
    lastCheer = now;
    const e = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    client.publish(T("cheer"), JSON.stringify({ n: me.name, e }), { qos: 0 });
  }
  function showCheer(d) {
    if (screen !== "race" || !root) return;
    const layer = $(".sn-cheers"); if (!layer) return;
    const el = document.createElement("div");
    el.className = "sn-cheer";
    el.textContent = `${String(d.e || "📣").slice(0, 2)} ${String(d.n || "").slice(0, 8)}`;
    el.style.left = (8 + Math.random() * 70) + "%";
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  // ---------- 결과 ----------
  function showResult(s) {
    if (!s) { showLobby(); return; }
    screen = "result";
    const order = orderOf(s).map(i => s.racers[i]);
    const win = order[0];
    const medal = ["🥇", "🥈", "🥉"];
    root.innerHTML = `
      <div class="sn-wrap">
        <div class="sn-win">
          <div class="trophy">🏆</div>
          <h2>${esc(win.name)} 우승!</h2>
          ${win.id === me.id ? `<p>축하해요! 오늘 밤의 행운은 당신 거예요 🎉</p>` : ""}
        </div>
        ${order.map((r, i) => `
          <div class="sn-rank" style="--c:${esc(r.color)}">
            <span class="no">${medal[i] || i + 1}</span><span class="sn-dot"></span>
            <span>${esc(r.name)}${r.id === me.id ? " (나)" : ""}</span>
          </div>`).join("")}
        <div style="margin-top:20px">
          ${isHost
            ? `<button id="sn-again" class="sn-btn primary">한 판 더!</button>`
            : `<p class="sn-wait">방장이 다음 판을 준비하고 있어요…</p>`}
          <button id="sn-leave" class="sn-btn ghost">방 나가기</button>
        </div>
      </div>`;
    const ag = $("#sn-again");
    if (ag) ag.onclick = () => {
      clearTimers();
      publishState({ phase: "lobby" });
    };
    $("#sn-leave").onclick = () => { leave(); showEntry(); };
  }

  window.addEventListener("pagehide", () => { if (client) leave(); });
  (window.GameModules = window.GameModules || {}).race = { mount, unmount };
})();
