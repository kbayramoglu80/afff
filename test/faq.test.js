import test from "node:test";
import assert from "node:assert/strict";
import { validateFaq } from "../lib/faq.js";

test("validateFaq accepts and trims a complete question and answer", () => {
  assert.deepEqual(validateFaq({
    question: "  Randevu nasıl alınır?  ",
    answer: "  Telefonla veya form üzerinden.  ",
  }).value, {
    question: "Randevu nasıl alınır?",
    answer: "Telefonla veya form üzerinden.",
  });
});

test("validateFaq rejects missing, blank, and oversized fields", () => {
  assert.match(validateFaq({}).error, /Soru/);
  assert.match(validateFaq({ question: "  ", answer: "Yanıt" }).error, /Soru/);
  assert.match(validateFaq({ question: "Soru", answer: "x".repeat(10001) }).error, /Yanıt/);
});
