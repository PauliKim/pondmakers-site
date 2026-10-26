// 폰드메이커스 홈페이지 — 첫 화면 슬라이드, 숫자 세기, 문화기술 장면 전환, 아티스트 캐러셀(굿덕 API, 실패 시 data/news.json), 문의 보내기.
// 고정 문구는 data/copy.json(영어 copy.en.json, 일본어 copy.ja.json)에 번호(C-01 등)로 있다. 어드민(/admin) 미리보기는 window.pondPreview로 문구를 바꿔 본다.
// en/, ja/ 페이지는 <html data-lang data-root="../">로 자기 언어와 사이트 맨 위 경로를 알려 준다.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const LANG = document.documentElement.dataset.lang || "ko";
  const ROOT = document.documentElement.dataset.root || "";
  const LOCALE = { ko: "ko-KR", en: "en-US", ja: "ja-JP" }[LANG] || "ko-KR";
  const isRelative = (u) => !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(u);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PREVIEW = new URLSearchParams(location.search).has("preview");

  // ---------- 고정 문구 ----------
  // t("H-25", { mail }) → 문구. HTML에 넣을 때는 et()로 이스케이프한다.
  let COPY = {};
  const FALLBACK = {
    "G-04": "뉴스를 불러오지 못했습니다.",
    "H-24": "문의가 접수되었습니다. 확인 후 연락드리겠습니다.",
    "H-25": "지금은 문의를 보낼 수 없습니다. {mail}로 메일을 보내 주세요.",
    "H-26": "{field} 칸을 입력해주세요.",
    "H-27": "개인정보 수집 및 이용에 동의해주세요.",
    "H-28": "보내는 중입니다."
  };
  const t = (id, vars = {}) => String(COPY[id] ?? FALLBACK[id] ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const et = (id, vars) => esc(t(id, vars)).replace(/\n/g, "<br>");
  const mail = () => t("H-08") || "contact@pondmakers.com";

  // index.html의 data-copy 요소에 문구를 넣는다(저장할 때 서버가 HTML에도 같은 값을 써 둔다)
  function applyStatic() {
    $$("[data-copy]").forEach((el) => {
      const id = el.dataset.copy; if (!(id in COPY)) return;
      if (el.tagName === "META") el.setAttribute("content", COPY[id].replace(/\n/g, " "));
      else if (el.tagName === "TITLE") document.title = COPY[id];
      else el.innerHTML = et(id);
    });
    const attr = (sel, key, name) => $$(sel).forEach((el) => { const id = el.dataset[key]; if (id in COPY) el.setAttribute(name, COPY[id].replace(/\n/g, " ")); });
    attr("[data-copy-ph]", "copyPh", "placeholder");
    attr("[data-copy-aria]", "copyAria", "aria-label");
    attr("[data-copy-alt]", "copyAlt", "alt");
    $$("[data-mail]").forEach((el) => (el.href = `mailto:${mail()}`));
    marquee();
    countAll(true);
  }
  // 흐르는 글자: 같은 낱말을 여러 번 이어 붙여 끊김 없이 돈다
  const marquee = () => ($("#marquee").innerHTML = Array.from({ length: 12 }, (_, i) => `<li${i ? ' aria-hidden="true"' : ' data-copy-dyn="F-03"'}>${et("F-03") || "PONDMAKERS"}</li>`).join(""));
  marquee();

  // ---------- 머리글 ----------
  const hd = $("#hd");
  const onScroll = () => {
    hd.classList.toggle("scrolled", scrollY > 40);
    $("#top-btn").classList.toggle("show", scrollY > innerHeight);
    tech();
  };
  addEventListener("scroll", onScroll, { passive: true });
  const menu = (open) => { document.body.classList.toggle("menu-open", open); $("#menu-btn").setAttribute("aria-expanded", String(open)); const label = t(open ? "K-05" : "K-04"); if (label) $("#menu-btn").setAttribute("aria-label", label); };
  $("#menu-btn").addEventListener("click", () => menu(!document.body.classList.contains("menu-open")));
  $("#gnb").addEventListener("click", (e) => { if (e.target.closest("a")) menu(false); });
  $("#top-btn").addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));

  // 언어 선택: 고른 언어를 쿠키(lang)에 남겨 두면 첫 화면(/)의 나라별 자동 이동보다 앞선다(functions/_middleware.js)
  const langBtn = $("#lang-btn"), langList = $("#lang-list");
  const langOpen = (open) => { langList.hidden = !open; langBtn.setAttribute("aria-expanded", String(open)); };
  $("#lang-now").textContent = { ko: "KO", en: "EN", ja: "JP" }[LANG];
  langList.querySelectorAll("a").forEach((a) => {
    if (a.dataset.langLink === LANG) a.setAttribute("aria-current", "true");
    a.addEventListener("click", () => { try { document.cookie = `lang=${a.dataset.langLink}; path=/; max-age=31536000; samesite=lax`; } catch (e) {} });
  });
  langBtn.addEventListener("click", (e) => { e.stopPropagation(); langOpen(langList.hidden); });
  document.addEventListener("click", (e) => { if (!e.target.closest("#lang")) langOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !langList.hidden) { langOpen(false); langBtn.focus(); } });
  // 지금 보고 있는 구역의 메뉴에 표시
  const navIO = new IntersectionObserver((list) => list.forEach((en) => {
    if (en.isIntersecting) $$("#gnb a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${en.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section").forEach((s) => navIO.observe(s));

  // ---------- 1. 첫 화면 슬라이드 ----------
  const slides = $$("#slides .slide");
  let cur = 0, timer = 0;
  function show(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle("on", k === cur); s.setAttribute("aria-hidden", String(k !== cur)); });
    $("#slide-now").textContent = cur + 1;
    const c = $("#slide-count"); c.classList.remove("run"); void c.offsetWidth;
    clearTimeout(timer);
    if (!reduced && !PREVIEW) { c.classList.add("run"); timer = setTimeout(() => show(cur + 1), 5000); }
  }
  $("#slide-prev").addEventListener("click", () => show(cur - 1));
  $("#slide-next").addEventListener("click", () => show(cur + 1));
  show(0);

  // ---------- 나타나기와 숫자 세기 ----------
  const revealIO = new IntersectionObserver((list) => list.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in"); revealIO.unobserve(en.target);
  }), { rootMargin: "0px 0px -10% 0px" });
  $$("[data-reveal]").forEach((el) => revealIO.observe(el));

  // "20M+"처럼 앞 숫자만 0부터 세고 뒤 글자는 그대로 둔다
  let counted = false;
  function countAll(instant) {
    $$("[data-count]").forEach((el) => {
      const text = t(el.dataset.copy) || el.textContent;
      const m = text.match(/^([\d,.]+)(.*)$/s);
      if (!m || instant || reduced) { el.textContent = text; return; }
      const end = Number(m[1].replace(/,/g, "")), rest = m[2], start = performance.now(), dur = 1600;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString(LOCALE) + rest;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  new IntersectionObserver((list, io) => {
    if (list.some((en) => en.isIntersecting) && !counted && !PREVIEW) { counted = true; countAll(false); io.disconnect(); }
  }, { threshold: 0.3 }).observe($("#stats"));

  // ---------- 4. 문화기술비전: 구역을 지나는 정도에 따라 장면 1 → 2 ----------
  const techBox = $("#section04");
  let techStep = -1;
  function tech(force) {
    const r = techBox.getBoundingClientRect();
    const p = (-r.top) / Math.max(1, r.height - innerHeight);
    const step = force ?? (p > 0.5 ? 1 : 0);
    if (step === techStep) return;
    techStep = step;
    $$(".tech-tags > *, .tech-thumbs figure, .tech-titles > *, .tech-dots i").forEach((el) => el.classList.toggle("on", [...el.parentElement.children].indexOf(el) === step));
  }

  // ---------- 5. 뉴스 ----------
  let NEWS = [];
  function renderNews() {
    const box = $("#news");
    const at = (u) => (isRelative(u) ? ROOT + u : u);
    box.innerHTML = NEWS.length ? NEWS.map((n) => `<div class="news-item"><a href="${esc(n.url ? at(n.url) : "#section05")}"${n.url ? ' target="_blank" rel="noopener"' : ""}><img src="${esc(at(n.image))}" alt="${esc(n.alt || n.title)}" loading="lazy" draggable="false"><strong>${esc(n.title)}</strong></a></div>`).join("")
      : `<p class="news-empty" data-copy-dyn="G-04">${et("G-04")}</p>`;
    // 링크가 없는 뉴스는 눌러도 움직이지 않는다
    box.querySelectorAll('a[href="#section05"]').forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
  }
  // 마우스로 끌어서 넘기기(터치는 기본 가로 스크롤)
  (() => {
    const box = $("#news");
    let down = false, x0 = 0, s0 = 0, moved = false;
    box.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; x0 = e.clientX; s0 = box.scrollLeft; });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 5) { moved = true; box.classList.add("drag"); }
      box.scrollLeft = s0 - dx;
    });
    addEventListener("pointerup", () => { down = false; setTimeout(() => box.classList.remove("drag"), 0); });
    box.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);
  })();

  // ---------- 6. 문의 ----------
  const form = $("#inquiry");
  const msg = (html) => ($("#form-msg").innerHTML = html);
  const siteKey = form.dataset.turnstile;
  if (siteKey) {
    // Cloudflare Turnstile: 사이트 키가 있을 때만 불러온다
    const box = $("#captcha"); box.hidden = false;
    window.onTurnstileLoad = () => window.turnstile.render(box, { sitekey: siteKey, theme: "dark", language: LANG });
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"; s.async = true;
    document.head.appendChild(s);
  }
  // 굿 파트너스 카드는 문의 항목을 '굿덕 파트너십 문의'로 맞춘다
  $("[data-partner]").addEventListener("click", () => { $("#q-type").selectedIndex = 0; });

  $("#policy-open").addEventListener("click", () => $("#policy").showModal());
  $("#policy").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const id of ["q-name", "q-phone", "q-email", "q-body"]) {
      const el = $(`#${id}`);
      if (!el.value.trim() || (el.type === "email" && !el.checkValidity())) {
        const field = el.closest(".form-row").querySelector("label span").textContent;
        msg(et("H-26", { field })); el.focus(); return;
      }
    }
    if (!$("#q-agree").checked) { msg(et("H-27")); $("#q-agree").focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    data.type = $("#q-type").value;
    const btn = $("#q-submit"); btn.disabled = true; msg(et("H-28"));
    try {
      data.lang = LANG;
      const res = await fetch(ROOT + "api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.status);
      form.reset(); window.turnstile?.reset();
      msg(et("H-24"));
    } catch (err) {
      // 서버 설정 전이거나 실패하면 메일로 보내도록 안내한다(입력한 내용을 담은 메일 쓰기 링크)
      const subject = `[${data.type}] ${data.name || ""}`;
      const lines = [`${t("H-09")}: ${data.type}`, `${t("H-13")}: ${data.name}`, `${t("H-15")}: ${data.phone}`, `${t("H-17")}: ${data.email}`, "", data.message];
      const href = `mailto:${mail()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      msg(et("H-25", { mail: `__MAIL__` }).replace("__MAIL__", `<a href="${esc(href)}">${esc(mail())}</a>`));
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- 시작 ----------
  const loadCopy = fetch(ROOT + (LANG === "ko" ? "data/copy.json" : `data/copy.${LANG}.json`)).then((r) => (r.ok ? r.json() : null)).then((c) => { if (c) { COPY = c.items; applyStatic(); } }).catch(() => {});
  // 아티스트 캐러셀: 굿덕 API(서버 functions/api/artists.js)에서 멤버십·프라이빗 채팅 판매 중 아티스트를 팔로우 많은 순으로.
  // 굿덕이 실패하거나 로컬 미리보기처럼 서버가 없으면 data/news.json의 고정 목록을 쓴다.
  const getJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const loadNews = getJson(ROOT + "api/artists?limit=20")
    .then((j) => { if (!j.artists || !j.artists.length) throw new Error("empty"); NEWS = j.artists.map((a) => ({ title: a.nameEn, image: a.imageUrl })); })
    .catch(() => getJson(ROOT + "data/news.json").then((j) => { NEWS = j.news || []; }))
    .catch(() => { NEWS = []; });
  let ready = false;
  Promise.all([loadCopy, loadNews]).then(() => {
    renderNews(); onScroll();
    ready = true;
    window.dispatchEvent(new Event("pond:ready"));
  });

  // 어드민 미리보기용: 저장 전 문구를 넣어 보고, 고른 문구가 있는 곳을 보여 준다.
  window.pondPreview = {
    get ready() { return ready; },
    setCopy(items) { COPY = { ...items }; applyStatic(); renderNews(); },
    showFor(id) {
      // 첫 화면 문구는 그 문구가 있는 장으로, 문화기술 문구는 그 장면으로, 개인정보 안내는 창을 열어 보여 준다
      const slide = { "C-01": 0, "C-02": 0, "C-03": 1, "C-04": 1, "C-05": 2, "C-06": 2, "C-07": 3, "C-08": 3 }[id];
      if (slide !== undefined) show(slide);
      const scene = { "F-04": 0, "F-06": 0, "F-05": 1, "F-07": 1 }[id];
      if (scene !== undefined) { techStep = -1; tech(scene); }
      const dlg = $("#policy");
      if (id.startsWith("I-")) { if (!dlg.open) dlg.showModal(); } else if (dlg.open) dlg.close();
      if (id.startsWith("H-2") && ["H-24", "H-25", "H-26", "H-27", "H-28"].includes(id)) msg(et(id, { field: t("H-13"), mail: mail() }));
      $$("[data-reveal]").forEach((el) => el.classList.add("in"));
      return $$(`[data-copy="${id}"], [data-copy-dyn="${id}"], [data-copy-ph="${id}"], [data-copy-aria="${id}"], [data-copy-alt="${id}"], #form-msg`).filter((el) => (el.id !== "form-msg" || /^H-2[4-8]$/.test(id)) && (el.offsetParent || el.closest("dialog[open]") || el.closest(".tech-col")));
    }
  };
})();
