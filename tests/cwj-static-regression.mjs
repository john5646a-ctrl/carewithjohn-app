import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import "./cwj-edge-cors.mjs";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const liveSmokeSyntax = spawnSync(process.execPath, ["--check", path.join(root, "tests/cwj-live-pages-smoke.mjs")], { encoding: "utf8" });
assert.equal(liveSmokeSyntax.status, 0, `live Pages smoke script syntax error: ${liveSmokeSyntax.stderr}`);
const browserSmokeSyntax = spawnSync(process.execPath, ["--check", path.join(root, "tests/cwj-browser-smoke.mjs")], { encoding: "utf8" });
assert.equal(browserSmokeSyntax.status, 0, `browser smoke script syntax error: ${browserSmokeSyntax.stderr}`);
const index = read("index.html");
const loader = index.match(/for\(let i=1;i<=(\d+);i\+\+\)/);
assert.ok(loader, "index loader loop exists");
const partCount = Number(loader[1]);
assert.equal(partCount, 16, "loader should load all 16 committed parts");

assert.match(index, /cwj_parts\/part/ , "loader must request cwj_parts resources");
assert.match(index, /cache:'no-store'/, "loader must bypass browser HTTP cache for build parts");
assert.match(index, /Build part '\+i\+' failed/, "loader must reject non-success responses instead of silently rendering partial content");
assert.match(index, /Build loading failed/, "loader must show an explicit error when a required part fails");
const authUiParts = [9, 10].map((n) => read(`cwj_parts/part${String(n).padStart(2, "0")}.txt`)).join("\n");
assert.match(authUiParts, /authModal|authEmail|authPassword/, "app parts must retain the sign-in form entry point");
const liveWorkflow = read(".github/workflows/cwj-live-smoke.yml");
for (const requiredStep of ["workflow_dispatch", "tests/cwj-live-pages-smoke.mjs", "tests/cwj-browser-smoke.mjs", "actions/upload-artifact@v4"]) {
  assert.ok(liveWorkflow.includes(requiredStep), `live release smoke workflow missing required entry: ${requiredStep}`);
}
const browserSmoke = read("tests/cwj-browser-smoke.mjs");
assert.match(browserSmoke, /role-state/, "live browser smoke must check unauthenticated role-state access");
const cacheVersion = index.match(/\?v=([0-9.]+)/)?.[1];
assert.equal(cacheVersion, "29.0.0", "loader cache version should match the current release");

for (let i = 1; i <= partCount; i++) {
  const file = `cwj_parts/part${String(i).padStart(2, "0")}.txt`;
  assert.ok(fs.existsSync(path.join(root, file)), `missing build part: ${file}`);
  const content = read(file);
  assert.ok(content.length > 0, `empty build part: ${file}`);
}

const primaryUi = read("cwj_parts/part10.txt");
const primaryStyle = primaryUi.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1];
assert.ok(primaryStyle, "part10 primary UI style block must close");
assert.equal((primaryStyle.match(/{/g) || []).length, (primaryStyle.match(/}/g) || []).length,
  "part10 primary UI CSS braces must balance independently of its JavaScript");

for (let i = 11; i <= 16; i++) {
  const file = `cwj_parts/part${String(i).padStart(2, "0")}.txt`;
  const css = read(file);
  assert.match(css, /<style\b/i, `${file} should contain a style block`);
  assert.match(css, /<\/style>/i, `${file} style block must close`);
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, `${file} CSS braces must balance`);
}

const roles = read("cwj_parts/part06.txt");
for (const role of ["admin_owner", "staff_member", "client", "family_member"]) {
  assert.ok(roles.includes(role), `canonical role missing: ${role}`);
}
assert.match(roles, /cloudUser=null;const me=await cloudMe\(\);if\(!me\)throw new Error/,
  "login must hydrate and validate the active account/organisation before rendering");

const renderers = read("cwj_parts/part10.txt");
assert.match(renderers, /cwj-family-approved/);
assert.match(renderers, /cwj-staff-approved/);
assert.match(renderers, /CWJ_ROLES\.CLIENT/);
assert.match(renderers, /CWJ_ROLES\.FAMILY_MEMBER/);
const loginUi = read("cwj_parts/part10.txt");
assert.ok(!loginUi.includes("Choose your entry point"), "login must not offer a non-functional client-side role picker");
assert.ok(!loginUi.includes("data-role=\"admin\"") && !loginUi.includes("data-role=\"staff\"") && !loginUi.includes("data-role=\"family\""),
  "role access must come from verified account membership, not a client-side login toggle");
assert.ok(loginUi.includes("Your CareWithJohn account and organisation membership determine the access you receive."),
  "login must explain that the account membership determines access");
assert.ok(!loginUi.includes('onclick="closeAuth()"'), "unauthenticated users must not be able to dismiss the required sign-in gate");
assert.ok(loginUi.includes("body.cwj-approved:has(#authModal.show) main"), "unauthenticated sign-in must hide the underlying app shell");

const adminCss = read("cwj_parts/part12.txt");
const staffCss = read("cwj_parts/part13.txt");
const familyCss = read("cwj_parts/part14.txt");
assert.match(adminCss, /body\.cwj-approved:not\(\.cwj-staff-approved\):not\(\.cwj-family-approved\)/,
  "Admin styling must be role-scoped");
assert.match(staffCss, /body\.cwj-approved\.cwj-staff-approved/,
  "Staff styling must be role-scoped");
assert.match(familyCss, /body\.cwj-approved\.cwj-family-approved/,
  "Family/Client styling must be role-scoped");


const approvedVisualParts = [10, 11, 12, 13, 14, 15, 16]
  .map((n) => read(`cwj_parts/part${String(n).padStart(2, "0")}.txt`))
  .join("\n");
for (const brandColour of ["#0B2D52", "#087F88", "#12A3A5", "#4A9B45", "#EAF6FB"]) {
  assert.ok(approvedVisualParts.toLowerCase().includes(brandColour.toLowerCase()),
    `approved CareWithJohn brand colour missing from visual layer: ${brandColour}`);
}
const allPartStyleContent = Array.from({ length: partCount }, (_, index) =>
  read(`cwj_parts/part${String(index + 1).padStart(2, "0")}.txt`)).join("\n");
const allStyleIds = [...allPartStyleContent.matchAll(/<style\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)]
  .map((match) => match[1]);
assert.equal(new Set(allStyleIds).size, allStyleIds.length,
  "all committed application parts must not duplicate style element IDs");

const styleIds = [...approvedVisualParts.matchAll(/<style\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)]
  .map((match) => match[1]);
assert.equal(new Set(styleIds).size, styleIds.length,
  "approved visual layer must not contain duplicate style element IDs");

console.log("CareWithJohn static regression checks: PASS");
console.log(`Validated ${partCount} build parts, loader/cache consistency, CSS integrity, role separation and login hydration guard.`);
console.log("Not covered: real browser rendering, device viewport screenshots, live Supabase/auth, RLS, or end-to-end workflows.");
