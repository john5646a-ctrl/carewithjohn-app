import assert from "node:assert/strict";
import { projectRoleState } from "../supabase/functions/cwj-api/role-state.mjs";

const user = { id: "staff-1", email: "staff@example.test", full_name: "Alex Worker" };
const state = {
  meta: { schema: 25 },
  organisations: [{ id: "org-1", name: "CareWithJohn", status: "active" }],
  memberships: [],
  permissionPolicies: { version: 3, policies: { staff_member: { mode: "relationship_required", capabilities: ["visits.view_assigned"] } } },
  settings: { cleaningRate: 999 },
  team: [
    { id: "tm-1", userId: "staff-1", name: "Alex Worker", role: "Support Worker", costRate: 999 },
    { id: "tm-2", userId: "staff-2", name: "Other Worker", role: "Support Worker" },
  ],
  clients: [
    { id: "c-1", name: "Assigned Client", rate: 100, address: "1 Example Street", notes: "support note" },
    { id: "c-2", name: "Other Client", rate: 200, address: "2 Example Street" },
  ],
  jobs: [
    { id: "j-1", clientId: "c-1", assigneeUserId: "staff-1", date: "2026-10-11", time: "10:00", status: "Upcoming", income: 100, workerCost: 30, notes: "internal visit note" },
    { id: "j-2", clientId: "c-2", assigneeUserId: "staff-2", date: "2026-10-11", time: "11:00", status: "Upcoming", income: 200 },
    { id: "j-3", organisationId: "org-2", clientId: "c-1", assigneeUserId: "staff-1", date: "2026-10-11", time: "12:00", status: "Upcoming", income: 300 },
  ],
  invoices: [{ id: "inv-1", amount: 1000 }],
  expenses: [{ id: "exp-1", amount: 500 }],
  tasks: [{ id: "t-1", clientId: "c-1", assigneeUserId: "staff-1" }, { id: "t-2", clientId: "c-2", assigneeUserId: "staff-1" }],
  activity: [{ id: "a-1", userId: "staff-1", clientId: "c-1" }, { id: "a-2", userId: "staff-1", clientId: "c-2" }],
  messages: [{ id: "m-1", clientId: "c-1", body: "Not explicitly shared with staff" }, { id: "m-2", clientId: "c-1", recipientId: "staff-1", body: "Direct staff message" }, { id: "m-3", clientId: "c-2", body: "Other client message" }, { id: "m-4", clientId: "c-2", recipientId: "staff-1", body: "Direct message for an unrelated client" }, { id: "m-5", clientId: "c-1", recipientId: "staff-1", body: "Explicitly hidden from Staff", visibleToStaff: false }, { id: "m-6", organisationId: "org-2", recipientId: "staff-1", body: "Other organisation direct message" }],
  documents: [{ id: "d-1", clientId: "c-1", name: "Team document", visibility: "team", storage_path: "private/path" }, { id: "d-2", clientId: "c-2", name: "Other document", visibility: "team" }],
  notifications: [{ id: "n-1", recipientId: "staff-1", title: "Own alert" }, { id: "n-2", recipientId: "staff-2", title: "Other alert" }, { id: "n-3", organisationId: "org-2", recipientId: "staff-1", title: "Other organisation alert" }, { id: "n-4", clientId: "c-2", recipientId: "staff-1", title: "Unassigned client alert" }],
};

const staff = projectRoleState(state, "staff_member", user, "org-1");
assert.deepEqual(staff.jobs.map((job) => job.id), ["j-1"]);
assert.deepEqual(staff.clients.map((client) => client.id), ["c-1"]);
assert.deepEqual(staff.team.map((member) => member.id), ["tm-1"]);
assert.equal("income" in staff.jobs[0], false);
assert.equal(staff.jobs[0].workerCost, 30);
assert.equal("rate" in staff.clients[0], false);
assert.deepEqual(staff.invoices, []);
assert.deepEqual(staff.expenses, []);
assert.deepEqual(staff.documents.map((document) => document.id), ["d-1"]);
assert.equal("storage_path" in staff.documents[0], false);
assert.deepEqual(staff.notifications.map((notice) => notice.id), ["n-1"]);
assert.deepEqual(staff.tasks.map((task) => task.id), ["t-1"], "Staff tasks must not bypass assigned-client scope through assignee matching");
assert.deepEqual(staff.activity.map((event) => event.id), ["a-1"], "Staff activity must not expose activity for unassigned clients");
assert.deepEqual(staff.messages.map((message) => message.id), ["m-2"], "Staff must not see client-associated conversations unless directly addressed or explicitly team-visible");

const familyState = {
  ...state,
  relationships: [
    { id: "r-1", organisationId: "org-1", userId: "family-1", resourceType: "client", resourceId: "c-1", status: "active", permissions: { location: true, documents: true } },
    { id: "r-2", organisationId: "org-1", userId: "family-1", resourceType: "client", resourceId: "c-2", status: "pending", permissions: { location: true, documents: true } },
    { id: "r-3", organisationId: "org-1", userId: "family-2", resourceType: "client", resourceId: "c-2", status: "active", permissions: { location: true } },
  ],
  documents: [{ id: "d-1", clientId: "c-1", name: "Family document", visibility: "family", storage_path: "private/path" }, { id: "d-2-org", organisationId: "org-2", clientId: "c-1", name: "Wrong Organisation Document", visibility: "family", storage_path: "other/private/path" }],
  jobs: [
    { id: "j-1", clientId: "c-1", name: "Assigned Client", service: "Support", date: "2026-10-11", time: "10:00", status: "Upcoming", location: "1 Example Street", income: 100, notes: "private internal note" },
    { id: "j-2", clientId: "c-2", name: "Other Client", service: "Support", date: "2026-10-11", time: "11:00", status: "Upcoming" },
    { id: "j-3", organisationId: "org-2", clientId: "c-1", name: "Wrong Organisation Visit", service: "Support", date: "2026-10-11", time: "12:00", status: "Upcoming" },
  ],
};
const family = projectRoleState(familyState, "family_member", { id: "family-1", email: "family@example.test" }, "org-1");
assert.deepEqual(family.relationships.map((relationship) => relationship.id), ["r-1"]);
assert.deepEqual(family.clients.map((client) => client.id), ["c-1"]);
assert.deepEqual(family.jobs.map((job) => job.id), ["j-1"]);
assert.equal(family.jobs[0].location, "1 Example Street");
assert.equal("income" in family.jobs[0], false);
assert.equal("notes" in family.jobs[0], false);
assert.equal("rate" in family.clients[0], false);
assert.equal("address" in family.clients[0], false);
assert.deepEqual(family.documents.map((document) => document.id), ["d-1"]);
assert.equal("phone" in family.clients[0], false, "Family contact details require an explicit relationship permission");
assert.deepEqual(family.messages, [], "Family messages require an explicit relationship permission");

