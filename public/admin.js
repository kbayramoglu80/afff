const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const faqForm = document.getElementById("faq-form");
const postForm = document.getElementById("post-form");
const treatmentForm = document.getElementById("treatment-form");
const seoForm = document.getElementById("seo-form");
const loginMessage = document.getElementById("login-message");
const dashboardMessage = document.getElementById("dashboard-message");
const faqList = document.getElementById("faq-list");
const postList = document.getElementById("post-list");
const contactList = document.getElementById("contact-list");
const treatmentPageList = document.getElementById("treatment-page-list");
const treatmentDetailPageList = document.getElementById("treatment-detail-page-list");
const treatmentDetailGroups = document.getElementById("treatment-detail-content-groups");
const treatmentDetailMessage = document.getElementById("treatment-detail-message");
const faqFormTitle = document.getElementById("faq-form-title");
const postFormTitle = document.getElementById("post-form-title");
const siteContentGroups = document.getElementById("site-content-groups");
const siteContentMessage = document.getElementById("site-content-message");
const postMessage = document.getElementById("post-message");
const treatmentMessage = document.getElementById("treatment-message");
const seoMessage = document.getElementById("seo-message");
const postImageInput = document.getElementById("post-image");
const postImagePreviewWrap = document.getElementById("post-image-preview-wrap");
const postImagePreview = document.getElementById("post-image-preview");
let csrfToken = "";
let faqs = [];
let posts = [];
let treatmentPages = [];
let treatmentDetailPages = [];
let treatmentDetailCatalog = { fields: [], images: [] };
let treatmentDetailControls = new Map();
let treatmentDetailSlug = "";
let treatmentDetailDirty = false;
let postImageData = null;
let contactSubmissions = [];
let siteCatalog = { fields: [], images: [] };
let savedSiteEntries = [];
let savedSiteAssets = {};
let siteContentControls = new Map();

async function getCsrfToken() {
  const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Güvenlik anahtarı alınamadı.");
  csrfToken = result.csrfToken;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "İstek tamamlanamadı.");
  return result;
}

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function createSiteContentInput(field, value, locale) {
  const label = document.createElement("label");
  label.textContent = locale === "tr" ? "Türkçe" : "İngilizce";
  const control = field.type === "attribute" && field.attribute === "href"
    ? document.createElement("input")
    : document.createElement("textarea");
  control.value = value;
  control.maxLength = 10000;
  control.dataset.siteContentKey = field.key;
  control.dataset.siteContentLocale = locale;
  if (locale === "en") control.placeholder = "Boşsa Türkçe içerik çeviri uyarısıyla gösterilir.";
  label.append(control);
  return { label, control };
}

function createSiteContentImageEditor(image, messageElement) {
  const entry = document.createElement("article");
  entry.className = "site-content-entry";
  entry.dataset.search = `${image.groupLabel} ${image.label}`.toLocaleLowerCase("tr");
  const title = document.createElement("span");
  title.className = "site-content-entry-title";
  title.textContent = image.label;
  const preview = document.createElement("img");
  preview.className = "site-content-image-preview";
  preview.alt = image.label;
  preview.src = savedSiteAssets[image.key] || new URL(image.src, window.location.origin).href;
  const actions = document.createElement("div");
  actions.className = "site-content-image-actions";
  const uploadLabel = document.createElement("label");
  uploadLabel.textContent = "Görseli değiştir";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  uploadLabel.append(fileInput);
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "secondary";
  reset.textContent = "Varsayılan görsele dön";
  reset.disabled = !savedSiteAssets[image.key];
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    if (!file) return;
    fileInput.disabled = true;
    reset.disabled = true;
    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          if (typeof reader.result !== "string") reject(new Error("Görsel okunamadı."));
          else resolve(reader.result);
        });
        reader.addEventListener("error", () => reject(new Error("Görsel okunamadı.")));
        reader.readAsDataURL(file);
      });
      await apiRequest("/api/admin/site-assets", {
        method: "PUT",
        body: JSON.stringify({ key: image.key, imageData }),
      });
      savedSiteAssets[image.key] = `/api/site-assets/${image.key}?v=${Date.now()}`;
      preview.src = savedSiteAssets[image.key];
      reset.disabled = false;
      showMessage(messageElement, "Görsel kaydedildi.", true);
    } catch (error) {
      showMessage(messageElement, error.message);
    } finally {
      fileInput.disabled = false;
      fileInput.value = "";
    }
  });
  reset.addEventListener("click", async () => {
    reset.disabled = true;
    try {
      await apiRequest("/api/admin/site-assets", {
        method: "PUT",
        body: JSON.stringify({ key: image.key, imageData: null }),
      });
      delete savedSiteAssets[image.key];
      preview.src = new URL(image.src, window.location.origin).href;
      showMessage(messageElement, "Varsayılan görsele dönüldü.", true);
    } catch (error) {
      showMessage(messageElement, error.message);
      reset.disabled = false;
    }
  });
  actions.append(uploadLabel, reset);
  entry.append(title, preview, actions);
  return entry;
}

