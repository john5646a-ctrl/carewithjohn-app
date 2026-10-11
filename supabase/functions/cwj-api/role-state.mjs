const ARRAY_KEYS = [
  "team", "clients", "leads", "jobs", "recurring", "tasks", "expenses", "quotes",
  "invoices", "reviews", "marketing", "events", "documents", "activity", "runs",
  "memory", "compliance", "messages", "notifications", "feedback", "handover",
  "approvals", "concerns", "services", "personServices", "visitTasks", "timeEntries",
  "staffCompliance", "personUpdates", "actions", "businessNotes", "carePlans",
  "incidentReports", "riskAssessments", "relationships", "memberships", "organisations",
];

const arr = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value ?? "").trim();
const lower = (value) => text(value).toLowerCase();
const userIdOf = (row) => text(row?.userId ?? row?.user_id ?? row?.profileId ?? row?.profile_id);
const orgIdOf = (row) => text(row?.organisationId ?? row?.organisation_id);
const inOrganisation = (row, organisationId) => !orgIdOf(row) || orgIdOf(row) === text(organisationId);
const clientIdOf = (row) => text(row?.clientId ?? row?.client_id ?? row?.personId ?? row?.person_id);
const recipientIdOf = (row) => text(row?.recipientId ?? row?.recipient_id);
const senderIdOf = (row) => text(row?.senderId ?? row?.sender_id);
const active = (row) => lower(row?.status) === "active";

function pick(row, keys) {
  const result = {};
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) result[key] = row[key];
  }
  return result;
}

function baseProjection(state, role, user, organisationId) {
  const result = Object.fromEntries(ARRAY_KEYS.map((key) => [key, []]));
  const org = arr(state?.organisations).find((item) => text(item.id) === text(organisationId));
  result.meta = { schema: Number(state?.meta?.schema || 1) };
  result.identity = { version: 1, activeOrganisationId: organisationId };
  result.organisations = [{ id: organisationId, name: text(org?.name) || "CareWithJohn", status: "active" }];
  result.memberships = [{
    organisationId,
    userId: text(user?.id),
    role,
    status: "active",
  }];
  result.relationships = [];
  const policy = state?.permissionPolicies?.policies?.[role];
  result.permissionPolicies = {
    version: Number(state?.permissionPolicies?.version || 3),
    policies: { [role]: policy ? { mode: policy.mode, capabilities: arr(policy.capabilities) } : { mode: "relationship_required", capabilities: [] } },
  };
  result.profile = { businessName: "CareWithJohn", tagline: "Supporting better everyday living" };
  result.settings = {};
  result.agent = {};
  result.research = {};
  return result;
}

function safeJobForStaff(job, userId) {
  const result = pick(job, [
    "id", "date", "time", "startTime", "endTime", "name", "clientName", "clientId", "client_id",
    "personId", "person_id", "service", "serviceType", "hours", "duration", "status", "location",
    "assignee", "assignedTo", "workerId", "worker_id", "assigneeUserId", "assignedUserId",
    "notes", "description", "task", "completionNotes", "startedAt", "completedAt", "priority",
    "visitType", "createdAt", "updatedAt", "workerCost", "earnings",
  ]);
  result.assigneeUserId = userId;
  if (!result.clientId && !result.client_id) {
    const clientId = clientIdOf(job);
    if (clientId) result.clientId = clientId;
  }
  return result;
}

function safeClientForStaff(client) {
  return pick(client, [
    "id", "name", "type", "clientType", "client_type", "service", "status", "phone", "email",
    "address", "area", "location", "preferences", "outcomes", "notes", "handover", "riskLevel",
    "risk_level", "reviewDate", "review_date", "authorisedContact", "authorised_contact",
  ]);
}

function safeDocument(document) {
  return pick(document, ["id", "name", "documentType", "document_type", "status", "visibility", "clientId", "client_id", "personId", "person_id", "createdAt", "created_at"]);
}

function safeMessage(message) {
  return pick(message, ["id", "clientId", "client_id", "personId", "person_id", "senderId", "sender_id", "recipientId", "recipient_id", "senderName", "sender_name", "body", "status", "createdAt", "created_at", "readAt", "read_at"]);
}

