import { test, expect } from "@playwright/test"

// Smoke coverage for the paths a visitor actually clicks: home loads,
// palette search finds a subject, a material viewer route opens, and the
// offline banner reacts to connectivity loss. Assertions stay structural
// (routes, landmarks, landmarks text) on purpose: they must hold in both
// Serbian and English UI and regardless of how many subjects are seeded.

async function continueAsGuest(page: import("@playwright/test").Page) {
  await page.goto("/")
  const shellLink = page.locator('a[href="/subjects"]').first()
  const guestButton = page.getByRole("button", { name: /gost|guest/i })
  // Either the app shell or the welcome screen: wait for whichever comes.
  await expect(shellLink.or(guestButton)).toBeVisible({ timeout: 20000 })
  if ((await shellLink.count()) === 0) {
    // Wait for hydration to settle (early clicks hit the pre-hydration
    // node and get swallowed), then continue as guest.
    await expect(guestButton).toBeVisible({ timeout: 10000 })
    await guestButton.first().click()
    await expect(shellLink).toBeVisible()
  }
}

test("home loads with subject links", async ({ page }) => {
  await continueAsGuest(page)
})

test("palette search finds a subject", async ({ page }) => {
  await continueAsGuest(page)
  await page.goto("/subjects")
  const subjectLink = page.locator('a[href*="/subjects/"]').first()
  await expect(subjectLink).toBeVisible()
  const subjectName = ((await subjectLink.innerText()) ?? "").split("\n")[0].trim()
  expect(subjectName.length).toBeGreaterThan(0)

  // `/` focuses the command palette from anywhere.
  await page.keyboard.press("/")
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("textbox").fill(subjectName.slice(0, 5))

  const result = dialog.locator("[data-palette-row]").first()
  await expect(result).toBeVisible()
  await result.click()
  // First hit can be a subject row or a document content match inside it.
  // Either way search navigated somewhere under /subjects/.
  await expect(page).toHaveURL(/\/subjects\/.+/)
})

test("material viewer route opens", async ({ page }) => {
  await continueAsGuest(page)
  await page.goto("/subjects")
  await page.locator('a[href*="/subjects/"]').first().click()
  await expect(page).toHaveURL(/\/subjects\/[^/]+/)

  const materialLink = page.locator('a[href*="/materials/"]').first()
  await expect(materialLink).toBeVisible()
  const materialTitle = ((await materialLink.innerText()) ?? "").split("\n")[0].trim()
  await materialLink.click()

  await expect(page).toHaveURL(/\/materials\//)
  // Route-level check only: the viewer header repeats the material title
  // even when the PDF itself fails to render (tracked separately).
  if (materialTitle.length > 0) {
    await expect(page.getByText(materialTitle, { exact: false }).first()).toBeVisible()
  }
})

test("offline banner follows connectivity", async ({ page, context }) => {
  await continueAsGuest(page)
  const banner = page.getByRole("status")
  await expect(banner).toBeHidden()

  await context.setOffline(true)
  await expect(banner).toBeVisible()

  await context.setOffline(false)
  await expect(banner).toBeHidden()
})
