import test from "node:test";
import assert from "node:assert/strict";
import { buildSitemapXml, renderParagraphs, renderReferences, validateSeoSettings } from "../lib/seo.js";

test("validateSeoSettings requires a Turkish title and description and trims text", () => {
  assert.deepEqual(validateSeoSettings({
    titleTr: " Ana sayfa ",
    titleEn: " Home ",
    descriptionTr: " Açıklama ",
    descriptionEn: "",
  }).value, {
    titleTr: "Ana sayfa",
    titleEn: "Home",
    descriptionTr: "Açıklama",
    descriptionEn: "",
  });
  assert.match(validateSeoSettings({ titleTr: "", descriptionTr: "Açıklama" }).error, /Türkçe SEO başlığı/);
});

test("rendered medical content escapes HTML and only links HTTPS references", () => {
  assert.equal(renderParagraphs("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.match(renderReferences("Kaynak başlığı | https://doi.org/10.1000/example"), /href="https:\/\/doi\.org/);
  assert.doesNotMatch(renderReferences("Kötü bağlantı | javascript:alert(1)"), /javascript:/);
});

test("sitemap contains only the homepage and treatment URLs", () => {
  const xml = buildSitemapXml("https://www.example.test", [
    { slug: "diz-cerrahisi", updatedAt: new Date("2026-01-02T00:00:00Z") },
  ]);
  assert.match(xml, /<loc>https:\/\/www\.example\.test\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.example\.test\/tedavi\/diz-cerrahisi<\/loc>/);
  assert.match(xml, /<lastmod>2026-01-02<\/lastmod>/);
});