function projectStaff(state, result, user, organisationId) {
  const uid = text(user?.id);
  const email = lower(user?.email);
  const ownTeam = arr(state.team).filter((item) =>
    inOrganisation(item, organisationId) &&
    (userIdOf(item) === uid || (email && lower(item.email) === email))
  ).slice(0, 1);
  const teamIds = new Set(ownTeam.map((item) => text(item.id)).filter(Boolean));
  const teamNames = new Set(ownTeam.map((item) => lower(item.name)).filter(Boolean));
  result.team = ownTeam.map((item) => ({
    ...pick(item, ["id", "name", "role", "roleTitle", "role_title", "status", "phone", "email", "capacity", "skills", "availability"]),
    userId: uid,
  }));

  const jobs = arr(state.jobs).filter((job) => {
    if (orgIdOf(job) && orgIdOf(job) !== text(organisationId)) return false;
    const explicitUser = text(job.assigneeUserId ?? job.assignedUserId ?? job.assignee_user_id ?? job.assigned_user_id);
    if (explicitUser) return explicitUser === uid;
    const workerId = text(job.workerId ?? job.worker_id ?? job.teamMemberId ?? job.team_member_id);
    if (workerId && teamIds.has(workerId)) return true;
    const assignedName = lower(job.assignee ?? job.assignedTo ?? job.assigned_to ?? job.workerName ?? job.assigneeName);
    return teamNames.size > 0 && teamNames.has(assignedName);
  }).filter((job) => lower(job.status) !== "cancelled");

  result.jobs = jobs.map((job) => safeJobForStaff(job, uid));
  const clientIds = new Set(jobs.map(clientIdOf).filter(Boolean));
  result.clients = arr(state.clients).filter((client) =>
    inOrganisation(client, organisationId) && clientIds.has(text(client.id))
  ).map(safeClientForStaff);
  result.tasks = arr(state.tasks).filter((task) => {
    if (!inOrganisation(task, organisationId)) return false;
    const assigned = text(task.assigneeUserId ?? task.assignedUserId ?? task.userId ?? task.user_id);
    return assigned === uid || clientIds.has(clientIdOf(task));
  }).map((task) => pick(task, ["id", "title", "name", "description", "status", "dueDate", "due_date", "clientId", "client_id", "jobId", "job_id", "assignedUserId", "assigneeUserId", "priority"]));
  result.documents = arr(state.documents).filter((doc) => {
    if (!inOrganisation(doc, organisationId)) return false;
    const visibility = lower(doc.visibility);
    return clientIds.has(clientIdOf(doc)) && ["team", "shared"].includes(visibility);
  }).map(safeDocument);
  const assignedJobIds = new Set(jobs.map((job) => text(job.id)).filter(Boolean));
  result.messages = arr(state.messages).filter((message) => {
    if (!inOrganisation(message, organisationId)) return false;
    const clientId = clientIdOf(message);
    if (message.visibleToStaff === false) return false;
    // A direct recipient match must never bypass the assigned-client boundary.
    if (clientId && !clientIds.has(clientId)) return false;
    if (userIdOf(message) === uid || senderIdOf(message) === uid || recipientIdOf(message) === uid) return true;
    const visitId = text(message.visitId ?? message.visit_id ?? message.jobId ?? message.job_id);
    if (visitId && assignedJobIds.has(visitId)) return true;
    const visibility = lower(message.visibility ?? message.audience ?? message.messageType ?? message.message_type);
    return Boolean(clientId) && clientIds.has(clientId) &&
      message.visibleToStaff !== false &&
      ["team", "staff", "shared"].includes(visibility);
  }).map(safeMessage);
  result.notifications = arr(state.notifications).filter((notice) =>
    inOrganisation(notice, organisationId) && recipientIdOf(notice) === uid
  ).map((notice) => pick(notice, ["id", "notificationType", "notification_type", "title", "body", "severity", "readAt", "read_at", "createdAt", "created_at"]));
  result.activity = arr(state.activity).filter((event) =>
    inOrganisation(event, organisationId) && (userIdOf(event) === uid || senderIdOf(event) === uid)
  ).map((event) => pick(event, ["id", "type", "title", "detail", "createdAt", "created_at", "userId", "user_id"]));
  return result;
}

function relationshipRows(state, user, organisationId) {
  const uid = text(user?.id);
  return arr(state.relationships).filter((relationship) =>
    userIdOf(relationship) === uid &&
    orgIdOf(relationship) === text(organisationId) &&
    lower(relationship.resourceType ?? relationship.resource_type) === "client" &&
    active(relationship) &&
    text(relationship.resourceId ?? relationship.resource_id)
  );
}

function permissionsFor(relationships, clientId) {
  return relationships.filter((relationship) => text(relationship.resourceId ?? relationship.resource_id) === text(clientId))
    .map((relationship) => relationship.permissions && typeof relationship.permissions === "object" ? relationship.permissions : {});
}

function allows(permissions, key) {
  return permissions.length > 0 && permissions.every((item) => item[key] === true);
}

