const data = window.MANUAL_DATA;

const sectionLabels = [
  ["startup", "1. เปิดใช้งานเครื่อง"],
  ["controls", "2. โปรแกรมควบคุม"],
  ["dateFilm", "3. เปลี่ยนฟิล์มวันที่"],
  ["productFilm", "4. เปลี่ยนฟิล์มบรรจุ"],
  ["setup", "5. ตั้งค่าก่อนใช้งาน"],
  ["checklist", "6. Checklist ก่อนเดินเครื่อง"],
  ["troubleshooting", "7. ปัญหาและวิธีแก้"],
  ["maintenance", "8. บำรุงรักษา"],
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text) {
  if (!query || !text) return text;
  return text.replace(new RegExp(`(${escapeRegExp(query)})`, "gi"), "<mark>$1</mark>");
}

function classifyBlock(sectionId, text) {
  if (sectionId === "troubleshooting") return "problem";
  if (/ไม่แนะนำ|ระวัง|เสียหาย|อุณหภูมิ|Heater|RUN/.test(text)) return "note";
  return "";
}

function isTitleLike(text) {
  return /^(\d+(\.\d+)*|[A-H]\.)/.test(text) || /^บทที่/.test(text);
}

function blockMatches(block) {
  if (!query) return true;
  return block.text.toLowerCase().includes(query.toLowerCase());
}

function visibleSections() {
  return sectionLabels
    .filter(([id]) => activeSection === "all" || activeSection === id)
    .map(([id, label]) => {
      const blocks = (data.sections[id] || []).filter(blockMatches);
      return { id, label, blocks };
    })
    .filter((section) => section.blocks.length);
}

function renderNav() {
  nav.innerHTML = "";
  const allButton = document.createElement("button");
  allButton.className = `nav-button ${activeSection === "all" ? "active" : ""}`;
  allButton.textContent = "ทั้งหมด";
  allButton.addEventListener("click", () => {
    activeSection = "all";
    render();
  });
  nav.append(allButton);

  for (const [id, label] of sectionLabels) {
    const button = document.createElement("button");
    button.className = `nav-button ${activeSection === id ? "active" : ""}`;
    button.textContent = label;
    button.addEventListener("click", () => {
      activeSection = id;
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
    card.innerHTML = `<strong>${item.label}</strong><span>${item.hint}</span>`;
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
    <div class="gallery">
      ${images
        .map(
          (image) => `
            <button type="button" data-src="${image.src}" data-alt="${image.alt}">
              <img src="${image.src}" alt="${image.alt}" loading="lazy">
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBlock(block, sectionId, index) {
  const text = block.text || "";
  const title = isTitleLike(text);
  const checkable = sectionId === "checklist" && text;
  const body = title
    ? `<p class="step-title">${highlight(text)}</p>`
    : `<p>${highlight(text)}</p>`;
  const content = checkable
    ? `<label class="check-row"><input type="checkbox" data-check="${sectionId}-${index}"><span>${highlight(text)}</span></label>`
    : body;

  return `
    <article class="block ${classifyBlock(sectionId, text)}">
      ${text ? content : ""}
      ${renderGallery(block.images || [])}
    </article>
  `;
}

function renderContent() {
  const sections = visibleSections();
  const blockCount = sections.reduce((sum, section) => sum + section.blocks.length, 0);
  resultsMeta.textContent = query
    ? `พบ ${blockCount} รายการจากคำค้น "${query}"`
    : "เลือกหมวดด้านซ้ายหรือค้นหาคำที่ต้องการ";

  if (!sections.length) {
    manualContent.innerHTML = `<div class="empty">ไม่พบข้อมูลที่ตรงกับคำค้น ลองค้นด้วยคำสั้นลง เช่น "ลม", "ฟิล์ม", "ซีล"</div>`;
    return;
  }

  manualContent.innerHTML = sections
    .map(
      (section) => `
        <section class="section" id="${section.id}">
          <div class="section-header">
            <h2>${section.label}</h2>
          </div>
          ${section.blocks.map((block, index) => renderBlock(block, section.id, index)).join("")}
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
