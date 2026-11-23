import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/demo/showcase-stores.ts", import.meta.url), "utf8");
const ids = [...new Set(source.match(/photo-[a-zA-Z0-9-]+/g) ?? [])];
const failures = [];
let cursor = 0;
async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++];
    const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=240&q=45`;
    try {
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(12000) });
      if (!response.ok) failures.push({ id, status: response.status });
    } catch (error) {
      failures.push({ id, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
await Promise.all(Array.from({ length: 6 }, () => worker()));
if (failures.length) {
  console.error("Showcase image URL check failed:", failures);
  process.exitCode = 1;
} else {
  console.log(`Verified ${ids.length} unique showcase image URLs.`);
}
