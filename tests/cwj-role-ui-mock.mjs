import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { projectRoleState } from "../supabase/functions/cwj-api/role-state.mjs";

const root = process.cwd();
const host = "127.0.0.1";
const port = 4173;
const apiBase = "https://fjxiqkqrnkmnohzvmnss.supabase.co/functions/v1/cwj-api";
const orgId = "org-test";
const today = "2026-10-11";
const roleUsers = {
  admin_owner: { id: "admin-1", email: "admin@example.test", full_name: "CareWithJohn Admin", role: "admin_owner", organisation_id: orgId },
  staff_member: { id: "staff-1", email: "staff@example.test", full_name: "Alex Worker", role: "staff_member", organisation_id: orgId },
  client: { id: "client-1", email: "client@example.test", full_name: "Assigned Client", role: "client", organisation_id: orgId },
  family_member: { id: "family-1", email: "family@example.test", full_name: "Family Member", role: "family_member", organisation_id: orgId },
};
const state = {
  meta: { schema: 25 },
  identity: { version: 1, activeOrganisationId: orgId },
  organisations: [{ id: orgId, name: "CareWithJohn", status: "active" }],
  memberships: Object.values(roleUsers).map((user) => ({ organisationId: orgId, userId: user.id, role: user.role, status: "active" })),
  permissionPolicies: {
    version: 3,
    policies: {
      admin_owner: { mode: "organisation", capabilities: ["*"] },
      staff_member: { mode: "assignment_required", capabilities: ["visits.view_assigned", "visits.complete"] },
      client: { mode: "relationship_required", capabilities: ["visits.view_linked"] },
      family_member: { mode: "relationship_required", capabilities: ["visits.view_linked"] },
    },
  },
  profile: { businessName: "CareWithJohn", phone: "07900000000", email: "private-business@example.test" },
  settings: { cleaningRate: 100, careRate: 100 },
  team: [
    { id: "tm-1", userId: "staff-1", name: "Alex Worker", email: "staff@example.test", role: "Support Worker", phone: "07900000001", costRate: 30 },
    { id: "tm-2", userId: "staff-2", name: "Other Worker", email: "other@example.test", role: "Support Worker", costRate: 40 },
  ],
  clients: [
    { id: "client-1", name: "Assigned Client", type: "Client", service: "Companionship", status: "active", address: "1 Example Road", phone: "07900000002", rate: 100, notes: "Private staff note" },
    { id: "client-2", name: "Other Client", type: "Client", service: "Cleaning", status: "active", address: "2 Example Road", rate: 200, notes: "Other private note" },
  ],
  jobs: [
    { id: "visit-1", clientId: "client-1", assigneeUserId: "staff-1", assignee: "Alex Worker", date: today, time: "10:00", service: "Companionship", hours: 2, status: "Upcoming", location: "1 Example Road", workerCost: 30, income: 100, notes: "Internal visit note" },
    { id: "visit-2", clientId: "client-2", assigneeUserId: "staff-2", assignee: "Other Worker", date: today, time: "12:00", service: "Cleaning", hours: 2, status: "Upcoming", location: "2 Example Road", workerCost: 40, income: 200, notes: "Other internal note" },
  ],
  relationships: [
    { id: "rel-family-active", organisationId: orgId, userId: "family-1", resourceType: "client", resourceId: "client-1", status: "active", permissions: { location: true, careTeam: true, documents: true } },
    { id: "rel-family-pending", organisationId: orgId, userId: "family-1", resourceType: "client", resourceId: "client-2", status: "pending", permissions: { location: true, careTeam: true, documents: true } },
    { id: "rel-client-active", organisationId: orgId, userId: "client-1", resourceType: "client", resourceId: "client-1", status: "active", permissions: { location: true } },
  ],
  tasks: [],
  documents: [{ id: "doc-family", clientId: "client-1", name: "Family welcome document", visibility: "family", status: "active", storage_path: "private/secret.pdf" }],
  messages: [{ id: "msg-private", clientId: "client-1", body: "Private family message" }],
  notifications: [],
  leads: [], recurring: [], expenses: [], quotes: [], invoices: [], reviews: [], marketing: [],
  events: [], activity: [], runs: [], memory: [], compliance: [], feedback: [], handover: [],
  approvals: [], concerns: [], services: [], personServices: [], visitTasks: [], timeEntries: [],
  staffCompliance: [], personUpdates: [], actions: [], businessNotes: [], carePlans: [], incidentReports: [], riskAssessments: [],
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, "index.html")) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  fs.readFile(file, (error, bytes) => {
    if (error) { response.writeHead(404); response.end("Not found"); return; }
    const ext = path.extname(file);
    const type = ext === ".html" ? "text/html; charset=utf-8" : ext === ".txt" ? "text/plain; charset=utf-8" : "application/octet-stream";
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    response.end(bytes);
  });
});
await new Promise((resolve) => server.listen(port, host, resolve));

