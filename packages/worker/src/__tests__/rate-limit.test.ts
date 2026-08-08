import { describe, it, expect } from "vitest"
import { exports } from "cloudflare:workers"

type Worker = {
  fetch: (url: string | Request, init?: RequestInit) => Promise<Response>
}
const SELF = (exports as unknown as { default: Worker }).default

const TEST_IP = "203.0.113.77"

describe("auth rate limiter", () => {
  it("allows a burst within the window", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-connecting-ip": TEST_IP },
        body: JSON.stringify({ name: `burst${i}`, password: "wrongpass" }),
      })
      expect(res.status).not.toBe(429)
    }
  })

  it("rejects requests over the limit with 429", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": TEST_IP },
      body: JSON.stringify({ name: "overlimit", password: "wrongpass" }),
    })
    expect(res.status).toBe(429)
    const body = await res.json<{ error: string }>()
    expect(body.error).toContain("Previše zahteva")
  })

  it("ignores client-supplied x-forwarded-for so the limit cannot be bypassed by rotating it", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `203.0.113.${i + 1}`,
        },
        body: JSON.stringify({ name: `spoof${i}`, password: "wrongpass" }),
      })
      expect(res.status).not.toBe(429)
    }
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.99",
      },
      body: JSON.stringify({ name: "spoofed", password: "wrongpass" }),
    })
    expect(res.status).toBe(429)
  })
})