const familyNotifications = projectRoleState({
  ...familyState,
  relationships: [{ id: "r-notify", organisationId: "org-1", userId: "family-1", resourceType: "client", resourceId: "c-1", status: "active", permissions: { notifications: true } }],
  notifications: [
    { id: "fn-linked-own", recipientId: "family-1", clientId: "c-1", title: "Linked own alert" },
    { id: "fn-unlinked-own", recipientId: "family-1", clientId: "c-2", title: "Unlinked own alert" },
    { id: "fn-linked-shared", clientId: "c-1", title: "Linked relationship alert" },
    { id: "fn-wrong-org", organisationId: "org-2", recipientId: "family-1", title: "Wrong organisation alert" },
  ],
}, "family_member", { id: "family-1", email: "family@example.test" }, "org-1");
assert.deepEqual(familyNotifications.notifications.map((notice) => notice.id), ["fn-linked-own", "fn-linked-shared"],
  "Family notifications must remain within the active organisation and linked-client relationship");

const familyMessageAccess = projectRoleState({
  ...familyState,
  relationships: [{ id: "r-msg", organisationId: "org-1", userId: "family-1", resourceType: "client", resourceId: "c-1", status: "active", permissions: { messages: true } }],
  messages: [
    { id: "family-visible", clientId: "c-1", body: "Visible family update", visibleToClient: true, visibility: "family" },
    { id: "internal-hidden", clientId: "c-1", body: "Staff-only message", visibleToClient: false, visibility: "team" },
    { id: "visibility-hidden", clientId: "c-1", body: "Internal visibility message", visibleToClient: true, visibility: "internal" },
    { id: "unlinked-message", clientId: "c-2", body: "Unlinked message", visibleToClient: true, visibility: "family" },
    { id: "wrong-org-message", organisationId: "org-2", clientId: "c-1", body: "Wrong organisation message", visibleToClient: true, visibility: "family" },
  ],
}, "family_member", { id: "family-1", email: "family@example.test" }, "org-1");
assert.deepEqual(familyMessageAccess.messages.map((message) => message.id), ["family-visible"],
  "Family must only receive messages for linked clients that are not explicitly internal or hidden from clients/family");
assert.equal("senderId" in familyMessageAccess.messages[0], false, "Client/Family messages must not expose internal sender IDs");
assert.equal("recipientId" in familyMessageAccess.messages[0], false, "Client/Family messages must not expose internal recipient IDs");
assert.deepEqual(family.tasks, [], "Family tasks require an explicit relationship permission");
assert.equal("storage_path" in family.documents[0], false);
assert.deepEqual(family.invoices, []);
assert.deepEqual(family.expenses, []);


const revokedAndCrossOrg = projectRoleState({
  ...familyState,
  relationships: [
    { id: "revoked", organisationId: "org-1", userId: "family-1", resourceType: "client", resourceId: "c-1", status: "revoked", permissions: { location: true, documents: true, messages: true } },
    { id: "wrong-org", organisationId: "org-2", userId: "family-1", resourceType: "client", resourceId: "c-2", status: "active", permissions: { location: true, documents: true, messages: true } },
    { id: "other-user", organisationId: "org-1", userId: "family-2", resourceType: "client", resourceId: "c-2", status: "active", permissions: { location: true, documents: true, messages: true } },
  ],
}, "family_member", { id: "family-1" }, "org-1");
assert.deepEqual(revokedAndCrossOrg.relationships, [], "Revoked, cross-organisation and other-user relationships must grant no access");
assert.deepEqual(revokedAndCrossOrg.clients, []);
assert.deepEqual(revokedAndCrossOrg.jobs, []);
assert.deepEqual(revokedAndCrossOrg.documents, []);
assert.deepEqual(revokedAndCrossOrg.messages, []);

const restrictedStaff = projectRoleState({
  ...state,
  jobs: [...state.jobs, { id: "j-other-org", organisationId: "org-2", clientId: "c-1", assigneeUserId: "staff-1", status: "Upcoming" }],
}, "staff_member", user, "org-1");
assert.deepEqual(restrictedStaff.jobs.map((job) => job.id), ["j-1"], "Staff projection must exclude jobs explicitly tagged to another organisation");

const empty = projectRoleState({}, "client", { id: "client-1" }, "org-1");
assert.deepEqual(empty.jobs, []);
assert.deepEqual(empty.clients, []);
assert.equal(empty.identity.activeOrganisationId, "org-1");
assert.equal(empty.memberships[0].userId, "client-1");
assert.throws(() => projectRoleState({}, "admin_owner", { id: "admin-1" }, "org-1"));

console.log("CareWithJohn role-state projection tests: PASS");
