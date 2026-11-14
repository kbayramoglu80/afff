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