function projectFamily(state, result, user, organisationId, role) {
  const relationships = relationshipRows(state, user, organisationId);
  result.relationships = relationships.map((relationship) => pick(relationship, [
    "id", "organisationId", "organisation_id", "userId", "user_id", "resourceType", "resource_type",
    "resourceId", "resource_id", "permissions", "status", "createdAt", "created_at",
  ]));
  const clientIds = new Set(relationships.map((relationship) => text(relationship.resourceId ?? relationship.resource_id)));
  const clientPermissions = (clientId) => permissionsFor(relationships, clientId);

  result.clients = arr(state.clients).filter((client) =>
    inOrganisation(client, organisationId) && clientIds.has(text(client.id))
  ).map((client) => {
    const permissions = clientPermissions(client.id);
    const output = pick(client, ["id", "name", "type", "clientType", "client_type", "service", "status"]);
    if (allows(permissions, "location")) Object.assign(output, pick(client, ["area", "location"]));
    if (allows(permissions, "address")) Object.assign(output, pick(client, ["address"]));
    if (allows(permissions, "contactDetails")) Object.assign(output, pick(client, ["phone", "email", "authorisedContact", "authorised_contact"]));
    if (allows(permissions, "supportInformation")) Object.assign(output, pick(client, ["preferences", "outcomes"]));
    if (allows(permissions, "supportNotes")) Object.assign(output, pick(client, ["publicNotes", "clientNotes", "familyNotes", "supportNotes"]));
    return output;
  });

  const jobs = arr(state.jobs).filter((job) => {
    const clientId = clientIdOf(job);
    return inOrganisation(job, organisationId) && clientIds.has(clientId) && lower(job.status) !== "cancelled";
  });
  result.jobs = jobs.map((job) => {
    const clientId = clientIdOf(job);
    const permissions = clientPermissions(clientId);
    const output = pick(job, ["id", "date", "time", "startTime", "endTime", "name", "clientName", "clientId", "client_id", "personId", "person_id", "service", "serviceType", "hours", "duration", "status"]);
    if (allows(permissions, "location") || allows(permissions, "visitLocation")) Object.assign(output, pick(job, ["location"]));
    if (allows(permissions, "supportNotes")) Object.assign(output, pick(job, ["publicNotes", "clientNotes", "familyNotes", "visitSummary"]));
    if (allows(permissions, "careTeam")) Object.assign(output, pick(job, ["assignee", "assignedTo", "assigneeUserId", "assignedUserId"]));
    if (!output.clientId && !output.client_id) output.clientId = clientId;
    return output;
  });

  if (relationships.length && relationships.every((relationship) => {
    const p = relationship.permissions && typeof relationship.permissions === "object" ? relationship.permissions : {};
    return p.careTeam === true;
  })) {
    const assignedNames = new Set(jobs.map((job) => lower(job.assignee ?? job.assignedTo ?? job.workerName)).filter(Boolean));
    const assignedIds = new Set(jobs.map((job) => text(job.workerId ?? job.worker_id ?? job.assigneeUserId ?? job.assignedUserId)).filter(Boolean));
    result.team = arr(state.team).filter((member) =>
      inOrganisation(member, organisationId) && (assignedNames.has(lower(member.name)) || assignedIds.has(text(member.id)))
    ).map((member) => pick(member, ["id", "name", "role", "roleTitle", "role_title", "status"]));
  }

  result.documents = arr(state.documents).filter((document) => {
    if (!inOrganisation(document, organisationId)) return false;
    const clientId = clientIdOf(document);
    if (!clientIds.has(clientId)) return false;
    const permissions = clientPermissions(clientId);
    const visibility = lower(document.visibility);
    const allowedVisibility = role === "family_member" ? ["family", "shared"] : ["client", "shared"];
    return allows(permissions, "documents") && allowedVisibility.includes(visibility);
  }).map(safeDocument);

  result.messages = arr(state.messages).filter((message) => {
    if (!inOrganisation(message, organisationId)) return false;
    const clientId = clientIdOf(message);
    if (!clientIds.has(clientId)) return false;
    const visibility = lower(message.visibility ?? message.audience ?? message.messageType ?? message.message_type);
    const internalVisibility = ["internal", "staff", "team", "staff_only", "internal_staff"].includes(visibility);
    if (message.visibleToClient === false || message.visibleToFamily === false ||
        message.internal === true || message.isInternal === true || internalVisibility) return false;
    return allows(clientPermissions(clientId), "messages") || allows(clientPermissions(clientId), "communications");
  }).map(safeMessage);

  result.tasks = arr(state.tasks).filter((task) => {
    if (!inOrganisation(task, organisationId)) return false;
    const clientId = clientIdOf(task);
    return clientIds.has(clientId) && allows(clientPermissions(clientId), "tasks");
  }).map((task) => pick(task, ["id", "title", "name", "description", "status", "dueDate", "due_date", "clientId", "client_id", "jobId", "job_id"]));

  result.notifications = arr(state.notifications).filter((notice) => {
    if (!inOrganisation(notice, organisationId)) return false;
    if (recipientIdOf(notice) === text(user?.id)) return true;
    const clientId = clientIdOf(notice);
    return clientIds.has(clientId) && allows(clientPermissions(clientId), "notifications");
  }).map((notice) => pick(notice, ["id", "notificationType", "notification_type", "title", "body", "severity", "readAt", "read_at", "createdAt", "created_at"]));
  return result;
}

export function projectRoleState(state, role, user, organisationId) {
  if (!["staff_member", "client", "family_member"].includes(role)) {
    throw new Error("Only Staff, Client or Family Member state projections are supported.");
  }
  const source = state && typeof state === "object" ? state : {};
  const result = baseProjection(source, role, user || {}, organisationId);
  if (role === "staff_member") return projectStaff(source, result, user || {}, organisationId);
  return projectFamily(source, result, user || {}, organisationId, role);
}
