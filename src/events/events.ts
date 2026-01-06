import { Env } from "../env"

export async function handleEvents(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // GET all events
  if (req.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM events ORDER BY event_date ASC").all()
    return new Response(JSON.stringify({ success: true, events: results }), { headers: { "Content-Type": "application/json" } })
  }

  // CREATE event
  if (req.method === "POST") {
    const body = await req.json()
    const { creator_id, title, description, event_date, location, cover_url } = body
    if (!creator_id || !title || !event_date) return new Response("Missing required fields", { status: 400 })

    const result = await env.DB.prepare(`
      INSERT INTO events (creator_id, title, description, event_date, location, cover_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(creator_id, title, description || null, event_date, location || null, cover_url || null).run()

    return new Response(JSON.stringify({ success: true, event_id: result.meta.last_row_id }), { headers: { "Content-Type": "application/json" } })
  }

  return new Response("Not Found", { status: 404 })
}
