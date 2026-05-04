#!/usr/bin/env node
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const WebSocket = require("ws");

const COLLECTION_ID = "17979154316722015";

async function getPages() {
  const res = await fetch("http://localhost:9222/json");
  return res.json();
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.once("open", () => {
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    });
    ws.on("message", (data) => {
      const msg = JSON.parse(data);
      if (msg.id === 1) { ws.close(); resolve(msg.result); }
    });
    ws.once("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("timeout after 30s")); }, 30000);
  });
}

async function main() {
  console.log("Connecting to Chrome on port 9222...");
  let pages;
  try {
    pages = await getPages();
  } catch {
    console.error("Cannot connect to Chrome. Start it with:\n");
    console.error(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\Users\\naimj\\AppData\\Local\\Google\\Chrome\\User Data"`);
    process.exit(1);
  }

  const page = pages.find(p => p.type === "page" && p.url.includes("instagram.com"));
  if (!page) {
    console.error("No Instagram tab open. Navigate to your saved collection in Chrome first.");
    process.exit(1);
  }
  console.log(`Found: ${page.url}`);

  const script = `(async () => {
    const codes = [];
    let maxId = null;
    do {
      const url = 'https://www.instagram.com/api/v1/feed/collection/${COLLECTION_ID}/posts/?count=50' + (maxId ? '&max_id=' + maxId : '');
      const r = await fetch(url, { headers: { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
      const d = await r.json();
      for (const item of d.items ?? []) {
        const c = item.media?.code ?? item.code;
        if (c && !codes.includes(c)) codes.push(c);
      }
      maxId = d.more_available ? d.next_max_id : null;
      console.log('fetched', codes.length, 'so far...');
    } while (maxId);
    return codes.join('\\n');
  })()`;

  console.log("Fetching collection...");
  const result = await evaluate(page.webSocketDebuggerUrl, script);

  if (result?.value) {
    const ids = result.value.trim().split("\n").filter(Boolean);
    console.log(`\nFound ${ids.length} reels:`);
    console.log(ids.join("\n"));
    writeFileSync("reel-ids.txt", ids.join("\n"));
    console.log("\nSaved to reel-ids.txt");
  } else {
    console.error("Failed:", JSON.stringify(result));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
