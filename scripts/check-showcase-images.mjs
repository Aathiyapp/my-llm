import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/demo/showcase-stores.ts", import.meta.url), "utf8");
const starts = [...source.matchAll(/makeStore\("([^"]+)","[^"]+","([^"]+)"/g)];
const usernames = new Set();
const catalogErrors = [];
for (let index = 0; index < starts.length; index++) {
  const start = starts[index].index ?? 0;
  const end = index + 1 < starts.length ? starts[index + 1].index ?? source.length : source.indexOf("\n];", start);
  const block = source.slice(start, end < 0 ? source.length : end);
  const storeId = starts[index][1];
  const username = starts[index][2];
  const productCount = (block.match(/\["[^"]+","₹/g) ?? []).length;
  if (usernames.has(username)) catalogErrors.push(`Duplicate store username: ${username}`);
  usernames.add(username);
  if (productCount < 10 || productCount > 20) catalogErrors.push(`${storeId} has ${productCount} products; expected 10–20.`);
}
if (starts.length < 10) catalogErrors.push(`Only ${starts.length} showcase stores are configured; minimum is 10.`);
if (catalogErrors.length) {
  console.error("Showcase catalog validation failed:", catalogErrors);
  process.exit(1);
}
console.log(`Catalog check passed: ${starts.length} stores, ${starts.length * 3} collections, 10–20 products per store.`);

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
  console.log(`Image check passed: ${ids.length} unique showcase image URLs.`);
}