function renderSiteContent() {
  siteContentGroups.replaceChildren();
  siteContentControls = new Map();
  const storedEntries = new Map(savedSiteEntries.map(entry => [entry.key, entry]));
  const groups = new Map();
  const getGroup = item => {
    let group = groups.get(item.groupKey);
    if (!group) {
      group = { label: item.groupLabel, fields: [], images: [] };
      groups.set(item.groupKey, group);
    }
    return group;
  };
  siteCatalog.fields.forEach(field => getGroup(field).fields.push(field));
  siteCatalog.images.forEach(image => getGroup(image).images.push(image));

  for (const [groupKey, group] of groups) {
    const details = document.createElement("details");
    details.className = "site-content-group";
    details.dataset.groupKey = groupKey;
    const summary = document.createElement("summary");
    summary.textContent = `${group.label} (${group.fields.length + group.images.length})`;
    const body = document.createElement("div");
    body.className = "site-content-group-body";

    for (const field of group.fields) {
      const saved = storedEntries.get(field.key);
      const entry = document.createElement("article");
      entry.className = "site-content-entry";
      entry.dataset.search = `${field.groupLabel} ${field.label} ${saved?.valueTr || field.valueTr} ${saved?.valueEn || ""}`.toLocaleLowerCase("tr");
      const title = document.createElement("span");
      title.className = "site-content-entry-title";
      title.textContent = field.label;
      const locales = document.createElement("div");
      locales.className = "site-content-locales";
      const turkish = createSiteContentInput(field, saved?.valueTr ?? field.valueTr, "tr");
      const english = createSiteContentInput(field, saved?.valueEn ?? "", "en");
      locales.append(turkish.label, english.label);
      entry.append(title, locales);
      body.append(entry);
      siteContentControls.set(field.key, { field, turkish: turkish.control, english: english.control });
    }

    for (const image of group.images) body.append(createSiteContentImageEditor(image, siteContentMessage));

    details.append(summary, body);
    siteContentGroups.append(details);
  }
}

async function loadSiteContent() {
  const [pageResponse, content] = await Promise.all([
    fetch("/", { credentials: "same-origin", cache: "no-store" }),
    apiRequest("/api/admin/site-content"),
  ]);
  if (!pageResponse.ok) throw new Error("Ana sayfa içerikleri okunamadı.");
  const pageHtml = await pageResponse.text();
  const pageDocument = new DOMParser().parseFromString(pageHtml, "text/html");
  siteCatalog = window.SiteContent.collect(pageDocument);
  savedSiteEntries = content.entries;
  savedSiteAssets = content.assets;
  renderSiteContent();
}

async function loadSeoSettings() {
  const settings = await apiRequest("/api/admin/seo");
  for (const field of ["titleTr", "titleEn", "descriptionTr", "descriptionEn"]) {
    seoForm.elements[field].value = settings[field] || "";
  }
}

