export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const body = await request.json()

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

export const onRequestGet: PagesFunction = async ({ env }) => {
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
