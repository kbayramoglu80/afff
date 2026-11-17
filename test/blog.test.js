import test from "node:test";
import assert from "node:assert/strict";
import { slugifyTitle, validatePost } from "../lib/blog.js";

test("slugifyTitle converts Turkish characters and removes unsafe separators", () => {
  assert.equal(slugifyTitle("Diz ve Omuz Sağlığı: İlk Adımlar!"), "diz-ve-omuz-sagligi-ilk-adimlar");
});

test("validatePost accepts a complete draft and trims its text", () => {
  const result = validatePost({
    title: "  Diz Sağlığı  ",
    excerpt: "  Kısa bilgi  ",
    content: "  Yazı içeriği  ",
    status: "draft",
  });
  assert.deepEqual(result.value, {
    title: "Diz Sağlığı",
    slug: "diz-sagligi",
    excerpt: "Kısa bilgi",
    content: "Yazı içeriği",
    titleEn: "",
    excerptEn: "",
    contentEn: "",
    status: "draft",
    imageData: null,
  });
});

test("validatePost accepts optional English title, excerpt, and content", () => {
  const result = validatePost({
    title: "Başlık",
    excerpt: "Özet",
    content: "İçerik",
    titleEn: "Title",
    excerptEn: "Summary",
    contentEn: "Article text",
    status: "draft",
  });
  assert.equal(result.value.titleEn, "Title");
  assert.equal(result.value.excerptEn, "Summary");
  assert.equal(result.value.contentEn, "Article text");
});

test("validatePost rejects missing, oversized, and invalid-status content", () => {
  assert.match(validatePost({}).error, /Başlık/);
  assert.match(validatePost({
    title: "Başlık",
    excerpt: "Özet",
    content: "İçerik",
    status: "public",
  }).error, /durumu/);
  assert.match(validatePost({
    title: "Başlık",
    excerpt: "Özet",
    content: "x".repeat(20001),
    status: "draft",
  }).error, /İçerik/);
  assert.match(validatePost({
    title: "Başlık",
    excerpt: "Özet",
    content: "İçerik",
    contentEn: "x".repeat(20001),
    status: "draft",
  }).error, /İngilizce içerik/);
});

test("validatePost accepts a correctly encoded PNG image", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
  const imageData = `data:image/png;base64,${png}`;
  const result = validatePost({
    title: "Başlık",
    excerpt: "Özet",
    content: "İçerik",
    status: "published",
    imageData,
  });
  assert.equal(result.value.imageData, imageData);
});

test("validatePost rejects an image whose declared type does not match its contents", () => {
  const imageData = `data:image/png;base64,${Buffer.from("not a PNG").toString("base64")}`;
  const result = validatePost({
    title: "Başlık",
    excerpt: "Özet",
    content: "İçerik",
    status: "published",
    imageData,
  });
  assert.match(result.error, /uyuşmuyor/);
});
