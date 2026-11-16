// =====================================================
// 👥 2:2 팀전 공용 방 시스템 — 이 파일은 수정하지 않아도 됩니다
// 「통했나?」「폭탄 해체」가 함께 사용 (방 번호 · 4명 자리 · 실시간 연결)
// 공개 MQTT 브로커로 같은 방 번호의 폰끼리 연결, 방장 폰이 게임 진행을 맡음
// =====================================================
(() => {
  if (window.TeamRoom) return;

  const qs = new URLSearchParams(location.search);
  const BROKER = qs.get("broker") || "wss://broker.hivemq.com:8884/mqtt";
  const MQTT_LIB = "https://cdn.jsdelivr.net/npm/mqtt@5/dist/mqtt.min.js";

  const TEAMS = {
    A: { name: "위스키팀", emoji: "🥃", color: "#e39a52" },
    B: { name: "하이볼팀", emoji: "🍋", color: "#62b8c4" },
  };

  // ---------- 도구 ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const getS = (st, k) => { try { return st.getItem(k); } catch (e) { return null; } };
  const setS = (st, k, v) => { try { st.setItem(k, v); } catch (e) {} };
  const SS = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  // 같은 씨앗(seed)이면 모든 폰에서 같은 결과가 나오는 랜덤
  const rng = seed => {
    let a = typeof seed === "number" ? seed : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1779033703);
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const shuffle = (arr, r = Math.random) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  let libPromise = null;
  function loadMqtt() {
    if (typeof mqtt !== "undefined") return Promise.resolve();
    return libPromise || (libPromise = new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = MQTT_LIB; s.onload = ok;
      s.onerror = () => { libPromise = null; fail(); };
      document.head.appendChild(s);
    }));
  }
  loadMqtt().catch(() => {});

  // ---------- 공통 스타일 ----------
  const css = `
  .tr-wrap{padding:24px 20px 40px}
  .tr-hero{font-size:56px;text-align:center;line-height:1}
  .tr-title{font-family:'Noto Serif KR',serif;font-size:24px;text-align:center;margin-top:8px}
  .tr-sub{color:var(--sub);font-size:14px;text-align:center;margin:6px 0 22px;white-space:pre-line}
  .tr-msg{color:var(--point);font-size:14px;text-align:center;min-height:21px;margin-bottom:10px}
  .tr-label{display:block;color:var(--sub);font-size:13px;margin-bottom:6px}
  .tr-input{width:100%;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:14px;font-size:16px;font-family:inherit;margin-bottom:12px}
  .tr-input:focus{outline:none;border-color:var(--point)}
  .tr-btn{display:block;width:100%;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:12px;padding:15px;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
  .tr-btn.primary{background:var(--point);border-color:var(--point);color:var(--bg)}
  .tr-btn.ghost{background:none;border-color:transparent;color:var(--sub);font-weight:400;margin-top:6px}
  .tr-btn.small{padding:10px;font-size:14px;font-weight:500}
  .tr-btn:disabled{opacity:.4}
  .tr-btn+.tr-btn{margin-top:10px}
  .tr-or{text-align:center;color:var(--sub);font-size:13px;margin:18px 0}
  .tr-row{display:flex;gap:8px}
  .tr-row .tr-input{margin:0;flex:1}
  .tr-row .tr-btn{width:96px;flex-shrink:0;margin:0}
  .tr-code{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;text-align:center;margin-bottom:16px}
  .tr-code span{color:var(--sub);font-size:13px}
  .tr-code b{display:block;font-size:42px;letter-spacing:.15em;color:var(--point);line-height:1.2}
  .tr-code small{color:var(--sub);font-size:12px}
  .tr-teams{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .tr-team{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--tc);border-radius:14px;padding:12px 10px}
  .tr-team h3{font-size:15px;color:var(--tc)}
  .tr-seat{display:block;width:100%;text-align:left;background:#1b1714;border:1px dashed var(--line);border-radius:10px;padding:9px 10px;margin-top:8px;color:var(--sub);font-family:inherit;font-size:15px;min-height:54px;cursor:pointer}
  .tr-seat.full{border-style:solid;color:var(--text);cursor:default}
  .tr-seat.me{border-color:var(--point)}
  .tr-seat small{display:block;font-size:11px;color:var(--sub)}
  .tr-seat .off{color:#e8584f;font-size:11px}
  .tr-wait{color:var(--sub);text-align:center;font-size:14px;margin:10px 0 4px;white-space:pre-line}
  .tr-hint{color:var(--sub);font-size:12px;text-align:center;margin:-4px 0 14px}
  .tr-opt{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:14px}
  .tr-opt small{display:block;color:var(--sub);font-size:12px}
  .tr-toggle{flex-shrink:0;width:52px;height:30px;border-radius:15px;border:0;background:var(--line);position:relative;cursor:pointer}
  .tr-toggle::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:var(--text);transition:left .2s}
  .tr-toggle.on{background:var(--point)}
  .tr-toggle.on::after{left:25px}
  .tr-foot{margin-top:24px;display:flex;gap:8px}
  .tr-foot .tr-btn{margin:0;flex:1;padding:10px;font-size:13px;font-weight:400;background:none;color:var(--sub);border-color:var(--line)}
  .tr-banner{background:#3a1d1a;color:#f2b8a8;font-size:13px;text-align:center;padding:8px 12px}
  .tr-chip{display:inline-block;font-size:12px;border-radius:20px;padding:2px 10px;border:1px solid var(--tc,var(--line));color:var(--tc,var(--sub))}
  .tr-name{color:var(--tc);font-weight:700}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // =====================================================
  function create(game) {
    const NS = game.ns;
    const LABELS = game.seatLabels || ["", ""];
    let root = null, client = null, room = null, isHost = false;
    let state = null, screen = "", wakeLock = null;
    let joinTimer = 0, goneTimer = 0, joinSentAt = 0, hostTimers = [];
    const me = { id: "", name: "" };
    const T = s => `${NS}/${room}/${s}`;
    const $ = sel => root && root.querySelector(sel);

    // ---------- 게임에 넘겨주는 도구 ----------
    const api = {
      TEAMS, esc, uid, rng, shuffle, me, $,
      get root() { return root; },
      get state() { return state; },
      get g() { return state && state.g; },
      get isHost() { return isHost; },
      get screen() { return screen; },
      set screen(v) { screen = v; },
      seated() { return state ? [...state.seats.A, ...state.seats.B].filter(Boolean) : []; },
      seatOf(id) {
        for (const t of ["A", "B"]) { const i = state.seats[t].indexOf(id); if (i >= 0) return { team: t, idx: i }; }
        return null;
      },
      teamOf(id) { const s = api.seatOf(id); return s ? s.team : null; },
      partnerOf(id) { const s = api.seatOf(id); return s ? state.seats[s.team][1 - s.idx] : null; },
      player(id) { return (state && state.players.find(p => p.id === id)) || { id, name: "?" }; },
      nameOf(id) { return api.player(id).name; },
      // 팀 색으로 이름 표시
      tag(id) { const t = api.teamOf(id); return `<span class="tr-name" style="--tc:${t ? TEAMS[t].color : "var(--text)"}">${esc(api.nameOf(id))}</span>`; },
      teamTag(t) { return `<span class="tr-name" style="--tc:${TEAMS[t].color}">${TEAMS[t].emoji} ${TEAMS[t].name}</span>`; },
      send(act) {
        act.id = me.id;
        if (isHost) hostAct(me.id, act);
        else if (client) client.publish(T("act"), JSON.stringify(act), { qos: 1 });
      },
      // 방장만: 게임 상태 바꾸고 모두에게 전송
      update(patch) {
        if (!isHost) return;
        const g = typeof patch === "function" ? patch(state.g) : { ...state.g, ...patch };
        publish({ ...state, phase: "game", g });
      },
      setSeats(seats) { if (isHost) state = { ...state, seats }; },
      swapPartners() {
        const s = state.seats;
        api.setSeats({ A: [s.A[0], s.B[1]], B: [s.B[0], s.A[1]] });
      },
      later(fn, ms) { const t = setTimeout(fn, ms); hostTimers.push(t); return t; },
      clearLater() { hostTimers.forEach(clearTimeout); hostTimers = []; },
      toLobby() { if (!isHost) return; api.clearLater(); publish({ ...state, phase: "lobby", g: null }); },
      exit() { leave(); showEntry(); },
      offline() { return state ? state.players.filter(p => p.off && api.seatOf(p.id)) : []; },
      banner() {
        const off = api.offline();
        return off.length ? `<div class="tr-banner">📵 ${off.map(p => esc(p.name)).join(", ")}님 연결이 끊겼어요. 화면을 다시 켜면 돌아와요</div>` : "";
      },
      // 게임 화면 아래 공통 버튼
      footer() {
        return `<div class="tr-foot">
          ${isHost ? `<button class="tr-btn" data-tr="lobby">대기실로</button>` : ""}
          <button class="tr-btn" data-tr="exit">방 나가기</button></div>`;
      },
      bindFooter() {
        const lb = root && root.querySelector('[data-tr="lobby"]');
        if (lb) lb.onclick = () => { if (confirmLobby()) api.toLobby(); };
        const ex = root && root.querySelector('[data-tr="exit"]');
        if (ex) ex.onclick = () => { if (confirmExit()) api.exit(); };
      },
      vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} },
      LS, getS, setS,
    };
    const confirmLobby = () => window.confirm("게임을 그만하고 대기실로 갈까요?");
    const confirmExit = () => window.confirm("방에서 나갈까요?");

    // ---------- 진입 ----------
    function mount(el, ctx) {
      root = el; api.ctx = ctx || {};
      me.id = getS(SS, "team-id") || uid();
      setS(SS, "team-id", me.id);
      me.name = getS(LS, "snail-name") || "";
      showEntry();
    }
    function unmount() { leave(); root = null; screen = ""; }

    function showEntry(msg = "") {
      screen = "entry";
      if (!root) return;
      root.innerHTML = `
        <div class="tr-wrap">
          <div class="tr-hero">${game.emoji}</div>
          <h2 class="tr-title">${esc(game.title)}</h2>
          <p class="tr-sub">${esc(game.sub)}</p>
          <p class="tr-msg" id="tr-msg">${esc(msg)}</p>
          <label class="tr-label" for="tr-name">닉네임</label>
          <input id="tr-name" class="tr-input" maxlength="6" placeholder="예: 태윤" value="${esc(me.name)}">
          <button id="tr-create" class="tr-btn primary">방 만들기</button>
          <div class="tr-or">또는 방 번호로 참가</div>
          <div class="tr-row">
            <input id="tr-code" class="tr-input" inputmode="numeric" maxlength="4" placeholder="4자리 번호">
            <button id="tr-join" class="tr-btn">참가</button>
          </div>
          <p class="tr-wait" style="margin-top:22px">4명이 각자 폰으로 참여해요\n한 명이 방을 만들고, 나머지 3명이 번호로 들어오면 돼요</p>
        </div>`;
      const setMsg = m => { const e = $("#tr-msg"); if (e) e.textContent = m; };
      const takeName = () => {
        const n = $("#tr-name").value.trim().slice(0, 6);
        if (!n) { setMsg("닉네임을 입력해 주세요"); return false; }
        me.name = n; setS(LS, "snail-name", n); return true;
      };
      $("#tr-create").onclick = () => { if (takeName()) createRoom(); };
      $("#tr-join").onclick = () => {
        if (!takeName()) return;
        const code = $("#tr-code").value.trim();
        if (!/^\d{4}$/.test(code)) return setMsg("방 번호 4자리를 입력해 주세요");
        joinRoom(code);
      };
    }

    function showMsgScreen(text, withBack) {
      screen = "msg";
      if (!root) return;
      root.innerHTML = `<div class="tr-wrap"><div class="tr-hero">${game.emoji}</div>
        <p class="tr-wait" style="margin-top:20px">${esc(text)}</p>
        ${withBack ? `<button id="tr-back" class="tr-btn ghost">처음으로</button>` : ""}</div>`;
      const b = $("#tr-back"); if (b) b.onclick = () => api.exit();
    }

    // ---------- 연결 ----------
    async function connect(opts, onReady) {
      try { await loadMqtt(); } catch (e) { showEntry("게임 서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요"); return false; }
      if (!root) return false;
      client = mqtt.connect(BROKER, {
        clientId: "mt_" + uid(), clean: true, keepalive: 20,
        connectTimeout: 8000, reconnectPeriod: 2000, ...opts,
      });
      client.on("connect", onReady);
      client.on("message", onMessage);
      client.on("error", () => {});
      return true;
    }

    async function createRoom() {
      isHost = true;
      room = String(1000 + Math.floor(Math.random() * 9000));
      state = {
        phase: "lobby", players: [{ id: me.id, name: me.name }],
        seats: { A: [me.id, null], B: [null, null] }, opts: { ...(game.defaultOpts || {}) }, g: null,
      };
      showMsgScreen("방을 만드는 중…");
      const ok = await connect({ will: { topic: T("state"), payload: "", qos: 1, retain: true } }, () => {
        client.subscribe(T("act"), { qos: 1 });
        publish(state);
      });
      if (ok) keepAwake();
    }

    async function joinRoom(code) {
      isHost = false; room = code; state = null;
      showMsgScreen(`${code}번 방에 들어가는 중…`);
      const ok = await connect({ will: { topic: T("act"), payload: JSON.stringify({ id: me.id, t: "leave" }), qos: 1, retain: false } }, () => {
        client.subscribe(T("state"), { qos: 1 });
        sendJoin();
      });
      if (!ok) return;
      keepAwake();
      clearTimeout(joinTimer);
      joinTimer = setTimeout(() => {
        if (!state) { leave(); showEntry("방을 찾을 수 없어요. 번호를 확인해 주세요"); }
      }, 8000);
    }

    function sendJoin() {
      joinSentAt = Date.now();
      if (client) client.publish(T("act"), JSON.stringify({ id: me.id, t: "join", name: me.name }), { qos: 1 });
    }

    function leave() {
      api.clearLater();
      clearTimeout(joinTimer); clearTimeout(goneTimer);
      if (game.onLeave) try { game.onLeave(api); } catch (e) {}
      if (client) {
        const c = client; client = null;
        try {
          if (isHost) c.publish(T("state"), "", { qos: 1, retain: true });
          else c.publish(T("act"), JSON.stringify({ id: me.id, t: "leave" }), { qos: 1 });
        } catch (e) {}
        setTimeout(() => { try { c.end(); } catch (e) {} }, 400);
      }
      if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
      state = null; room = null; isHost = false;
    }

    async function keepAwake() {
      try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (e) {}
    }
    const onVis = () => { if (document.visibilityState === "visible" && client) keepAwake(); };
    document.addEventListener("visibilitychange", onVis);

    // ---------- 메시지 ----------
    function onMessage(topic, buf, packet) {
      const kind = topic.split("/").pop();
      const txt = buf.toString();
      if (isHost) {
        if (kind !== "act") return;
        let a; try { a = JSON.parse(txt); } catch (e) { return; }
        if (!a || typeof a.id !== "string" || typeof a.t !== "string") return;
        hostAct(a.id, a);
        return;
      }
      if (kind !== "state") return;
      if (!txt) {                               // 방장 연결 끊김 → 잠시 기다려 봄
        if (!state) return;
        clearTimeout(goneTimer);
        goneTimer = setTimeout(() => { leave(); showEntry("방장 연결이 끊겨 방이 닫혔어요"); }, 20000);
        return;
      }
      let s; try { s = JSON.parse(txt); } catch (e) { return; }
      if (!s || !Array.isArray(s.players) || !s.seats) return;
      clearTimeout(goneTimer); clearTimeout(joinTimer);
      handleState(s, packet && packet.retain);
    }

    // ---------- 방장: 요청 처리 ----------
    function hostAct(from, a) {
      if (!state) return;
      const seats = state.seats;
      const seatedIds = () => [...seats.A, ...seats.B].filter(Boolean);
      if (a.t === "join") {
        const name = String(a.name || "손님").slice(0, 6);
        let players = state.players.slice();
        const ex = players.find(p => p.id === from);
        if (ex) {
          if (ex.name === name && !ex.off) { publish(state); return; }
          players = players.map(p => p.id === from ? { ...p, name, off: false } : p);
          state = { ...state, players };
          publish(state);
          return;
        }
        if (state.phase !== "lobby" || seatedIds().length >= 4) return;   // 꽉 참 / 게임 중
        players.push({ id: from, name });
        const ns = { A: seats.A.slice(), B: seats.B.slice() };
        // 빈 자리 채우기: A1 → B1 → A2 → B2 순서 (자리 번호 = 라벨)
        const order = [["A", 0], ["B", 0], ["A", 1], ["B", 1]];
        const free = order.find(([t, i]) => !ns[t][i]);
        if (free) ns[free[0]][free[1]] = from;
        publish({ ...state, players, seats: ns });
        return;
      }
      if (a.t === "leave") {
        if (from === me.id) return;
        if (state.phase === "lobby") {
          const ns = { A: seats.A.map(x => x === from ? null : x), B: seats.B.map(x => x === from ? null : x) };
          publish({ ...state, players: state.players.filter(p => p.id !== from), seats: ns });
        } else {
          publish({ ...state, players: state.players.map(p => p.id === from ? { ...p, off: true } : p) });
        }
        return;
      }
      if (a.t === "seat") {                     // 대기실에서 빈 자리로 이동
        if (state.phase !== "lobby") return;
        const { team, idx } = a;
        if (!["A", "B"].includes(team) || ![0, 1].includes(idx) || seats[team][idx]) return;
        const ns = { A: seats.A.map(x => x === from ? null : x), B: seats.B.map(x => x === from ? null : x) };
        ns[team][idx] = from;
        publish({ ...state, seats: ns });
        return;
      }
      if (from !== me.id && !seatedIds().includes(from)) return;
      if (state.phase === "game" && game.onAction) game.onAction(api, from, a);
    }

    function publish(s) {
      state = { ...s, host: me.id, ts: Date.now() };
      if (client) client.publish(T("state"), JSON.stringify(state), { qos: 1, retain: true });
      handleState(state, false);
    }

    function handleState(s, retained) {
      const prev = state;
      state = s;
      if (!root) return;
      const mine = api.seatOf(me.id) || s.players.some(p => p.id === me.id);
      if (!isHost && !mine) {
        const full = api.seated().length >= 4;
        if (s.phase !== "lobby" || full) {
          showMsgScreen(s.phase !== "lobby" ? "지금 게임이 진행 중이라 들어갈 수 없어요" : "방이 꽉 찼어요 (4명)\n다른 방을 만들어 주세요", true);
          return;
        }
        if (Date.now() - joinSentAt > 3000) sendJoin();
      }
      if (s.phase === "lobby") { showLobby(); return; }
      if (screen === "lobby" || screen === "msg") screen = "";
      game.render(api, prev, retained);
    }

    // ---------- 대기실 ----------
    function showLobby() {
      screen = "lobby";
      const s = state;
      const n = api.seated().length;
      const seatHtml = (t, i) => {
        const id = s.seats[t][i];
        const label = LABELS[i] ? `<small>${esc(LABELS[i])}</small>` : "";
        if (!id) return `<button class="tr-seat" data-team="${t}" data-idx="${i}">${label}+ 빈 자리</button>`;
        const p = api.player(id);
        return `<div class="tr-seat full${id === me.id ? " me" : ""}">${label}${esc(p.name)}${id === me.id ? " (나)" : ""}${id === s.host ? " 👑" : ""}${p.off ? ` <span class="off">연결 끊김</span>` : ""}</div>`;
      };
      root.innerHTML = `
        <div class="tr-wrap">
          <div class="tr-code"><span>방 번호</span><b>${esc(room)}</b><small>함께할 손님에게 이 번호를 알려주세요</small></div>
          <div class="tr-teams">
            ${["A", "B"].map(t => `
              <div class="tr-team" style="--tc:${TEAMS[t].color}">
                <h3>${TEAMS[t].emoji} ${TEAMS[t].name}</h3>
                ${seatHtml(t, 0)}${seatHtml(t, 1)}
              </div>`).join("")}
          </div>
          <p class="tr-hint">${esc(game.seatHint || "빈 자리를 누르면 자리를 옮길 수 있어요")}</p>
          ${isHost && game.lobbyOptions ? game.lobbyOptions(api) : ""}
          ${isHost
            ? `<button id="tr-shuffle" class="tr-btn small">🔀 팀 섞기</button>
               <button id="tr-start" class="tr-btn primary" ${n < 4 ? "disabled" : ""}>${n < 4 ? `${n}/4명 모이는 중…` : "게임 시작!"}</button>`
            : `<p class="tr-wait">${n < 4 ? `${n}/4명 모이는 중…` : "방장이 시작을 누르면 게임이 시작돼요"}</p>`}
          <button id="tr-leave" class="tr-btn ghost">방 나가기</button>
        </div>`;
      root.querySelectorAll(".tr-seat[data-team]").forEach(b => {
        b.onclick = () => api.send({ t: "seat", team: b.dataset.team, idx: +b.dataset.idx });
      });
      if (isHost) {
        if (game.bindLobbyOptions) game.bindLobbyOptions(api, opts => publish({ ...state, opts: { ...state.opts, ...opts } }));
        $("#tr-shuffle").onclick = () => {
          const ss = { A: state.seats.A.slice(), B: state.seats.B.slice() };
          for (const i of [0, 1]) if (Math.random() < 0.5) [ss.A[i], ss.B[i]] = [ss.B[i], ss.A[i]];
          // 같은 줄끼리만 섞어서 자리 라벨(남/여 등)이 유지되게
          if (ss.A.join() === state.seats.A.join()) [ss.A[1], ss.B[1]] = [ss.B[1], ss.A[1]];
          publish({ ...state, seats: ss });
        };
        $("#tr-start").onclick = () => {
          if (api.seated().length < 4) return;
          api.clearLater();
          state = { ...state, phase: "game" };
          game.start(api);
        };
      }
      $("#tr-leave").onclick = () => api.exit();
    }

    window.addEventListener("pagehide", () => { if (client) leave(); });
    return { mount, unmount, api };
  }

  // 게임 파일에서 필요한 파일 불러오기 (한 번만)
  const loaded = {};
  function need(src) {
    return loaded[src] || (loaded[src] = new Promise((ok, fail) => {
      const el = document.createElement("script");
      el.src = src + "?v=" + Date.now().toString().slice(0, 8);
      el.onload = ok;
      el.onerror = () => { delete loaded[src]; fail(); };
      document.head.appendChild(el);
    }));
  }

  window.TeamRoom = { create, TEAMS, esc, uid, rng, shuffle, need };
})();
