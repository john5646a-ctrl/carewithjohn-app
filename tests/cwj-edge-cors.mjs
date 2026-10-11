import assert from "node:assert/strict";
import { corsHeaders } from "../supabase/functions/cwj-api/cors.mjs";

const allowedOrigin = "https://john5646a-ctrl.github.io";
const acceptedCors = corsHeaders(new Request("https://api.example.test/resource", {
  headers: { Origin: allowedOrigin },
}), [allowedOrigin]);
assert.equal(acceptedCors["Access-Control-Allow-Origin"], allowedOrigin,
  "configured application origin should receive CORS permission");
assert.equal(acceptedCors["Access-Control-Allow-Credentials"], "true");

const rejectedCors = corsHeaders(new Request("https://api.example.test/resource", {
  headers: { Origin: "https://attacker.example" },
}), [allowedOrigin]);
assert.equal("Access-Control-Allow-Origin" in rejectedCors, false,
  "unapproved origins must not be reflected into CORS headers");

const spoofedCors = corsHeaders(new Request("https://api.example.test/resource", {
  headers: { Origin: allowedOrigin + ".attacker.example" },
}), [allowedOrigin]);
assert.equal("Access-Control-Allow-Origin" in spoofedCors, false,
  "origin allowlist must use exact matches, not substrings");

const noOriginCors = corsHeaders(new Request("https://api.example.test/resource"), [allowedOrigin]);
assert.equal("Access-Control-Allow-Origin" in noOriginCors, false,
  "requests without Origin must not receive an invented CORS origin");

console.log("CareWithJohn Edge Function CORS tests: PASS");