async function saveSiteContent() {
  showMessage(siteContentMessage, "");
  const buttons = [
    document.getElementById("site-content-save"),
    document.getElementById("site-content-save-bottom"),
  ];
  buttons.forEach(button => { button.disabled = true; });
  try {
    const entries = [...siteContentControls.values()].map(({ field, turkish, english }) => ({
      key: field.key,
      type: field.type,
      attribute: field.attribute,
      valueTr: turkish.value,
      valueEn: english.value,
    }));
    await apiRequest("/api/admin/site-content", {
      method: "PUT",
      body: JSON.stringify({ entries }),
    });
    savedSiteEntries = entries;
    showMessage(siteContentMessage, "Değişiklikler kaydedildi. Ana sayfayı yenileyerek görüntüleyebilirsiniz.", true);
  } catch (error) {
    showMessage(siteContentMessage, error.message);
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}

function filterSiteContent(query) {
  const term = query.trim().toLocaleLowerCase("tr");
  siteContentGroups.querySelectorAll(".site-content-group").forEach(group => {
    let matches = 0;
    group.querySelectorAll(".site-content-entry").forEach(entry => {
      const visible = !term || entry.dataset.search.includes(term);
      entry.hidden = !visible;
      if (visible) matches += 1;
    });
    group.hidden = matches === 0;
    if (term && matches) group.open = true;
  });
}

function selectTreatmentPage(page) {
  treatmentForm.elements.key.value = page.key;
  for (const field of [
    "titleTr", "titleEn", "summaryTr", "summaryEn", "contentTr", "contentEn",
    "seoTitleTr", "seoTitleEn", "seoDescriptionTr", "seoDescriptionEn", "referencesTr", "referencesEn",
  ]) {
    treatmentForm.elements[field].value = page[field] || "";
  }
  document.getElementById("treatment-form-title").textContent = `${page.titleTr} — alt sayfa`;
  document.getElementById("treatment-preview-link").href = `/tedavi/${encodeURIComponent(page.slug)}`;
}

function renderTreatmentPages() {
  treatmentPageList.replaceChildren();
  for (const page of treatmentPages) {
    const row = document.createElement("article");
    row.className = "post-row";
    const title = document.createElement("h3");
    title.textContent = page.titleTr;
    const summary = document.createElement("p");
    summary.textContent = page.summaryTr;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Düzenle";
    edit.addEventListener("click", () => selectTreatmentPage(page));
    actions.append(edit);
    row.append(title, summary, actions);
    treatmentPageList.append(row);
  }
}

async function loadTreatmentPages(selectedKey = treatmentForm.elements.key.value) {
  treatmentPages = await apiRequest("/api/admin/treatments");
  renderTreatmentPages();
  const selected = treatmentPages.find(page => page.key === selectedKey) || treatmentPages[0];
  if (selected) selectTreatmentPage(selected);
}

function renderTreatmentDetailContent() {
  treatmentDetailGroups.replaceChildren();
  treatmentDetailControls = new Map();
  const storedEntries = new Map(savedSiteEntries.map(entry => [entry.key, entry]));
  const groups = new Map();
  const getGroup = item => {
    let group = groups.get(item.groupKey);
    if (!group) {
      group = { label: item.groupLabel, fields: [], images: [] };
      groups.set(item.groupKey, group);
    }
    return group;
  };
  treatmentDetailCatalog.fields.forEach(field => getGroup(field).fields.push(field));
  treatmentDetailCatalog.images.forEach(image => getGroup(image).images.push(image));

  for (const group of groups.values()) {
    const details = document.createElement("details");
    details.className = "site-content-group";
    const summary = document.createElement("summary");
    summary.textContent = `${group.label} (${group.fields.length + group.images.length})`;
    const body = document.createElement("div");
    body.className = "site-content-group-body";
    for (const field of group.fields) {
      const saved = storedEntries.get(field.key);
      const entry = document.createElement("article");
      entry.className = "site-content-entry";
      entry.dataset.search = `${field.groupLabel} ${field.label} ${saved?.valueTr || field.valueTr} ${saved?.valueEn || field.valueEn || ""}`.toLocaleLowerCase("tr");
      const title = document.createElement("span");
      title.className = "site-content-entry-title";
      title.textContent = field.label;
      const locales = document.createElement("div");
      locales.className = "site-content-locales";
      const turkish = createSiteContentInput(field, saved?.valueTr ?? field.valueTr, "tr");
      const english = createSiteContentInput(field, saved?.valueEn || field.valueEn || "", "en");
      const markDirty = () => { treatmentDetailDirty = true; };
      turkish.control.addEventListener("input", markDirty);
      english.control.addEventListener("input", markDirty);
      locales.append(turkish.label, english.label);
      entry.append(title, locales);
      body.append(entry);
      treatmentDetailControls.set(field.key, { field, turkish: turkish.control, english: english.control });
    }
    for (const image of group.images) body.append(createSiteContentImageEditor(image, treatmentDetailMessage));
    details.append(summary, body);
    treatmentDetailGroups.append(details);
  }
}

async function loadTreatmentDetailPage(slug) {
  if (!slug) return;
  const [response, englishResponse] = await Promise.all([
    fetch(`/tedavi/${encodeURIComponent(slug)}.html`, {
      credentials: "same-origin",
      cache: "no-store",
    }),
    fetch(`/en/tedavi/${encodeURIComponent(slug)}.html`, {
      credentials: "same-origin",
      cache: "no-store",
    }),
  ]);
  if (!response.ok) throw new Error("Tedavi detay sayfası yüklenemedi.");
  if (!englishResponse.ok) throw new Error("Tedavi detay sayfasının İngilizce içeriği yüklenemedi.");
  const [html, englishHtml] = await Promise.all([response.text(), englishResponse.text()]);
  const pageDocument = new DOMParser().parseFromString(html, "text/html");
  const englishDocument = new DOMParser().parseFromString(englishHtml, "text/html");
  treatmentDetailCatalog = window.SiteContent.collect(pageDocument, `tedavi/${slug}`);
  if (englishDocument.body.dataset.staticLanguage === "en") {
    const englishFields = new Map(
      window.SiteContent.collect(englishDocument, `tedavi/${slug}`).fields.map(field => [field.key, field.valueTr]),
    );
    treatmentDetailCatalog.fields.forEach(field => {
      field.valueEn = englishFields.get(field.key) || "";
    });
  }
  treatmentDetailSlug = slug;
  treatmentDetailDirty = false;
  document.getElementById("treatment-detail-preview-link").href = `/tedavi/${encodeURIComponent(slug)}.html`;
  document.getElementById("treatment-detail-form-title").textContent =
    treatmentDetailPages.find(page => page.slug === slug)?.title || slug;
  renderTreatmentDetailContent();
  renderTreatmentDetailPages();
  showMessage(treatmentDetailMessage, "");
}

function renderTreatmentDetailPages() {
  treatmentDetailPageList.replaceChildren();
  for (const page of treatmentDetailPages) {
    const row = document.createElement("article");
    row.className = "post-row";
    row.classList.toggle("selected", page.slug === treatmentDetailSlug);
    row.dataset.search = `${page.title} ${page.slug}`.toLocaleLowerCase("tr");
    const heading = document.createElement("div");
    heading.className = "post-row-head";
    const title = document.createElement("h3");
    title.textContent = page.title;
    heading.append(title);
    if (page.slug === treatmentDetailSlug) {
      const selected = document.createElement("span");
      selected.className = "post-row-status";
      selected.textContent = "Seçili";
      heading.append(selected);
    }
    const slug = document.createElement("p");
    slug.textContent = `/tedavi/${page.slug}.html`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.dataset.treatmentDetailSlug = page.slug;
    edit.textContent = "İçeriği düzenle";
    const preview = document.createElement("a");
    preview.className = "preview-link";
    preview.href = `/tedavi/${encodeURIComponent(page.slug)}.html`;
    preview.target = "_blank";
    preview.rel = "noopener noreferrer";
    preview.textContent = "Önizle ↗";
    actions.append(edit, preview);
    row.append(heading, slug, actions);
    treatmentDetailPageList.append(row);
  }
}

async function loadTreatmentDetailPages() {
  treatmentDetailPages = await apiRequest("/api/admin/treatment-details");
  renderTreatmentDetailPages();
  if (treatmentDetailPages.length) await loadTreatmentDetailPage(treatmentDetailPages[0].slug);
}

function filterTreatmentDetailPages(query) {
  const term = query.trim().toLocaleLowerCase("tr");
  treatmentDetailPageList.querySelectorAll(".post-row").forEach(row => {
    row.hidden = term && !row.dataset.search.includes(term);
  });
}

function filterTreatmentDetailContent(query) {
  const term = query.trim().toLocaleLowerCase("tr");
  treatmentDetailGroups.querySelectorAll(".site-content-group").forEach(group => {
    let matches = 0;
    group.querySelectorAll(".site-content-entry").forEach(entry => {
      const visible = !term || entry.dataset.search.includes(term);
      entry.hidden = !visible;
      if (visible) matches += 1;
    });
    group.hidden = matches === 0;
    if (term && matches) group.open = true;
  });
}

async function saveTreatmentDetailContent() {
  if (!treatmentDetailSlug) return;
  showMessage(treatmentDetailMessage, "");
  const button = document.getElementById("treatment-detail-save-button");
  button.disabled = true;
  try {
    const entries = [...treatmentDetailControls.values()].map(({ field, turkish, english }) => ({
      key: field.key,
      type: field.type,
      attribute: field.attribute,
      valueTr: turkish.value,
      valueEn: english.value,
    }));
    await apiRequest("/api/admin/site-content", {
      method: "PUT",
      body: JSON.stringify({ entries }),
    });
    const storedEntries = new Map(savedSiteEntries.map(entry => [entry.key, entry]));
    entries.forEach(entry => storedEntries.set(entry.key, entry));
    savedSiteEntries = [...storedEntries.values()];
    treatmentDetailDirty = false;
    showMessage(treatmentDetailMessage, "Tedavi detay sayfası içerikleri kaydedildi.", true);
  } catch (error) {
    showMessage(treatmentDetailMessage, error.message);
  } finally {
    button.disabled = false;
  }
}

function resetFaqForm() {
  faqForm.reset();
  faqForm.elements.id.value = "";
  faqFormTitle.textContent = "Yeni soru";
}

function renderFaqs() {
  faqList.replaceChildren();
  if (!faqs.length) {
    const empty = document.createElement("p");
    empty.textContent = "Henüz soru eklenmemiş.";
    faqList.append(empty);
    return;
  }
  for (const faq of faqs) {
    const row = document.createElement("article");
    row.className = "faq-row";
    const title = document.createElement("h3");
    title.textContent = faq.question;
    const answer = document.createElement("p");
    answer.textContent = faq.answer;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Düzenle";
    edit.addEventListener("click", () => {
      faqForm.elements.id.value = faq._id;
      faqForm.elements.question.value = faq.question;
      faqForm.elements.answer.value = faq.answer;
      faqForm.elements.questionEn.value = faq.questionEn || "";
      faqForm.elements.answerEn.value = faq.answerEn || "";
      faqFormTitle.textContent = "Soruyu düzenle";
      faqForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`"${faq.question}" sorusu silinsin mi?`)) return;
      try {
        await apiRequest(`/api/admin/faqs/${encodeURIComponent(faq._id)}`, { method: "DELETE" });
        await loadFaqs();
        showMessage(dashboardMessage, "Soru silindi.", true);
      } catch (error) {
        showMessage(dashboardMessage, error.message);
      }
    });
    actions.append(edit, remove);
    row.append(title, answer, actions);
    faqList.append(row);
  }
}

