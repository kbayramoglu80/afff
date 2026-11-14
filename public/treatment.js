const titleElement = document.getElementById("page-title");
const summaryElement = document.getElementById("page-summary");
const contentElement = document.getElementById("page-content");
const errorElement = document.getElementById("page-error");
const languageToggle = document.getElementById("language-toggle");
const languageStorageKey = "site-language";
let treatment = null;
let language = localStorage.getItem(languageStorageKey) === "en" ? "en" : "tr";

function localizedValue(field) {
  const translated = treatment[`${field}En`];
  return language === "en" && translated ? translated : treatment[`${field}Tr`];
}

function renderTreatment() {
  document.documentElement.lang = language;
  const defaultSuffix = language === "tr" ? "Doç. Dr. Mesut Karıksız" : "Assoc. Prof. Mesut Karıksız";
  const seoTitle = localizedValue("seoTitle") || `${localizedValue("title")} | ${defaultSuffix}`;
  const seoDescription = localizedValue("seoDescription") || localizedValue("summary");
  document.title = seoTitle;
  document.querySelector('meta[name="description"]').content = seoDescription;
  document.querySelector('meta[property="og:title"]').content = seoTitle;
  document.querySelector('meta[property="og:description"]').content = seoDescription;
  document.querySelector('meta[name="twitter:title"]').content = seoTitle;
  document.querySelector('meta[name="twitter:description"]').content = seoDescription;
  titleElement.textContent = localizedValue("title");
  summaryElement.textContent = localizedValue("summary");
  languageToggle.textContent = language === "tr" ? "EN" : "TR";
  document.getElementById("page-eyebrow").textContent = language === "tr" ? "Tedavi alanı" : "Treatment area";
  document.getElementById("back-link").textContent = language === "tr" ? "TEDAVİ ALANLARI" : "TREATMENT AREAS";
  document.getElementById("contact-link").textContent = language === "tr" ? "İletişim ve randevu" : "Contact and appointments";
  contentElement.replaceChildren();
  localizedValue("content").split(/\n{2,}/).filter(Boolean).forEach(text => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    contentElement.append(paragraph);
  });
  renderReferences(localizedValue("references"));
}

function renderReferences(value) {
  const container = document.getElementById("page-references");
  container.replaceChildren();
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return;

  const section = document.createElement("section");
  section.className = "references";
  const heading = document.createElement("h2");
  heading.textContent = language === "tr" ? "Bilimsel kaynaklar" : "Scientific references";
  const list = document.createElement("ol");
  for (const line of lines) {
    const [citation, href] = line.split("|").map(part => part.trim());
    let url;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (!citation || url.protocol !== "https:") continue;
    const link = document.createElement("a");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = citation;
    const item = document.createElement("li");
    item.append(link);
    list.append(item);
  }
  if (list.childElementCount) {
    section.append(heading, list);
    container.append(section);
  }
}

languageToggle.addEventListener("click", () => {
  language = language === "tr" ? "en" : "tr";
  localStorage.setItem(languageStorageKey, language);
  renderTreatment();
});

async function loadTreatment() {
  try {
    const slug = decodeURIComponent(window.location.pathname.split("/").pop());
    const response = await fetch(`/api/treatments/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Tedavi sayfası yüklenemedi.");
    treatment = result;
    renderTreatment();
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  }
}

loadTreatment();
