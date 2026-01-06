export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { group_id, user_id, role } = await request.json()

  await env.DB.prepare(`
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (?, ?, ?)
  `).bind(group_id, user_id, role ?? "member").run()

  return Response.json({ success: true })
}
