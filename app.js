const data = window.MANUAL_DATA;

const sectionLabels = [
  { id: "startup", label: "เปิดใช้งานเครื่อง", number: "01", icon: "⏻" },
  { id: "controls", label: "โปรแกรมควบคุม", number: "02", icon: "▣" },
  { id: "dateFilm", label: "เปลี่ยนฟิล์มวันที่", number: "03", icon: "◆" },
  { id: "productFilm", label: "เปลี่ยนฟิล์มบรรจุ", number: "04", icon: "◫" },
  { id: "setup", label: "ตั้งค่าก่อนใช้งาน", number: "05", icon: "☑" },
  { id: "checklist", label: "Checklist ก่อนเดินเครื่อง", number: "06", icon: "✓" },
  { id: "troubleshooting", label: "ปัญหาและวิธีแก้", number: "07", icon: "!" },
  { id: "maintenance", label: "บำรุงรักษา", number: "08", icon: "◎" },
];

const nav = document.querySelector("#nav");
const quickActions = document.querySelector("#quickActions");
const manualContent = document.querySelector("#manualContent");
const resultsMeta = document.querySelector("#resultsMeta");
const searchInput = document.querySelector("#searchInput");
const dialog = document.querySelector("#imageDialog");
const dialogImage = dialog.querySelector("img");
const dialogText = dialog.querySelector("p");

let activeSection = "all";
let query = "";

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text) {
  const safeText = escapeHtml(text || "");
  if (!query) return safeText;
  return safeText.replace(new RegExp(`(${escapeRegExp(escapeHtml(query))})`, "gi"), "<mark>$1</mark>");
}

function compactTitle(text) {
  return text.replace(/^\d+(\.\d+)*\s*/, "").replace(/^[A-H]\.\s*/, "").trim();
}

function sectionTitle(sectionId) {
  return sectionLabels.find((section) => section.id === sectionId)?.label || sectionId;
}

function isSectionHeading(sectionId, text) {
  if (!text) return false;
  const label = sectionTitle(sectionId);
  return compactTitle(text).includes(label.replace("Checklist ก่อนเดินเครื่อง", "Check list สำหรับตรวจสอบก่อนเดินเครื่อง"));
}

function isImportant(text) {
  return /ระวัง|ไม่แนะนำ|เสียหาย|Heater|RUN|Emergency|อุณหภูมิ|หยุด|แฟบ|รั่ว|ตัน/.test(text);
}

function isStepTitle(text) {
  return /^(\d+(\.\d+)*|[A-H]\.)\s*/.test(text);
}

function splitBulletText(text) {
  const normalized = text
    .replace(/\s+-\s+/g, "\n- ")
    .replace(/\s+(?=\d+\.\d+\s)/g, "\n")
    .replace(/\s+(?=[A-H]\.\s)/g, "\n")
    .trim();

  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const title = lines.shift() || text;
  const bullets = lines.map((line) => line.replace(/^-\s*/, ""));
  return { title, bullets };
}

