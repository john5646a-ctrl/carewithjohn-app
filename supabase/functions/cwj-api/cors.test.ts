import { assertEquals, assertFalse } from "jsr:@std/assert";
import { corsHeaders } from "./cors.ts";

Deno.test("allows the configured application origin", () => {
  const headers = corsHeaders(
    new Request("https://api.example.test/resource", { headers: { Origin: "https://john5646a-ctrl.github.io" } }),
    ["https://john5646a-ctrl.github.io"],
  );
  assertEquals(headers["Access-Control-Allow-Origin"], "https://john5646a-ctrl.github.io");
  assertEquals(headers["Access-Control-Allow-Credentials"], "true");
});

Deno.test("does not reflect an arbitrary origin", () => {
  const headers = corsHeaders(
    new Request("https://api.example.test/resource", { headers: { Origin: "https://attacker.example" } }),
    ["https://john5646a-ctrl.github.io"],
  );
  assertFalse("Access-Control-Allow-Origin" in headers);
});

Deno.test("requires an exact origin match, not a trusted-origin substring", () => {
  const headers = corsHeaders(
    new Request("https://api.example.test/resource", { headers: { Origin: "https://john5646a-ctrl.github.io.attacker.example" } }),
    ["https://john5646a-ctrl.github.io"],
  );
  assertFalse("Access-Control-Allow-Origin" in headers);
});

Deno.test("does not add CORS permission when Origin is absent", () => {
  const headers = corsHeaders(new Request("https://api.example.test/resource"), ["https://john5646a-ctrl.github.io"]);
  assertFalse("Access-Control-Allow-Origin" in headers);
});
