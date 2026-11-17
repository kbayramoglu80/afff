(() => {
const navbar = document.querySelector(".navbar");
const menuToggle = document.querySelector(".menu-toggle");
const languageButtons = document.querySelectorAll("[data-site-language]");
const languageStatus = document.getElementById("language-status");
const isEnglishPath = pathname => pathname === "/en" || pathname.startsWith("/en/");

function getLocalizedPath(pathname, language) {
  const normalizedPath = pathname === "/index.html" ? "/" : pathname;
  const isEnglish = isEnglishPath(normalizedPath);
  if (language === "en" && !isEnglish) return `/en${normalizedPath === "/" ? "/" : normalizedPath}`;
  if (language === "tr" && isEnglish) return normalizedPath.slice(3) || "/";
  return normalizedPath;
}

function localizeInternalLinks(language) {
  document.querySelectorAll("a[href]").forEach(link => {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === "/admin" || url.pathname.startsWith("/api/")) return;
    url.pathname = getLocalizedPath(url.pathname, language);
    link.href = `${url.pathname}${url.search}${url.hash}`;
  });
}

function updateLanguageButtons(language) {
  languageButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.siteLanguage === language));
  });
  document.documentElement.lang = language;
  localizeInternalLinks(language);
}

function translateEnglishPageChrome() {
  const replacements = [
    ["Doç. Dr. Mesut Karıksız", "Assoc. Prof. Dr. Mesut Karıksız"],
    ["Ortopedi ve Travmatoloji Uzmanı", "Orthopaedics and Traumatology Specialist"],
    ["Ortopedi ve Travmatoloji", "Orthopaedics and Traumatology"],
    ["Medipol Koşuyolu Üniversite Hastanesi", "Medipol Koşuyolu University Hospital"],
    ["Yazan ve tıbbi olarak gözden geçiren:", "Written and medically reviewed by:"],
    ["Randevu talebi bırakın", "Request an appointment"],
    ["Randevu talebi gönder", "Send appointment request"],
    ["Randevu ve iletişim", "Appointments and contact"],
    ["Sağlık veya kimlik bilgisi yazmayın.", "Do not include health or identity information."],
    ["Randevu talebimin yanıtlanması amacıyla kişisel verilerimin işlenmesini kabul ediyorum.", "I consent to the processing of my personal data to respond to my appointment request."],
    ["Bu form acil durumlar için değildir. Tanı, tetkik sonucu veya kimlik bilgisi paylaşmayın.", "This form is not for emergencies. Do not share diagnoses, test results, or identity information."],
    ["Yukarıdaki acil durum belirtilerinden herhangi biri", "Any of the emergency symptoms listed above"],
    ["Bu riskler uygun hasta seçimi, dikkatli teknik ve düzenli kontrollerle azaltılmaya çalışılır. Sizin için geçerli olanlar muayenede konuşulur.", "These risks are managed through appropriate patient selection, careful technique, and regular follow-up. Your individual risks will be discussed during your assessment."],
    ["Bu riskler uygun hasta seçimi, ameliyat öncesi hazırlık, dikkatli teknik ve düzenli kontrollerle azaltılmaya çalışılır. Sizin için geçerli olanlar muayenede ayrıntılı konuşulur.", "These risks are managed through appropriate patient selection, preoperative preparation, careful technique, and regular follow-up. Your individual risks will be discussed during your assessment."],
    ["Önemli:", "Important:"],
    ["DOLDURUN", "COMPLETE"],
    ["Türkçe", "Turkish"],
    ["Örn. hafta içi öğleden sonra. Sağlık veya kimlik bilgisi yazmayın.", "For example, weekday afternoons. Do not include health or identity information."],
    ["Sağlık veya kimlik bilgisi yazmayın.", "Do not include health or identity information."],
  ];
  const exactReplacements = new Map([
    ["Klinik deneyim ve bilimsel çalışmalar", "Clinical experience and research"],
    ["Klinik deneyim", "Clinical experience"],
    ["İlgili sayfalar", "Related pages"],
    ["Sıkça sorulan sorular", "Frequently asked questions"],
    ["Hangi durumlarda yapılır?", "When is it performed?"],
    ["Ameliyat öncesi değerlendirme", "Preoperative assessment"],
    ["Ameliyat nasıl yapılır?", "How is the surgery performed?"],
    ["İşlem nasıl yapılır?", "How is the procedure performed?"],
    ["Nasıl teşhis edilir?", "How is it diagnosed?"],
    ["Kimler için uygundur?", "Who may be suitable?"],
    ["Kimlere uygulanır?", "Who may be eligible?"],
    ["Kimlere uygulanmaz?", "Who may not be suitable?"],
    ["İyileşme süreci", "Recovery"],
    ["Ameliyat sonrası", "After surgery"],
    ["Olası riskler", "Potential risks"],
    ["Riskler", "Risks"],
    ["Belirtiler", "Symptoms"],
    ["Tedavi seçenekleri", "Treatment options"],
    ["Fizik tedavi", "Physiotherapy"],
    ["Özet", "Summary"],
    ["Ne zaman doktora başvurmalı?", "When should you consult a doctor?"],
    ["Ne zaman ortopedi uzmanına başvurmalı?", "When should you consult an orthopaedic specialist?"],
    ["Ayırıcı tanı", "Differential diagnosis"],
    ["Hakkımda", "About me"],
    ["Tedavi alanları", "Treatment areas"],
    ["Çalışma alanları", "Areas of practice"],
    ["İletişim", "Contact"],
    ["Yönetici girişi", "Admin login"],
    ["Sayfa yolu", "Breadcrumb"],
    ["Bölge", "Region"],
    ["Yaş", "Age"],
    ["Problem", "Problem"],
    ["Yaklaşım", "Approach"],
    ["Açıklama", "Description"],
    ["Yöntem", "Method"],
    ["Nasıl çalışır?", "How does it work?"],
    ["Ana sayfa / Home", "Home"],
    ["Ana Sayfa", "Home"],
    ["Ad soyad", "Full name"],
    ["Telefon", "Phone"],
    ["E-posta (isteğe bağlı)", "Email (optional)"],
    ["Uygun gün ve saat / notunuz", "Preferred day and time / your note"],
    ["Randevu", "Appointments"],
    ["Protez Cerrahisi", "Joint Replacement Surgery"],
    ["Ortobiyolojik Tedaviler", "Orthobiologic Treatments"],
    ["Yüksek tibial osteotomi", "High tibial osteotomy"],
    ["Diz protezi", "Knee replacement"],
    ["Kalça protezi", "Hip replacement"],
    ["Omuz protezi", "Shoulder replacement"],
    ["Revizyon protez cerrahisi", "Revision joint replacement surgery"],
    ["Kök hücre tedavisi", "Stem cell therapy"],
    ["PRF tedavisi", "PRF therapy"],
    ["PRP tedavisi", "PRP therapy"],
    ["Ganz ameliyatı", "Ganz procedure"],
    ["Halluks valgus", "Hallux valgus"],
  ]);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest("script, style, svg")) continue;
    let value = node.nodeValue;
    const text = value.trim();
    const translatedText = exactReplacements.get(text);
    if (translatedText) {
      node.nodeValue = value.replace(text, translatedText);
      continue;
    }
    replacements.forEach(([source, translated]) => {
      value = value.replaceAll(source, translated);
    });
    value = value.replace(/\[COMPLETE(?::[^\]]*)?\]/g, "[COMPLETE: add the relevant details for your practice.]");
    node.nodeValue = value;
  }
  document.querySelectorAll("[aria-label], [placeholder], [title]").forEach(element => {
    ["aria-label", "placeholder", "title"].forEach(attribute => {
      let value = element.getAttribute(attribute);
      const translated = exactReplacements.get(value.trim());
      if (translated) {
        element.setAttribute(attribute, translated);
        return;
      }
      replacements.forEach(([source, translated]) => {
        value = value.replaceAll(source, translated);
      });
      element.setAttribute(attribute, value);
    });
  });
  document.querySelectorAll(".breadcrumbs").forEach(breadcrumb => {
    const lastText = [...breadcrumb.childNodes].reverse().find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    const heading = document.querySelector("article h1");
    if (lastText && heading) lastText.nodeValue = `${lastText.nodeValue.includes("›") ? " › " : " "}${heading.textContent.trim()}`;
  });
  document.querySelectorAll(".appointment-panel").forEach(panel => {
    const heading = document.querySelector("article h1");
    const appointmentDescription = panel.querySelector(".appointment-copy p");
    if (heading) panel.dataset.treatmentName = heading.textContent.trim();
    if (appointmentDescription && /[ğüşöçıİ]|hakkında|randevu|talebinizi|incelendikten/i.test(appointmentDescription.textContent)) {
      appointmentDescription.textContent = "Use this form to request an appointment. After reviewing your request, we will contact you about scheduling.";
    }
  });
}

