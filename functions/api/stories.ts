import { Env } from "../env"

export async function handleStories(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // GET all active stories
  if (req.method === "GET") {
    const now = new Date().toISOString()
    const query = `
      SELECT * FROM stories
      WHERE expires_at > ?
      ORDER BY created_at DESC
    `
    const { results } = await env.DB.prepare(query).bind(now).all()
    return new Response(JSON.stringify({ success: true, stories: results }), { headers: { "Content-Type": "application/json" } })
  }

  // CREATE story
  if (req.method === "POST") {
    const body = await req.json()
    const { user_id, type, media_url, text_content, background_style, music_url, music_title, expires_at } = body
    if (!user_id || !type || !expires_at) return new Response("Missing required fields", { status: 400 })

    const query = `
      INSERT INTO stories (user_id, type, media_url, text_content, background_style, music_url, music_title, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await env.DB.prepare(query).bind(user_id, type, media_url || null, text_content || null, background_style || null, music_url || null, music_title || null, expires_at).run()
    return new Response(JSON.stringify({ success: true, story_id: result.meta.last_row_id }), { headers: { "Content-Type": "application/json" } })
  }

  return new Response("Not Found", { status: 404 })
}
