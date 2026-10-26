// SEO 설정: 검색·공유 문구(언어별 A-01~A-04), 링크 미리보기 이미지, 검색 노출, 검색엔진 소유 확인, 회사 정보.
// 저장하면 서버(/api/seo)가 data/seo.json·copy 파일·세 언어 페이지·새 이미지를 커밋 하나로 main에 올린다.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LANGS = { ko: "한국어", en: "영어", ja: "일본어" };
  const COPY_FILES = { ko: "copy.json", en: "copy.en.json", ja: "copy.ja.json" };
  const IDS = ["A-01", "A-02", "A-03", "A-04"];
  const NAMES = { "A-01": "페이지 제목", "A-02": "검색 결과 설명", "A-03": "링크 미리보기 제목", "A-04": "링크 미리보기 설명" };
  // 검색 결과에서 잘리지 않는 대략의 길이(영어는 글자가 좁아 두 배)
  const LIMIT = { "A-01": { ko: 30, ja: 30, en: 60 }, "A-02": { ko: 80, ja: 80, en: 155 }, "A-03": { ko: 40, ja: 40, en: 80 }, "A-04": { ko: 60, ja: 60, en: 120 } };
  const SITE = "https://www.pondmakers.com/";
  const OG = { w: 1200, h: 630 };
  const VERIFY = { google: "Google", naver: "네이버", bing: "Bing" };

  let saved = null;   // { seo, texts: { ko: { sha, items } } }
  let draft = null;
  let seoSha = null;
  let image = null;   // 새로 고른 그림 { base64, url }
  let lang = "ko";
  let canSave = false;

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const code = (v) => { const s = String(v ?? "").trim(); const m = s.match(/content\s*=\s*["']([^"']*)["']/i); return (m ? m[1] : s).trim(); };

  function notice(text, kind = "") {
    const el = $("#notice");
    el.hidden = !text; el.textContent = text || ""; el.className = `notice ${kind}`;
  }

  // 저장 전과 다른 것들 → [{ what, before, after }]
  function changes() {
    if (!saved) return [];
    const out = [];
    for (const l of Object.keys(LANGS)) for (const id of IDS) {
      const a = saved.texts[l].items[id], b = draft.texts[l].items[id];
      if (a !== b) out.push({ what: `${LANGS[l]} ${NAMES[id]} (${id})`, before: a, after: b });
    }
    const s = saved.seo, d = draft.seo;
    if (image) out.push({ what: "링크 미리보기 이미지", before: s.ogImage, after: "새 그림(1200×630)" });
    if (s.index !== d.index) out.push({ what: "검색 노출", before: s.index ? "노출" : "숨김", after: d.index ? "노출" : "숨김" });
    for (const k of Object.keys(VERIFY)) {
      if (code(s.verification[k]) !== code(d.verification[k])) out.push({ what: `${VERIFY[k]} 소유 확인`, before: s.verification[k] || "(없음)", after: code(d.verification[k]) || "(없음)" });
    }
    if (s.organization.name !== d.organization.name) out.push({ what: "회사 이름", before: s.organization.name, after: d.organization.name });
    if (s.organization.alternateName !== d.organization.alternateName) out.push({ what: "다른 이름", before: s.organization.alternateName, after: d.organization.alternateName });
    if (s.organization.sameAs.join("\n") !== d.organization.sameAs.join("\n")) out.push({ what: "공식 SNS 주소", before: s.organization.sameAs.join("\n") || "(없음)", after: d.organization.sameAs.join("\n") || "(없음)" });
    return out;
  }

  function refreshStatus() {
    const n = changes().length;
    $("#status").textContent = !saved ? "불러오는 중" : n ? `저장하지 않은 변경 ${n}개` : "저장된 설정과 같습니다";
    $("#status").classList.toggle("changed", n > 0);
    $("#save").disabled = !canSave || !n;
    $("#save").title = canSave ? "" : "로그인 후 저장할 수 있습니다";
    $("#revert").disabled = !n;
  }

  function preview() {
    const t = draft.texts[lang].items;
    $("#serp-url").textContent = SITE + (lang === "ko" ? "" : `${lang}/`);
    $("#serp-title").textContent = t["A-01"];
    $("#serp-desc").textContent = t["A-02"].replace(/\n/g, " ");
    $("#share-title").textContent = t["A-03"];
    $("#share-desc").textContent = t["A-04"].replace(/\n/g, " ");
    const src = image ? image.url : `../${draft.seo.ogImage}`;
    $("#share-img").src = src; $("#og-img").src = src;
    $("#og-meta").textContent = image ? "새 그림 · 1200×630 · 저장 전" : `${draft.seo.ogImage} · ${draft.seo.ogImageWidth}×${draft.seo.ogImageHeight}`;
    $("#og-undo").hidden = !image;
    for (const id of IDS) {
      const n = [...t[id]].length, max = LIMIT[id][lang];
      const el = $(`[data-count="${id}"]`);
      el.textContent = `${n}자 · 권장 ${max}자 이내${n > max ? " — 검색 결과에서 잘릴 수 있습니다" : ""}`;
      el.classList.toggle("over", n > max);
    }
    $("#index-warn").hidden = draft.seo.index;
    refreshStatus();
  }

  // draft → 입력칸
  function fill() {
    $$("[data-text]").forEach((el) => { el.value = draft.texts[lang].items[el.dataset.text]; });
    $$("[data-verify]").forEach((el) => { el.value = draft.seo.verification[el.dataset.verify] || ""; });
    $("[data-org=name]").value = draft.seo.organization.name;
    $("[data-org=alternateName]").value = draft.seo.organization.alternateName;
    $("[data-org=sameAs]").value = draft.seo.organization.sameAs.join("\n");
    $("#index").checked = draft.seo.index;
    $$("input, textarea").forEach((el) => { if (el.id !== "og-file") el.readOnly = !canSave; });
    $("#index").disabled = $("#og-file").disabled = !canSave;
    preview();
  }

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!draft) return;
    if (el.dataset.text) draft.texts[lang].items[el.dataset.text] = el.value;
    else if (el.dataset.verify) draft.seo.verification[el.dataset.verify] = el.value;
    else if (el.dataset.org === "sameAs") draft.seo.organization.sameAs = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    else if (el.dataset.org) draft.seo.organization[el.dataset.org] = el.value;
    else if (el.id === "index") draft.seo.index = el.checked;
    else return;
    preview();
  });
  $("#index").addEventListener("change", (e) => { draft.seo.index = e.target.checked; preview(); });

  $("#seg-lang").addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    lang = b.dataset.lang;
    $$("#seg-lang button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    fill();
  });

  // 고른 그림을 가운데 기준으로 1200×630에 맞춰 잘라 JPG로
  $("#og-file").addEventListener("change", async (e) => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      if (bmp.width < 600 || bmp.height < 315) notice(`그림이 작습니다(${bmp.width}×${bmp.height}). 1200×630 이상을 권장합니다. 그대로 쓰면 흐리게 보일 수 있습니다.`, "error");
      else notice("");
      const scale = Math.max(OG.w / bmp.width, OG.h / bmp.height);
      const w = OG.w / scale, h = OG.h / scale;
      const canvas = document.createElement("canvas");
      canvas.width = OG.w; canvas.height = OG.h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, OG.w, OG.h); // 투명한 PNG는 흰 바탕에
      ctx.drawImage(bmp, (bmp.width - w) / 2, (bmp.height - h) / 2, w, h, 0, 0, OG.w, OG.h);
      let q = 0.9, url = canvas.toDataURL("image/jpeg", q);
      while (url.length > 1_400_000 && q > 0.5) { q -= 0.1; url = canvas.toDataURL("image/jpeg", q); }
      image = { url, base64: url.slice(url.indexOf(",") + 1) };
      preview();
    } catch (err) {
      notice(`그림을 열지 못했습니다: ${err.message}`, "error");
    }
  });
  $("#og-undo").addEventListener("click", () => { image = null; preview(); });

  $("#revert").addEventListener("click", () => { draft = clone(saved); image = null; fill(); });
  window.addEventListener("beforeunload", (e) => { if (changes().length) { e.preventDefault(); e.returnValue = ""; } });

  $("#save").addEventListener("click", () => {
    const list = changes(); if (!list.length) return;
    $("#diff").innerHTML = list.map((c) => `<li><span class="id">${esc(c.what)}</span><span class="before">${esc(c.before)}</span><span class="after">${esc(c.after)}</span></li>`).join("");
    $("#confirm").showModal();
  });
  $("#confirm").addEventListener("close", async () => {
    if ($("#confirm").returnValue !== "ok") return;
    $("#save").disabled = true; $("#status").textContent = "저장하는 중";
    try {
      const texts = {};
      for (const l of Object.keys(LANGS)) {
        if (IDS.some((id) => saved.texts[l].items[id] !== draft.texts[l].items[id])) texts[l] = { sha: saved.texts[l].sha, items: draft.texts[l].items };
      }
      const seo = { ...draft.seo, verification: Object.fromEntries(Object.keys(VERIFY).map((k) => [k, code(draft.seo.verification[k])])) };
      const res = await fetch("../api/seo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seo, seoSha, texts, image: image ? image.base64 : null }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error([body.error || `저장하지 못했습니다(${res.status}).`, ...(body.details || [])].join(" "));
      image = null;
      await load(false);
      notice(body.changed ? `저장했습니다(${(body.summary || []).join(", ")}). 1~2분 뒤 운영 사이트에 반영됩니다.` : "바뀐 것이 없어 저장하지 않았습니다.", "ok");
    } catch (err) {
      notice(err.message, "error");
      refreshStatus();
    }
  });

  async function load(first = true) {
    try {
      const res = await fetch("../api/seo", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `서버에 연결하지 못했습니다(${res.status}).`);
      saved = { seo: body.seo, texts: body.texts }; seoSha = body.seoSha; canSave = true;
      $("#who").textContent = body.email;
    } catch (e) {
      if (!first) throw e;
      // 로그인이나 설정이 없을 때: 공개된 파일로 볼 수만 있게
      const get = (p) => fetch(p, { cache: "no-store" }).then((r) => r.json());
      const [seo, ...copies] = await Promise.all([get("../data/seo.json"), ...Object.values(COPY_FILES).map((f) => get(`../data/${f}`))]);
      saved = { seo, texts: Object.fromEntries(Object.keys(LANGS).map((l, i) => [l, { sha: null, items: Object.fromEntries(IDS.map((id) => [id, copies[i].items[id] || ""])) }])) };
      notice(`볼 수만 있습니다. ${e.message}`, "error");
    }
    delete saved.seo._설명;
    draft = clone(saved);
    fill();
  }
  load();
})();