async function loadFaqs() {
  faqs = await apiRequest("/api/admin/faqs");
  renderFaqs();
}

function resetPostForm() {
  postForm.reset();
  postForm.elements.id.value = "";
  postForm.elements.status.value = "draft";
  postImageInput.value = "";
  postImageData = null;
  postImagePreview.removeAttribute("src");
  postImagePreviewWrap.hidden = true;
  postFormTitle.textContent = "Yeni yazı";
}

function showPostImage(imageData) {
  postImageData = imageData;
  if (imageData) {
    postImagePreview.src = imageData;
    postImagePreviewWrap.hidden = false;
  } else {
    postImagePreview.removeAttribute("src");
    postImagePreviewWrap.hidden = true;
  }
}

function renderPosts() {
  postList.replaceChildren();
  if (!posts.length) {
    const empty = document.createElement("p");
    empty.textContent = "Henüz yazı eklenmemiş.";
    postList.append(empty);
    return;
  }

  posts.forEach(post => {
    const row = document.createElement("article");
    row.className = "post-row";
    const header = document.createElement("div");
    header.className = "post-row-head";
    const title = document.createElement("h3");
    title.textContent = post.title;
    const status = document.createElement("span");
    status.className = `post-row-status${post.status === "draft" ? " draft" : ""}`;
    status.textContent = post.status === "published" ? "Yayımlandı" : "Taslak";
    header.append(title, status);
    const excerpt = document.createElement("p");
    excerpt.textContent = post.excerpt;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Düzenle";
    edit.addEventListener("click", () => {
      postForm.elements.id.value = post._id;
      postForm.elements.title.value = post.title;
      postForm.elements.titleEn.value = post.titleEn || "";
      postForm.elements.excerpt.value = post.excerpt;
      postForm.elements.excerptEn.value = post.excerptEn || "";
      postForm.elements.content.value = post.content;
      postForm.elements.contentEn.value = post.contentEn || "";
      postForm.elements.status.value = post.status;
      postImageInput.value = "";
      showPostImage(post.imageData || null);
      postFormTitle.textContent = "Yazıyı düzenle";
      postForm.scrollIntoView({ behavior: "smooth", block: "start" });
      postForm.elements.title.focus({ preventScroll: true });
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`"${post.title}" yazısı silinsin mi?`)) return;
      try {
        await apiRequest(`/api/admin/posts/${encodeURIComponent(post._id)}`, { method: "DELETE" });
        if (postForm.elements.id.value === post._id) resetPostForm();
        await loadPosts();
        showMessage(postMessage, "Yazı silindi.", true);
      } catch (error) {
        showMessage(postMessage, error.message);
      }
    });
    actions.append(edit, remove);
    row.append(header, excerpt, actions);
    postList.append(row);
  });
}

