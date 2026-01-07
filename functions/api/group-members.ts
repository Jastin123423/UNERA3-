export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const { group_id, user_id, role } = await request.json()

    if (!group_id || !user_id) {
      return new Response("Missing fields", { status: 400 })
    }

    await env.DB.prepare(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES (?, ?, ?)`
    )
      .bind(group_id, user_id, role ?? "member")
      .run()

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    )
  }
}