window.SiteLanguage = {
  updateButtons: updateLanguageButtons,
  navigate(language) {
    const url = new URL(window.location.href);
    url.pathname = getLocalizedPath(url.pathname, language);
    window.location.assign(url.href);
  },
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
    menuToggle.setAttribute("aria-label", document.documentElement.lang === "en" ? "Open menu" : "Menüyü aç");
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = navbar.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen
      ? (document.documentElement.lang === "en" ? "Close menu" : "Menüyü kapat")
      : (document.documentElement.lang === "en" ? "Open menu" : "Menüyü aç"));
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

  const language = isEnglishPath(window.location.pathname) ? "en" : "tr";
  updateLanguageButtons(language);
  if (document.body.dataset.staticLanguage === "en") translateEnglishPageChrome();
  languageButtons.forEach(button => button.addEventListener("click", () => {
    window.SiteLanguage.navigate(button.dataset.siteLanguage);
  }));
  loadPageContent().then(() => {
    localizeInternalLinks(language);
    if (language === "en") {
      if (window.SiteContent.hasMissingEnglishContent()) {
        languageStatus.textContent = "Some English content is not available yet; Turkish text is shown for those sections.";
      }
      const heading = document.querySelector("main h1, article h1");
      if (heading) {
        const title = `${heading.textContent.trim()} | Assoc. Prof. Dr. Mesut Karıksız`;
        document.title = title;
        document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
        document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", title);
      }
      document.querySelector('meta[property="og:locale"]')?.setAttribute("content", "en_GB");
      const description = document.querySelector(".answer p, main .summary, article h1 + p");
      if (description) {
        const value = description.textContent.trim().slice(0, 500);
        document.querySelector('meta[name="description"]')?.setAttribute("content", value);
        document.querySelector('meta[property="og:description"]')?.setAttribute("content", value);
        document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", value);
      }
    }
  }).catch(error => {
    languageStatus.textContent = language === "en"
      ? "Page content could not be loaded."
      : "Sayfa içerikleri yüklenemedi.";
    console.error("Could not load treatment page content:", error);
  });
}
})();