const browser = await chromium.launch({ headless: true });
const failures = [];
const artifactsDir = path.join(root, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });
try {
  for (const role of ["admin_owner", "staff_member", "client", "family_member"]) {
    for (const width of [320, 360, 375, 390, 414, 768, 1024, 1440]) {
      const user = roleUsers[role];
      let signedIn = false;
      const page = await browser.newPage({ viewport: { width, height: width === 768 || width === 1024 ? 1024 : 844 } });
      const pageErrors = [];
      const consoleErrors = [];
      const partResponses = new Map();
      const apiRequests = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("response", (response) => {
        const match = response.url().match(/\/cwj_parts\/(part\d+\.txt)(?:\?|$)/);
        if (match) partResponses.set(match[1], response.status());
      });
      await page.route(`${apiBase}/**`, async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        apiRequests.push(`${request.method()} ${url.pathname}`);
        const routePath = url.pathname.replace("/functions/v1/cwj-api", "");
        if (request.method() === "OPTIONS") {
          const origin = request.headers().origin || "http://127.0.0.1:4173";
          return route.fulfill({ status: 204, headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "authorization, content-type, apikey",
            "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
          } });
        }
        const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
        if (routePath === "/auth/login" && request.method() === "POST") {
          signedIn = true;
          return json(200, { access_token: "mock-token", token_type: "bearer" });
        }
        if (routePath === "/auth/me" && request.method() === "GET") {
          if (!signedIn) return json(401, { error: "Not authenticated." });
          return json(200, { user });
        }
        if (routePath === "/state" && request.method() === "GET") {
          if (role !== "admin_owner") return json(403, { error: "Admin only" });
          return json(200, { state, version: 1 });
        }
        if (routePath === "/role-state" && request.method() === "GET") {
          if (!signedIn) return json(401, { error: "Not authenticated." });
          if (role === "admin_owner") return json(403, { error: "Admin uses /state" });
          return json(200, { state: projectRoleState(state, role, user, orgId), version: 1 });
        }
        if (routePath === "/health" && request.method() === "GET") return json(200, { ok: true, service: "cwj-api" });
        if (routePath === "/auth/logout") return json(200, { ok: true });
        return json(404, { error: `Unhandled mock API route: ${request.method()} ${routePath}` });
      });

      await page.goto(`http://${host}:${port}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      try {
        await page.waitForSelector("#authEmail", { state: "visible", timeout: 15000 });
      } catch (error) {
        console.error(JSON.stringify({ stage: "auth-modal", role, width, pageErrors, consoleErrors, body: (await page.locator("body").innerText().catch(() => "")).slice(0, 1200) }));
        throw error;
      }
      await page.locator("#authEmail").fill(user.email);
      await page.locator("#authPassword").fill("mock-test-password");
      await page.locator('button[onclick="loginCloud()"]').click();
      await page.waitForFunction(() => !document.querySelector("#authModal")?.classList.contains("show"), { timeout: 20000 });
      await page.waitForTimeout(200);

      const metrics = await page.evaluate(() => ({
        bodyText: document.body.innerText,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        bodyClass: document.body.className,
        roleStateError: window.__cwjRoleStateError || '',
        roleStateSummary: window.__cwjRoleStateSummary || null,
        bodyPreview: document.body.innerText.slice(0, 600),
        authVisible: Boolean(document.querySelector("#authModal.show")),
        buildFailed: document.body.innerText.includes("Build loading failed"),
        viewText: (document.getElementById("view")?.innerText || "").slice(0, 700),
      }));
      if (!metrics.bodyClass.includes("cwj-approved")) failures.push(`${role} @ ${width}px: approved body class missing`);
      if (metrics.authVisible) failures.push(`${role} @ ${width}px: sign-in modal did not close after mocked sign-in`);
      if (metrics.buildFailed) failures.push(`${role} @ ${width}px: loader failed`);
      if (metrics.roleStateError) failures.push(`${role} @ ${width}px: role-state load failed: ${metrics.roleStateError}`);
      if (metrics.documentWidth > width || metrics.bodyWidth > width) failures.push(`${role} @ ${width}px: horizontal overflow (document ${metrics.documentWidth}, body ${metrics.bodyWidth})`);
      if (pageErrors.length) failures.push(`${role} @ ${width}px: JavaScript errors: ${pageErrors.join("; ")}`);
      const missingParts = Array.from({ length: 16 }, (_, index) => `part${String(index + 1).padStart(2, "0")}.txt`).filter((name) => partResponses.get(name) !== 200);
      if (missingParts.length) failures.push(`${role} @ ${width}px: missing parts: ${missingParts.join(", ")}`);

      if (role === "staff_member") {
        if (!/MY DAY/i.test(metrics.bodyText) && !/My Visits/i.test(metrics.bodyText) && !/My schedule/i.test(metrics.bodyText)) failures.push(`Staff @ ${width}px: expected work-focused navigation/home was not rendered`);
        if (!metrics.bodyText.includes("Assigned Client")) failures.push(`Staff @ ${width}px: assigned client was not visible`);
        if (metrics.bodyText.includes("Other Client") || metrics.bodyText.includes("Other Worker")) failures.push(`Staff @ ${width}px: unrelated client or staff was visible`);
      }
      if (role === "family_member" || role === "client") {
        if (!metrics.bodyText.includes("Assigned Client")) failures.push(`${role} @ ${width}px: linked client was not visible`);
        if (metrics.bodyText.includes("Other Client")) failures.push(`${role} @ ${width}px: unlinked/pending client was visible`);
        if (metrics.bodyText.includes("Internal visit note") || metrics.bodyText.includes("Private staff note") || metrics.bodyText.includes("Private family message")) {
          failures.push(`${role} @ ${width}px: internal notes or a private message was visible`);
        }
        if (metrics.bodyText.includes("$100") || metrics.bodyText.includes("$200")) failures.push(`${role} @ ${width}px: financial information was visible`);
      }
      if (role === "admin_owner" && !metrics.bodyText.includes("Today")) failures.push(`Admin @ ${width}px: operational dashboard was not rendered`);

      if (width === 390) {
        await page.screenshot({ path: path.join(artifactsDir, `role-${role}-390px.png`), fullPage: true });
      }
      if (role === "staff_member") {
        await page.evaluate(() => window.showPage("Schedule"));
        await page.waitForTimeout(80);
        const scheduleText = await page.locator("#view").innerText();
        if (!scheduleText.includes("Assigned Client")) failures.push(`Staff @ ${width}px: assigned visit missing after opening schedule`);
        await page.evaluate(() => window.showPage("Clients"));
        await page.waitForTimeout(80);
        const clientsText = await page.locator("#view").innerText();
        if (!clientsText.includes("Assigned Client")) failures.push(`Staff @ ${width}px: assigned client missing after opening clients`);
        if (clientsText.includes("Other Client")) failures.push(`Staff @ ${width}px: unrelated client appeared in clients view`);
      }
      if (role === "client" || role === "family_member") {
        await page.evaluate(() => window.showPage("Visits"));
        await page.waitForTimeout(80);
        const visitsText = await page.locator("#view").innerText();
        if (!visitsText.includes("Assigned Client")) failures.push(`${role} @ ${width}px: linked visit missing after opening visits`);
        if (visitsText.includes("Other Client")) failures.push(`${role} @ ${width}px: unlinked client appeared in visits view`);
        await page.evaluate(() => window.showPage("Messages"));
        await page.waitForTimeout(80);
        if (pageErrors.length) failures.push(`${role} @ ${width}px: JavaScript errors during role navigation: ${pageErrors.join("; ")}`);
      }
      console.log(JSON.stringify({ role, width, bodyClass: metrics.bodyClass, documentWidth: metrics.documentWidth, partsLoaded: partResponses.size, apiRequests, viewText: metrics.viewText, pageErrors, roleStateError: metrics.roleStateError, roleStateSummary: metrics.roleStateSummary, bodyPreview: metrics.bodyPreview }));
      await page.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error("CareWithJohn mocked role UI smoke: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("CareWithJohn mocked role UI smoke: PASS — all four role experiences rendered at 320, 390 and 768px using synthetic identities and server projection fixtures.");
}
