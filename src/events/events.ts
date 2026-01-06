import { Env } from "../env"

export async function handleEvents(req: Request, env: Env): Promise<Response> {
  // ✅ CORS (important for browser + curl safety)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    })
  }

  // ✅ CREATE EVENT
  if (req.method === "POST") {
    const body = await req.json()

    const {
      creator_id,
      title,
      description,
      event_date,
      location,
      cover_url
    } = body

    if (!creator_id || !title || !event_date) {
      return new Response("Missing required fields", { status: 400 })
    }

    const result = await env.DB
      .prepare(`
        INSERT INTO events
        (creator_id, title, description, event_date, location, cover_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        creator_id,
        title,
        description ?? null,
        event_date,
        location ?? null,
        cover_url ?? null
      )
      .run()

    return new Response(
      JSON.stringify({
        success: true,
        event_id: result.meta.last_row_id
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    )
  }

  // ✅ LIST EVENTS
  if (req.method === "GET") {
    const { results } = await env.DB
      .prepare("SELECT * FROM events ORDER BY event_date ASC")
      .all()

    return new Response(JSON.stringify(results), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
  }

  // ❌ BLOCK EVERYTHING ELSE
  return new Response("Method Not Allowed", { status: 405 })
}
