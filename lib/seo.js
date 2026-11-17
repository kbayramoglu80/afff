const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_REFERENCES_LENGTH = 10000;
const MAX_REFERENCES_COUNT = 20;

function validateText(input, field, label, maxLength, required = false) {
  const value = input[field] ?? "";
  if (typeof value !== "string" || (required && !value.trim()) || value.length > maxLength) {
    return { error: `${label} ${required ? "boş bırakılamaz ve " : ""}en fazla ${maxLength} karakter olabilir.` };
  }
  return { value: value.trim() };
}

function validateReferences(value, label) {
  if (typeof value !== "string" || value.length > MAX_REFERENCES_LENGTH) {
    return { error: `${label} en fazla ${MAX_REFERENCES_LENGTH} karakter olabilir.` };
  }
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > MAX_REFERENCES_COUNT) {
    return { error: `${label} en fazla ${MAX_REFERENCES_COUNT} kaynak içerebilir.` };
  }
  for (const line of lines) {
    const [citation, url, ...extra] = line.split("|").map(part => part.trim());
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { error: `${label} her satırda "Kaynak bilgisi | https://..." biçiminde olmalıdır.` };
    }
    if (!citation || citation.length > 500 || extra.length || parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
      return { error: `${label} her satırda geçerli bir kaynak açıklaması ve HTTPS bağlantısı olmalıdır.` };
    }
  }
  return { value: lines.join("\n") };
}

export function validateSeoSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Geçerli SEO ayarları gönderin." };
  }
  const fields = [
    ["titleTr", "Türkçe SEO başlığı", MAX_TITLE_LENGTH, true],
    ["titleEn", "İngilizce SEO başlığı", MAX_TITLE_LENGTH, false],
    ["descriptionTr", "Türkçe meta açıklaması", MAX_DESCRIPTION_LENGTH, true],
    ["descriptionEn", "İngilizce meta açıklaması", MAX_DESCRIPTION_LENGTH, false],
  ];
  const value = {};
  for (const [field, label, maxLength, required] of fields) {
    const parsed = validateText(input, field, label, maxLength, required);
    if (parsed.error) return parsed;
    value[field] = parsed.value;
  }
  return { value };
}

export function validateSeoReferences(value, label = "Kaynaklar") {
  return validateReferences(value, label);
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

export function renderParagraphs(value) {
  return String(value).split(/\n{2,}/).filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

export function renderReferences(value, heading = "Bilimsel kaynaklar") {
  const references = String(value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!references.length) return "";
  const items = references.flatMap(line => {
    const [citation, href, ...extra] = line.split("|").map(part => part.trim());
    let url;
    try {
      url = new URL(href);
    } catch {
      return [];
    }
    if (!citation || extra.length || url.protocol !== "https:" || url.username || url.password) return [];
    return [`<li><a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(citation)}</a></li>`];
  }).join("");
  if (!items) return "";
  return `<section class="references"><h2>${escapeHtml(heading)}</h2><ol>${items}</ol></section>`;
}

export function buildSitemapXml(origin, pages, staticPages = []) {
  const urls = [
    `<url><loc>${escapeHtml(`${origin}/`)}</loc></url>`,
    `<url><loc>${escapeHtml(`${origin}/en/`)}</loc></url>`,
    ...pages.flatMap(page => {
      const lastmod = page.updatedAt && !Number.isNaN(new Date(page.updatedAt).getTime())
        ? `<lastmod>${new Date(page.updatedAt).toISOString().slice(0, 10)}</lastmod>`
        : "";
      const slug = encodeURIComponent(page.slug);
      return [
        `<url><loc>${escapeHtml(`${origin}/tedavi/${slug}`)}</loc>${lastmod}</url>`,
        `<url><loc>${escapeHtml(`${origin}/en/tedavi/${slug}`)}</loc>${lastmod}</url>`,
      ];
    }),
    ...staticPages.flatMap(slug => {
      const filename = `${encodeURIComponent(slug)}.html`;
      return [
        `<url><loc>${escapeHtml(`${origin}/tedavi/${filename}`)}</loc></url>`,
        `<url><loc>${escapeHtml(`${origin}/en/tedavi/${filename}`)}</loc></url>`,
      ];
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}
