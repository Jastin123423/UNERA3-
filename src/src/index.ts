export default {
  async fetch(req: Request, env: Env) {
    if (new URL(req.url).pathname === "/test-db") {
      const result = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all()

      return new Response(JSON.stringify(result.results), {
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response("UNERA API running ✅")
  }
}

