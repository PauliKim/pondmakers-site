// 아티스트 노출 관리: 굿덕 후보 목록(/api/artists-admin)에서 홈페이지 캐러셀에 숨길 아티스트를 고른다.
// 저장하면 서버가 data/artists-hidden.json을 main에 커밋하고, 홈페이지 서버(/api/artists)가 그 아티스트를 뺀다.
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SHOWN = 20; // 홈페이지가 부르는 수(app.js의 limit)

  let artists = [];        // 굿덕 후보(팔로우 많은 순)
  let saved = new Map();   // 저장된 숨김 id → 이름
  let draft = new Map();   // 지금 고른 숨김 id → 이름
  let sha = null;
  let canSave = false;

  function notice(text, kind = "") {
    const el = $("#notice");
    el.hidden = !text; el.textContent = text || ""; el.className = `notice ${kind}`;
  }
  const changed = () => {
    const add = [...draft.keys()].filter((id) => !saved.has(id));
    const remove = [...saved.keys()].filter((id) => !draft.has(id));
    return { add, remove, n: add.length + remove.length };
  };
  function refreshStatus() {
    const { n } = changed();
    $("#status").textContent = n ? `저장하지 않은 변경 ${n}개 · 숨김 ${draft.size}명` : `숨김 ${draft.size}명 · 후보 ${artists.length}명`;
    $("#status").classList.toggle("changed", n > 0);
    $("#save").disabled = !canSave || !n;
    $("#save").title = canSave ? "" : "로그인 후 저장할 수 있습니다";
    $("#revert").disabled = !n;
  }

  function render() {
    const q = $("#search").value.trim().toLowerCase();
    let rank = 0;
    $("#grid").innerHTML = artists.map((a) => {
      const hidden = draft.has(a.id);
      if (!hidden) rank += 1;
      if (q && !`${a.nameEn} ${a.id}`.toLowerCase().includes(q)) return "";
      const place = hidden ? '<span class="tag tag-locked">숨김</span>' : rank <= SHOWN ? `<span class="tag tag-changed">${rank}번째</span>` : '<span class="tag tag-locked">20위 밖</span>';
      return `<li class="artist${hidden ? " is-hidden" : ""}">
        <img src="${esc(a.imageUrl)}" alt="" loading="lazy">
        <div class="artist-body">
          <div class="artist-name">${esc(a.nameEn)}</div>
          <div class="artist-meta">${esc(a.id)} · 팔로우 ${Number(a.followerCount).toLocaleString("ko-KR")}</div>
          <div class="artist-foot">${place}
            <label class="artist-toggle"><input type="checkbox" data-id="${esc(a.id)}" data-name="${esc(a.nameEn)}" ${hidden ? "checked" : ""}> 숨김</label>
          </div>
        </div>
      </li>`;
    }).join("") || '<li class="empty-search">찾는 아티스트가 없습니다.</li>';
    // 숨김 목록에 있지만 지금 후보에 없는 아티스트(판매 종료 등)
    const ids = new Set(artists.map((a) => a.id));
    const gone = [...draft.entries()].filter(([id]) => !ids.has(id));
    $("#gone").hidden = !gone.length;
    $("#gone-list").innerHTML = gone.map(([id, name]) => `<li><label><input type="checkbox" data-id="${esc(id)}" data-name="${esc(name)}" checked> ${esc(name || id)} <span class="artist-meta">${esc(id)}</span></label></li>`).join("");
    refreshStatus();
  }

  document.addEventListener("change", (e) => {
    const box = e.target.closest("input[type=checkbox][data-id]"); if (!box) return;
    if (box.checked) draft.set(box.dataset.id, box.dataset.name); else draft.delete(box.dataset.id);
    render();
  });
  $("#search").addEventListener("input", render);
  $("#revert").addEventListener("click", () => { draft = new Map(saved); render(); });
  window.addEventListener("beforeunload", (e) => { if (changed().n) { e.preventDefault(); e.returnValue = ""; } });

  const nameOf = (id) => draft.get(id) || saved.get(id) || id;
  $("#save").addEventListener("click", () => {
    const { add, remove } = changed(); if (!add.length && !remove.length) return;
    $("#diff").innerHTML = [
      ...add.map((id) => `<li><span class="id">숨김</span><span class="after">${esc(nameOf(id))}</span></li>`),
      ...remove.map((id) => `<li><span class="id">다시 보임</span><span class="after">${esc(nameOf(id))}</span></li>`)
    ].join("");
    $("#confirm").showModal();
  });
  $("#confirm").addEventListener("close", async () => {
    if ($("#confirm").returnValue !== "ok") return;
    $("#save").disabled = true; $("#status").textContent = "저장하는 중";
    try {
      const hidden = [...draft.entries()].map(([id, name]) => ({ id, name }));
      const res = await fetch("../api/artists-admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hidden, sha }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `저장하지 못했습니다(${res.status}).`);
      saved = new Map(draft); sha = body.sha;
      notice("저장했습니다. 1~2분 뒤 홈페이지 캐러셀에 반영됩니다.", "ok");
    } catch (err) {
      notice(err.message, "error");
    }
    render();
  });

  async function start() {
    try {
      const res = await fetch("../api/artists-admin", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `서버에 연결하지 못했습니다(${res.status}).`);
      artists = body.artists || []; sha = body.sha; canSave = true;
      saved = new Map((body.hidden || []).map((h) => [String(h.id), h.name || ""]));
      $("#who").textContent = body.email;
      if (body.generatedAt) notice(`굿덕 목록 기준 시각: ${new Date(body.generatedAt).toLocaleString("ko-KR")}`);
    } catch (e) {
      // 로그인이나 설정이 없을 때: 공개된 숨김 목록만 보여 준다
      const doc = await fetch("../data/artists-hidden.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ hidden: [] }));
      saved = new Map((doc.hidden || []).map((h) => [String(h.id), h.name || ""]));
      notice(`굿덕 목록을 불러오지 못해 볼 수만 있습니다. ${e.message}`, "error");
    }
    draft = new Map(saved);
    render();
  }
  start();
})();