async function loadPosts() {
  posts = await apiRequest("/api/admin/posts");
  renderPosts();
}

function renderContactSubmissions() {
  contactList.replaceChildren();
  if (!contactSubmissions.length) {
    const empty = document.createElement("p");
    empty.textContent = "Henüz iletişim talebi yok.";
    contactList.append(empty);
    return;
  }

  for (const submission of contactSubmissions) {
    const row = document.createElement("article");
    row.className = "contact-submission";

    const header = document.createElement("div");
    header.className = "contact-submission-head";
    const name = document.createElement("h3");
    name.textContent = submission.fullName;
    const kind = document.createElement("span");
    kind.className = "contact-submission-kind";
    kind.textContent = submission.requestType === "appointment" ? "Randevu talebi" : "İletişim";
    const status = document.createElement("span");
    status.className = "contact-submission-status";
    status.classList.toggle("unread", !submission.isRead);
    status.textContent = submission.isRead ? "Okundu" : "Yeni";
    const received = document.createElement("time");
    received.dateTime = submission.createdAt;
    received.textContent = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(submission.createdAt));
    header.append(name, kind, status, received);

    const details = document.createElement("div");
    details.className = "contact-submission-meta";
    const phone = document.createElement("a");
    phone.href = `tel:${submission.phone.replace(/[^\d+]/g, "")}`;
    phone.textContent = submission.phone;
    details.append(phone);
    if (submission.email) {
      const email = document.createElement("a");
      email.href = `mailto:${submission.email}`;
      email.textContent = submission.email;
      details.append(email);
    }
    if (submission.treatment) {
      const treatment = document.createElement("span");
      treatment.className = "contact-submission-treatment";
      treatment.textContent = `Tedavi alanı: ${submission.treatment}`;
      details.append(treatment);
    }

    const message = document.createElement("p");
    message.className = "contact-submission-message";
    message.textContent = submission.message;
    const actions = document.createElement("div");
    actions.className = "actions";

    if (!submission.isRead) {
      const markRead = document.createElement("button");
      markRead.type = "button";
      markRead.className = "secondary";
      markRead.textContent = "Okundu işaretle";
      markRead.addEventListener("click", async () => {
        try {
          await apiRequest(`/api/admin/contact-submissions/${encodeURIComponent(submission._id)}`, {
            method: "PATCH",
            body: JSON.stringify({ isRead: true }),
          });
          await loadContactSubmissions();
        } catch (error) {
          showMessage(dashboardMessage, error.message);
        }
      });
      actions.append(markRead);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`${submission.fullName} adlı kişinin iletişim talebi silinsin mi?`)) return;
      try {
        await apiRequest(`/api/admin/contact-submissions/${encodeURIComponent(submission._id)}`, {
          method: "DELETE",
        });
        await loadContactSubmissions();
      } catch (error) {
        showMessage(dashboardMessage, error.message);
      }
    });
    actions.append(remove);
    row.append(header, details, message, actions);
    contactList.append(row);
  }
}

