import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// Feature 005 (T045): the words of each statistic's definition are held once in Go and shown by the screen and the API;
// docs/domain.md must carry the same text, so the screen, the API and the domain document cannot drift apart.
const root = join(__dirname, "..", "..");

test("every definition of the API is written in docs/domain.md, word for word", () => {
  const go = readFileSync(join(root, "backend", "internal", "analytics", "definitions.go"), "utf8");
  const domain = readFileSync(join(root, "docs", "domain.md"), "utf8").replace(/\r\n/g, "\n");
  const defs = [...go.matchAll(/\{"(\w+)", "((?:[^"\\]|\\.)*)"\}/g)].map((m) => ({ key: m[1], text: m[2].replace(/\\"/g, '"') }));
  expect(defs.length).toBe(13);
  for (const d of defs) expect(domain, `docs/domain.md lacks the definition of ${d.key}`).toContain(`- **${d.key}**: ${d.text}`);
});
