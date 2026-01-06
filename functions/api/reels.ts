import { Env } from "../env"

export async function handleReels(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // GET all reels
  if (req.method === "GET") {
    const { results } = await env.DB.prepare("SELECT reels.*, users.username, users.profile_image_url FROM reels JOIN users ON users.id = reels.user_id ORDER BY created_at DESC").all()
    return new Response(JSON.stringify({ success: true, reels: results }), { headers: { "Content-Type": "application/json" } })
  }

  // CREATE reel
  if (req.method === "POST") {
    const body = await req.json()
    const { user_id, video_url, caption, song_name } = body
    if (!user_id || !video_url) return new Response("Missing required fields", { status: 400 })

    const result = await env.DB.prepare("INSERT INTO reels (user_id, video_url, caption, song_name) VALUES (?, ?, ?, ?)").bind(user_id, video_url, caption || null, song_name || null).run()
    return new Response(JSON.stringify({ success: true, reel_id: result.meta.last_row_id }), { headers: { "Content-Type": "application/json" } })
  }

  return new Response("Not Found", { status: 404 })
}
