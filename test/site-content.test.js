import test from "node:test";
import assert from "node:assert/strict";
import { validateSiteAsset, validateSiteContentBatch } from "../lib/site-content.js";

test("validateSiteContentBatch trims neither copy nor metadata and accepts both locales", () => {
  const result = validateSiteContentBatch({
    entries: [{
      key: "c-dGV4dDox",
      type: "text",
      attribute: null,
      valueTr: "  Yeni başlık  ",
      valueEn: "  New heading  ",
    }],
  });
  assert.deepEqual(result.value, [{
    key: "c-dGV4dDox",
    type: "text",
    attribute: null,
    valueTr: "  Yeni başlık  ",
    valueEn: "  New heading  ",
  }]);
});

test("validateSiteContentBatch rejects unsafe links and duplicate or malformed keys", () => {
  const base = { type: "attribute", attribute: "href", valueTr: "#contact", valueEn: "#contact" };
  assert.match(validateSiteContentBatch({ entries: [{ ...base, key: "c-a", valueTr: "javascript:alert(1)" }] }).error, /Bağlantı/);
  assert.match(validateSiteContentBatch({ entries: [{ ...base, key: "c-a", valueTr: "/\\example.com" }] }).error, /Bağlantı/);
  assert.match(validateSiteContentBatch({ entries: [{ ...base, key: "c-a" }, { ...base, key: "c-a" }] }).error, /birden fazla/);
  assert.match(validateSiteContentBatch({ entries: [{ ...base, key: "bad key" }] }).error, /kimliği/);
});

test("validateSiteAsset accepts a supported image and allows explicit reset", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
  assert.equal(validateSiteAsset({
    key: "c-a",
    imageData: `data:image/png;base64,${png}`,
  }).value.contentType, "image/png");
  assert.deepEqual(validateSiteAsset({ key: "c-a", imageData: null }).value, {
    key: "c-a",
    imageData: null,
    contentType: null,
  });
  assert.match(validateSiteAsset({ key: "c-a" }).error, /gönderilmedi/);
});

test("validateSiteAsset rejects mismatched image data", () => {
  const result = validateSiteAsset({
    key: "c-a",
    imageData: `data:image/png;base64,${Buffer.from("not an image").toString("base64")}`,
  });
  assert.match(result.error, /uyuşmuyor/);
});
