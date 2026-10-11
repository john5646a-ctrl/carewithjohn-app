import assert from "node:assert/strict";

const apiBase = (process.env.CWJ_API_BASE || "https://fjxiqkqrnkmnohzvmnss.supabase.co/functions/v1/cwj-api").replace(/\/$/, "");
const required = [
  "CWJ_TEST_STAFF_TOKEN",
  "CWJ_TEST_CLIENT_TOKEN",
  "CWJ_TEST_FAMILY_TOKEN",
  "CWJ_TEST_STAFF_ASSIGNED_CLIENT_ID",
  "CWJ_TEST_STAFF_UNASSIGNED_CLIENT_ID",
  "CWJ_TEST_CLIENT_ID",
  "CWJ_TEST_FAMILY_LINKED_CLIENT_ID",
  "CWJ_TEST_FAMILY_PENDING_CLIENT_ID",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Live role-state integration test not run: missing protected test configuration: ${missing.join(", ")}`);
  process.exit(2);
}

const tokens = {
  staff_member: process.env.CWJ_TEST_STAFF_TOKEN,
  client: process.env.CWJ_TEST_CLIENT_TOKEN,
  family_member: process.env.CWJ_TEST_FAMILY_TOKEN,
};
if (process.env.CWJ_TEST_ADMIN_TOKEN) tokens.admin_owner = process.env.CWJ_TEST_ADMIN_TOKEN;

async function request(path, token) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  let body;
  try { body = await response.json(); }
  catch { throw new Error(`${path} returned non-JSON HTTP ${response.status}`); }
  return { status: response.status, body };
}

function rows(state, key) {
  assert.ok(Array.isArray(state?.[key]), `role-state response must contain an array for ${key}`);
  return state[key];
}
function ids(state, key, field = "id") {
  return rows(state, key).map((row) => String(row[field] ?? ""));
}
function noFinance(state, role) {
  assert.deepEqual(rows(state, "invoices"), [], `${role} must not receive invoices`);
  assert.deepEqual(rows(state, "expenses"), [], `${role} must not receive expenses`);
  assert.deepEqual(rows(state, "quotes"), [], `${role} must not receive quotes`);
  assert.deepEqual(rows(state, "leads"), [], `${role} must not receive leads`);
  for (const job of rows(state, "jobs")) {
    assert.equal("income" in job, false, `${role} visit projection must not expose income`);
    assert.equal("clientCharge" in job, false, `${role} visit projection must not expose client charges`);
  }
  for (const document of rows(state, "documents")) {
    assert.equal("storage_path" in document, false, `${role} documents must not expose private storage paths`);
  }
}

for (const [role, token] of Object.entries(tokens)) {
  const identity = await request("/auth/me", token);
  assert.equal(identity.status, 200, `${role} /auth/me must validate the live test identity`);
  assert.equal(identity.body?.user?.role, role, `${role} test token must resolve to the expected canonical role`);
  assert.ok(identity.body?.user?.organisation_id, `${role} test identity must have an active organisation`);

  const projected = await request("/role-state", token);
  if (role === "admin_owner") {
    assert.equal(projected.status, 403, "Admin must not use the non-admin /role-state projection endpoint");
    continue;
  }
  assert.equal(projected.status, 200, `${role} /role-state must return an authorised projection`);
  const state = projected.body?.state;
  assert.ok(state && typeof state === "object", `${role} /role-state must return state`);
  noFinance(state, role);

  if (role === "staff_member") {
    const assigned = process.env.CWJ_TEST_STAFF_ASSIGNED_CLIENT_ID;
    const unassigned = process.env.CWJ_TEST_STAFF_UNASSIGNED_CLIENT_ID;
    assert.ok(ids(state, "clients").includes(assigned), "Staff must receive the assigned client");
    assert.ok(!ids(state, "clients").includes(unassigned), "Staff must not receive an unassigned client");
    assert.ok(rows(state, "jobs").length > 0, "Staff test fixture must include an assigned visit");
    assert.ok(rows(state, "jobs").every((job) => String(job.clientId ?? job.client_id ?? job.personId ?? job.person_id ?? "") === assigned),
      "Staff visits must remain within the assigned-client fixture");
    assert.ok(!rows(state, "messages").some((message) => String(message.clientId ?? message.client_id ?? "") === unassigned),
      "Staff must not receive messages for an unassigned client");
  } else if (role === "client") {
    const ownClient = process.env.CWJ_TEST_CLIENT_ID;
    assert.ok(ids(state, "clients").includes(ownClient), "Client must receive their own linked client record");
    assert.ok(rows(state, "clients").every((client) => String(client.id) === ownClient), "Client projection must not include other clients");
    assert.ok(rows(state, "jobs").every((job) => String(job.clientId ?? job.client_id ?? job.personId ?? job.person_id ?? "") === ownClient),
      "Client visits must remain within their own client record");
  } else if (role === "family_member") {
    const linked = process.env.CWJ_TEST_FAMILY_LINKED_CLIENT_ID;
    const pending = process.env.CWJ_TEST_FAMILY_PENDING_CLIENT_ID;
    assert.ok(ids(state, "clients").includes(linked), "Family must receive the actively linked client");
    assert.ok(!ids(state, "clients").includes(pending), "Family must not receive a pending/unapproved client relationship");
    assert.ok(rows(state, "relationships").every((relationship) => String(relationship.status).toLowerCase() === "active"),
      "Family projection must not return pending or revoked relationships");
  }
  console.log(`PASS live authenticated projection: ${role}`);
}
console.log("CareWithJohn live role-state integration checks: PASS");
