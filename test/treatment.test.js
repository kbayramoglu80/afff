import test from "node:test";
import assert from "node:assert/strict";
import { treatmentPages } from "../lib/treatment-seeds.js";
import { validateTreatmentPage } from "../lib/treatment.js";

test("all homepage treatment areas have a unique seeded subpage", () => {
  assert.equal(treatmentPages.length, 9);
  assert.equal(new Set(treatmentPages.map(page => page.key)).size, treatmentPages.length);
  assert.ok(treatmentPages.every(page => page.slug === page.key && page.titleTr && page.contentTr));
});

test("validateTreatmentPage accepts localized content and trims whitespace", () => {
  assert.deepEqual(validateTreatmentPage({
    titleTr: "  Diz Cerrahisi ",
    titleEn: " Knee Surgery ",
    summaryTr: " Özet ",
    summaryEn: " Summary ",
    contentTr: " İçerik ",
    contentEn: " Content ",
  }).value, {
    titleTr: "Diz Cerrahisi",
    titleEn: "Knee Surgery",
    summaryTr: "Özet",
    summaryEn: "Summary",
    contentTr: "İçerik",
    contentEn: "Content",
    seoTitleTr: "",
    seoTitleEn: "",
    seoDescriptionTr: "",
    seoDescriptionEn: "",
    referencesTr: "",
    referencesEn: "",
  });
});

test("validateTreatmentPage rejects missing Turkish fields and oversized content", () => {
  assert.match(validateTreatmentPage({}).error, /Türkçe başlık/);
  assert.match(validateTreatmentPage({
    titleTr: "Başlık",
    summaryTr: "Özet",
    contentTr: "x".repeat(20001),
  }).error, /Türkçe içerik/);
});

test("validateTreatmentPage accepts SEO metadata and secure scientific references", () => {
  const result = validateTreatmentPage({
    titleTr: "Diz Cerrahisi",
    summaryTr: "Özet",
    contentTr: "İçerik",
    seoTitleTr: "Diz Cerrahisi | Uzman değerlendirmesi",
    seoDescriptionTr: "Diz sorunlarının değerlendirilmesi.",
    referencesTr: "Yazar. Makale başlığı. Dergi. 2025. | https://doi.org/10.1000/example",
  });
  assert.equal(result.value.seoTitleTr, "Diz Cerrahisi | Uzman değerlendirmesi");
  assert.match(result.value.referencesTr, /^Yazar\./);
  assert.match(validateTreatmentPage({
    titleTr: "Diz Cerrahisi",
    summaryTr: "Özet",
    contentTr: "İçerik",
    referencesTr: "Güvensiz kaynak | javascript:alert(1)",
  }).error, /HTTPS bağlantısı/);
});
