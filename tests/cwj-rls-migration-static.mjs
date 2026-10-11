import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(root, "supabase/migrations/20261011183000_cwj_finance_relationship_rls_guard.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

assert.match(sql, /drop policy if exists invoices_client_family_select on public\.invoices/i,
  "Client/Family invoice visibility policy must be removed");
assert.doesNotMatch(sql, /create policy invoices_client_family_select/i,
  "Client/Family must not regain invoice visibility through RLS");
for (const policy of [
  "organisation_memberships_admin_write",
  "organisation_memberships_select",
  "person_access_relationships_admin_write",
  "person_access_relationships_select",
]) {
  assert.match(sql, new RegExp(`drop policy if exists ${policy} on public\\.`, "i"),
    `${policy} must be reconciled`);
}
const adminChecks = [...sql.matchAll(/public\.current_role\(\)\s*=\s*'([^']+)'/g)].map((match) => match[1]);
assert.ok(adminChecks.length >= 8, "membership and relationship policies must consistently constrain role checks");
assert.ok(adminChecks.every((role) => role === "admin"),
  "current_role() maps admin_owner to 'admin'; policy comparisons must use that canonical database role");
console.log("CareWithJohn RLS migration guard tests: PASS");
