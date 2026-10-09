import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const loader = index.match(/for\(let i=1;i<=(\d+);i\+\+\)/);
assert.ok(loader, "index loader loop exists");
const partCount = Number(loader[1]);
assert.equal(partCount, 16, "loader should load all 16 committed parts");

const cacheVersion = index.match(/\?v=([0-9.]+)/)?.[1];
assert.equal(cacheVersion, "29.0.0", "loader cache version should match the current release");

for (let i = 1; i <= partCount; i++) {
  const file = `cwj_parts/part${String(i).padStart(2, "0")}.txt`;
  assert.ok(fs.existsSync(path.join(root, file)), `missing build part: ${file}`);
  const content = read(file);
  assert.ok(content.length > 0, `empty build part: ${file}`);
}

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

const adminCss = read("cwj_parts/part12.txt");
const staffCss = read("cwj_parts/part13.txt");
const familyCss = read("cwj_parts/part14.txt");
assert.match(adminCss, /body\.cwj-approved:not\(\.cwj-staff-approved\):not\(\.cwj-family-approved\)/,
  "Admin styling must be role-scoped");
assert.match(staffCss, /body\.cwj-approved\.cwj-staff-approved/,
  "Staff styling must be role-scoped");
assert.match(familyCss, /body\.cwj-approved\.cwj-family-approved/,
  "Family/Client styling must be role-scoped");

console.log("CareWithJohn static regression checks: PASS");
console.log(`Validated ${partCount} build parts, loader/cache consistency, CSS integrity, role separation and login hydration guard.`);
console.log("Not covered: real browser rendering, device viewport screenshots, live Supabase/auth, RLS, or end-to-end workflows.");
