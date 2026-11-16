// =====================================================
// 💣 폭탄 해체 — 2:2 팀전 협동 게임 (이 파일은 아래 설정 숫자만 바꿔도 돼요)
// 팀마다 한 명은 폭탄, 한 명은 설명서만 보고 "말로만" 해체
// 두 팀이 똑같은 폭탄을 동시에 풀고, 먼저 해체한 팀이 승리
// 폭탄과 설명서는 판마다 랜덤으로 새로 만들어져요
// =====================================================
(() => {
  // ===== 설정 =====
  const TIME_SEC = 240;             // 제한 시간(초) — 4분
  const MAX_STRIKES = 3;            // 이만큼 틀리면 펑
  const SEAT_LABELS = ["남", "여"]; // 대기실 자리 이름 (["", ""] 이면 표시 안 함)
  const COUNTDOWN = 3500;           // 시작 전 3·2·1 (ms)
  const HOLD_MS = 600;              // 이보다 길게 누르면 '꾹 누르기'

  const V = "?v=" + Date.now().toString().slice(0, 8);
  const loadJs = (src, ready) => new Promise((ok, fail) => {
    if (ready()) return ok();
    const s = document.createElement("script");
    s.src = src + V; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });

  // ---------- 색 · 기호 ----------
  const WIRE = {
    r: { nm: "빨간", hex: "#e8584f" }, b: { nm: "파란", hex: "#4f8fe8" }, y: { nm: "노란", hex: "#f5d547" },
    w: { nm: "흰", hex: "#f2efe9" }, k: { nm: "검은", hex: "#1a1a1a" },
  };
  const BTN = {
    r: { nm: "빨간", hex: "#d9463d", fg: "#fff" }, b: { nm: "파란", hex: "#3d78d9", fg: "#fff" },
    y: { nm: "노란", hex: "#f0cd3c", fg: "#14110f" }, w: { nm: "흰", hex: "#f2efe9", fg: "#14110f" },
  };
  const LABELS = ["누르기", "멈춰", "폭발", "잠깐"];
  const SYMS = ["🌙", "⭐", "☀️", "☁️", "⚡", "🔥", "💧", "🍀", "🌸", "🍄", "🐟", "🐠", "🐱", "🐶", "🐰", "🦊",
    "🍎", "🍋", "🍇", "🔑", "🗝️", "🔔", "🎈", "🎲", "⚓", "✂️", "💎", "🎩", "👑", "🚲", "☂️", "🐙", "🌵", "🍩", "🎸", "🚀"];

  // =====================================================
  // 폭탄 + 설명서 만들기 (같은 seed면 모든 폰에서 똑같이 나옴)
  // =====================================================
  function makeBomb(seed) {
    const R = window.TeamRoom.rng(seed);
    const pick = a => a[Math.floor(R() * a.length)];
    const int = (a, b) => a + Math.floor(R() * (b - a + 1));
    const shuf = a => window.TeamRoom.shuffle(a, R);
    const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const serial = pick(L) + pick(L) + int(1, 9) + int(0, 9);
    const odd = +serial.slice(-1) % 2 === 1;
    const wc = Object.keys(WIRE);

    // ---- 1단계: 선 자르기 ----
    const wireRules = {};
    for (const n of [3, 4, 5]) {
      const rules = [], used = new Set();
      const howMany = int(3, 4);
      let guard = 0;
      while (rules.length < howMany && guard++ < 50) {
        const type = pick(["none", "many", "one", "last", "first", "odd"]);
        const c = pick(wc);
        const k = type + (type === "odd" ? "" : c);
        if (used.has(k) || (type === "odd" && used.has("oddx"))) continue;
        used.add(k); if (type === "odd") used.add("oddx");
        const sure = ["many", "one", "last", "first"].includes(type);
        const act = sure && R() < 0.5
          ? { type: pick(["lastOf", "firstOf"]), c }
          : R() < 0.75 ? { type: "pos", k: int(1, n) } : { type: "last" };
        rules.push({ type, c, act });
      }
      wireRules[n] = { rules, other: { type: "pos", k: int(1, n) } };
    }
    const nW = int(3, 5);
    const wires = Array.from({ length: nW }, () => pick(wc));
    const wireAns = solveWires(wires, wireRules[nW], odd);

    // ---- 2단계: 기호 누르기 ----
    let cols, symShown, symOrder, tries = 0;
    do {
      cols = Array.from({ length: 4 }, () => shuf(SYMS).slice(0, 6));
      const ci = int(0, 3);
      const chosen = shuf(cols[ci].map((s, i) => i)).slice(0, 4).sort((a, b) => a - b).map(i => cols[ci][i]);
      symOrder = chosen;
      symShown = shuf(chosen);
      const hits = cols.filter(col => chosen.every(s => col.includes(s))).length;
      if (hits === 1) break;
    } while (++tries < 100);

    // ---- 3단계: 버튼 ----
    const bc = Object.keys(BTN);
    const btn = { c: pick(bc), l: pick(LABELS), strip: pick(bc) };
    const btnRules = [], usedB = new Set();
    let g2 = 0;
    while (btnRules.length < 3 && g2++ < 50) {
      const type = pick(["cl", "l", "c", "even"]);
      const c = pick(bc), l = pick(LABELS);
      const k = type === "cl" ? type + c + l : type === "l" ? type + l : type === "c" ? type + c : type;
      if (usedB.has(k)) continue;
      usedB.add(k);
      btnRules.push({ type, c, l, act: R() < 0.5 ? "tap" : "hold" });
    }
    // 첫 규칙은 이 폭탄에 맞는 것이 하나쯤 섞이게 (너무 '그 외'만 나오지 않게)
    if (R() < 0.6) btnRules[int(0, 2)] = { type: pick(["cl", "l", "c"]), c: btn.c, l: btn.l, act: R() < 0.5 ? "tap" : "hold" };
    const btnOther = R() < 0.5 ? "tap" : "hold";
    const digits = shuf([1, 2, 3, 4, 5]);
    const strip = {}; bc.forEach((c, i) => { strip[c] = digits[i]; });
    const btnAct = solveButton(btn, btnRules, btnOther, odd);

    return {
      serial, odd,
      wire: { rules: wireRules, wires, ans: wireAns },
      sym: { cols, shown: symShown, order: symOrder },
      btn: { c: btn.c, l: btn.l, sc: btn.strip, rules: btnRules, other: btnOther, map: strip, act: btnAct, digit: strip[btn.strip] },
    };
  }

  function wireCond(r, wires, odd) {
    const cnt = wires.filter(w => w === r.c).length;
    switch (r.type) {
      case "none": return cnt === 0;
      case "many": return cnt >= 2;
      case "one": return cnt === 1;
      case "last": return wires[wires.length - 1] === r.c;
      case "first": return wires[0] === r.c;
      case "odd": return odd;
    }
    return false;
  }
  function wireAct(act, wires) {
    if (act.type === "pos") return act.k - 1;
    if (act.type === "last") return wires.length - 1;
    if (act.type === "lastOf") return wires.lastIndexOf(act.c);
    if (act.type === "firstOf") return wires.indexOf(act.c);
    return 0;
  }
  function solveWires(wires, set, odd) {
    for (const r of set.rules) if (wireCond(r, wires, odd)) {
      const i = wireAct(r.act, wires);
      if (i >= 0) return i;
    }
    return wireAct(set.other, wires);
  }
  function btnCond(r, b, odd) {
    if (r.type === "cl") return b.c === r.c && b.l === r.l;
    if (r.type === "l") return b.l === r.l;
    if (r.type === "c") return b.c === r.c;
    if (r.type === "even") return !odd;
    return false;
  }
  function solveButton(b, rules, other, odd) {
    for (const r of rules) if (btnCond(r, b, odd)) return r.act;
    return other;
  }

  // ---------- 설명서 문장 ----------
  const wireCondText = r => {
    const nm = r.c && WIRE[r.c].nm;
    return {
      none: `${nm} 선이 하나도 없으면`, many: `${nm} 선이 2개 이상이면`, one: `${nm} 선이 딱 1개면`,
      last: `마지막 선이 ${nm}색이면`, first: `첫 번째 선이 ${nm}색이면`, odd: `시리얼 번호 끝자리가 홀수면`,
    }[r.type];
  };
  const wireActText = a => ({
    pos: `${a.k}번째 선 자르기`, last: `마지막 선 자르기`,
    lastOf: `마지막 ${a.c && WIRE[a.c].nm} 선 자르기`, firstOf: `첫 번째 ${a.c && WIRE[a.c].nm} 선 자르기`,
  }[a.type]);
  const btnCondText = r => ({
    cl: `버튼이 ${BTN[r.c].nm}색이고 글자가 '${r.l}'이면`, l: `글자가 '${r.l}'이면`,
    c: `버튼이 ${BTN[r.c].nm}색이면`, even: `시리얼 번호 끝자리가 짝수면`,
  }[r.type]);
  const btnActText = a => a === "tap" ? "짧게 한 번 누르기" : "꾹 누르고 있기 → 아래 '손 떼는 규칙'";
  const fmt = sec => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  // ---------- 스타일 ----------
  const css = `
  .bm-wrap{padding:16px 18px 36px}
  .bm-h{font-family:'Noto Serif KR',serif;font-size:23px;text-align:center;margin:4px 0 8px}
  .bm-p{color:var(--sub);font-size:14px;line-height:1.65;white-space:pre-line}
  .bm-p b{color:var(--text)}
  .bm-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin:12px 0}
  .bm-role{text-align:center;border:1.5px solid var(--point);border-radius:16px;padding:16px;margin:12px 0;background:#2a2119}
  .bm-role .e{font-size:44px;line-height:1}
  .bm-role b{display:block;font-size:20px;color:var(--point);margin-top:6px}
  .bm-role small{display:block;color:var(--sub);font-size:13px;margin-top:4px;white-space:pre-line}
  .bm-dots{display:flex;justify-content:center;gap:6px;margin:6px 0 14px}
  .bm-dots i{width:7px;height:7px;border-radius:50%;background:var(--line)}
  .bm-dots i.on{background:var(--point)}
  .bm-nav{display:flex;gap:8px;margin-top:14px}
  .bm-nav .tr-btn{margin:0}
  .bm-li{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:1.5}
  .bm-li:last-child{border-bottom:0}
  .bm-li .n{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--line);color:var(--text);font-size:12px;text-align:center;line-height:22px}
  .bm-li .a{color:var(--point);font-weight:700}
  .bm-li.hl{background:#2a2119;border-radius:8px;padding-left:6px}
  .bm-hud{display:flex;justify-content:space-between;align-items:center;background:#0c0a09;border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:10px}
  .bm-time{font-family:ui-monospace,Menlo,monospace;font-size:30px;color:#ff5a4e;font-variant-numeric:tabular-nums;letter-spacing:.04em}
  .bm-time.warn{animation:bmBlink 1s steps(2) infinite}
  @keyframes bmBlink{50%{opacity:.35}}
  .bm-x{font-size:16px;letter-spacing:2px}
  .bm-serial{font-size:12px;color:var(--sub);text-align:right}
  .bm-serial b{display:block;font-family:ui-monospace,Menlo,monospace;font-size:17px;color:var(--text);letter-spacing:.1em}
  .bm-stage{display:flex;gap:6px;margin-bottom:10px}
  .bm-stage span{flex:1;text-align:center;font-size:12px;padding:6px 0;border-radius:8px;border:1px solid var(--line);color:var(--sub)}
  .bm-stage span.on{border-color:var(--point);color:var(--point)}
  .bm-stage span.ok{background:#1f3322;border-color:#3f7a46;color:#8fd096}
  .bm-opp{font-size:12px;color:var(--sub);text-align:center;margin:-2px 0 10px}
  .bm-mod{background:#26211d;border:2px solid #3a332d;border-radius:16px;padding:16px 14px;min-height:280px;position:relative}
  .bm-mod h4{font-size:14px;color:var(--sub);font-weight:500;margin-bottom:12px;text-align:center}
  .bm-wire{display:flex;align-items:center;gap:10px;margin:10px 0}
  .bm-wire .no{width:16px;color:var(--sub);font-size:13px;text-align:center}
  .bm-wire .ln{flex:1;height:14px;border-radius:7px;background:var(--wc);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);border:1px solid #55504a;position:relative}
  .bm-wire.cut .ln{background:linear-gradient(90deg,var(--wc) 44%,transparent 44%,transparent 56%,var(--wc) 56%)}
  .bm-wire button{flex-shrink:0;background:#3a332d;border:1px solid #57504a;color:var(--text);border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;cursor:pointer}
  .bm-wire.cut button{opacity:.3}
  .bm-syms{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .bm-sym{aspect-ratio:1.25;font-size:46px;background:#3a332d;border:2px solid #57504a;border-radius:14px;cursor:pointer;position:relative;font-family:inherit}
  .bm-sym.ok{border-color:#59b463;background:#1f3322}
  .bm-sym.ok::after{content:"✓";position:absolute;top:4px;right:8px;font-size:15px;color:#8fd096}
  .bm-btnwrap{display:flex;align-items:center;justify-content:center;gap:18px;padding:12px 0}
  .bm-big{width:170px;height:170px;border-radius:50%;border:6px solid #00000055;background:var(--bc);color:var(--bf);font-size:26px;font-weight:700;font-family:inherit;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;box-shadow:0 6px 0 #00000066}
  .bm-big.down{transform:translateY(4px);box-shadow:0 2px 0 #00000066}
  .bm-strip{width:22px;height:150px;border-radius:11px;background:#3a332d;border:1px solid #57504a;transition:background .15s}
  .bm-flash{position:absolute;inset:0;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;pointer-events:none}
  .bm-flash.ok{background:#1f3322ee;color:#8fd096;animation:bmIn .25s}
  .bm-flash.bad{background:#4a1b17ee;color:#ffb3a8;animation:bmShake .4s}
  @keyframes bmIn{from{opacity:0;transform:scale(.9)}to{opacity:1}}
  @keyframes bmShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
  .bm-tabs{display:flex;gap:6px;margin-bottom:10px}
  .bm-tabs button{flex:1;background:none;border:1px solid var(--line);color:var(--sub);border-radius:10px;padding:9px 0;font-size:13px;font-family:inherit;cursor:pointer}
  .bm-tabs button.on{border-color:var(--point);color:var(--point);background:#2a2119}
  .bm-man{background:#efe6d6;color:#2b2420;border-radius:14px;padding:14px 14px 16px}
  .bm-man h4{font-family:'Noto Serif KR',serif;font-size:17px;margin:4px 0 6px}
  .bm-man .tip{font-size:12px;background:#e2d5bf;border-radius:8px;padding:8px 10px;margin-bottom:8px;line-height:1.5}
  .bm-man .sec{font-weight:700;font-size:14px;margin:12px 0 2px;color:#7a4a1c}
  .bm-man .bm-li{border-color:#d8cab2;font-size:14px}
  .bm-man .bm-li .n{background:#d8cab2;color:#2b2420}
  .bm-man .bm-li .a{color:#a3471d}
  .bm-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
  .bm-col{background:#e2d5bf;border-radius:10px;padding:6px 0;text-align:center}
  .bm-col .t{font-size:11px;color:#7a6a55}
  .bm-col div{font-size:26px;line-height:1.45}
  .bm-mini{display:flex;flex-direction:column;gap:6px;margin:8px 0}
  .bm-mini .bm-wire{margin:3px 0}
  .bm-mini .bm-wire .ln{height:11px}
  .bm-qa{display:flex;gap:8px;margin-top:10px}
  .bm-qa button{flex:1;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:12px 0;font-size:16px;font-family:inherit;cursor:pointer}
  .bm-qa button.good{border-color:#59b463;color:#8fd096}
  .bm-qa button.bad{border-color:#e8584f;color:#ffb3a8}
  .bm-fb{font-size:13px;line-height:1.6;margin-top:8px;min-height:20px;white-space:pre-line}
  .bm-count{font-family:'Noto Serif KR',serif;font-size:80px;text-align:center;color:var(--point);margin:50px 0 10px}
  .bm-res{text-align:center;margin:10px 0 16px}
  .bm-res .e{font-size:60px;animation:bmIn .5s}
  .bm-res h2{font-family:'Noto Serif KR',serif;font-size:25px;margin-top:6px}
  .bm-team{display:flex;justify-content:space-between;align-items:center;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--tc);border-radius:12px;padding:12px 14px;margin-bottom:8px;font-size:14px}
  .bm-team small{display:block;color:var(--sub);font-size:12px}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- 로컬 상태 ----------
  let L = null;          // 이번 판 내 폰 상태
  let tutPage = 0, tutKey = "", hudTimer = 0, flashT = 0;
  const stopHud = () => { clearInterval(hudTimer); hudTimer = 0; clearTimeout(flashT); };

  // =====================================================
  // 방장: 진행
  // =====================================================
  const freshTeams = () => ({ A: { stage: 0, strikes: 0, status: "play", time: null }, B: { stage: 0, strikes: 0, status: "play", time: null } });

  function toTutorial(api, bombSeat, firstTime) {
    api.clearLater();
    api.update({ step: "tut", ready: {}, bombSeat, firstTime, gid: api.uid() });
  }

  function startPlay(api) {
    const g = api.g;
    api.clearLater();
    api.update({ ...g, step: "play", gid: api.uid(), seed: Math.floor(Math.random() * 2 ** 31), teams: freshTeams(), winner: null });
    const gid = api.g.gid;
    api.later(() => endGame(api, gid, true), COUNTDOWN + (TIME_SEC + 15) * 1000);
  }

  function endGame(api, gid, byTimeout) {
    const g = api.g;
    if (!g || g.step !== "play" || g.gid !== gid) return;
    api.clearLater();
    const teams = { ...g.teams };
    if (byTimeout) ["A", "B"].forEach(t => { if (teams[t].status === "play") teams[t] = { ...teams[t], status: "timeout" }; });
    api.update({ ...g, step: "end", teams });
  }

  function onAction(api, from, a) {
    const g = api.g;
    if (!g) return;
    if (a.t === "ready" && g.step === "tut") {
      const ready = { ...g.ready, [from]: true };
      if (api.seated().every(id => ready[id])) { api.update({ ...g, ready }); startPlay(api); }
      else api.update({ ...g, ready });
    } else if (a.t === "go" && from === api.me.id && g.step === "tut") {
      startPlay(api);
    } else if (a.t === "prog" && g.step === "play" && a.gid === g.gid) {
      const s = api.seatOf(from);
      if (!s || s.idx !== g.bombSeat) return;
      const cur = g.teams[s.team];
      if (cur.status !== "play") return;
      const status = ["play", "done", "boom", "timeout"].includes(a.status) ? a.status : "play";
      const t2 = {
        stage: Math.max(0, Math.min(3, a.stage | 0)), strikes: Math.max(0, Math.min(MAX_STRIKES, a.strikes | 0)),
        status, time: typeof a.time === "number" ? a.time : null,
      };
      const teams = { ...g.teams, [s.team]: t2 };
      let winner = g.winner;
      if (status === "done" && !winner) winner = s.team;
      const over = winner || ["A", "B"].every(t => teams[t].status !== "play");
      api.update({ ...g, teams, winner, step: over ? "end" : "play" });
      if (over) api.clearLater();
    } else if (a.t === "again" && from === api.me.id && g.step === "end") {
      toTutorial(api, 1 - g.bombSeat, false);
    }
  }

  // =====================================================
  // 화면
  // =====================================================
  const esc = s => window.TeamRoom.esc(s);
  const roleOf = (api, g, id = api.me.id) => { const s = api.seatOf(id); return s && s.idx === g.bombSeat ? "bomb" : "manual"; };
  const ROLE = {
    bomb: { e: "💣", nm: "폭탄 담당", d: "폭탄이 내 폰에 떠요. 보이는 걸 짝꿍에게 말로 설명하고\n짝꿍이 알려주는 대로 해체해요" },
    manual: { e: "📖", nm: "설명서 담당", d: "해체 설명서가 내 폰에 떠요. 폭탄은 못 봐요!\n짝꿍에게 질문해서 어떻게 할지 알려주세요" },
  };

  function render(api) {
    const g = api.g;
    if (!g) return;
    if (g.step === "tut") return showTut(api, g);
    if (g.step === "play") return showPlay(api, g);
    if (g.step === "end") return showEnd(api, g);
  }

  function paint(api, key, html) {
    api.screen = key;
    api.root.innerHTML = api.banner() + `<div class="bm-wrap">${html}${api.footer()}</div>`;
    api.bindFooter();
  }

  // ---------- 설명서 (게임 전 튜토리얼) ----------
  const TUT_PAGES = 6;
  function showTut(api, g, force) {
    stopHud();
    if (tutKey !== g.gid) { tutKey = g.gid; tutPage = g.firstTime ? 0 : -1; force = true; }
    const role = roleOf(api, g);
    const partner = api.partnerOf(api.me.id);
    const ready = !!g.ready[api.me.id];
    const n = api.seated().filter(id => g.ready[id]).length;
    // 준비 버튼이 없는 페이지는 다른 사람이 준비해도 다시 그리지 않음 (연습 문제 유지)
    const hasReady = tutPage === -1 || tutPage === TUT_PAGES - 1;
    const pkey = "tut:" + g.gid + ":" + tutPage + (hasReady ? ":" + n + ":" + ready : "");
    if (!force && api.screen === pkey) return;
    const roleCard = `<div class="bm-role"><div class="e">${ROLE[role].e}</div><b>이번 판 나는 ${ROLE[role].nm}</b><small>${ROLE[role].d}</small><small style="margin-top:8px">짝꿍: ${api.tag(partner)} (${ROLE[role === "bomb" ? "manual" : "bomb"].nm})</small></div>`;
    const readyBox = `
      <div class="sy-status" style="display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:14px">${api.seated().map(id => `<span class="tr-chip" style="--tc:${g.ready[id] ? api.TEAMS[api.teamOf(id)].color : "var(--line)"}">${g.ready[id] ? "✓ " : ""}${esc(api.nameOf(id))}</span>`).join("")}</div>
      <button class="tr-btn primary" id="bm-ready" style="margin-top:14px" ${ready ? "disabled" : ""}>${ready ? `준비 완료 ✓ (${n}/4)` : "이해했어요, 준비 완료!"}</button>
      ${api.isHost ? `<button class="tr-btn ghost" id="bm-go">기다리지 않고 바로 시작</button>` : ""}
      <p class="bm-p" style="text-align:center;font-size:12px;margin-top:6px">4명 모두 준비되면 3·2·1 후 바로 시작해요</p>`;

    let body = "";
    if (tutPage === -1) {          // 두 번째 판부터: 역할 안내만
      body = `<h2 class="bm-h">역할 바꿔서 한 판 더!</h2>${roleCard}
        <button class="tr-btn small" id="bm-replay">📖 설명 처음부터 다시 보기</button>${readyBox}`;
    } else {
      const dots = `<div class="bm-dots">${Array.from({ length: TUT_PAGES }, (_, i) => `<i class="${i === tutPage ? "on" : ""}"></i>`).join("")}</div>`;
      const pages = [
        () => `<h2 class="bm-h">💣 폭탄 해체 설명서</h2>
          <p class="bm-p" style="text-align:center">팀마다 폭탄이 1개씩 있어요.\n한 명은 <b>폭탄</b>만, 한 명은 <b>설명서</b>만 볼 수 있어요.\n둘이 <b>말로만</b> 주고받아서 폭탄을 해체하는 게임이에요!</p>
          ${roleCard}
          <div class="bm-card bm-p">🙅 <b>폰 화면을 서로 보여주면 안 돼요!</b>\n보여주는 순간 반칙이에요. 오직 말로만!</div>`,
        () => `<h2 class="bm-h">게임 진행</h2>
          <div class="bm-card">
            <div class="bm-li"><span class="n">1</span><div>폭탄은 <b>3단계</b>예요<br><span style="color:var(--sub)">✂️ 선 자르기 → 🔣 기호 누르기 → 🔴 버튼</span></div></div>
            <div class="bm-li"><span class="n">2</span><div>제한 시간은 <b>${Math.floor(TIME_SEC / 60)}분</b>이에요</div></div>
            <div class="bm-li"><span class="n">3</span><div>틀리면 실수 ❌ 1개. <b>${MAX_STRIKES}번 틀리면 펑!</b> 💥</div></div>
            <div class="bm-li"><span class="n">4</span><div>두 팀이 <b>똑같은 폭탄</b>을 동시에 풀어요. <b>먼저 해체한 팀 승리!</b></div></div>
            <div class="bm-li"><span class="n">5</span><div>설명서는 판마다 바뀌어요. 외워도 소용없어요 😏</div></div>
          </div>
          <p class="bm-p" style="text-align:center">다음 장부터 단계별로 연습해 볼게요 👉</p>`,
        () => {
          const ex = ["r", "b", "b", "y"];
          return `<h2 class="bm-h">✂️ 1단계 · 선 자르기</h2>
          <p class="bm-p">폭탄에 선이 3~5개 있어요. 설명서에는 <b>선 개수별 규칙</b>이 있어요.\n규칙을 <b>위에서부터</b> 확인해서, <b>처음으로 맞는 규칙 하나만</b> 따르면 돼요.</p>
          <div class="bm-card"><div style="font-size:12px;color:var(--sub);margin-bottom:4px">💣 연습 폭탄 (선 4개)</div>
            <div class="bm-mini">${ex.map((c, i) => `<div class="bm-wire" style="--wc:${WIRE[c].hex}"><span class="no">${i + 1}</span><div class="ln"></div></div>`).join("")}</div></div>
          <div class="bm-man"><h4>📖 선이 4개일 때</h4>
            <div class="bm-li"><span class="n">1</span><div>빨간 선이 하나도 없으면 → <span class="a">2번째 선 자르기</span></div></div>
            <div class="bm-li"><span class="n">2</span><div>마지막 선이 노란색이면 → <span class="a">첫 번째 선 자르기</span></div></div>
            <div class="bm-li"><span class="n">3</span><div>파란 선이 2개 이상이면 → <span class="a">마지막 파란 선 자르기</span></div></div>
            <div class="bm-li"><span class="n">4</span><div>그 외 → <span class="a">마지막 선 자르기</span></div></div></div>
          <p class="bm-p" style="margin-top:12px"><b>문제!</b> 몇 번째 선을 잘라야 할까요?</p>
          <div class="bm-qa" id="bm-qa">${[1, 2, 3, 4].map(k => `<button data-k="${k}">${k}번</button>`).join("")}</div>
          <div class="bm-fb" id="bm-fb"></div>`;
        },
        () => {
          const cols = [["🍀", "🎈", "🐟", "⚓", "🔔", "🍄"], ["🔑", "🐟", "🌙", "🍀", "🎲", "⭐"], ["🎩", "⭐", "🍀", "🌙", "🐟", "🎈"]];
          const shown = ["⭐", "🐟", "🔑", "🌙"];
          return `<h2 class="bm-h">🔣 2단계 · 기호 누르기</h2>
          <p class="bm-p">폭탄에 기호 버튼 4개가 있어요. 설명서에는 기호가 적힌 <b>세로줄 4개</b>가 있어요.\n① 폭탄의 기호 4개가 <b>모두 들어있는 줄</b>을 찾고\n② 그 줄의 <b>위에서 아래 순서대로</b> 누르면 돼요.</p>
          <div class="bm-man"><h4>📖 연습 설명서</h4>
            <div class="bm-cols" style="grid-template-columns:repeat(3,1fr)">${cols.map((c, i) => `<div class="bm-col"><span class="t">${i + 1}줄</span>${c.map(s => `<div>${s}</div>`).join("")}</div>`).join("")}</div></div>
          <p class="bm-p" style="margin-top:12px"><b>직접 눌러보세요!</b> 아래 연습 폭탄을 올바른 순서로</p>
          <div class="bm-syms" id="bm-psyms" style="margin-top:8px">${shown.map(s => `<button class="bm-sym" data-s="${s}" style="font-size:38px">${s}</button>`).join("")}</div>
          <div class="bm-fb" id="bm-fb"></div>`;
        },
        () => `<h2 class="bm-h">🔴 3단계 · 버튼</h2>
          <p class="bm-p">큰 버튼이 하나 있어요. 설명서에서 버튼 <b>색깔·글자</b>에 맞는 규칙을 찾으면\n<b>짧게 한 번 누르기</b> 또는 <b>꾹 누르고 있기</b> 중 하나가 나와요.</p>
          <div class="bm-card bm-p">꾹 누르면 버튼 옆에 <b>색깔 띠</b>가 켜져요.\n폭탄 담당은 띠 색을 말하고, 설명서 담당은 <b>"손 떼는 규칙"</b>을 보고\n"타이머에 <b>숫자 ○</b>가 보일 때 떼세요!"라고 알려주면 돼요.</div>
          <div class="bm-man"><h4>📖 연습: 손 떼는 규칙</h4>
            <div class="bm-li"><span class="n">·</span><div>띠가 노란색이면 → <span class="a">타이머에 5가 보일 때 떼기</span></div></div>
            <div class="bm-li"><span class="n">·</span><div>그 외 → <span class="a">타이머에 1이 보일 때 떼기</span></div></div></div>
          <p class="bm-p" style="margin-top:12px"><b>직접 해보세요!</b> 버튼을 꾹 누르고, 타이머에 <b>5</b>가 보일 때 손을 떼요</p>
          <div style="text-align:center"><span class="bm-time" id="bm-ptime" style="font-size:26px">0:49</span></div>
          <div class="bm-btnwrap"><button class="bm-big" id="bm-pbtn" style="--bc:${BTN.b.hex};--bf:#fff;width:130px;height:130px;font-size:20px">멈춰</button><div class="bm-strip" id="bm-pstrip" style="height:120px"></div></div>
          <div class="bm-fb" id="bm-fb" style="text-align:center"></div>`,
        () => `<h2 class="bm-h">마지막 꿀팁 🍯</h2>
          <div class="bm-card">
            <div class="bm-li"><span class="n">💣</span><div><b>폭탄 담당</b>은 보이는 걸 전부 말해주세요<br><span style="color:var(--sub)">"선 4개, 위에서부터 빨강·파랑·파랑·노랑!"</span></div></div>
            <div class="bm-li"><span class="n">📖</span><div><b>설명서 담당</b>은 먼저 질문하세요<br><span style="color:var(--sub)">"선 몇 개예요?" "시리얼 번호 끝자리는요?"</span></div></div>
            <div class="bm-li"><span class="n">🔢</span><div>시리얼 번호는 폭탄 화면 오른쪽 위에 있어요</div></div>
            <div class="bm-li"><span class="n">📑</span><div>설명서는 지금 단계 페이지가 자동으로 펼쳐져요</div></div>
            <div class="bm-li"><span class="n">😆</span><div>옆 팀 목소리에 헷갈려도 그게 재미! 틀려도 괜찮아요</div></div>
          </div>
          ${roleCard}${readyBox}`,
      ];
      body = dots + pages[tutPage]() + (tutPage < TUT_PAGES - 1 ? `
        <div class="bm-nav">${tutPage > 0 ? `<button class="tr-btn small" id="bm-prev" style="flex:1">← 이전</button>` : ""}
          <button class="tr-btn primary" id="bm-next" style="flex:2">${tutPage === 0 ? "설명 시작 →" : "다음 →"}</button></div>`
        : `<div class="bm-nav"><button class="tr-btn small" id="bm-prev" style="flex:1">← 이전</button></div>`);
    }
    paint(api, pkey, body);

    const rd = api.$("#bm-ready"); if (rd) rd.onclick = () => api.send({ t: "ready" });
    const go = api.$("#bm-go"); if (go) go.onclick = () => api.send({ t: "go" });
    const nx = api.$("#bm-next"); if (nx) nx.onclick = () => { tutPage++; showTut(api, api.g, true); window.scrollTo(0, 0); };
    const pv = api.$("#bm-prev"); if (pv) pv.onclick = () => { tutPage--; showTut(api, api.g, true); window.scrollTo(0, 0); };
    const rp = api.$("#bm-replay"); if (rp) rp.onclick = () => { tutPage = 0; showTut(api, api.g, true); window.scrollTo(0, 0); };
    bindPractice(api);
  }

  function bindPractice(api) {
    const fb = api.$("#bm-fb");
    // 1단계 연습
    const qa = api.$("#bm-qa");
    if (qa) qa.querySelectorAll("button").forEach(b => b.onclick = () => {
      const k = +b.dataset.k;
      qa.querySelectorAll("button").forEach(x => x.className = "");
      b.className = k === 1 ? "good" : "bad";
      fb.innerHTML = k === 1
        ? `✅ <b>정답!</b> 1번 규칙은 해당 없음 (빨간 선이 있으니까)\n→ 2번 규칙 해당! 마지막 선이 노란색 → <b>첫 번째 선</b>\n3번 규칙도 맞지만, <b>먼저 맞은 규칙 하나만</b> 적용해요`
        : `❌ 아쉬워요! 위에서부터 하나씩 확인해 보세요.\n1번: 빨간 선이 있으니 해당 없음 → 2번: 마지막 선이 노란색? 👀`;
    });
    // 2단계 연습
    const ps = api.$("#bm-psyms");
    if (ps) {
      const order = ["🔑", "🐟", "🌙", "⭐"];
      let step = 0;
      ps.querySelectorAll(".bm-sym").forEach(b => b.onclick = () => {
        if (step >= 4 || b.classList.contains("ok")) return;
        if (b.dataset.s === order[step]) {
          b.classList.add("ok"); step++;
          fb.innerHTML = step === 4 ? `✅ <b>완벽해요!</b> ⭐🐟🔑🌙가 모두 있는 건 <b>2줄</b>뿐!\n그래서 2줄의 위→아래 순서 🔑 → 🐟 → 🌙 → ⭐` : `좋아요! ${step}/4`;
        } else {
          fb.innerHTML = `❌ 그 순서가 아니에요. 4개가 <b>모두</b> 들어있는 줄이 어디일까요? (1줄엔 ⭐이 없어요)`;
        }
      });
    }
    // 3단계 연습 (꾹 누르기)
    const pb = api.$("#bm-pbtn");
    if (pb) {
      const tEl = api.$("#bm-ptime"), strip = api.$("#bm-pstrip");
      let sec = 49, down = 0, holding = false, done = false;
      const iv = setInterval(() => {
        if (!tEl.isConnected) return clearInterval(iv);
        sec = sec <= 30 ? 49 : sec - 1;
        tEl.textContent = `0:${String(sec).padStart(2, "0")}`;
      }, 1000);
      const hold = () => { if (!down || holding) return; holding = true; strip.style.background = BTN.y.hex; };
      pb.oncontextmenu = e => e.preventDefault();
      pb.onpointerdown = e => {
        e.preventDefault(); if (done) return;
        down = performance.now(); pb.classList.add("down");
        try { pb.setPointerCapture(e.pointerId); } catch (x) {}
        setTimeout(hold, HOLD_MS);
      };
      const up = () => {
        if (!down) return;
        const held = holding;
        down = 0; holding = false; pb.classList.remove("down"); strip.style.background = "";
        if (!held) { fb.innerHTML = "짧게 눌렀어요! 이번엔 <b>꾹</b> 누르고 있어 보세요"; return; }
        if (tEl.textContent.includes("5")) { done = true; fb.innerHTML = `✅ <b>성공!</b> ${tEl.textContent}에 5가 있었어요\n실전에서도 이렇게 하면 돼요`; }
        else fb.innerHTML = `❌ ${tEl.textContent}에는 5가 없어요. 다시 꾹 눌러보세요`;
      };
      pb.onpointerup = up; pb.onpointercancel = up;
    }
  }

  // ---------- 게임 화면 ----------
  function ensureLocal(api, g) {
    if (L && L.gid === g.gid) return L;
    stopHud();
    L = {
      gid: g.gid, bomb: makeBomb(g.seed), t0: performance.now() + COUNTDOWN,
      stage: 0, strikes: 0, ended: false, cut: [], symStep: 0, symOk: [], tab: 0, lastStage: -1, lastStrikes: 0,
      busy: false, painted: "",
    };
    return L;
  }

  const remain = () => TIME_SEC - (performance.now() - L.t0) / 1000;
  const myTeam = api => api.teamOf(api.me.id);
  const opp = t => t === "A" ? "B" : "A";

  function oppLine(api, g) {
    const o = opp(myTeam(api)), ot = g.teams[o];
    const st = ot.status === "play" ? `${Math.min(3, ot.stage + 1)}단계 진행 중 · 실수 ${ot.strikes}` : ot.status === "done" ? "해체 성공!" : "💥 펑!";
    return `상대 ${api.teamTag(o)} : ${st}`;
  }
  const stageBar = stage => `<div class="bm-stage">${["✂️ 선", "🔣 기호", "🔴 버튼"].map((s, i) => `<span class="${i < stage ? "ok" : i === stage ? "on" : ""}">${s}</span>`).join("")}</div>`;
  const xs = n => "❌".repeat(n) + "⬜".repeat(Math.max(0, MAX_STRIKES - n));

  function showPlay(api, g) {
    ensureLocal(api, g);
    const role = roleOf(api, g);
    const key = "play:" + g.gid;
    if (api.screen === key) { patchPlay(api, g, role); return; }
    api.screen = key;
    if (!hudTimer) hudTimer = setInterval(() => tick(api), 200);
    tick(api, true);
  }

  // 3·2·1 → 본 화면
  function tick(api, force) {
    const g = api.g;
    if (!api.root || !g || g.step !== "play" || g.gid !== L.gid) { stopHud(); return; }
    const role = roleOf(api, g);
    const pre = performance.now() < L.t0;
    const mode = pre ? "count" : role;
    if (force || L.painted !== mode) {
      L.painted = mode;
      if (pre) {
        paint(api, api.screen, `${ROLE[role].e ? `<div class="bm-role"><div class="e">${ROLE[role].e}</div><b>나는 ${ROLE[role].nm}</b><small>짝꿍: ${api.tag(api.partnerOf(api.me.id))}</small></div>` : ""}<div class="bm-count" id="bm-cd">3</div><p class="bm-p" style="text-align:center">곧 시작해요! 폰 화면은 나만 보기 🙈</p>`);
      } else if (role === "bomb") paintBomb(api, g);
      else paintManual(api, g);
    }
    if (pre) { const c = api.$("#bm-cd"); if (c) c.textContent = Math.ceil((L.t0 - performance.now()) / 1000); return; }
    const r = remain();
    const te = api.$("#bm-time");
    if (te) { te.textContent = fmt(r); te.classList.toggle("warn", r < 30); }
    if (role === "bomb" && !L.ended && r <= 0) finish(api, "timeout");
  }

  function patchPlay(api, g, role) {
    const o = api.$("#bm-opp"); if (o) o.innerHTML = oppLine(api, g);
    if (role === "manual" && L.painted === "manual") {
      const me = g.teams[myTeam(api)];
      const x = api.$("#bm-x"); if (x) x.textContent = xs(me.strikes);
      if (me.strikes > L.lastStrikes) { L.lastStrikes = me.strikes; api.vibrate([80, 60, 80]); flash(api, "bad", `❌ 실수! (${me.strikes}/${MAX_STRIKES})`); }
      if (me.stage !== L.lastStage) {
        const prev = L.lastStage;
        L.lastStage = me.stage; L.tab = Math.min(2, me.stage);
        if (prev >= 0 && me.stage > prev) flash(api, "ok", me.stage >= 3 ? "🎉 해체 성공!" : `✅ ${me.stage}단계 해체! 다음 페이지로`);
        renderManualPage(api);
      }
    }
  }

  function flash(api, kind, text) {
    const host = api.$(".bm-mod") || api.$(".bm-man");
    if (!host) return;
    host.style.position = "relative";
    const el = document.createElement("div");
    el.className = "bm-flash " + kind; el.textContent = text;
    host.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  function hud(api, withSerial) {
    return `<div class="bm-hud"><div><span class="bm-time" id="bm-time">${fmt(remain())}</span><div class="bm-x" id="bm-x">${xs(L.strikes)}</div></div>
      ${withSerial ? `<div class="bm-serial">시리얼 번호<b>${L.bomb.serial}</b></div>` : `<div class="bm-serial">📖 설명서<b style="font-size:13px;letter-spacing:0">${esc(api.nameOf(api.partnerOf(api.me.id)))}님께 질문!</b></div>`}</div>`;
  }

  // ---------- 폭탄 담당 ----------
  function paintBomb(api, g) {
    if (L.ended) { paint(api, api.screen, `<div class="bm-res"><div class="e">${L.endEmoji}</div><h2>${L.endText}</h2><p class="bm-p">상대 팀을 기다리는 중…</p></div><p class="bm-opp" id="bm-opp">${oppLine(api, g)}</p>`); return; }
    paint(api, api.screen, `${hud(api, true)}<div id="bm-sbar">${stageBar(L.stage)}</div><p class="bm-opp" id="bm-opp">${oppLine(api, g)}</p><div class="bm-mod" id="bm-mod"></div>`);
    renderModule(api);
  }

  function renderModule(api) {
    const m = api.$("#bm-mod");
    if (!m) return;
    const B = L.bomb;
    if (L.stage === 0) {
      m.innerHTML = `<h4>✂️ 선 자르기 — 짝꿍에게 선 색깔을 말해주세요</h4>
        ${B.wire.wires.map((c, i) => `<div class="bm-wire${L.cut.includes(i) ? " cut" : ""}" style="--wc:${WIRE[c].hex}"><span class="no">${i + 1}</span><div class="ln"></div><button data-i="${i}">자르기</button></div>`).join("")}`;
      m.querySelectorAll(".bm-wire button").forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        if (L.busy || L.cut.includes(i)) return;
        L.cut.push(i);
        b.closest(".bm-wire").classList.add("cut");
        if (i === B.wire.ans) solved(api); else strike(api);
      });
    } else if (L.stage === 1) {
      m.innerHTML = `<h4>🔣 기호 누르기 — 기호 4개를 말해주세요</h4>
        <div class="bm-syms">${B.sym.shown.map(s => `<button class="bm-sym${L.symOk.includes(s) ? " ok" : ""}" data-s="${s}">${s}</button>`).join("")}</div>`;
      m.querySelectorAll(".bm-sym").forEach(b => b.onclick = () => {
        const s = b.dataset.s;
        if (L.busy || L.symOk.includes(s)) return;
        if (s === B.sym.order[L.symStep]) {
          L.symOk.push(s); L.symStep++; b.classList.add("ok"); api.vibrate(20);
          if (L.symStep >= 4) solved(api);
        } else strike(api);
      });
    } else if (L.stage === 2) {
      const bt = B.btn;
      m.innerHTML = `<h4>🔴 버튼 — 색깔과 글자를 말해주세요</h4>
        <div class="bm-btnwrap"><button class="bm-big" id="bm-big" style="--bc:${BTN[bt.c].hex};--bf:${BTN[bt.c].fg}">${bt.l}</button><div class="bm-strip" id="bm-strip"></div></div>
        <p class="bm-p" style="text-align:center;font-size:12px">짧게 누르기 또는 꾹 누르고 있기<br>꾹 누르면 옆에 띠 색이 켜져요</p>`;
      bindBigButton(api);
    }
  }

  function bindBigButton(api) {
    const b = api.$("#bm-big"), strip = api.$("#bm-strip");
    const bt = L.bomb.btn;
    let down = 0, holding = false, ht = 0;
    b.oncontextmenu = e => e.preventDefault();
    b.onpointerdown = e => {
      e.preventDefault();
      if (L.busy || L.ended) return;
      down = performance.now(); b.classList.add("down");
      try { b.setPointerCapture(e.pointerId); } catch (x) {}
      ht = setTimeout(() => { if (down) { holding = true; strip.style.background = BTN[bt.sc].hex; api.vibrate(30); } }, HOLD_MS);
    };
    const up = () => {
      if (!down) return;
      clearTimeout(ht);
      const held = holding;
      down = 0; holding = false; b.classList.remove("down"); strip.style.background = "";
      if (L.busy || L.ended) return;
      if (bt.act === "tap") { if (!held) solved(api); else strike(api); return; }
      if (!held) { strike(api); return; }
      if (fmt(remain()).includes(String(bt.digit))) solved(api); else strike(api);
    };
    b.onpointerup = up; b.onpointercancel = up;
  }

  function sendProg(api, status) {
    api.send({ t: "prog", gid: L.gid, stage: L.stage, strikes: L.strikes, status, time: status === "done" ? Math.round((TIME_SEC - remain()) * 10) / 10 : null });
  }

  function solved(api) {
    L.busy = true;
    api.vibrate(60);
    L.stage++;
    if (L.stage >= 3) { finish(api, "done"); return; }
    sendProg(api, "play");
    flash(api, "ok", `✅ ${L.stage}단계 해체!`);
    const sb = api.$("#bm-sbar"); if (sb) sb.innerHTML = stageBar(L.stage);
    flashT = setTimeout(() => { L.busy = false; renderModule(api); }, 1000);
  }

  function strike(api) {
    L.strikes++;
    api.vibrate([100, 60, 100]);
    const x = api.$("#bm-x"); if (x) x.textContent = xs(L.strikes);
    if (L.strikes >= MAX_STRIKES) { finish(api, "boom"); return; }
    sendProg(api, "play");
    flash(api, "bad", `❌ 실수! (${L.strikes}/${MAX_STRIKES})`);
  }

  function finish(api, status) {
    if (L.ended) return;
    L.ended = true; L.busy = true;
    sendProg(api, status);
    L.endEmoji = status === "done" ? "🎉" : status === "boom" ? "💥" : "⏰";
    L.endText = status === "done" ? "해체 성공!" : status === "boom" ? "펑! 폭탄이 터졌어요" : "시간 초과!";
    if (status !== "done") api.vibrate([300, 100, 300]);
    if (api.g && api.g.step === "play") paintBomb(api, api.g);
  }

  // ---------- 설명서 담당 ----------
  function paintManual(api, g) {
    const me = g.teams[myTeam(api)];
    L.lastStage = me.stage; L.lastStrikes = me.strikes; L.tab = Math.min(2, me.stage);
    paint(api, api.screen, `${hud(api, false)}<p class="bm-opp" id="bm-opp">${oppLine(api, g)}</p>
      <div class="bm-tabs" id="bm-tabs">${["✂️ 선 자르기", "🔣 기호", "🔴 버튼"].map((t, i) => `<button data-i="${i}">${t}</button>`).join("")}</div>
      <div class="bm-man" id="bm-man"></div>`);
    const x = api.$("#bm-x"); if (x) x.textContent = xs(me.strikes);
    api.root.querySelectorAll("#bm-tabs button").forEach(b => b.onclick = () => { L.tab = +b.dataset.i; renderManualPage(api); });
    renderManualPage(api);
  }

  function renderManualPage(api) {
    const m = api.$("#bm-man");
    if (!m) return;
    const done = (api.g && api.g.teams[myTeam(api)].stage) || 0;
    api.root.querySelectorAll("#bm-tabs button").forEach((b, i) => {
      b.classList.toggle("on", i === L.tab);
      b.textContent = (i < done ? "✅ " : "") + ["✂️ 선 자르기", "🔣 기호", "🔴 버튼"][i].replace(i < done ? /^\S+ / : /^$/, "");
    });
    const B = L.bomb;
    const li = (n, cond, act) => `<div class="bm-li"><span class="n">${n}</span><div>${cond} → <span class="a">${act}</span></div></div>`;
    if (L.tab === 0) {
      m.innerHTML = `<h4>✂️ 선 자르기</h4>
        <div class="tip">💬 먼저 "선 몇 개예요? 색깔을 위에서부터 말해주세요!"<br>👉 해당하는 개수의 규칙을 <b>위에서부터</b> 확인, <b>처음 맞는 규칙 하나만!</b></div>
        ${[3, 4, 5].map(n => `<div class="sec">선이 ${n}개일 때</div>
          ${B.wire.rules[n].rules.map((r, i) => li(i + 1, wireCondText(r), wireActText(r.act))).join("")}
          ${li(B.wire.rules[n].rules.length + 1, "그 외", wireActText(B.wire.rules[n].other))}`).join("")}`;
    } else if (L.tab === 1) {
      m.innerHTML = `<h4>🔣 기호 누르기</h4>
        <div class="tip">💬 "기호 4개가 뭐예요?"<br>👉 4개가 <b>모두</b> 들어있는 줄을 찾아서, 그 줄의 <b>위 → 아래 순서</b>대로 누르라고 알려주세요</div>
        <div class="bm-cols">${B.sym.cols.map((c, i) => `<div class="bm-col"><span class="t">${i + 1}줄</span>${c.map(s => `<div>${s}</div>`).join("")}</div>`).join("")}</div>`;
    } else {
      m.innerHTML = `<h4>🔴 버튼</h4>
        <div class="tip">💬 "버튼 색깔이랑 글자가 뭐예요?"<br>👉 규칙을 <b>위에서부터</b> 확인, 처음 맞는 규칙 하나만!</div>
        ${B.btn.rules.map((r, i) => li(i + 1, btnCondText(r), btnActText(r.act))).join("")}
        ${li(B.btn.rules.length + 1, "그 외", btnActText(B.btn.other))}
        <div class="sec">✋ 손 떼는 규칙 (꾹 누르고 있을 때)</div>
        <div class="tip" style="margin-top:4px">💬 "띠가 무슨 색이에요?" → 타이머(남은 시간)에 그 숫자가 <b>보이는 순간</b> 떼라고 알려주세요</div>
        ${Object.keys(BTN).map(c => li("·", `띠가 ${BTN[c].nm}색이면`, `타이머에 ${B.btn.map[c]}가 보일 때 떼기`)).join("")}`;
    }
  }

  // ---------- 결과 ----------
  function showEnd(api, g) {
    const key = "end:" + g.gid;
    if (api.screen === key) return;
    stopHud();
    const mine = myTeam(api);
    const w = g.winner;
    const st = t => {
      const x = g.teams[t];
      if (x.status === "done") return `🎉 해체 성공${x.time != null ? ` · ${fmt(x.time)} 걸림` : ""}`;
      if (x.status === "boom") return "💥 펑! (실수 3번)";
      if (x.status === "timeout") return "⏰ 시간 초과";
      return `${Math.min(3, x.stage + 1)}단계에서 멈춤`;
    };
    const title = w ? (w === mine ? "우리 팀 승리! 🎉" : `${api.TEAMS[w].name} 승리!`) : "둘 다 펑… 무승부 💥";
    const B = makeBomb(g.seed);
    paint(api, key, `
      <div class="bm-res"><div class="e">${w ? (w === mine ? "🏆" : "👏") : "💥"}</div><h2>${title}</h2>
        ${w ? `<p class="bm-p">${api.teamTag(w)} ${g.teams[w].time != null ? `${fmt(g.teams[w].time)} 만에 해체!` : ""}</p>` : ""}</div>
      ${["A", "B"].map(t => `<div class="bm-team" style="--tc:${api.TEAMS[t].color}"><div>${api.teamTag(t)}<small>${api.state.seats[t].map(id => `${esc(api.nameOf(id))}(${roleOf(api, g, id) === "bomb" ? "💣" : "📖"})`).join(" · ")}</small></div><div style="text-align:right">${st(t)}<small>실수 ${g.teams[t].strikes}/${MAX_STRIKES}</small></div></div>`).join("")}
      <div class="bm-card bm-p" style="font-size:13px"><b>🔍 이번 폭탄 정답</b>
✂️ ${B.wire.ans + 1}번째 선  ·  🔣 ${B.sym.order.join(" → ")}
🔴 ${B.btn.act === "tap" ? "짧게 누르기" : `꾹 누르고 타이머에 ${B.btn.digit}가 보일 때 떼기`}</div>
      ${api.isHost ? `<button class="tr-btn primary" id="bm-again">역할 바꿔서 한 판 더!</button>` : `<p class="bm-p" style="text-align:center">방장이 다음 판(역할 교대)을 시작할 수 있어요</p>`}`);
    const ag = api.$("#bm-again"); if (ag) ag.onclick = () => api.send({ t: "again" });
  }

  // =====================================================
  const game = {
    ns: "mullae-bomb/v1", emoji: "💣", title: "폭탄 해체",
    sub: "2:2 협동 게임! 한 명은 폭탄, 한 명은 설명서\n말로만 주고받아 먼저 해체한 팀이 승리",
    seatLabels: SEAT_LABELS,
    seatHint: SEAT_LABELS[0] ? `팀마다 ${SEAT_LABELS[0]}·${SEAT_LABELS[1]} 한 명씩 앉아주세요 · 빈 자리를 누르면 이동` : "빈 자리를 누르면 자리를 옮길 수 있어요",
    start: api => toTutorial(api, 0, true),
    onAction, render,
    onLeave: () => { stopHud(); L = null; tutKey = ""; },
  };

  let inst = null;
  (window.GameModules = window.GameModules || {}).bomb = {
    mount(el, ctx) {
      el.innerHTML = `<p class="game-loading">💣 불러오는 중…</p>`;
      loadJs("team-room.js", () => !!window.TeamRoom).then(() => {
        if (!el.isConnected) return;
        inst = window.TeamRoom.create(game);
        inst.mount(el, ctx);
      }).catch(() => { el.innerHTML = `<p class="game-loading">게임을 불러오지 못했어요. 새로고침해 주세요</p>`; });
    },
    unmount() { if (inst) inst.unmount(); inst = null; stopHud(); },
    _makeBomb: seed => makeBomb(seed),   // 테스트용
    _g: () => inst && inst.api.g,          // 테스트용
  };
})();
