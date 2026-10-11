import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.CWJ_APP_URL || "https://john5646a-ctrl.github.io/carewithjohn-app/";
const artifactsDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });
const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
];

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const consoleErrors = [];
    const resourceErrors = [];
    const partResponses = new Map();
    let expectedAuth401Seen = false;

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.url().includes("/auth/me") && response.status() === 401) expectedAuth401Seen = true;
      const match = response.url().match(/\/cwj_parts\/(part\d+\.txt)(?:\?|$)/);
      if (match) {
        partResponses.set(match[1], response.status());
        if (!response.ok()) resourceErrors.push(`${match[1]} returned HTTP ${response.status()}`);
      }
    });
    page.on("requestfailed", (request) => {
      if (request.url().includes("cwj_parts/") || request.url().startsWith(baseUrl)) {
        resourceErrors.push(`${request.url()} failed: ${request.failure()?.errorText || "unknown error"}`);
      }
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("#authEmail", { state: "visible", timeout: 45000 });
    await page.waitForSelector("#authPassword", { state: "visible", timeout: 10000 });
    await page.waitForTimeout(250);

    let apiChecks = null;
    if (viewport.width === 320) {
      try {
        apiChecks = await page.evaluate(async () => {
          const api = "https://fjxiqkqrnkmnohzvmnss.supabase.co/functions/v1/cwj-api";
          const healthResponse = await fetch(`${api}/health`, { cache: "no-store" });
          const healthBody = await healthResponse.json();
          const authResponse = await fetch(`${api}/auth/me`, { cache: "no-store", credentials: "include" });
          const authBody = await authResponse.json();
          const roleStateResponse = await fetch(`${api}/role-state`, { cache: "no-store", credentials: "include" });
          const roleStateBody = await roleStateResponse.json();
          return {
            healthStatus: healthResponse.status,
            healthBody,
            unauthenticatedStatus: authResponse.status,
            unauthenticatedBody: authBody,
            roleStateStatus: roleStateResponse.status,
            roleStateBody,
          };
        });
        if (apiChecks.healthStatus !== 200 || apiChecks.healthBody?.ok !== true || apiChecks.healthBody?.service !== "cwj-api") {
          failures.push(`live API health check failed: ${JSON.stringify(apiChecks)}`);
        }
        if (apiChecks.unauthenticatedStatus !== 401 || apiChecks.unauthenticatedBody?.error !== "Not authenticated.") {
          failures.push(`unauthenticated API request was not rejected as expected: ${JSON.stringify(apiChecks)}`);
        }
        if (apiChecks.roleStateStatus !== 401 || apiChecks.roleStateBody?.error !== "Not authenticated.") {
          failures.push(`unauthenticated role-state request was not rejected as expected: ${JSON.stringify(apiChecks)}`);
        }
      } catch (error) {
        failures.push(`live API CORS/health check failed from the app origin: ${error.message}`);
      }
    }

    const metrics = await page.evaluate(() => ({
      title: document.title,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      bodyClass: document.body.className,
      emailVisible: Boolean(document.querySelector("#authEmail")?.getClientRects().length),
      passwordVisible: Boolean(document.querySelector("#authPassword")?.getClientRects().length),
      buildFailed: document.body.innerText.includes("Build loading failed"),
    }));

    await page.screenshot({
      path: path.join(artifactsDir, `cwj-login-${viewport.width}px.png`),
      fullPage: true,
    });

    const missingParts = Array.from({ length: 16 }, (_, index) => `part${String(index + 1).padStart(2, "0")}.txt`)
      .filter((name) => partResponses.get(name) !== 200);

    if (metrics.buildFailed) failures.push(`${viewport.width}px: loader displayed Build loading failed`);
    if (!metrics.bodyClass.includes("cwj-approved")) failures.push(`${viewport.width}px: approved UI class was not applied`);
    if (!metrics.emailVisible || !metrics.passwordVisible) failures.push(`${viewport.width}px: sign-in form fields are not visible`);
    if (metrics.documentWidth > viewport.width || metrics.bodyWidth > viewport.width) {
      failures.push(`${viewport.width}px: horizontal overflow (document=${metrics.documentWidth}, body=${metrics.bodyWidth})`);
    }
    if (missingParts.length) failures.push(`${viewport.width}px: missing/non-200 app parts: ${missingParts.join(", ")}`);
    if (resourceErrors.length) failures.push(`${viewport.width}px: resource errors: ${resourceErrors.join("; ")}`);
    if (pageErrors.length) failures.push(`${viewport.width}px: JavaScript errors: ${pageErrors.join("; ")}`);
    const unexpectedConsoleErrors = [...consoleErrors];
    const expected401Count =
      (apiChecks?.unauthenticatedStatus === 401 && apiChecks?.unauthenticatedBody?.error === "Not authenticated." ? 1 : 0) +
      (apiChecks?.roleStateStatus === 401 && apiChecks?.roleStateBody?.error === "Not authenticated." ? 1 : 0);
    // Each deliberate unauthenticated fetch can emit one generic browser-console 401.
    // Remove only the number explained by the two explicit API checks; leave any extras as failures.
    for (let i = 0; i < expected401Count; i += 1) {
      const expected401Index = unexpectedConsoleErrors.findIndex((message) => message.includes("status of 401"));
      if (expected401Index >= 0) unexpectedConsoleErrors.splice(expected401Index, 1);
    }
    if (unexpectedConsoleErrors.length) failures.push(`${viewport.width}px: console errors: ${unexpectedConsoleErrors.join("; ")}`);

    console.log(JSON.stringify({ viewport, metrics, apiChecks, expectedAuth401Seen, partsLoaded: partResponses.size, pageErrors, consoleErrors, unexpectedConsoleErrors, resourceErrors }));
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("CareWithJohn browser smoke test: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("CareWithJohn browser smoke test: PASS — login/load screen verified at all six viewport widths.");
}
