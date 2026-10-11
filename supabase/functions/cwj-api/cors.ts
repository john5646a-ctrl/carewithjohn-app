const CORS_METHODS = "GET,POST,PUT,OPTIONS";

export function corsHeaders(req: Request, allowedOrigins: readonly string[]): Record<string, string> {
  const origin = req.headers.get("Origin");
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Allow-Methods": CORS_METHODS,
  };

  // Only echo an exact origin that the operator has explicitly allowed.
  // Omitting Access-Control-Allow-Origin makes browsers reject unapproved
  // cross-origin reads and preflight requests.
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
