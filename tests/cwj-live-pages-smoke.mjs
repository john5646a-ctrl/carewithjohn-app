import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const baseUrl = process.env.CWJ_APP_URL || "https://john5646a-ctrl.github.io/carewithjohn-app/";
const read = (file) => fs.readFileSync(path.join(root, file));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const indexBytes = read("index.html");
const indexText = indexBytes.toString("utf8");
const loader = indexText.match(/for\(let i=1;i<=(\d+);i\+\+\)/);
if (!loader) throw new Error("Repository index.html has no recognised build-part loader.");
const partCount = Number(loader[1]);
const version = indexText.match(/\?v=([0-9.]+)/)?.[1];
if (!version) throw new Error("Repository index.html has no versioned part URL.");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBytes(url) {
  const response = await fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function verifyDeployment() {
  const liveIndex = await fetchBytes(new URL("index.html", baseUrl));
  if (sha256(liveIndex) !== sha256(indexBytes)) {
    throw new Error(`Live index.html hash mismatch (expected ${sha256(indexBytes)}, received ${sha256(liveIndex)}).`);
  }

  for (let i = 1; i <= partCount; i++) {
    const file = `cwj_parts/part${String(i).padStart(2, "0")}.txt`;
    const expected = read(file);
    const url = new URL(`${file}?v=${version}`, baseUrl);
    const actual = await fetchBytes(url);
    if (sha256(actual) !== sha256(expected)) {
      throw new Error(`Live resource mismatch for ${file}: expected ${sha256(expected)}, received ${sha256(actual)}.`);
    }
  }
  console.log(`Live Pages smoke test: PASS — ${baseUrl}`);
  console.log(`Verified index.html and all ${partCount} parts against repository SHA ${process.env.GITHUB_SHA || "unknown"} (loader version ${version}).`);
}

let lastError;
for (let attempt = 1; attempt <= 10; attempt++) {
  try {
    await verifyDeployment();
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.log(`Attempt ${attempt}/10: ${error.message}`);
    if (attempt < 10) await sleep(15000);
  }
}
console.error("Live Pages verification failed after 10 attempts.");
throw lastError;
