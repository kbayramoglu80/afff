const navbar = document.querySelector(".navbar");
const menuToggle = document.querySelector(".menu-toggle");
const languageButtons = document.querySelectorAll("[data-site-language]");
const languageStatus = document.getElementById("language-status");
let googleTranslatePromise = null;

function updateLanguageButtons(language) {
  languageButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.siteLanguage === language));
  });
  document.documentElement.lang = language;
}

function waitForGoogleSelect(attempt = 0) {
  const select = document.querySelector(".goog-te-combo");
  if (select) return Promise.resolve(select);
  if (attempt >= 50) return Promise.reject(new Error("Google Translate seçim alanı yüklenemedi."));
  return new Promise(resolve => setTimeout(resolve, 100))
    .then(() => waitForGoogleSelect(attempt + 1));
}

function waitForPageTranslation(content, previousText) {
  return new Promise((resolve, reject) => {
    let settleTimer;
    let changed = content.innerText.trim() !== previousText;
    const finish = () => {
      clearTimeout(timeout);
      clearTimeout(settleTimer);
      observer.disconnect();
      resolve();
    };
    const scheduleFinish = () => {
      if (changed) settleTimer = setTimeout(finish, 2000);
    };
    const observer = new MutationObserver(() => {
      if (content.innerText.trim() !== previousText) {
        changed = true;
        clearTimeout(settleTimer);
        scheduleFinish();
      }
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      clearTimeout(settleTimer);
      reject(new Error("Sayfa çevirisi zamanında tamamlanmadı."));
    }, 15000);
    observer.observe(content, { childList: true, characterData: true, subtree: true });
    scheduleFinish();
  });
}

function loadGoogleTranslate() {
  if (googleTranslatePromise) return googleTranslatePromise;
  googleTranslatePromise = new Promise((resolve, reject) => {
    window.siteGoogleTranslateInit = () => {
      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "tr", includedLanguages: "en", autoDisplay: false },
          "google_translate_element",
        );
        waitForGoogleSelect().then(resolve, reject);
      } catch (error) {
        reject(error);
      }
    };

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=siteGoogleTranslateInit";
    script.onerror = () => reject(new Error("Google Translate yüklenemedi."));
    document.head.append(script);
  });
  return googleTranslatePromise;
}

async function translatePage(language) {
  const content = document.querySelector("article") || document.body;
  const previousText = content.innerText.trim();
  const previousLanguage = document.documentElement.lang;
  window.SiteContent?.refresh(language === "en" ? "en" : "tr");
  if (language === "tr" && !googleTranslatePromise) {
    updateLanguageButtons("tr");
    return;
  }
  const select = await loadGoogleTranslate();
  select.value = language === "en" ? "en" : "";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  try {
    await waitForPageTranslation(content, previousText);
  } catch (error) {
    select.value = previousLanguage === "en" ? "en" : "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    throw error;
  }
  updateLanguageButtons(language);
}

window.SiteLanguage = {
  updateButtons: updateLanguageButtons,
  translatePage,
};

function loadPageContent() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "../public/site-content.js";
    script.addEventListener("load", async () => {
      try {
        window.SiteContent.capture();
        await window.SiteContent.load();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Sayfa içerik düzenleyicisi yüklenemedi.")), { once: true });
    document.head.append(script);
  });
}

if (document.body.dataset.languageMode !== "database") {
  function closeMenu() {
    navbar.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Menüyü aç");
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = navbar.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Menüyü kapat" : "Menüyü aç");
  });

  navbar.querySelectorAll(".nav-links a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && navbar.classList.contains("menu-open")) {
      closeMenu();
      menuToggle.focus();
    }
  });

  const updateNavbar = () => navbar.classList.toggle("scrolled", window.scrollY > 20);
  updateNavbar();
  window.addEventListener("scroll", updateNavbar, { passive: true });
}

if (document.body.dataset.languageMode === "google") {
  const savedLanguage = localStorage.getItem("site-language") === "en" ? "en" : "tr";
  updateLanguageButtons("tr");
  const pageContentPromise = loadPageContent().catch(error => {
    languageStatus.textContent = "Sayfa içerikleri yüklenemedi.";
    console.error("Could not load treatment page content:", error);
  });
  if (savedLanguage === "en") {
    pageContentPromise.then(() => translatePage("en")).then(() => {
      languageStatus.textContent = "";
    }).catch(error => {
      updateLanguageButtons("tr");
      languageStatus.textContent = "English translation could not be loaded.";
      console.error("Could not load English translation:", error);
    });
  }
  languageButtons.forEach(button => button.addEventListener("click", async () => {
    const language = button.dataset.siteLanguage;
    if (language === document.documentElement.lang) return;
    languageStatus.textContent = "";
    try {
      await pageContentPromise;
      await translatePage(language);
      localStorage.setItem("site-language", language);
      languageStatus.textContent = "";
    } catch (error) {
      updateLanguageButtons(document.documentElement.lang);
      languageStatus.textContent = language === "en"
        ? "English translation could not be loaded."
        : "Türkçe çeviri uygulanamadı.";
      console.error("Could not change page language:", error);
    }
  }));
}
