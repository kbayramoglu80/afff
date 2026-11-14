import { validateImageData } from "./blog.js";

const MAX_CONTENT_FIELDS = 500;
const MAX_CONTENT_LENGTH = 10000;
const CONTENT_KEY_PATTERN = /^c-[A-Za-z0-9_-]{1,698}$/;
const EDITABLE_ATTRIBUTES = new Set(["alt", "aria-label", "content", "href", "placeholder", "title"]);

function isValidKey(key) {
  return typeof key === "string" && key.length <= 700 && CONTENT_KEY_PATTERN.test(key);
}

function isSafeHref(value) {
  if (!value) return true;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return false;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return true;
  if (value.startsWith("#")) return true;
  return value.startsWith("/") && !value.startsWith("//");
}

export function validateSiteContentBatch(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Array.isArray(input.entries)) {
    return { error: "Geçerli site içerikleri gönderin." };
  }
  if (input.entries.length > MAX_CONTENT_FIELDS) {
    return { error: `En fazla ${MAX_CONTENT_FIELDS} içerik alanı kaydedilebilir.` };
  }

  const keys = new Set();
  const entries = [];
  for (const entry of input.entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry) || !isValidKey(entry.key)) {
      return { error: "İçerik alanı kimliği geçersiz." };
    }
    if (keys.has(entry.key)) return { error: "Aynı içerik alanı birden fazla gönderilemez." };
    keys.add(entry.key);
    if (entry.type !== "text" && entry.type !== "attribute") {
      return { error: "İçerik alanı türü geçersiz." };
    }
    if (entry.type === "attribute" && !EDITABLE_ATTRIBUTES.has(entry.attribute)) {
      return { error: "Düzenlenebilir içerik niteliği geçersiz." };
    }
    if (entry.type === "text" && entry.attribute != null) {
      return { error: "Metin alanı için nitelik gönderilemez." };
    }
    for (const locale of ["valueTr", "valueEn"]) {
      if (typeof entry[locale] !== "string" || entry[locale].length > MAX_CONTENT_LENGTH) {
        return { error: `İçerik en fazla ${MAX_CONTENT_LENGTH} karakter olabilir.` };
      }
      if (entry.type === "attribute" && entry.attribute === "href" && !isSafeHref(entry[locale].trim())) {
        return { error: "Bağlantı yalnızca http, https, e-posta, telefon veya site içi adres olabilir." };
      }
    }
    entries.push({
      key: entry.key,
      type: entry.type,
      attribute: entry.attribute ?? null,
      valueTr: entry.valueTr,
      valueEn: entry.valueEn,
    });
  }

  return { value: entries };
}

export function validateSiteAsset(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !isValidKey(input.key)) {
    return { error: "Görsel alanı kimliği geçersiz." };
  }
  if (!Object.hasOwn(input, "imageData")) return { error: "Görsel verisi gönderilmedi." };
  const image = validateImageData(input.imageData);
  if (image.error) return image;
  if (!image.value) return { value: { key: input.key, imageData: null, contentType: null } };

  const contentType = image.value.slice(5, image.value.indexOf(";"));
  return { value: { key: input.key, imageData: image.value, contentType } };
}
