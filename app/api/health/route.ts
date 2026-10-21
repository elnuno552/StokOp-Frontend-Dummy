// GET /api/health: liveness of the app.
export async function GET() {
  return Response.json({ status: "ok", app: "up", timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
