export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { user_id, post_id } = await request.json()

  await env.DB.prepare(`
    INSERT INTO group_post_likes (user_id, post_id)
    VALUES (?, ?)
  `).bind(user_id, post_id).run()

  return Response.json({ success: true })
}
