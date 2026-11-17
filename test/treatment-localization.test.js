import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const treatmentDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tedavi");

function getTagSequence(html) {
  return [...html.matchAll(/<\/?([a-z][a-z0-9-]*)(?:\s|>)/gi)]
    .map(match => match[0].startsWith("</") ? `/${match[1].toLowerCase()}` : match[1].toLowerCase());
}

test("every static treatment page has a structure-preserving English counterpart", async () => {
  const sourcePages = (await readdir(treatmentDirectory)).filter(file => file.endsWith(".html")).sort();
  const englishPages = (await readdir(path.join(treatmentDirectory, "en"))).filter(file => file.endsWith(".html")).sort();
  assert.deepEqual(englishPages, sourcePages);

  for (const filename of sourcePages) {
    const [source, english] = await Promise.all([
      readFile(path.join(treatmentDirectory, filename), "utf8"),
      readFile(path.join(treatmentDirectory, "en", filename), "utf8"),
    ]);
    assert.match(english, /<html lang="en">/, `${filename} must declare English`);
    assert.match(english, /<body[^>]*data-static-language="en"/, `${filename} must identify its English source`);
    assert.doesNotMatch(english, /translate\.google\.com/i, `${filename} must not use Google Translate`);
    assert.match(english, /<title>[^<]+<\/title>/, `${filename} must have a page title`);
    assert.match(english, /<meta\b[^>]*name="description"[^>]*>/i, `${filename} must have a page description`);
    assert.deepEqual(getTagSequence(english), getTagSequence(source), `${filename} must preserve its markup structure`);
  }
});
