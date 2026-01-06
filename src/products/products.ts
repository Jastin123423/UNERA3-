import { Env } from "../env"

export async function handleProducts(req: Request, env: Env) {
  const url = new URL(req.url)
  const id = url.pathname.split("/").pop()

  // GET all products
  if (req.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY created_at DESC").all()
    return new Response(JSON.stringify({ success: true, products: results }), { headers: { "Content-Type": "application/json" } })
  }

  // CREATE product
  if (req.method === "POST") {
    const body = await req.json()
    const { seller_id, title, category, description, country, address, main_price, discount_price, quantity, phone_number, images } = body
    if (!seller_id || !title || !category || !description || !country || !address || !main_price || !quantity) return new Response("Missing required fields", { status: 400 })

    const result = await env.DB.prepare(`
      INSERT INTO products (seller_id, title, category, description, country, address, main_price, discount_price, quantity, phone_number, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(seller_id, title, category, description, country, address, main_price, discount_price || null, quantity, phone_number || null, images || null).run()

    return new Response(JSON.stringify({ success: true, product_id: result.meta.last_row_id }), { headers: { "Content-Type": "application/json" } })
  }

  return new Response("Not Found", { status: 404 })
}
