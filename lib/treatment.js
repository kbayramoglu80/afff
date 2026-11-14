import { validateSeoReferences } from "./seo.js";

const MAX_TITLE_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 500;
const MAX_CONTENT_LENGTH = 20000;

export function validateTreatmentPage(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Geçerli tedavi sayfası bilgisi gönderin." };
  }

  const fields = [
    ["titleTr", "Türkçe başlık", MAX_TITLE_LENGTH, true],
    ["titleEn", "İngilizce başlık", MAX_TITLE_LENGTH, false],
    ["summaryTr", "Türkçe özet", MAX_SUMMARY_LENGTH, true],
    ["summaryEn", "İngilizce özet", MAX_SUMMARY_LENGTH, false],
    ["contentTr", "Türkçe içerik", MAX_CONTENT_LENGTH, true],
    ["contentEn", "İngilizce içerik", MAX_CONTENT_LENGTH, false],
    ["seoTitleTr", "Türkçe SEO başlığı", MAX_TITLE_LENGTH, false],
    ["seoTitleEn", "İngilizce SEO başlığı", MAX_TITLE_LENGTH, false],
    ["seoDescriptionTr", "Türkçe meta açıklaması", MAX_SUMMARY_LENGTH, false],
    ["seoDescriptionEn", "İngilizce meta açıklaması", MAX_SUMMARY_LENGTH, false],
  ];
  const value = {};

  for (const [field, label, maxLength, required] of fields) {
    const text = input[field] ?? (required ? undefined : "");
    if (typeof text !== "string" || (required && !text.trim()) || text.length > maxLength) {
      return { error: `${label} ${required ? "boş bırakılamaz ve " : ""}en fazla ${maxLength} karakter olabilir.` };
    }
    value[field] = text.trim();
  }

  for (const locale of ["Tr", "En"]) {
    const references = validateSeoReferences(input[`references${locale}`] ?? "", `${locale === "Tr" ? "Türkçe" : "İngilizce"} kaynaklar`);
    if (references.error) return references;
    value[`references${locale}`] = references.value;
  }

  return { value };
}
