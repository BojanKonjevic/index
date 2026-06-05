import { Hono } from "hono"
import subjects from "./routes/subjects"
import pdf from "./routes/pdf"

const app = new Hono()

app.route("/api", subjects)
app.route("/api", pdf)

app.get("/api/health", (c) => c.json({ status: "ok" }))

export default app
