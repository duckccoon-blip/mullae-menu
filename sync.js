// =====================================================
// 💞 통했나? — 처음 만난 4명이 2:2로 하는 취향 싱크로 + 타이밍 게임
// 질문은 sync-q.js 에서 추가·수정 (이 파일은 아래 설정 숫자만 바꿔도 돼요)
// =====================================================
(() => {
  // ===== 설정 =====
  const Q_PER_ROUND = 5;            // 라운드당 취향 질문 수
  const ROUNDS = 2;                 // 라운드 수 (파트너 체인지 켜면 라운드마다 짝이 바뀜)
  const ANSWER_SEC = 20;            // 질문당 답하는 시간(초)
  const COMBO_RATE = 0.3;           // 자동 조합 질문 비율 (0~1)
  const TIMING_TARGETS = [5, 7, 7.7, 8, 10, 10, 12.3, 15];   // 타이밍 게임 목표(초)
  const SEAT_LABELS = ["남", "여"]; // 대기실 자리 이름 (["", ""] 이면 표시 안 함)
  const PREDICT_AT = 3;             // 라운드에서 몇 번째 문제를 '파트너 예측'으로 (0부터, -1이면 안 함)

  const V = "?v=" + Date.now().toString().slice(0, 8);
  const loadJs = (src, ready) => new Promise((ok, fail) => {
    if (ready()) return ok();
    const s = document.createElement("script");
    s.src = src + V; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });

  const css = `
  .sy-wrap{padding:18px 20px 36px}
  .sy-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--sub);margin-bottom:8px}
  .sy-bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-bottom:22px}
  .sy-bar i{display:block;height:100%;background:var(--point);border-radius:3px}
  .sy-q{font-family:'Noto Serif KR',serif;font-size:clamp(21px,6vw,26px);text-align:center;line-height:1.4;margin:6px 0 8px;word-break:keep-all}
  .sy-qsub{text-align:center;color:var(--point);font-size:14px;margin-bottom:18px;min-height:21px}
  .sy-opts{display:grid;gap:10px}
  .sy-opt{display:block;width:100%;background:var(--card);border:1.5px solid var(--line);color:var(--text);border-radius:14px;padding:17px 14px;font-size:18px;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;word-break:keep-all}
  .sy-opt.sel{border-color:var(--point);background:#2a2119;color:var(--point);font-weight:700}
  .sy-status{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-top:22px}
  .sy-who{font-size:12px;border:1px solid var(--line);border-radius:20px;padding:3px 10px;color:var(--sub)}
  .sy-who.ok{border-color:var(--tc);color:var(--tc)}
  .sy-note{color:var(--sub);font-size:13px;text-align:center;margin-top:12px;white-space:pre-line}
  .sy-h{font-family:'Noto Serif KR',serif;font-size:24px;text-align:center;margin:4px 0 6px}
  .sy-rules{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px 16px;margin:16px 0}
  .sy-rule{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);font-size:14px}
  .sy-rule:last-child{border-bottom:0}
  .sy-rule b{font-size:20px;line-height:1.2}
  .sy-rule small{display:block;color:var(--sub);font-size:12px;margin-top:2px}
  .sy-pairs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
  .sy-pair{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--tc);border-radius:12px;padding:10px;text-align:center;font-size:14px}
  .sy-pair .h{font-size:12px;color:var(--tc);margin-bottom:4px}
  .sy-rv{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px}
  .sy-rv .o{font-size:16px;font-weight:500}
  .sy-rv .who{margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;min-height:22px}
  .sy-rv .who span{font-size:12px;border-radius:20px;padding:2px 9px;background:var(--tc);color:var(--bg);font-weight:700}
  .sy-rv.empty{opacity:.45}
  .sy-verdict{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
  .sy-vd{border-radius:12px;padding:12px 8px;text-align:center;border:1px solid var(--line);font-size:13px}
  .sy-vd b{display:block;font-size:17px;margin-top:2px}
  .sy-vd.hit{border-color:var(--tc);background:color-mix(in srgb,var(--tc) 16%,transparent)}
  .sy-vd.hit b{animation:syPop .5s ease-out}
  @keyframes syPop{0%{transform:scale(.4)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
  .sy-big{text-align:center;font-size:15px;color:var(--point);margin:4px 0 10px}
  .sy-score{display:flex;justify-content:center;align-items:center;gap:14px;font-size:15px;margin:10px 0 16px}
  .sy-score b{font-size:24px}
  .sy-guess{font-size:13px;padding:6px 0;border-bottom:1px dashed var(--line)}
  .sy-guess:last-child{border-bottom:0}
  .sy-target{text-align:center;color:var(--sub);font-size:14px}
  .sy-target b{display:block;font-size:30px;color:var(--point);font-family:'Noto Serif KR',serif}
  .sy-clock{font-family:ui-monospace,Menlo,monospace;font-size:64px;text-align:center;margin:18px 0;letter-spacing:.02em;font-variant-numeric:tabular-nums}
  .sy-clock.hidden{color:var(--sub)}
  .sy-press{display:block;width:190px;height:190px;margin:0 auto;border-radius:50%;border:0;background:var(--point);color:var(--bg);font-size:28px;font-weight:700;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:manipulation}
  .sy-press:active{transform:scale(.96)}
  .sy-press:disabled{background:var(--line);color:var(--sub)}
  .sy-track{position:relative;height:56px;margin:26px 8px 10px;border-bottom:2px solid var(--line)}
  .sy-track .tg{position:absolute;top:-8px;bottom:-8px;width:2px;background:var(--point)}
  .sy-track .tg span{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--point);white-space:nowrap}
  .sy-track .pt{position:absolute;width:14px;height:14px;border-radius:50%;background:var(--tc);border:2px solid var(--bg);transform:translateX(-50%)}
  .sy-trow{display:flex;justify-content:space-between;align-items:center;padding:9px 2px;border-bottom:1px solid var(--line);font-size:15px}
  .sy-trow .t{font-family:ui-monospace,Menlo,monospace}
  .sy-trow .e{color:var(--sub);font-size:13px;width:70px;text-align:right}
  .sy-sec{font-size:13px;color:var(--sub);margin:22px 0 8px}
  .sy-mbar{height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-top:5px}
  .sy-mbar i{display:block;height:100%;background:var(--point)}
  .sy-best{text-align:center;background:var(--card);border:1px solid var(--point);border-radius:16px;padding:18px 12px;margin:8px 0}
  .sy-best .e{font-size:40px;animation:syPop .6s ease-out}
  .sy-best h3{font-family:'Noto Serif KR',serif;font-size:21px;margin-top:4px}
  .sy-best p{color:var(--sub);font-size:13px;margin-top:4px}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- 로컬 상태 (내 폰에서만) ----------
  let localPick = { qid: null, s: null, g: null };
  let qStart = {}, tickTimer = 0, raf = 0, sentNext = "";
  let tLocal = null;   // 타이밍 게임 로컬 진행 {tid, t0, sent, msg}

  const stopLoops = () => { clearInterval(tickTimer); tickTimer = 0; if (raf) cancelAnimationFrame(raf); raf = 0; };

  // =====================================================
  // 방장: 질문 뽑기
  // =====================================================
  function buildList(api) {
    const Q = window.SYNC_Q || { questions: {}, combos: [] };
    const total = ROUNDS * Q_PER_ROUND;
    const all = [];
    Object.entries(Q.questions || {}).forEach(([c, lines]) => (lines || []).forEach(line => {
      const p = String(line).split("|").map(x => x.trim()).filter(Boolean);
      if (p.length >= 3) all.push({ key: p[0], c, q: p[0], o: p.slice(1, 5) });
    }));
    let used = [];
    try { used = JSON.parse(api.getS(api.LS, "sync-used") || "[]"); } catch (e) {}
    const usedSet = new Set(used);
    let fresh = all.filter(x => !usedSet.has(x.key));

    // 메뉴판 질문 (실제 메뉴 이름, 품절 제외)
    const menuItems = [];
    ((api.ctx && api.ctx.MENU) || []).forEach(cat => (cat.items || []).forEach(it => { if (!it.soldout && it.name) menuItems.push(it.name); }));
    const extras = [];
    if (menuItems.length >= 2 && (Q.menuQuestions || []).length) {
      const n = Math.min(menuItems.length, Math.random() < 0.5 ? 2 : 3);
      extras.push({ c: "메뉴판", q: Q.menuQuestions[Math.floor(Math.random() * Q.menuQuestions.length)], o: api.shuffle(menuItems).slice(0, n) });
    }
    // 자동 조합 질문
    const combos = api.shuffle(Q.combos || []);
    const nCombo = Math.min(combos.length, Math.max(0, Math.round(total * COMBO_RATE) - extras.length));
    for (let i = 0; i < nCombo; i++) {
      const cb = combos[i];
      const r = Math.random(); const n = r < 0.4 ? 2 : r < 0.75 ? 3 : 4;
      extras.push({ c: cb.c || "랜덤", q: cb.q, o: api.shuffle(cb.pool).slice(0, Math.min(n, cb.pool.length)) });
    }
    const needHw = total - extras.length;
    if (fresh.length < needHw) { usedSet.clear(); used = []; fresh = all; }
    const hw = api.shuffle(fresh).slice(0, needHw);
    hw.forEach(x => used.push(x.key));
    api.setS(api.LS, "sync-used", JSON.stringify(used.slice(-3000)));

    // 섞고, 같은 카테고리가 연달아 나오지 않게 정리
    let pool = api.shuffle([...hw.map(({ c, q, o }) => ({ c, q, o })), ...extras]);
    const list = [];
    while (pool.length) {
      const last = list[list.length - 1];
      let i = pool.findIndex(x => !last || x.c !== last.c);
      if (i < 0) i = 0;
      list.push(pool.splice(i, 1)[0]);
    }
    return list.map((x, i) => ({
      ...x, o: api.shuffle(x.o),
      kind: PREDICT_AT >= 0 && i % Q_PER_ROUND === PREDICT_AT ? "predict" : "match",
    }));
  }

  // =====================================================
  // 방장: 진행
  // =====================================================
  const seatsCopy = api => ({ A: api.state.seats.A.slice(), B: api.state.seats.B.slice() });

  function newGame(api, intro) {
    api.clearLater();
    const g = {
      step: intro ? "intro" : "q", ready: {}, list: buildList(api), n: 0,
      swap: !!(api.state.opts && api.state.opts.swap),
      rs: Array.from({ length: ROUNDS }, () => ({ A: 0, B: 0 })), pairs: [], hist: [],
    };
    if (intro) api.update(g); else goQuestion(api, g);
  }

  function goQuestion(api, g) {
    const round = Math.floor(g.n / Q_PER_ROUND);
    const pairs = g.pairs.slice();
    if (g.n % Q_PER_ROUND === 0) pairs[round] = seatsCopy(api);
    const item = g.list[g.n];
    const dur = ANSWER_SEC + (item.kind === "predict" ? 10 : 0);
    const qid = api.uid();
    api.update({ ...g, pairs, step: "q", round, qid, ans: {}, dur });
    api.later(() => reveal(api, qid), dur * 1000 + 1500);
  }

  function complete(api, g) {
    return api.seated().every(id => {
      const a = g.ans[id];
      return a && a.s != null && (g.list[g.n].kind !== "predict" || a.g != null);
    });
  }

  function reveal(api, qid) {
    const g = api.g;
    if (!g || g.step !== "q" || g.qid !== qid) return;
    api.clearLater();
    const item = g.list[g.n];
    const seats = api.state.seats;
    const pts = { A: 0, B: 0 };
    ["A", "B"].forEach(t => {
      const [a, b] = seats[t].map(id => g.ans[id] || {});
      if (item.kind === "predict") {
        if (a.g != null && a.g === b.s) pts[t]++;
        if (b.g != null && b.g === a.s) pts[t]++;
      } else if (a.s != null && a.s === b.s) pts[t]++;
    });
    const rs = g.rs.map((x, i) => i === g.round ? { A: x.A + pts.A, B: x.B + pts.B } : x);
    const hist = [...g.hist, { n: g.n, ans: g.ans, seats: seatsCopy(api), pts }];
    api.update({ ...g, step: "reveal", rs, hist, pts });
  }

  function goTiming(api, g) {
    const tid = api.uid();
    const target = TIMING_TARGETS[Math.floor(Math.random() * TIMING_TARGETS.length)];
    api.update({ ...g, step: "timing", tm: { tid, target, res: {} } });
    api.later(() => timingReveal(api, tid), 3000 + (target + 10) * 1000 + 6000);
  }

  function timingReveal(api, tid) {
    const g = api.g;
    if (!g || g.step !== "timing" || g.tm.tid !== tid) return;
    api.clearLater();
    const err = v => (typeof v === "number" ? Math.min(10, Math.abs(v - g.tm.target)) : 10);
    const seats = api.state.seats;
    const tot = { A: 0, B: 0 };
    ["A", "B"].forEach(t => seats[t].forEach(id => { tot[t] += err(g.tm.res[id]); }));
    const r = (x, y) => Math.round(x * 100) - Math.round(y * 100);
    const pts = r(tot.A, tot.B) < 0 ? { A: 2, B: 0 } : r(tot.A, tot.B) > 0 ? { A: 0, B: 2 } : { A: 1, B: 1 };
    const rs = g.rs.map((x, i) => i === g.round ? { A: x.A + pts.A, B: x.B + pts.B } : x);
    api.update({ ...g, step: "tReveal", rs, tm: { ...g.tm, tot, pts } });
  }

  function advance(api) {
    const g = api.g;
    if (g.step === "reveal") {
      if (g.n % Q_PER_ROUND === Q_PER_ROUND - 1) goTiming(api, g);
      else goQuestion(api, { ...g, n: g.n + 1 });
    } else if (g.step === "tReveal") {
      if (g.round >= ROUNDS - 1) api.update({ ...g, step: "final" });
      else if (g.swap) { api.swapPartners(); api.update({ ...g, step: "swap" }); }
      else goQuestion(api, { ...g, n: g.n + 1 });
    } else if (g.step === "swap") {
      goQuestion(api, { ...g, n: g.n + 1 });
    }
  }

  function stepKey(g) {
    if (!g) return "";
    if (g.step === "q") return "q:" + g.qid;
    if (g.step === "timing" || g.step === "tReveal") return g.step + ":" + g.tm.tid;
    return g.step + ":" + g.n;
  }

  function onAction(api, from, a) {
    const g = api.g;
    if (!g) return;
    if (a.t === "ready" && g.step === "intro") {
      const ready = { ...g.ready, [from]: true };
      if (api.seated().every(id => ready[id])) goQuestion(api, { ...g, ready });
      else api.update({ ...g, ready });
    } else if (a.t === "go" && from === api.me.id && g.step === "intro") {
      goQuestion(api, g);
    } else if (a.t === "ans" && g.step === "q" && a.qid === g.qid) {
      const nOpt = g.list[g.n].o.length;
      const ok = v => v == null || (Number.isInteger(v) && v >= 0 && v < nOpt);
      if (!ok(a.s) || !ok(a.g)) return;
      const g2 = { ...g, ans: { ...g.ans, [from]: { s: a.s, g: a.g } } };
      api.update(g2);
      if (complete(api, g2)) api.later(() => reveal(api, g2.qid), 800);
    } else if (a.t === "time" && g.step === "timing" && a.tid === g.tm.tid) {
      if (g.tm.res[from] !== undefined) return;
      const v = typeof a.v === "number" && a.v >= 0 && a.v < g.tm.target + 11 ? Math.round(a.v * 100) / 100 : null;
      const g2 = { ...g, tm: { ...g.tm, res: { ...g.tm.res, [from]: v } } };
      api.update(g2);
      if (api.seated().every(id => g2.tm.res[id] !== undefined)) api.later(() => timingReveal(api, g2.tm.tid), 600);
    } else if (a.t === "next" && a.key === stepKey(g)) {
      advance(api);
    } else if (a.t === "again" && from === api.me.id) {
      newGame(api, false);
    }
  }

  // =====================================================
  // 화면 (모든 폰)
  // =====================================================
  function render(api) {
    const g = api.g;
    if (!g) return;
    const key = stepKey(g);
    const same = api.screen === key;
    if (g.step !== "timing") { if (!same) stopLoops(); }
    if (g.step === "intro") return showIntro(api, g);
    if (g.step === "q") return showQuestion(api, g, same);
    if (g.step === "reveal") return same ? null : showReveal(api, g);
    if (g.step === "timing") return showTiming(api, g, same);
    if (g.step === "tReveal") return same ? null : showTimingResult(api, g);
    if (g.step === "swap") return same ? null : showSwap(api, g);
    if (g.step === "final") return same ? null : showFinal(api, g);
  }

  const esc = s => window.TeamRoom.esc(s);
  const roundLabel = g => `${g.round + 1}라운드`;
  const pairCards = (api, seats) => `
    <div class="sy-pairs">${["A", "B"].map(t => `
      <div class="sy-pair" style="--tc:${api.TEAMS[t].color}">
        <div class="h">${api.TEAMS[t].emoji} ${api.TEAMS[t].name}</div>
        ${seats[t].map(id => esc(api.nameOf(id))).join(" · ")}
      </div>`).join("")}</div>`;
  const scoreLine = (api, sc) => `
    <div class="sy-score">${api.teamTag("A")} <b>${sc.A}</b> : <b>${sc.B}</b> ${api.teamTag("B")}</div>`;
  const nextBtn = (api, key, label) => `
    <button class="tr-btn primary" id="sy-next" style="margin-top:14px">${label}</button>`;
  function bindNext(api, key) {
    const b = api.$("#sy-next");
    if (!b) return;
    if (sentNext === key) { b.disabled = true; b.textContent = "넘어가는 중…"; }
    b.onclick = () => { sentNext = key; b.disabled = true; b.textContent = "넘어가는 중…"; api.send({ t: "next", key }); };
  }
  function paint(api, key, html) {
    api.screen = key;
    api.root.innerHTML = api.banner() + `<div class="sy-wrap">${html}${api.footer()}</div>`;
    api.bindFooter();
  }

  // ---------- 시작 안내 ----------
  function showIntro(api, g) {
    const meReady = !!g.ready[api.me.id];
    const n = api.seated().filter(id => g.ready[id]).length;
    paint(api, stepKey(g) + ":" + n, `
      <div class="tr-hero" style="font-size:48px">💞</div>
      <h2 class="sy-h">통했나?</h2>
      <p class="sy-note" style="margin-top:0">처음 만난 우리, 얼마나 통하는지 볼까요?</p>
      ${pairCards(api, api.state.seats)}
      <div class="sy-rules">
        <div class="sy-rule"><b>🙊</b><div>질문이 나오면 <b style="font-size:inherit">말없이</b> 각자 골라요<small>같은 팀 둘이 같은 답을 고르면 +1점</small></div></div>
        <div class="sy-rule"><b>🔮</b><div>'파트너 예측' 문제도 있어요<small>내 답을 고르고, 짝꿍이 뭘 골랐을지 맞혀요 (맞힌 만큼 점수)</small></div></div>
        <div class="sy-rule"><b>⏱️</b><div>라운드 끝엔 타이밍 게임<small>목표 시간을 마음속으로 세서 버튼! 둘의 오차가 작은 팀 +2점</small></div></div>
        ${g.swap ? `<div class="sy-rule"><b>🔄</b><div>1라운드가 끝나면 파트너 체인지<small>모두가 한 번씩 짝이 돼요</small></div></div>` : ""}
        <div class="sy-rule"><b>🗣️</b><div>답이 공개되면 그때 마음껏 수다!<small>"왜 그걸 골랐어요?"가 이 게임의 진짜 재미예요</small></div></div>
      </div>
      <div class="sy-status">${api.seated().map(id => `<span class="sy-who${g.ready[id] ? " ok" : ""}" style="--tc:${api.TEAMS[api.teamOf(id)].color}">${g.ready[id] ? "✓ " : ""}${esc(api.nameOf(id))}</span>`).join("")}</div>
      <button class="tr-btn primary" id="sy-ready" style="margin-top:18px" ${meReady ? "disabled" : ""}>${meReady ? `준비 완료 ✓ (${n}/4)` : "준비 완료!"}</button>
      ${api.isHost ? `<button class="tr-btn ghost" id="sy-go">기다리지 않고 바로 시작</button>` : ""}
      <p class="sy-note">4명이 모두 준비되면 자동으로 시작해요</p>`);
    api.$("#sy-ready").onclick = () => api.send({ t: "ready" });
    const go = api.$("#sy-go"); if (go) go.onclick = () => api.send({ t: "go" });
  }

  // ---------- 질문 ----------
  function showQuestion(api, g, same) {
    const item = g.list[g.n];
    if (localPick.qid !== g.qid) localPick = { qid: g.qid, s: null, g: null };
    if (!qStart[g.qid]) qStart[g.qid] = performance.now();
    const mineSrv = g.ans[api.me.id];
    if (mineSrv && localPick.s == null) { localPick.s = mineSrv.s; localPick.g = mineSrv.g; }
    const predict = item.kind === "predict";
    const partner = api.partnerOf(api.me.id);
    const stage = !predict ? "s" : localPick.s == null ? "s" : localPick.g == null ? "g" : "done";
    const done = predict ? stage === "done" : localPick.s != null;
    const answered = api.seated().filter(id => { const a = g.ans[id]; return a && a.s != null && (!predict || a.g != null); });
    const qn = g.n % Q_PER_ROUND + 1;

    const left = Math.max(0, g.dur - (performance.now() - qStart[g.qid]) / 1000);
    const pct = left / g.dur * 100;
    const sub = !predict ? (done ? "선택 완료! 공개 전까지 바꿀 수 있어요" : "말하지 말고 골라주세요 🤫")
      : stage === "s" ? "① 먼저, 나라면?"
      : stage === "g" ? `② ${esc(api.nameOf(partner))}님은 뭘 골랐을까요?`
      : "선택 완료! 다른 사람 기다리는 중";
    const sel = stage === "g" ? localPick.g : stage === "done" ? localPick.g : localPick.s;

    paint(api, stepKey(g), `
      <div class="sy-top"><span>${roundLabel(g)} · ${qn}/${Q_PER_ROUND}</span><span class="tr-chip">${predict ? "🔮 파트너 예측" : esc(item.c)}</span><span id="sy-left">${Math.ceil(left)}초</span></div>
      <div class="sy-bar"><i id="sy-barfill" style="width:${pct}%"></i></div>
      <div class="sy-q">${esc(item.q)}</div>
      <div class="sy-qsub">${sub}</div>
      <div class="sy-opts">${item.o.map((o, i) => `<button class="sy-opt${sel === i ? " sel" : ""}" data-i="${i}">${esc(o)}</button>`).join("")}</div>
      ${predict && stage !== "s" ? `<button class="tr-btn ghost" id="sy-redo">← 내 답 다시 고르기 (나: ${esc(item.o[localPick.s])})</button>` : ""}
      <div class="sy-status">${api.seated().map(id => `<span class="sy-who${answered.includes(id) ? " ok" : ""}" style="--tc:${api.TEAMS[api.teamOf(id)].color}">${answered.includes(id) ? "✓ " : ""}${esc(api.nameOf(id))}</span>`).join("")}</div>
      <p class="sy-note">${answered.length}/4명 선택 완료 · 모두 고르면 바로 공개돼요</p>`);

    const fill = api.$("#sy-barfill");
    requestAnimationFrame(() => { if (fill) { fill.style.transition = `width ${left}s linear`; fill.style.width = "0%"; } });
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const el = api.$("#sy-left"); if (!el) return clearInterval(tickTimer);
      el.textContent = Math.ceil(Math.max(0, g.dur - (performance.now() - qStart[g.qid]) / 1000)) + "초";
    }, 250);

    api.root.querySelectorAll(".sy-opt").forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (!predict) { localPick.s = i; api.send({ t: "ans", qid: g.qid, s: i }); }
      else if (stage === "s") { localPick.s = i; localPick.g = null; }
      else { localPick.g = i; api.send({ t: "ans", qid: g.qid, s: localPick.s, g: i }); }
      showQuestion(api, api.g.qid === g.qid ? api.g : g, true);
    });
    const redo = api.$("#sy-redo");
    if (redo) redo.onclick = () => { localPick.s = null; localPick.g = null; showQuestion(api, api.g, true); };
  }

  // ---------- 답 공개 ----------
  function showReveal(api, g) {
    const h = g.hist[g.hist.length - 1];
    const item = g.list[h.n];
    const predict = item.kind === "predict";
    const seats = h.seats;
    const all = [...seats.A, ...seats.B];
    const teamOfAt = id => seats.A.includes(id) ? "A" : "B";
    const color = id => api.TEAMS[teamOfAt(id)].color;
    const picks = item.o.map((_, i) => all.filter(id => h.ans[id] && h.ans[id].s === i));
    const allSame = picks.some(p => p.length === 4);
    const verdict = t => {
      const p = h.pts[t];
      if (predict) return `<div class="sy-vd${p ? " hit" : ""}" style="--tc:${api.TEAMS[t].color}">${api.teamTag(t)}<b>${p === 2 ? "🔮 둘 다 맞힘!" : p === 1 ? "🔮 한 명 맞힘" : "😅 둘 다 빗나감"}</b>${p ? `+${p}점` : "0점"}</div>`;
      return `<div class="sy-vd${p ? " hit" : ""}" style="--tc:${api.TEAMS[t].color}">${api.teamTag(t)}<b>${p ? "💘 통했다!" : "💔 엇갈렸다"}</b>${p ? "+1점" : "0점"}</div>`;
    };
    const guesses = predict ? `
      <div class="sy-rv">${all.map(id => {
        const a = h.ans[id] || {};
        const pid = seats[teamOfAt(id)].find(x => x !== id);
        const pa = h.ans[pid] || {};
        const okk = a.g != null && a.g === pa.s;
        return `<div class="sy-guess"><span class="tr-name" style="--tc:${color(id)}">${esc(api.nameOf(id))}</span>의 예상: ${a.g != null ? `<b>${esc(item.o[a.g])}</b>` : "시간 초과"} ${okk ? "✅" : "❌"}</div>`;
      }).join("")}</div>` : "";
    paint(api, stepKey(g), `
      <div class="sy-top"><span>${roundLabel(g)} · ${h.n % Q_PER_ROUND + 1}/${Q_PER_ROUND}</span><span class="tr-chip">${predict ? "🔮 파트너 예측" : esc(item.c)}</span><span></span></div>
      <div class="sy-q" style="margin-bottom:16px">${esc(item.q)}</div>
      ${allSame ? `<p class="sy-big">🎉 4명 모두 같은 답! 오늘 이 테이블 뭔가 통하네요</p>` : ""}
      ${item.o.map((o, i) => `
        <div class="sy-rv${picks[i].length ? "" : " empty"}">
          <div class="o">${esc(o)}</div>
          <div class="who">${picks[i].map(id => `<span style="--tc:${color(id)}">${esc(api.nameOf(id))}</span>`).join("")}</div>
        </div>`).join("")}
      ${all.some(id => !h.ans[id] || h.ans[id].s == null) ? `<p class="sy-note" style="margin-top:0">⏰ 시간 안에 못 고른 사람: ${all.filter(id => !h.ans[id] || h.ans[id].s == null).map(id => esc(api.nameOf(id))).join(", ")}</p>` : ""}
      ${guesses}
      <div class="sy-verdict">${verdict("A")}${verdict("B")}</div>
      ${scoreLine(api, g.rs[g.round])}
      <p class="sy-note" style="margin-top:0">💬 왜 그걸 골랐는지 서로 물어보세요!</p>
      ${nextBtn(api, stepKey(g), h.n % Q_PER_ROUND === Q_PER_ROUND - 1 ? "⏱️ 타이밍 게임으로 →" : "다음 질문 →")}`);
    bindNext(api, stepKey(g));
  }

  // ---------- 타이밍 게임 ----------
  function showTiming(api, g, same) {
    const tm = g.tm;
    const done = api.seated().filter(id => tm.res[id] !== undefined).length;
    if (!tLocal || tLocal.tid !== tm.tid) {
      stopLoops();
      tLocal = { tid: tm.tid, t0: performance.now() + 3200, sent: tm.res[api.me.id] !== undefined, msg: "" };
      same = false;
    }
    if (same) { const c = api.$("#sy-done"); if (c) c.textContent = `${done}/4명 기록 완료`; return; }
    paint(api, stepKey(g), `
      <div class="sy-top"><span>${roundLabel(g)} · 타이밍 게임</span><span></span><span></span></div>
      <div class="sy-target">목표 시간<b>${tm.target.toFixed(2)}초</b></div>
      <div class="sy-clock" id="sy-clock">3</div>
      <button class="sy-press" id="sy-press" disabled>준비…</button>
      <p class="sy-note" id="sy-tmsg">처음 3초만 시계가 보이고, 그다음부터는 마음속으로 세야 해요\n목표 시간이라고 생각될 때 버튼을 누르세요!</p>
      <p class="sy-note" id="sy-done">${done}/4명 기록 완료</p>`);
    const clock = api.$("#sy-clock"), btn = api.$("#sy-press"), msg = api.$("#sy-tmsg");
    const finish = (v, text) => {
      if (tLocal.sent) return;
      tLocal.sent = true; tLocal.msg = text;
      api.send({ t: "time", tid: tm.tid, v });
      btn.disabled = true; btn.textContent = "기록 완료";
      msg.textContent = text;
      api.vibrate(40);
    };
    if (tLocal.sent) { btn.textContent = "기록 완료"; msg.textContent = tLocal.msg || "기록 완료! 다른 사람을 기다리는 중이에요"; }
    btn.onpointerdown = e => {
      e.preventDefault();
      const el = (performance.now() - tLocal.t0) / 1000;
      if (el < 0 || tLocal.sent) return;
      const v = Math.round(el * 100) / 100;
      clock.classList.remove("hidden");
      clock.textContent = v.toFixed(2);
      finish(v, `기록 ${v.toFixed(2)}초! 결과는 4명 모두 누르면 공개돼요`);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && performance.now() > tLocal.t0 && !tLocal.sent) {
        finish(null, "화면을 벗어나서 이번 기록은 실패 처리됐어요 😢");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const loop = () => {
      if (api.screen !== stepKey(g) || !api.root) { document.removeEventListener("visibilitychange", onVis); return; }
      const el = (performance.now() - tLocal.t0) / 1000;
      if (!tLocal.sent) {
        if (el < 0) { clock.textContent = Math.ceil(-el); btn.disabled = true; btn.textContent = "준비…"; }
        else {
          btn.disabled = false; btn.textContent = "지금!";
          if (el < 3) { clock.classList.remove("hidden"); clock.textContent = el.toFixed(2); }
          else { clock.classList.add("hidden"); clock.textContent = "??.??"; }
          if (el > tm.target + 10) finish(null, "시간이 너무 지나서 실패 처리됐어요 😅");
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function showTimingResult(api, g) {
    const tm = g.tm;
    const seats = api.state.seats;
    const all = [...seats.A, ...seats.B];
    const max = tm.target * 1.6;
    const pos = v => Math.max(0, Math.min(100, v / max * 100));
    const row = id => {
      const v = tm.res[id];
      const ok = typeof v === "number";
      return `<div class="sy-trow"><span>${api.tag(id)}</span><span class="t">${ok ? v.toFixed(2) + "초" : "실패"}</span><span class="e">${ok ? (v >= tm.target ? "+" : "−") + Math.abs(v - tm.target).toFixed(2) : "오차 10"}</span></div>`;
    };
    const win = tm.pts.A === tm.pts.B ? null : tm.pts.A > tm.pts.B ? "A" : "B";
    paint(api, stepKey(g), `
      <div class="sy-top"><span>${roundLabel(g)} · 타이밍 결과</span><span></span><span></span></div>
      <div class="sy-target">목표 ${tm.target.toFixed(2)}초</div>
      <div class="sy-track">
        <div class="tg" style="left:${pos(tm.target)}%"><span>목표</span></div>
        ${all.map((id, i) => typeof tm.res[id] === "number" ? `<div class="pt" style="--tc:${api.TEAMS[api.teamOf(id)].color};left:${pos(tm.res[id])}%;top:${4 + i * 11}px"></div>` : "").join("")}
      </div>
      <div style="margin-top:28px">${all.map(row).join("")}</div>
      <div class="sy-verdict">
        ${["A", "B"].map(t => `<div class="sy-vd${tm.pts[t] ? " hit" : ""}" style="--tc:${api.TEAMS[t].color}">${api.teamTag(t)}<b>오차 ${tm.tot[t].toFixed(2)}초</b>${tm.pts[t] ? `+${tm.pts[t]}점` : "0점"}</div>`).join("")}
      </div>
      <p class="sy-big">${win ? `${api.teamTag(win)} 승리! 호흡 척척 👏` : "무승부! 둘 다 +1점"}</p>
      ${scoreLine(api, g.rs[g.round])}
      ${nextBtn(api, stepKey(g), g.round >= ROUNDS - 1 ? "🏆 최종 결과 보기" : g.swap ? "🔄 파트너 체인지 →" : "다음 라운드 →")}`);
    bindNext(api, stepKey(g));
  }

  // ---------- 파트너 체인지 ----------
  function showSwap(api, g) {
    const partner = api.partnerOf(api.me.id);
    paint(api, stepKey(g), `
      <div class="tr-hero" style="font-size:52px;margin-top:10px">🔄</div>
      <h2 class="sy-h">파트너 체인지!</h2>
      <p class="sy-note" style="margin-top:0">${roundLabel(g)} 결과 ${api.teamTag("A")} ${g.rs[g.round].A} : ${g.rs[g.round].B} ${api.teamTag("B")}</p>
      ${pairCards(api, api.state.seats)}
      <p class="sy-big">이번 짝꿍은 <b>${esc(api.nameOf(partner))}</b>님이에요!<br>자리 바꿔 앉아도 좋아요 😉</p>
      ${nextBtn(api, stepKey(g), `${g.round + 2}라운드 시작 →`)}`);
    bindNext(api, stepKey(g));
  }

  // ---------- 최종 결과 ----------
  function showFinal(api, g) {
    const ids = api.seated();
    // 개인 점수 = 라운드마다 소속 팀 점수 합
    const personal = {};
    ids.forEach(id => { personal[id] = 0; });
    g.pairs.forEach((p, r) => { if (!p) return; ["A", "B"].forEach(t => p[t].forEach(id => { personal[id] = (personal[id] || 0) + g.rs[r][t]; })); });
    // 6쌍 궁합 = 모든 질문에서 '내 답'이 같았던 횟수
    const pairs = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      let same = 0, tot = 0;
      g.hist.forEach(h => {
        const a = h.ans[ids[i]], b = h.ans[ids[j]];
        if (a && b && a.s != null && b.s != null) { tot++; if (a.s === b.s) same++; }
      });
      pairs.push({ a: ids[i], b: ids[j], same, tot });
    }
    pairs.sort((x, y) => y.same - x.same || (y.tot - x.tot));
    const best = pairs[0];
    const totalQ = g.hist.length;
    const ranking = ids.slice().sort((a, b) => personal[b] - personal[a]);
    const top = personal[ranking[0]];
    const nm = id => `<b>${esc(api.nameOf(id))}</b>`;
    paint(api, stepKey(g), `
      <div class="tr-hero" style="font-size:48px">🏆</div>
      <h2 class="sy-h">최종 결과</h2>
      ${best && best.same ? `
      <div class="sy-best">
        <div class="e">💘</div>
        <h3>오늘의 찰떡 궁합</h3>
        <p style="color:var(--text);font-size:17px;margin-top:8px">${nm(best.a)} & ${nm(best.b)}</p>
        <p>${totalQ}문제 중 ${best.same}개가 같은 답! 건배 한 번 어때요? 🥂</p>
      </div>` : ""}
      <div class="sy-sec">라운드별 결과</div>
      ${g.pairs.map((p, r) => p ? `
        <div class="sy-trow"><span>${r + 1}R</span>
          <span style="font-size:13px">${["A", "B"].map(t => `<span class="tr-name" style="--tc:${api.TEAMS[t].color}">${p[t].map(id => esc(api.nameOf(id))).join("·")} ${g.rs[r][t]}점</span>`).join(" : ")}</span>
          <span class="e">${g.rs[r].A === g.rs[r].B ? "무승부" : (g.rs[r].A > g.rs[r].B ? api.TEAMS.A.emoji : api.TEAMS.B.emoji) + " 승"}</span></div>` : "").join("")}
      <div class="sy-sec">개인 점수 ${g.pairs.length > 1 ? "(라운드마다 팀 점수를 합산)" : ""}</div>
      ${ranking.map(id => `<div class="sy-trow"><span>${personal[id] === top ? "👑 " : ""}${esc(api.nameOf(id))}</span><span class="t">${personal[id]}점</span></div>`).join("")}
      <div class="sy-sec">우리 넷의 궁합표 (같은 답 개수)</div>
      ${pairs.map(p => `<div style="padding:7px 2px;font-size:14px">${esc(api.nameOf(p.a))} & ${esc(api.nameOf(p.b))} <span style="float:right;color:var(--sub)">${p.same}/${p.tot}</span>
        <div class="sy-mbar"><i style="width:${p.tot ? p.same / p.tot * 100 : 0}%"></i></div></div>`).join("")}
      ${api.isHost ? `<button class="tr-btn primary" id="sy-again" style="margin-top:20px">새 질문으로 한 판 더!</button>` : `<p class="sy-note">방장이 다음 판을 준비할 수 있어요</p>`}`);
    const ag = api.$("#sy-again"); if (ag) ag.onclick = () => api.send({ t: "again" });
  }

  // =====================================================
  const game = {
    ns: "mullae-sync/v1", emoji: "💞", title: "통했나?",
    sub: "처음 만난 4명이 2:2로!\n말없이 같은 답을 고르면 점수, 타이밍 게임까지",
    seatLabels: SEAT_LABELS,
    seatHint: SEAT_LABELS[0] ? `팀마다 ${SEAT_LABELS[0]}·${SEAT_LABELS[1]} 한 명씩 앉아주세요 · 빈 자리를 누르면 이동` : "빈 자리를 누르면 자리를 옮길 수 있어요",
    defaultOpts: { swap: true },
    lobbyOptions: api => `
      <div class="tr-opt"><div>🔄 파트너 체인지<small>1라운드 후 짝꿍이 바뀌어요 (모두가 한 번씩 짝)</small></div>
      <button class="tr-toggle${api.state.opts.swap ? " on" : ""}" id="sy-swap" aria-label="파트너 체인지"></button></div>`,
    bindLobbyOptions: (api, set) => { api.$("#sy-swap").onclick = () => set({ swap: !api.state.opts.swap }); },
    start: api => newGame(api, true),
    onAction, render,
    onLeave: () => { stopLoops(); tLocal = null; qStart = {}; sentNext = ""; },
  };

  let inst = null;
  (window.GameModules = window.GameModules || {}).sync = {
    mount(el, ctx) {
      el.innerHTML = `<p class="game-loading">💞 불러오는 중…</p>`;
      Promise.all([
        loadJs("team-room.js", () => !!window.TeamRoom),
        loadJs("sync-q.js", () => !!window.SYNC_Q),
      ]).then(() => {
        if (!el.isConnected) return;
        inst = window.TeamRoom.create(game);
        inst.mount(el, ctx);
      }).catch(() => { el.innerHTML = `<p class="game-loading">게임을 불러오지 못했어요. 새로고침해 주세요</p>`; });
    },
    unmount() { if (inst) inst.unmount(); inst = null; stopLoops(); },
  };
})();
