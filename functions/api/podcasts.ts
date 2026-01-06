import { Env } from "../env"

export async function handlePodcasts(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // ------------------------
  // CREATE PODCAST
  // POST /api/podcasts
  // ------------------------
  if (req.method === "POST") {
    const body = await req.json()
    const { creator_id, title, description, audio_url, cover_url } = body

    if (!creator_id || !title || !audio_url) {
      return new Response("Missing required fields", { status: 400 })
    }

    const query = `
      INSERT INTO podcasts (creator_id, title, description, audio_url, cover_url)
      VALUES (?, ?, ?, ?, ?)
    `

    const result = await env.DB
      .prepare(query)
      .bind(
        creator_id,
        title,
        description || null,
        audio_url,
        cover_url || null
      )
      .run()

    return new Response(
      JSON.stringify({
        success: true,
        podcast_id: result.meta.last_row_id
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  }

  // ------------------------
  // GET PODCAST
  // GET /api/podcasts/:id
  // ------------------------
  if (req.method === "GET" && id) {
    const podcast = await env.DB
      .prepare("SELECT * FROM podcasts WHERE id = ?")
      .bind(id)
      .first()

    if (!podcast) {
      return new Response("Podcast not found", { status: 404 })
    }

    return new Response(JSON.stringify(podcast), {
      headers: { "Content-Type": "application/json" }
    })
  }

  return new Response("Not Found", { status: 404 })
}