function checklistFromText(text) {
  const prepared = text
    .replace(/\s+(?=6\.\d)/g, "\n")
    .replace(/\s+-\s+/g, "\n- ")
    .replace(/\s+(?=\d+\.\d+\.\d)/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  let currentGroup = "";
  for (const line of prepared) {
    if (/^6\.\d/.test(line)) {
      currentGroup = line.replace(/^6\.\d(\.\d)?\s*/, "");
      items.push({ group: currentGroup, text: currentGroup, heading: true });
    } else if (line.startsWith("-")) {
      items.push({ group: currentGroup, text: line.replace(/^-\s*/, ""), heading: false });
    }
  }
  return items.filter((item) => item.text && !/^บทที่/.test(item.text));
}

function normalizeBlocks(sectionId) {
  const rawBlocks = data.sections[sectionId] || [];
  const result = [];

  for (const block of rawBlocks) {
    const text = (block.text || "").trim();
    const images = block.images || [];
    if (!text && images.length && result.length) {
      result[result.length - 1].images.push(...images);
      continue;
    }
    if (isSectionHeading(sectionId, text)) continue;
    if (!result.length && !images.length && (/^\d+\.\s/.test(text) || /^บทที่/.test(text))) continue;
    if (sectionId === "checklist") {
      const items = checklistFromText(text);
      for (const item of items) result.push({ type: "check", text: item.text, heading: item.heading, images: [] });
      continue;
    }
    if (!text && !images.length) continue;

    const type = sectionId === "troubleshooting" ? "problem" : sectionId === "maintenance" ? "maintenance" : "step";
    result.push({ type, text, images: [...images] });
  }

  return result;
}

function blockMatches(block) {
  if (!query) return true;
  const haystack = [block.text, ...(block.images || []).map((image) => image.alt)].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function visibleSections() {
  return sectionLabels
    .filter((section) => activeSection === "all" || activeSection === section.id)
    .map((section) => ({ ...section, blocks: normalizeBlocks(section.id).filter(blockMatches) }))
    .filter((section) => section.blocks.length);
}

function renderNav() {
  nav.innerHTML = "";
  const allButton = document.createElement("button");
  allButton.className = `nav-button ${activeSection === "all" ? "active" : ""}`;
  allButton.innerHTML = `<span class="nav-number">ALL</span><span>ทั้งหมด</span>`;
  allButton.addEventListener("click", () => {
    activeSection = "all";
    render();
  });
  nav.append(allButton);

  for (const section of sectionLabels) {
    const button = document.createElement("button");
    button.className = `nav-button ${activeSection === section.id ? "active" : ""}`;
    button.innerHTML = `<span class="nav-number">${section.number}</span><span>${section.label}</span>`;
    button.addEventListener("click", () => {
      activeSection = section.id;
      render();
      document.querySelector(".content").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nav.append(button);
  }
}

function renderQuickActions() {
  quickActions.innerHTML = "";
  for (const item of data.quickActions) {
    const card = document.createElement("button");
    card.className = "quick-card";
    card.type = "button";
    card.innerHTML = `<strong>${highlight(item.label)}</strong><span>${highlight(item.hint)}</span>`;
    card.addEventListener("click", () => {
      activeSection = item.id;
      query = "";
      searchInput.value = "";
      render();
    });
    quickActions.append(card);
  }
}

function renderGallery(images) {
  if (!images.length) return "";
  return `
    <div class="gallery ${images.length === 1 ? "single" : ""}">
      ${images
        .map(
          (image) => `
            <button type="button" data-src="${image.src}" data-alt="${escapeHtml(image.alt)}">
              <img src="${image.src}" alt="${escapeHtml(image.alt)}" loading="lazy">
              <span>กดเพื่อดูรูปใหญ่</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTextBody(text) {
  const { title, bullets } = splitBulletText(text);
  if (!bullets.length) return `<p>${highlight(text)}</p>`;
  return `
    <p class="step-title">${highlight(title)}</p>
    <ul class="detail-list">
      ${bullets.map((item) => `<li>${highlight(item)}</li>`).join("")}
    </ul>
  `;
}

function renderStep(block, section, index) {
  const label = block.text.match(/^(\d+(\.\d+)*|[A-H]\.)/)?.[1] || `${section.number}.${index + 1}`;
  return `
    <article class="manual-card ${isImportant(block.text) ? "is-note" : ""}">
      <div class="card-marker">${escapeHtml(label)}</div>
      <div class="card-body">
        ${isStepTitle(block.text) ? renderTextBody(block.text) : `<p>${highlight(block.text)}</p>`}
        ${renderGallery(block.images)}
      </div>
    </article>
  `;
}

function renderCheck(block, section, index) {
  if (block.heading) {
    return `<h3 class="check-heading">${highlight(block.text)}</h3>`;
  }
  return `
    <label class="check-card">
      <input type="checkbox" data-check="${section.id}-${index}">
      <span>${highlight(block.text)}</span>
    </label>
  `;
}

function renderProblem(block) {
  const { title, bullets } = splitBulletText(block.text);
  return `
    <article class="problem-card">
      <h3>${highlight(compactTitle(title))}</h3>
      ${bullets.length ? `<ul class="detail-list">${bullets.map((item) => `<li>${highlight(item)}</li>`).join("")}</ul>` : ""}
    </article>
  `;
}

function renderBlock(block, section, index) {
  if (block.type === "check") return renderCheck(block, section, index);
  if (block.type === "problem" || block.type === "maintenance") return renderProblem(block);
  return renderStep(block, section, index);
}

function renderContent() {
  const sections = visibleSections();
  const blockCount = sections.reduce((sum, section) => sum + section.blocks.length, 0);
  resultsMeta.textContent = query
    ? `พบ ${blockCount} รายการจากคำค้น "${query}"`
    : "เลือกหมวดหรือค้นหาคำที่ต้องการ เช่น Heater, ฟิล์ม, RUN, ระบบลม";

  if (!sections.length) {
    manualContent.innerHTML = `<div class="empty">ไม่พบข้อมูลที่ตรงกับคำค้น ลองค้นด้วยคำสั้นลง เช่น "ลม", "ฟิล์ม", "ซีล"</div>`;
    return;
  }

  manualContent.innerHTML = sections
    .map(
      (section) => `
        <section class="section" id="${section.id}">
          <div class="section-header">
            <div class="section-badge">${section.number}</div>
            <div>
              <p>${section.icon} หมวดคู่มือ</p>
              <h2>${section.label}</h2>
            </div>
          </div>
          <div class="${section.id === "checklist" ? "check-grid" : "section-body"}">
            ${section.blocks.map((block, index) => renderBlock(block, section, index)).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function render() {
  renderNav();
  renderQuickActions();
  renderContent();
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value.trim();
  renderContent();
});

manualContent.addEventListener("click", (event) => {
  const button = event.target.closest(".gallery button");
  if (!button) return;
  dialogImage.src = button.dataset.src;
  dialogImage.alt = button.dataset.alt;
  dialogText.textContent = button.dataset.alt;
  dialog.showModal();
});

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

render();