async function loadContactSubmissions() {
  contactSubmissions = await apiRequest("/api/admin/contact-submissions");
  renderContactSubmissions();
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

async function initialize() {
  try {
    await getCsrfToken();
    const sessionState = await apiRequest("/api/admin/session");
    if (sessionState.authenticated) {
      showDashboard();
      await Promise.all([loadFaqs(), loadPosts(), loadContactSubmissions(), loadSiteContent(), loadTreatmentPages(), loadSeoSettings()]);
      await loadTreatmentDetailPages();
    } else {
      loginView.hidden = false;
    }
  } catch (error) {
    loginView.hidden = false;
    showMessage(loginMessage, error.message);
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(loginMessage, "");
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const result = await apiRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password: loginForm.elements.password.value,
      }),
    });
    csrfToken = result.csrfToken;
    loginForm.reset();
    showDashboard();
    await Promise.all([loadFaqs(), loadPosts(), loadContactSubmissions(), loadSiteContent(), loadTreatmentPages(), loadSeoSettings()]);
    await loadTreatmentDetailPages();
  } catch (error) {
    showMessage(loginMessage, error.message);
  } finally {
    submit.disabled = false;
  }
});

faqForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(dashboardMessage, "");
  const id = faqForm.elements.id.value;
  const payload = {
    question: faqForm.elements.question.value,
    answer: faqForm.elements.answer.value,
    questionEn: faqForm.elements.questionEn.value,
    answerEn: faqForm.elements.answerEn.value,
  };
  try {
    await apiRequest(id ? `/api/admin/faqs/${encodeURIComponent(id)}` : "/api/admin/faqs", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetFaqForm();
    await loadFaqs();
    showMessage(dashboardMessage, "Soru kaydedildi.", true);
  } catch (error) {
    showMessage(dashboardMessage, error.message);
  }
});

treatmentForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(treatmentMessage, "");
  const key = treatmentForm.elements.key.value;
  const payload = Object.fromEntries(
    [
      "titleTr", "titleEn", "summaryTr", "summaryEn", "contentTr", "contentEn",
      "seoTitleTr", "seoTitleEn", "seoDescriptionTr", "seoDescriptionEn", "referencesTr", "referencesEn",
    ]
      .map(field => [field, treatmentForm.elements[field].value]),
  );
  const saveButton = document.getElementById("save-treatment-button");
  saveButton.disabled = true;
  try {
    await apiRequest(`/api/admin/treatments/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadTreatmentPages(key);
    showMessage(treatmentMessage, "Tedavi alt sayfası kaydedildi.", true);
  } catch (error) {
    showMessage(treatmentMessage, error.message);
  } finally {
    saveButton.disabled = false;
  }
});

seoForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(seoMessage, "");
  const saveButton = document.getElementById("seo-save-button");
  saveButton.disabled = true;
  try {
    const payload = Object.fromEntries(["titleTr", "titleEn", "descriptionTr", "descriptionEn"]
      .map(field => [field, seoForm.elements[field].value]));
    await apiRequest("/api/admin/seo", { method: "PUT", body: JSON.stringify(payload) });
    showMessage(seoMessage, "Ana sayfa SEO bilgileri kaydedildi.", true);
  } catch (error) {
    showMessage(seoMessage, error.message);
  } finally {
    saveButton.disabled = false;
  }
});

document.getElementById("new-faq-button").addEventListener("click", resetFaqForm);
document.getElementById("new-post-button").addEventListener("click", () => {
  resetPostForm();
  postForm.scrollIntoView({ behavior: "smooth", block: "start" });
  postForm.elements.title.focus({ preventScroll: true });
});
document.getElementById("reset-post-button").addEventListener("click", resetPostForm);
document.getElementById("remove-post-image").addEventListener("click", () => {
  postImageInput.value = "";
  showPostImage(null);
});
postImageInput.addEventListener("change", async () => {
  const [file] = postImageInput.files;
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showMessage(postMessage, "Kapak görseli en fazla 2 MB olmalıdır.");
    postImageInput.value = "";
    return;
  }
  try {
    const imageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result !== "string") reject(new Error("Kapak görseli okunamadı."));
        else resolve(reader.result);
      });
      reader.addEventListener("error", () => reject(new Error("Kapak görseli okunamadı.")));
      reader.readAsDataURL(file);
    });
    showPostImage(imageData);
    showMessage(postMessage, "");
  } catch (error) {
    showMessage(postMessage, error.message);
    postImageInput.value = "";
  }
});
postForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(postMessage, "");
  const id = postForm.elements.id.value;
  const payload = {
    title: postForm.elements.title.value,
    titleEn: postForm.elements.titleEn.value,
    excerpt: postForm.elements.excerpt.value,
    excerptEn: postForm.elements.excerptEn.value,
    content: postForm.elements.content.value,
    contentEn: postForm.elements.contentEn.value,
    status: postForm.elements.status.value,
    imageData: postImageData,
  };
  const saveButton = document.getElementById("save-post-button");
  saveButton.disabled = true;
  try {
    await apiRequest(id ? `/api/admin/posts/${encodeURIComponent(id)}` : "/api/admin/posts", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetPostForm();
    await loadPosts();
    showMessage(postMessage, payload.status === "published"
      ? "Yazı yayımlandı; ana sayfada görünecek."
      : "Taslak kaydedildi.", true);
  } catch (error) {
    showMessage(postMessage, error.message);
  } finally {
    saveButton.disabled = false;
  }
});
document.getElementById("site-content-save").addEventListener("click", saveSiteContent);
document.getElementById("site-content-save-bottom").addEventListener("click", saveSiteContent);
document.getElementById("site-content-search").addEventListener("input", event => filterSiteContent(event.currentTarget.value));
document.getElementById("treatment-detail-search").addEventListener("input", event => filterTreatmentDetailContent(event.currentTarget.value));
document.getElementById("treatment-detail-page-search").addEventListener("input", event => filterTreatmentDetailPages(event.currentTarget.value));
document.getElementById("treatment-detail-save-button").addEventListener("click", saveTreatmentDetailContent);
treatmentDetailPageList.addEventListener("click", async event => {
  const button = event.target.closest("[data-treatment-detail-slug]");
  if (!button) return;
  const slug = button.dataset.treatmentDetailSlug;
  if (slug === treatmentDetailSlug) return;
  if (treatmentDetailDirty && !window.confirm("Kaydedilmemiş değişiklikler var. Sayfayı değiştirmek istiyor musunuz?")) {
    return;
  }
  try {
    await loadTreatmentDetailPage(slug);
  } catch (error) {
    showMessage(treatmentDetailMessage, error.message);
  }
});

document.getElementById("refresh-contact-button").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await loadContactSubmissions();
    showMessage(dashboardMessage, "İletişim talepleri yenilendi.", true);
  } catch (error) {
    showMessage(dashboardMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await apiRequest("/api/admin/logout", { method: "POST" });
    window.location.reload();
  } catch (error) {
    showMessage(dashboardMessage, error.message);
  }
});

initialize();
