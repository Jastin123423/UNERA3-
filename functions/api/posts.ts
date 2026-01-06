import { Env } from "../env"

export async function handlePosts(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // -----------------------------
  // CREATE POST
  // POST /api/posts
  // -----------------------------
  if (req.method === "POST") {
    const body = await req.json()

    const { user_id, content, media_url, media_type } = body

    if (!user_id) {
      return new Response("Missing user_id", { status: 400 })
    }

    const query = `
      INSERT INTO posts (user_id, content, media_url, media_type)
      VALUES (?, ?, ?, ?)
    `

    const result = await env.DB
      .prepare(query)
      .bind(user_id, content || null, media_url || null, media_type || null)
      .run()

    return new Response(
      JSON.stringify({
        success: true,
        post_id: result.meta.last_row_id
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  }

  // -----------------------------
  // GET SINGLE POST
  // GET /api/posts/:id
  // -----------------------------
  if (req.method === "GET" && id) {
    const query = `
      SELECT
        posts.*,
        users.username,
        users.profile_image_url
      FROM posts
      JOIN users ON users.id = posts.user_id
      WHERE posts.id = ?
    `

    const post = await env.DB
      .prepare(query)
      .bind(id)
      .first()

    if (!post) {
      return new Response("Post not found", { status: 404 })
    }

    return new Response(JSON.stringify(post), {
      headers: { "Content-Type": "application/json" }
    })
  }

  // -----------------------------
  // DELETE POST
  // DELETE /api/posts/:id
  // -----------------------------
  if (req.method === "DELETE" && id) {
    const body = await req.json()
    const { user_id } = body

    if (!user_id) {
      return new Response("Missing user_id", { status: 400 })
    }

    // ensure owner
    const check = await env.DB
      .prepare("SELECT user_id FROM posts WHERE id = ?")
      .bind(id)
      .first()

    if (!check || check.user_id !== user_id) {
      return new Response("Unauthorized", { status: 403 })
    }

    await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run()

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response("Not Found", { status: 404 })
}
