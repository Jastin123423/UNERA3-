import { handlePosts } from "./posts/posts"
import { handleFeed } from "./feeds/feeds"
import { handleStories } from "./stories/stories"
import { handleReels } from "./reels/reels"
import { handlePodcasts } from "./podcasts/podcasts"
import { handleProducts } from "./products/products"
import { handleBrands } from "./brands/brands"
import { handleEvents } from "./events/events"

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    // ---------- API ROUTER ----------
    if (path.startsWith("/api/posts")) {
      return handlePosts(req, env)
    }

    if (path.startsWith("/api/feed")) {
      return handleFeed(req, env)
    }

    if (path.startsWith("/api/stories")) {
      return handleStories(req, env)
    }

    if (path.startsWith("/api/reels")) {
      return handleReels(req, env)
    }

    if (path.startsWith("/api/podcasts")) {
      return handlePodcasts(req, env)
    }

    if (path.startsWith("/api/products")) {
      return handleProducts(req, env)
    }

    if (path.startsWith("/api/brands")) {
      return handleBrands(req, env)
    }

    if (path.startsWith("/api/events")) {
      return handleEvents(req, env)
    }

    // ---------- HEALTH CHECK ----------
    if (path === "/api") {
      return new Response(
        JSON.stringify({
          status: "ok",
          app: "UNERA",
          version: "1.0.0"
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // ---------- NOT FOUND ----------
    return new Response("API route not found", { status: 404 })
  }
}
