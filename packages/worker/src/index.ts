import { Hono } from "hono"
import subjects from "./routes/subjects"

const app = new Hono()

app.route("/api", subjects)

app.get("/api/health", (c) => c.json({ status: "ok" }))

export default app
