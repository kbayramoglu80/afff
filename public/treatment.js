(() => {
const titleElement = document.getElementById("page-title");
const summaryElement = document.getElementById("page-summary");
const contentElement = document.getElementById("page-content");
const errorElement = document.getElementById("page-error");
const languageStatus = document.getElementById("language-status");
const navbar = document.querySelector(".navbar");
const menuToggle = document.querySelector(".menu-toggle");
const languageButtons = document.querySelectorAll("[data-site-language]");
let treatment = null;
let language = window.location.pathname === "/en" || window.location.pathname.startsWith("/en/")
  ? "en"
  : "tr";

function localizedValue(field) {
  const translated = treatment[`${field}En`];
  const value = language === "en" && translated ? translated : treatment[`${field}Tr`];
  return typeof value === "string" ? value : "";
}

function renderTreatment() {
  const isEnglish = language === "en";
  const requestedTitle = new URLSearchParams(window.location.search).get("title")?.trim();
  const pageTitle = requestedTitle && requestedTitle.length <= 160 ? requestedTitle : localizedValue("title");
  document.documentElement.lang = language;
  const defaultSuffix = isEnglish ? "Assoc. Prof. Mesut Karıksız" : "Doç. Dr. Mesut Karıksız";
  const seoTitle = localizedValue("seoTitle") || `${pageTitle} | ${defaultSuffix}`;
  const seoDescription = localizedValue("seoDescription") || localizedValue("summary");
  document.title = seoTitle;
  document.querySelector('meta[name="description"]').content = seoDescription;
  document.querySelector('meta[property="og:title"]').content = seoTitle;
  document.querySelector('meta[property="og:description"]').content = seoDescription;
  document.querySelector('meta[name="twitter:title"]').content = seoTitle;
  document.querySelector('meta[name="twitter:description"]').content = seoDescription;
  titleElement.textContent = pageTitle;
  summaryElement.textContent = localizedValue("summary");
  navbar.setAttribute("aria-label", isEnglish ? "Main navigation" : "Ana menü");
  menuToggle.setAttribute("aria-label", isEnglish ? "Open menu" : "Menüyü aç");
  window.SiteLanguage.updateButtons(language);
  document.querySelector("footer").textContent = isEnglish
    ? "Assoc. Prof. Dr. Mesut Karıksız · Orthopedics and Traumatology"
    : "Doç. Dr. Mesut Karıksız · Ortopedi ve Travmatoloji";
  const navigationLabels = isEnglish
    ? { about: "About me", treatments: "Treatment areas", expertise: "Areas of expertise", academic: "Academic background", faq: "Frequently asked questions", contact: "Contact", admin: "Admin login" }
    : { about: "Hakkımda", treatments: "Tedavi alanları", expertise: "Çalışma alanları", academic: "Akademik", faq: "Sıkça sorulan sorular", contact: "İletişim", admin: "Yönetici girişi" };
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.textContent = navigationLabels[link.dataset.nav];
  });
  document.getElementById("page-eyebrow").textContent = isEnglish ? "Treatment area" : "Tedavi alanı";
  document.getElementById("contact-link").textContent = isEnglish ? "Contact and appointments" : "İletişim ve randevu";
  contentElement.replaceChildren();
  localizedValue("content").split(/\n{2,}/).filter(Boolean).forEach(text => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    contentElement.append(paragraph);
  });
  renderReferences(localizedValue("references"));
  const hasEnglishContent = ["title", "summary", "content"].every(field =>
    typeof treatment[`${field}En`] === "string" && treatment[`${field}En`].trim())
    && (!treatment.referencesTr || Boolean(treatment.referencesEn?.trim()));
  document.getElementById("page-language-notice").textContent = isEnglish && !hasEnglishContent
    ? "Some English content is not available yet; Turkish text is shown for those sections."
    : "";
}

function renderReferences(value) {
  const container = document.getElementById("page-references");
  container.replaceChildren();
  const lines = (typeof value === "string" ? value : "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
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

languageButtons.forEach(button => button.addEventListener("click", () => {
  const nextLanguage = button.dataset.siteLanguage;
  if (nextLanguage === language) return;
  window.SiteLanguage.navigate(nextLanguage);
}));

function closeMenu() {
  navbar.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", language === "en" ? "Open menu" : "Menüyü aç");
}

menuToggle.addEventListener("click", () => {
  const isOpen = navbar.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", language === "en"
    ? (isOpen ? "Close menu" : "Open menu")
    : (isOpen ? "Menüyü kapat" : "Menüyü aç"));
});

document.querySelectorAll(".nav-links a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && navbar.classList.contains("menu-open")) {
    closeMenu();
    menuToggle.focus();
  }
});
const updateNavbar = () => navbar.classList.toggle("scrolled", window.scrollY > 20);
updateNavbar();
window.addEventListener("scroll", updateNavbar, { passive: true });

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
})();
