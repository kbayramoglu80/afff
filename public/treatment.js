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
  document.title = `${localizedValue("title")} | Doç. Dr. Mesut Karıksız`;
  document.querySelector('meta[name="description"]').content = localizedValue("summary");
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
    titleElement.textContent = language === "tr" ? "Sayfa bulunamadı" : "Page not found";
    summaryElement.textContent = "";
    document.getElementById("contact-link").hidden = true;
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  }
}

loadTreatment();
