import { Hono } from "hono"

const app = new Hono()

app.get("/pdf/:id", async (c) => {
  const id = c.req.param("id")
  const url = `https://drive.google.com/uc?export=download&id=${id}&confirm=t`

  const response = await fetch(url, { redirect: "follow" })

  const headers = new Headers(response.headers)
  headers.set("Access-Control-Allow-Origin", "*")
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})

export default app
