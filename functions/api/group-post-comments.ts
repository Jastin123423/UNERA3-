export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const { user_id, post_id, parent_comment_id, text } =
    await request.json()

  await env.DB.prepare(`
    INSERT INTO group_post_comments (user_id, post_id, parent_comment_id, text)
    VALUES (?, ?, ?, ?)
  `).bind(
    user_id,
    post_id,
    parent_comment_id ?? null,
    text
  ).run()

  return Response.json({ success: true })
}
