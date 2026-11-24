// =====================================================
// 🐣 캐릭터 키우기 (다마고치) — 화면 3개를 이 파일 하나로
//   #pet    손님: 내 캐릭터 · 도감 · 밥 먹기 · 분양/부활 받기
//   #staff  직원: 분양 QR · 부활 QR 만들기 (직원 계정 로그인)
//   #tablet 매장 태블릿: 30초마다 바뀌는 밥 QR (직원 계정 로그인)
// 캐릭터 이름·이모지·그림은 아래 SPECIES 에서 바꿀 수 있어요
// =====================================================
(() => {
  // ===== 캐릭터 12종 (순서 바꾸지 마세요: 번호로 저장돼요) =====
  //   img / evoImg 에 그림 주소("pets/01.png")를 넣으면 이모지 대신 그림이 나와요
  //   evoEmoji 를 비우면 진화 후에 왕관 👑 이 씌워져요
  const SPECIES = [
    { name: "삐약이", emoji: "🐣", evoName: "꼬끼오", evoEmoji: "🐓", img: "", evoImg: "" },
    { name: "꼬물이", emoji: "🐛", evoName: "나풀이", evoEmoji: "🦋", img: "", evoImg: "" },
    { name: "냥냥이", emoji: "🐱", evoName: "호랑냥", evoEmoji: "🐯", img: "", evoImg: "" },
    { name: "멍뭉이", emoji: "🐶", evoName: "늑대멍", evoEmoji: "🐺", img: "", evoImg: "" },
    { name: "뻐끔이", emoji: "🐟", evoName: "고래왕", evoEmoji: "🐳", img: "", evoImg: "" },
    { name: "깡총이", emoji: "🐰", evoName: "킹깡총", evoEmoji: "", img: "", evoImg: "" },
    { name: "개굴이", emoji: "🐸", evoName: "킹개굴", evoEmoji: "", img: "", evoImg: "" },
    { name: "판다닥", emoji: "🐼", evoName: "킹판다", evoEmoji: "", img: "", evoImg: "" },
    { name: "펭펭이", emoji: "🐧", evoName: "황제펭", evoEmoji: "", img: "", evoImg: "" },
    { name: "여우비", emoji: "🦊", evoName: "구미호", evoEmoji: "", img: "", evoImg: "" },
    { name: "문어발", emoji: "🐙", evoName: "대왕문어", evoEmoji: "", img: "", evoImg: "" },
    { name: "곰돌이", emoji: "🐻", evoName: "킹곰돌", evoEmoji: "", img: "", evoImg: "" },
  ];
  const EVOLVE_AT = 10;          // 밥 몇 번 먹으면 진화
  const HUNGRY_DAYS = 7;         // 홀쭉
  const FAINT_DAYS = 14;         // 기절
  const DEAD_DAYS = 21;          // 사망 (보안 규칙과 같아야 해요)
  const ROTATE_MS = 30000;       // 태블릿 QR 바뀌는 간격
  const STAFF_EMAIL = "staff@mullae-hanjan.com";

  const FIREBASE = {
    apiKey: "AIzaSyBfG57kHYMNgXqNXkXPXB5qS2ORY8ZGoMY",
    authDomain: "mullae-hanjan.firebaseapp.com",
    projectId: "mullae-hanjan",
    storageBucket: "mullae-hanjan.firebasestorage.app",
    messagingSenderId: "166230193255",
    appId: "1:166230193255:web:7c6b82b39df42c9e0fd0c2",
  };
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const QR_LIB = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";

  // ---------- 도구 ----------
  const DAY = 86400000;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randCode = n => { const a = new Uint32Array(n); crypto.getRandomValues(a); return [...a].map(x => CODE_ABC[x % CODE_ABC.length]).join(""); };
  const today = () => Math.floor((Date.now() - 10800000) / DAY);   // 영업일: 한국시간 정오에 하루가 바뀜
  const ms = t => (t && t.toMillis ? t.toMillis() : (t || 0));
  const BASE = () => location.origin + location.pathname;
  const sleep = t => new Promise(r => setTimeout(r, t));

  function stateOf(p) {
    const d = (Date.now() - ms(p.lastFed)) / DAY;
    if (d >= DEAD_DAYS) return { k: "dead", label: "👻 하늘나라", d };
    if (d >= FAINT_DAYS) return { k: "faint", label: "😵 기절", d };
    if (d >= HUNGRY_DAYS) return { k: "hungry", label: "🥺 홀쭉", d };
    return { k: "ok", label: p.mealDay === today() ? "😋 배불러요" : "🙂 건강해요", d };
  }
  const spOf = p => SPECIES[p.species] || SPECIES[0];
  const nameOf = p => p.name || (p.evolved ? spOf(p).evoName : spOf(p).name);
  function face(p, big) {
    const sp = spOf(p);
    const img = p.evolved ? (sp.evoImg || sp.img) : sp.img;
    const emo = p.evolved && sp.evoEmoji ? sp.evoEmoji : sp.emoji;
    const crown = p.evolved && !sp.evoEmoji && !sp.evoImg ? `<span class="pe-crown">👑</span>` : "";
    const inner = img ? `<img src="${esc(img)}" alt="">` : `<span class="pe-emo">${emo}</span>`;
    return `<div class="pe-face ${big ? "big" : ""} st-${stateOf(p).k}">${crown}${inner}</div>`;
  }

  // ---------- 스타일 ----------
  const css = `
  .pe-wrap{padding:18px 18px 40px}
  .pe-h{font-family:'Noto Serif KR',serif;font-size:22px;text-align:center;margin:6px 0}
  .pe-sub{color:var(--sub);font-size:14px;text-align:center;white-space:pre-line;line-height:1.6}
  .pe-btn{display:block;width:100%;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:12px;padding:14px;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer;margin-top:10px}
  .pe-btn.primary{background:var(--point);border-color:var(--point);color:var(--bg)}
  .pe-btn.ghost{background:none;border-color:transparent;color:var(--sub);font-weight:400}
  .pe-btn:disabled{opacity:.45}
  .pe-input{width:100%;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:13px;font-size:16px;font-family:inherit}
  .pe-input:focus{outline:none;border-color:var(--point)}
  .pe-msg{color:var(--point);font-size:14px;text-align:center;min-height:20px;margin:8px 0;white-space:pre-line}
  .pe-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin:12px 0}
  .pe-code{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .pe-code b{font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:.12em;color:var(--point)}
  .pe-code small{display:block;color:var(--sub);font-size:12px}
  .pe-copy{flex-shrink:0;background:var(--line);color:var(--text);border:0;border-radius:8px;padding:8px 12px;font-size:13px;font-family:inherit}
  .pe-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .pe-pet{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 10px;text-align:center;position:relative}
  .pe-pet.dead{opacity:.75}
  .pe-pet .nm{font-weight:700;margin-top:4px;font-size:15px}
  .pe-pet .st{font-size:12px;color:var(--sub);margin-top:2px}
  .pe-pet .ed{position:absolute;top:6px;right:8px;background:none;border:0;color:var(--sub);font-size:13px;cursor:pointer}
  .pe-bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin:8px 4px 2px}
  .pe-bar i{display:block;height:100%;background:var(--point)}
  .pe-pet .ev{font-size:11px;color:var(--sub)}
  .pe-face{position:relative;height:86px;display:flex;align-items:center;justify-content:center}
  .pe-face.big{height:170px}
  .pe-face .pe-emo{font-size:58px;line-height:1;display:inline-block}
  .pe-face.big .pe-emo{font-size:120px}
  .pe-face img{height:76px;image-rendering:pixelated}
  .pe-face.big img{height:150px}
  .pe-crown{position:absolute;top:-2px;left:50%;transform:translateX(-50%);font-size:24px;z-index:1}
  .pe-face.big .pe-crown{font-size:44px;top:-10px}
  .st-ok .pe-emo,.st-ok img{animation:peBob 2.4s ease-in-out infinite}
  @keyframes peBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .st-hungry .pe-emo,.st-hungry img{transform:scaleX(.72);filter:saturate(.6)}
  .st-hungry::after{content:"💧";position:absolute;top:8px;right:28%;font-size:18px;animation:peDrip 1.6s ease-in infinite}
  @keyframes peDrip{from{transform:translateY(0);opacity:1}to{transform:translateY(16px);opacity:0}}
  .st-faint .pe-emo,.st-faint img{transform:rotate(90deg);filter:grayscale(.6)}
  .st-faint::after{content:"💫";position:absolute;top:4px;font-size:20px;animation:peSpin 1.5s linear infinite}
  @keyframes peSpin{to{transform:rotate(360deg)}}
  .st-dead .pe-emo,.st-dead img{filter:grayscale(1);opacity:.45}
  .st-dead::after{content:"👻";position:absolute;top:-4px;right:22%;font-size:26px;animation:peBob 2s ease-in-out infinite}
  .pe-sec{font-size:13px;color:var(--sub);margin:24px 0 8px;display:flex;justify-content:space-between}
  .pe-dex{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .pe-dx{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 2px;text-align:center}
  .pe-dx .e{font-size:30px;line-height:1.2}
  .pe-dx .n{font-size:11px;color:var(--sub);margin-top:2px}
  .pe-dx.no .e{filter:brightness(0);opacity:.35}
  .pe-dx.no .n{opacity:.5}
  .pe-dx .c{font-size:10px;color:var(--point)}
  .pe-egg{font-size:110px;text-align:center;margin:30px 0 10px;animation:peShake .5s ease-in-out infinite}
  @keyframes peShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}}
  .pe-pop{animation:pePop .7s ease-out}
  @keyframes pePop{0%{transform:scale(.2);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
  .pe-res{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:8px 12px;margin-top:8px}
  .pe-res .pe-face{height:60px;width:64px;flex-shrink:0}
  .pe-res .pe-face .pe-emo{font-size:42px}
  .pe-res .pe-face img{height:54px}
  .pe-res .t{font-size:14px}
  .pe-res .t b{display:block;font-size:15px}
  .pe-qr{background:#fff;border-radius:16px;padding:14px;margin:12px auto;max-width:330px}
  .pe-qr svg{display:block;width:100%;height:auto}
  .pe-tab .pe-qr{max-width:420px}
  .pe-ring{height:6px;background:var(--line);border-radius:3px;overflow:hidden;max-width:420px;margin:0 auto}
  .pe-ring i{display:block;height:100%;background:var(--point)}
  .pe-big2{font-family:'Noto Serif KR',serif;font-size:clamp(24px,6vw,34px);text-align:center;margin:8px 0}
  .pe-dexgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;font-size:22px;text-align:center;margin-top:8px}
  .pe-note{color:var(--sub);font-size:12px;text-align:center;margin-top:10px;white-space:pre-line;line-height:1.6}
  .pe-load{padding:60px 20px;text-align:center;color:var(--sub)}
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- Firebase 불러오기 ----------
  let FB = null;
  async function fb() {
    if (FB) return FB;
    const [appM, authM, fsM] = await Promise.all([
      import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js"),
    ]);
    const app = appM.getApps().length ? appM.getApp() : appM.initializeApp(FIREBASE);
    FB = { auth: authM.getAuth(app), db: fsM.getFirestore(app), A: authM, F: fsM };
    return FB;
  }
  function waitUser(auth) {
    return new Promise(res => { const off = FB.A.onAuthStateChanged(auth, u => { off(); res(u); }); });
  }
  let qrPromise = null;
  function loadQR() {
    return qrPromise || (qrPromise = new Promise((ok, fail) => {
      if (window.qrcode) return ok();
      const s = document.createElement("script"); s.src = QR_LIB; s.onload = ok; s.onerror = () => { qrPromise = null; fail(); };
      document.head.appendChild(s);
    }));
  }
  function qrSvg(text) {
    const q = window.qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  // ---------- 상태 ----------
  let root = null, ctx = {}, alive = false, timers = [], wakeLock = null;
  let me = { uid: null, owner: null, pets: [] };
  const $ = s => root && root.querySelector(s);
  const paint = html => { if (root) root.innerHTML = html; };
  const later = (fn, t) => { const id = setTimeout(fn, t); timers.push(id); return id; };
  const clearHash = () => { try { history.replaceState(null, "", "#" + (ctx.mode || "pet")); } catch (e) {} };
  const errMsg = e => {
    const c = (e && (e.code || e.message)) || "";
    if (/permission|insufficient/i.test(c)) return "권한이 없어요";
    if (/unavailable|network|offline/i.test(c)) return "인터넷 연결을 확인해 주세요";
    return "잠시 후 다시 시도해 주세요";
  };

  function mount(el, c) {
    root = el; ctx = c || {}; alive = true;
    paint(`<p class="pe-load">🐣 불러오는 중…</p>`);
    const go = ctx.mode === "staff" ? startStaff : ctx.mode === "tablet" ? startTablet : startPet;
    go().catch(e => { console.error(e); paint(`<div class="pe-wrap"><p class="pe-sub">연결에 실패했어요 😢\n${esc(errMsg(e))}</p><button class="pe-btn" id="pe-retry">다시 시도</button></div>`); const r = $("#pe-retry"); if (r) r.onclick = () => mount(el, c); });
  }
  function unmount() {
    alive = false; timers.forEach(clearTimeout); timers = [];
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    root = null;
  }

  // =====================================================
  // 손님
  // =====================================================
  async function ensureGuest() {
    const { auth, A, db, F } = await fb();
    let u = auth.currentUser || await waitUser(auth);
    if (!u) u = (await A.signInAnonymously(auth)).user;
    me.uid = u.uid;
    const link = await F.getDoc(F.doc(db, "links", u.uid));
    me.owner = link.exists() ? link.data().owner : null;
  }
  async function ensureOwner() {
    if (me.owner) return me.owner;
    const { db, F } = FB;
    const code = randCode(8);
    const b = F.writeBatch(db);
    b.set(F.doc(db, "owners", code), { created: F.serverTimestamp() });
    b.set(F.doc(db, "links", me.uid), { owner: code });
    await b.commit();
    me.owner = code;
    return code;
  }
  async function loadPets() {
    if (!me.owner) { me.pets = []; return; }
    const { db, F } = FB;
    const snap = await F.getDocs(F.query(F.collection(db, "pets"), F.where("owner", "==", me.owner)));
    me.pets = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(a.born) - ms(b.born));
  }

  async function startPet() {
    await ensureGuest();
    const p = ctx.params || {};
    if (p.t) return handleTicket(p.t);
    if (p.f) return handleFeed(p.f);
    await loadPets();
    showHome();
  }

  // ---------- 내 캐릭터 ----------
  function showHome(msg = "") {
    if (!alive) return;
    const pets = me.pets;
    const owned = new Set(pets.map(p => p.species));
    const count = {}; pets.forEach(p => { count[p.species] = (count[p.species] || 0) + 1; });
    paint(`
      <div class="pe-wrap">
        ${pets.length ? "" : `
          <div class="pe-egg" style="animation-duration:1.4s">🥚</div>
          <h2 class="pe-h">아직 친구가 없어요</h2>
          <p class="pe-sub">메뉴를 주문하면 직원이 <b>분양 QR</b>을 보여드려요\n카메라로 찍으면 12종 중 한 친구가 태어나요!</p>`}
        <p class="pe-msg" id="pe-msg">${esc(msg)}</p>
        ${pets.length ? `<div class="pe-grid">${pets.map(petCard).join("")}</div>` : ""}
        ${pets.length ? `<div class="pe-card pe-sub" style="text-align:left;font-size:13px">🍚 <b>밥 주기</b> : 매장 태블릿의 QR을 카메라로 찍으면 내 친구들이 <b>모두 함께</b> 먹어요 (하루 1번)
${EVOLVE_AT}번 먹으면 진화해요! ${HUNGRY_DAYS}일 굶으면 홀쭉, ${FAINT_DAYS}일 기절, ${DEAD_DAYS}일이면 하늘나라… 그땐 <b>부활주</b>를 주문해 주세요 👻</div>` : ""}
        <div class="pe-sec"><span>📖 도감</span><span>${owned.size}/${SPECIES.length}</span></div>
        <div class="pe-dex">${SPECIES.map((s, i) => `
          <div class="pe-dx${owned.has(i) ? "" : " no"}"><div class="e">${s.emoji}</div><div class="n">${owned.has(i) ? esc(s.name) : "???"}</div>${count[i] > 1 ? `<div class="c">×${count[i]}</div>` : ""}</div>`).join("")}</div>
        ${me.owner ? `
        <div class="pe-sec"><span>🔑 내 복구 코드</span></div>
        <div class="pe-card pe-code"><div><b>${esc(me.owner)}</b><small>폰을 바꾸거나 다른 앱으로 열었을 때 이 코드로 친구들을 불러와요\n캡처해 두세요!</small></div><button class="pe-copy" id="pe-copy">복사</button></div>` : ""}
        <div class="pe-sec"><span>📲 다른 폰·앱에서 키우던 친구 불러오기</span></div>
        <div style="display:flex;gap:8px"><input class="pe-input" id="pe-rc" maxlength="8" placeholder="복구 코드 8자리" autocapitalize="characters" style="text-transform:uppercase"><button class="pe-btn" id="pe-rcgo" style="width:96px;margin:0;flex-shrink:0">불러오기</button></div>
        <p class="pe-note">QR은 항상 같은 앱(기본 카메라)으로 찍으면 편해요\n앱이 바뀌어도 복구 코드만 있으면 괜찮아요</p>
      </div>`);
    root.querySelectorAll(".pe-pet .ed").forEach(b => b.onclick = () => renamePet(b.dataset.id));
    const cp = $("#pe-copy"); if (cp) cp.onclick = () => copy(me.owner, cp);
    $("#pe-rcgo").onclick = recover;
  }

  function petCard(p) {
    const st = stateOf(p);
    const left = Math.max(0, EVOLVE_AT - (p.feeds || 0));
    const nextTxt = st.k === "dead" ? "부활주로 살릴 수 있어요"
      : st.k === "ok" ? `${Math.max(1, Math.ceil(HUNGRY_DAYS - st.d))}일 뒤 배고파져요`
      : st.k === "hungry" ? `${Math.max(1, Math.ceil(FAINT_DAYS - st.d))}일 뒤 기절해요!`
      : `${Math.max(1, Math.ceil(DEAD_DAYS - st.d))}일 뒤 하늘나라… 빨리 밥을!`;
    return `
      <div class="pe-pet${st.k === "dead" ? " dead" : ""}">
        <button class="ed" data-id="${esc(p.id)}" aria-label="이름 바꾸기">✏️</button>
        ${face(p)}
        <div class="nm">${esc(nameOf(p))}${p.evolved ? " ✨" : ""}</div>
        <div class="st">${st.label}</div>
        ${p.evolved ? `<div class="ev" style="margin-top:6px">⭐ 완전체</div>` : `<div class="pe-bar"><i style="width:${Math.min(100, (p.feeds || 0) / EVOLVE_AT * 100)}%"></i></div><div class="ev">진화까지 밥 ${left}번</div>`}
        <div class="ev" style="margin-top:3px">${nextTxt}</div>
      </div>`;
  }

  function renamePet(id) {
    const p = me.pets.find(x => x.id === id); if (!p) return;
    const card = root.querySelector(`.pe-pet .ed[data-id="${CSS.escape(id)}"]`).closest(".pe-pet");
    card.querySelector(".nm").innerHTML = `<input class="pe-input" maxlength="8" value="${esc(nameOf(p))}" style="padding:8px;font-size:14px;text-align:center"><button class="pe-btn primary" style="padding:8px;font-size:13px;margin-top:6px">저장</button>`;
    const inp = card.querySelector("input"), btn = card.querySelector(".nm .pe-btn");
    inp.focus();
    btn.onclick = async () => {
      const name = inp.value.trim().slice(0, 8);
      if (!name) return;
      btn.disabled = true;
      try { await FB.F.updateDoc(FB.F.doc(FB.db, "pets", id), { name }); p.name = name; showHome("이름을 바꿨어요 ✏️"); }
      catch (e) { showHome("이름을 바꾸지 못했어요. " + errMsg(e)); }
    };
  }

  async function recover() {
    const msg = $("#pe-msg");
    const code = $("#pe-rc").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z2-9]{8}$/.test(code)) { msg.textContent = "복구 코드 8자리를 정확히 입력해 주세요"; return; }
    if (code === me.owner) { msg.textContent = "지금 보고 있는 코드예요"; return; }
    if (me.owner && me.pets.length && !window.confirm(`지금 화면의 친구들(코드 ${me.owner})은 이 폰에서 안 보이게 돼요.\n(코드를 알면 언제든 다시 불러올 수 있어요) 계속할까요?`)) return;
    try {
      await FB.F.setDoc(FB.F.doc(FB.db, "links", me.uid), { owner: code });
      me.owner = code; await loadPets();
      showHome(`불러왔어요! 친구 ${me.pets.length}마리 🎉`);
    } catch (e) { msg.textContent = "코드를 찾을 수 없어요. 다시 확인해 주세요"; }
  }

  function copy(text, btn) {
    const done = () => { btn.textContent = "복사됨 ✓"; setTimeout(() => { btn.textContent = "복사"; }, 1800); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => {});
    else {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {} ta.remove();
    }
  }

  // ---------- 분양 · 부활 ----------
  async function handleTicket(tid) {
    clearHash();
    const { db, F } = FB;
    let t;
    try { t = await F.getDoc(F.doc(db, "tickets", tid)); } catch (e) { t = null; }
    if (!t || !t.exists()) { await loadPets(); return showHome("QR이 올바르지 않아요. 직원에게 다시 요청해 주세요"); }
    const tk = t.data();
    if (ms(tk.created) < Date.now() - 3 * DAY) { await loadPets(); return showHome("유효기간(3일)이 지난 QR이에요"); }
    if (tk.type === "revive") return handleRevive(tid);

    // 분양
    await ensureOwner();
    await loadPets();
    if (me.pets.some(p => p.id === tid)) return showHome("이미 분양받은 QR이에요 😊");
    paint(`<div class="pe-wrap"><div class="pe-egg">🥚</div><h2 class="pe-h">두근두근…</h2><p class="pe-sub">알이 깨어나고 있어요!</p></div>`);
    const pet = {
      owner: me.owner, species: tk.species, name: "", born: F.serverTimestamp(), lastFed: F.serverTimestamp(),
      feeds: 0, mealDay: -1, evolved: false, revives: 0,
    };
    try {
      await Promise.all([F.setDoc(F.doc(db, "pets", tid), pet), sleep(2200)]);
    } catch (e) {
      return showHome("이미 사용된 분양 QR이에요. 직원에게 문의해 주세요");
    }
    const p = { id: tid, ...pet, born: Date.now(), lastFed: Date.now() };
    me.pets.push(p);
    const sp = SPECIES[tk.species];
    const dup = me.pets.filter(x => x.species === tk.species).length > 1;
    paint(`
      <div class="pe-wrap" style="text-align:center">
        <div class="pe-pop">${face(p, true)}</div>
        <h2 class="pe-h">${esc(sp.name)}${/[가-힣]$/.test(sp.name) && (sp.name.charCodeAt(sp.name.length - 1) - 44032) % 28 ? "이" : "가"} 태어났어요!</h2>
        <p class="pe-sub">${dup ? "또 너야?! 같은 친구가 또 왔어요 😆" : `도감 ${new Set(me.pets.map(x => x.species)).size}/${SPECIES.length} 🎉`}</p>
        <div class="pe-card" style="text-align:left">
          <label class="pe-sub" style="display:block;text-align:left;margin-bottom:6px">이름을 지어주세요 (안 지으면 '${esc(sp.name)}')</label>
          <input class="pe-input" id="pe-nm" maxlength="8" placeholder="${esc(sp.name)}">
          <button class="pe-btn primary" id="pe-nmok">좋아요!</button>
        </div>
        <div class="pe-card pe-code" style="text-align:left"><div><b>${esc(me.owner)}</b><small>내 복구 코드 — 캡처해 두면 폰이 바뀌어도 친구를 불러올 수 있어요</small></div><button class="pe-copy" id="pe-copy">복사</button></div>
        <p class="pe-note">🍚 다음에 오면 매장 태블릿 QR로 밥을 주세요!\n${EVOLVE_AT}번 먹으면 진화해요</p>
      </div>`);
    $("#pe-copy").onclick = () => copy(me.owner, $("#pe-copy"));
    $("#pe-nmok").onclick = async () => {
      const name = $("#pe-nm").value.trim().slice(0, 8);
      if (name) { try { await F.updateDoc(F.doc(db, "pets", tid), { name }); p.name = name; } catch (e) {} }
      showHome();
    };
  }

  async function handleRevive(tid) {
    const { db, F } = FB;
    await loadPets();
    let used = false;
    try { used = (await F.getDoc(F.doc(db, "used", tid))).exists(); } catch (e) {}
    if (used) return showHome("이미 사용된 부활 QR이에요");
    const dead = me.pets.filter(p => stateOf(p).k === "dead");
    if (!dead.length) return showHome(me.pets.length ? "하늘나라에 간 친구가 없어요 😊 모두 건강해요!" : "아직 친구가 없어요. 분양 QR을 먼저 받아주세요");
    paint(`
      <div class="pe-wrap">
        <div class="pe-egg" style="animation:none">🍶</div>
        <h2 class="pe-h">부활주 한 잔!</h2>
        <p class="pe-sub">누구를 살려줄까요?</p>
        <div class="pe-grid" style="margin-top:14px">${dead.map(p => `
          <button class="pe-pet dead" data-id="${esc(p.id)}" style="cursor:pointer;color:var(--text);font-family:inherit">${face(p)}<div class="nm">${esc(nameOf(p))}</div><div class="st">이 친구 살리기</div></button>`).join("")}</div>
        <p class="pe-msg" id="pe-msg"></p>
      </div>`);
    root.querySelectorAll("button.pe-pet").forEach(b => b.onclick = async () => {
      root.querySelectorAll("button.pe-pet").forEach(x => { x.disabled = true; });
      const p = me.pets.find(x => x.id === b.dataset.id);
      try {
        const batch = F.writeBatch(db);
        batch.set(F.doc(db, "used", tid), { pet: p.id, at: F.serverTimestamp() });
        batch.update(F.doc(db, "pets", p.id), { lastFed: F.serverTimestamp(), revives: (p.revives || 0) + 1, reviveTicket: tid });
        await batch.commit();
        p.lastFed = Date.now(); p.revives = (p.revives || 0) + 1;
        paint(`<div class="pe-wrap" style="text-align:center"><div class="pe-pop">${face(p, true)}</div><h2 class="pe-h">${esc(nameOf(p))} 부활!</h2><p class="pe-sub">다시 만나서 반가워요 🥹\n이번엔 밥 잘 챙겨줘요!</p><button class="pe-btn primary" id="pe-home">내 친구들 보기</button></div>`);
        $("#pe-home").onclick = () => showHome();
      } catch (e) {
        $("#pe-msg").textContent = "부활에 실패했어요. 이미 사용된 QR일 수 있어요";
        root.querySelectorAll("button.pe-pet").forEach(x => { x.disabled = false; });
      }
    });
  }

  // ---------- 밥 먹기 ----------
  async function handleFeed(code) {
    clearHash();
    const { db, F } = FB;
    await loadPets();
    if (!me.pets.length) return showHome("아직 친구가 없어서 밥을 줄 수 없어요 🥲");
    paint(`<div class="pe-wrap"><div class="pe-egg" style="animation-duration:.35s">🍚</div><h2 class="pe-h">냠냠 준비 중…</h2></div>`);
    const day = today();
    const results = await Promise.all(me.pets.map(async p => {
      const st = stateOf(p);
      if (st.k === "dead") return { p, r: "dead" };
      if ((p.mealDay ?? -1) >= day) return { p, r: "full" };
      const feeds = (p.feeds || 0) + 1;
      const evolved = feeds >= EVOLVE_AT;
      try {
        await F.updateDoc(F.doc(db, "pets", p.id), { lastFed: F.serverTimestamp(), feeds, mealDay: day, evolved, fedCode: code });
        const wasEvolved = p.evolved;
        Object.assign(p, { lastFed: Date.now(), feeds, mealDay: day, evolved });
        return { p, r: evolved && !wasEvolved ? "evolve" : st.k === "faint" ? "wake" : st.k === "hungry" ? "fat" : "ate" };
      } catch (e) { return { p, r: "fail", e }; }
    }));
    await sleep(900);
    const ate = results.filter(x => !["dead", "full", "fail"].includes(x.r)).length;
    const failed = results.filter(x => x.r === "fail").length;
    const evo = results.find(x => x.r === "evolve");
    const TXT = {
      ate: ["냠냠!", "맛있게 먹었어요"], fat: ["통통!", "홀쭉했던 배가 다시 빵빵해졌어요"], wake: ["번쩍!", "밥 냄새에 기절에서 깨어났어요"],
      evolve: ["✨ 진화했어요!", ""], full: ["배불러요", "오늘은 이미 먹었어요 (정오에 리셋)"], dead: ["…", "하늘나라에 있어요. 부활주를 주문해 주세요"],
      fail: ["앗!", "밥을 못 먹었어요"],
    };
    paint(`
      <div class="pe-wrap">
        ${evo ? `<div class="pe-pop" style="text-align:center">${face(evo.p, true)}</div><h2 class="pe-h">${esc(spOf(evo.p).name)} → ${esc(spOf(evo.p).evoName)} 진화!</h2>`
          : `<div class="pe-egg pe-pop" style="animation:none">🍚</div><h2 class="pe-h">${ate ? `${ate}마리가 밥을 먹었어요!` : "오늘은 다들 배불러요"}</h2>`}
        ${failed ? `<p class="pe-msg">QR 시간이 지났을 수 있어요. 태블릿 QR을 다시 찍어주세요\n(계속 안 되면 폰 시간이 맞는지 확인해 주세요)</p>` : ""}
        ${results.map(x => `
          <div class="pe-res">${face(x.p)}<div class="t"><b>${esc(nameOf(x.p))} · ${TXT[x.r][0]}</b>${x.r === "evolve" ? `${esc(spOf(x.p).evoName)}(으)로 진화했어요!` : TXT[x.r][1]}${!x.p.evolved && x.r !== "dead" ? ` · 진화까지 ${Math.max(0, EVOLVE_AT - (x.p.feeds || 0))}번` : ""}</div></div>`).join("")}
        <button class="pe-btn primary" id="pe-home" style="margin-top:16px">내 친구들 보기</button>
      </div>`);
    $("#pe-home").onclick = () => showHome();
  }

  // =====================================================
  // 직원 공통: 로그인
  // =====================================================
  async function ensureStaff(title, onReady) {
    const { auth, A, db, F } = await fb();
    let u = auth.currentUser || await waitUser(auth);
    const isAdmin = async uu => { try { return (await F.getDoc(F.doc(db, "admins", uu.uid))).exists(); } catch (e) { return false; } };
    if (u && !u.isAnonymous && await isAdmin(u)) return onReady(u);
    paint(`
      <div class="pe-wrap">
        <div class="pe-egg" style="animation:none;font-size:64px;margin:20px 0 6px">🧑‍🍳</div>
        <h2 class="pe-h">${esc(title)}</h2>
        <p class="pe-sub">직원 계정으로 로그인해 주세요\n(이 기기에서 한 번만 하면 계속 유지돼요)</p>
        <div class="pe-card">
          <input class="pe-input" id="pe-em" type="email" value="${esc(STAFF_EMAIL)}" autocomplete="username" style="margin-bottom:8px">
          <input class="pe-input" id="pe-pw" type="password" placeholder="비밀번호" autocomplete="current-password">
          <button class="pe-btn primary" id="pe-login">로그인</button>
          <p class="pe-msg" id="pe-msg"></p>
        </div>
      </div>`);
    const go = async () => {
      const msg = $("#pe-msg"); msg.textContent = "로그인 중…";
      try {
        const cred = await A.signInWithEmailAndPassword(auth, $("#pe-em").value.trim(), $("#pe-pw").value);
        if (!await isAdmin(cred.user)) { msg.textContent = "직원 권한이 없는 계정이에요"; return; }
        onReady(cred.user);
      } catch (e) { msg.textContent = "이메일 또는 비밀번호가 맞지 않아요"; }
    };
    $("#pe-login").onclick = go;
    $("#pe-pw").onkeydown = e => { if (e.key === "Enter") go(); };
  }
  async function keepAwake() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && alive && ctx.mode === "tablet") keepAwake(); });

  // =====================================================
  // 직원: 분양 · 부활 QR
  // =====================================================
  async function startStaff() {
    await loadQR();
    return ensureStaff("직원용 · 분양/부활 QR", () => showStaff());
  }
  function showStaff(msg = "") {
    if (!alive) return;
    paint(`
      <div class="pe-wrap">
        <h2 class="pe-h">어떤 QR을 만들까요?</h2>
        <p class="pe-sub">주문 1건당 QR 1장 · 한 번 찍으면 끝 · 3일 안에 사용</p>
        <button class="pe-btn primary" id="pe-adopt" style="padding:20px;font-size:18px">🥚 분양 QR 만들기<br><small style="font-weight:400;font-size:13px">12종 중 랜덤 (뭐가 나올지 비밀!)</small></button>
        <button class="pe-btn" id="pe-revive" style="padding:20px;font-size:18px">🍶 부활 QR 만들기<br><small style="font-weight:400;font-size:13px;color:var(--sub)">부활주 주문 시 · 하늘나라 친구 1마리 부활</small></button>
        <p class="pe-msg">${esc(msg)}</p>
        <div class="pe-card pe-sub" style="text-align:left;font-size:13px">📌 매장 태블릿 밥 QR 화면 주소<br><b style="color:var(--text);word-break:break-all">${esc(BASE())}#tablet</b><br>태블릿에서 이 주소를 열고 같은 직원 계정으로 로그인하면 돼요</div>
        <button class="pe-btn ghost" id="pe-out">로그아웃</button>
      </div>`);
    $("#pe-adopt").onclick = () => makeTicket("adopt");
    $("#pe-revive").onclick = () => makeTicket("revive");
    $("#pe-out").onclick = async () => { await FB.A.signOut(FB.auth); startStaff(); };
  }
  async function makeTicket(type) {
    const { db, F } = FB;
    const id = randCode(12);
    const data = { type, created: F.serverTimestamp() };
    if (type === "adopt") data.species = Math.floor(Math.random() * SPECIES.length);
    root.querySelectorAll("button").forEach(b => { b.disabled = true; });
    try { await F.setDoc(F.doc(db, "tickets", id), data); }
    catch (e) { return showStaff("QR을 만들지 못했어요. " + errMsg(e)); }
    const url = `${BASE()}#pet?t=${id}`;
    paint(`
      <div class="pe-wrap" style="text-align:center">
        <h2 class="pe-h">${type === "adopt" ? "🥚 분양 QR" : "🍶 부활 QR"}</h2>
        <p class="pe-sub">손님 폰 <b>카메라</b>로 이 QR을 찍게 해주세요</p>
        <div class="pe-qr">${qrSvg(url)}</div>
        <p class="pe-note">한 번 찍으면 끝 · 3일 안에 사용 가능\n${type === "adopt" ? "어떤 친구가 나올지는 손님 폰에서 공개돼요 🎁" : "손님이 살릴 친구를 직접 골라요"}</p>
        <button class="pe-btn primary" id="pe-back">완료 · 처음으로</button>
      </div>`);
    $("#pe-back").onclick = () => showStaff();
  }

  // =====================================================
  // 매장 태블릿: 30초마다 바뀌는 밥 QR
  // =====================================================
  async function startTablet() {
    await loadQR();
    return ensureStaff("매장 밥 QR (태블릿)", () => { keepAwake(); rotate(null); });
  }
  async function rotate(prev) {
    if (!alive || ctx.mode !== "tablet") return;
    const { db, F } = FB;
    const code = randCode(10);
    let ok = true;
    try { await F.setDoc(F.doc(db, "config", "feed"), { code, prev: prev || "", ts: F.serverTimestamp() }); }
    catch (e) { ok = false; }
    if (!alive) return;
    const url = `${BASE()}#pet?f=${code}`;
    paint(`
      <div class="pe-wrap pe-tab" style="text-align:center">
        <div class="pe-big2">🍚 밥 먹으러 왔나요?</div>
        <p class="pe-sub">폰 <b>카메라</b>로 QR을 찍으면 내 친구들이 모두 밥을 먹어요\n하루 1번 · 밥 ${EVOLVE_AT}번이면 진화!</p>
        <div class="pe-qr">${ok ? qrSvg(url) : `<p style="color:#14110f;padding:40px 10px">인터넷 연결을 확인 중이에요…</p>`}</div>
        <div class="pe-ring"><i id="pe-ring" style="width:100%"></i></div>
        <p class="pe-note">QR은 ${ROTATE_MS / 1000}초마다 바뀌어요 (매장에서만 밥을 줄 수 있어요)</p>
        <div class="pe-dexgrid">${SPECIES.map(s => `<span>${s.emoji}</span>`).join("")}</div>
        <p class="pe-note">아직 친구가 없다면? 메뉴 주문하고 분양 받으세요 🥚</p>
      </div>`);
    const ring = $("#pe-ring");
    requestAnimationFrame(() => { if (ring) { ring.style.transition = `width ${ROTATE_MS / 1000}s linear`; ring.style.width = "0%"; } });
    later(() => rotate(ok ? code : prev), ok ? ROTATE_MS : 5000);
  }

  (window.GameModules = window.GameModules || {}).pet = { mount, unmount };
})();
