import { Env } from "../env"

export async function handleBrands(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // GET all brands
  if (req.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM brands ORDER BY created_at DESC").all()
    return new Response(JSON.stringify({ success: true, brands: results }), { headers: { "Content-Type": "application/json" } })
  }

  // CREATE brand
  if (req.method === "POST") {
    const body = await req.json()
    const { owner_id, name, description, logo_url, category } = body
    if (!owner_id || !name) return new Response("Missing required fields", { status: 400 })

    const result = await env.DB.prepare(`
      INSERT INTO brands (owner_id, name, description, logo_url, category)
      VALUES (?, ?, ?, ?, ?)
    `).bind(owner_id, name, description || null, logo_url || null, category || null).run()

    return new Response(JSON.stringify({ success: true, brand_id: result.meta.last_row_id }), { headers: { "Content-Type": "application/json" } })
  }

  return new Response("Not Found", { status: 404 })
}
