import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const publicDir = join(root, "public")

const TILE = "#1a1a1a"
const GLYPH = "#f4f4f5"

// Official lucide GraduationCap (vendored from lucide-icons/lucide, 24x24,
// stroke-based line art). The mark is shown at 50% of the tile in the app
// (login screen, sidebar). Rendered as-is: nested <svg> + viewBox, with the
// glyph color substituted for currentColor.
const CAP = (
  await readFile(join(dirname(fileURLToPath(import.meta.url)), "graduation-cap.svg"))
).toString()

// Rounded square + cap at 50% (in-app logo composition) on transparent.
const logo = (size, radiusPct) => {
  const r = (size * radiusPct) / 100
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${TILE}"/>
  <g transform="translate(${size / 4} ${size / 4}) scale(${size / 48})">
  ${CAP.replaceAll("currentColor", GLYPH)}
  </g>
</svg>`,
    ),
  )
    .png()
    .toBuffer()
}

// Solid full-bleed tile + cap at 50% (iOS masks its own corners; Android
// crops maskable icons to the 80% safe zone, so the mark stays well inside).
const tileIcon = async (size, bg) =>
  sharp({
    create: { width: size, height: size, channels: 3, background: bg },
  })
    .composite([{ input: await logo(size, 0), left: 0, top: 0 }])
    .png()
    .toBuffer()

// Rounded corner radius of the in-app tile: rounded-2xl (16px on a 56px tile).
const ROUNDED_2XL_PCT = 28.6

const [pwa192, pwa512, maskable, apple] = await Promise.all([
  logo(192, ROUNDED_2XL_PCT),
  logo(512, ROUNDED_2XL_PCT),
  tileIcon(512, TILE),
  tileIcon(180, TILE),
])

const files = [
  ["pwa-192x192.png", pwa192],
  ["pwa-512x512.png", pwa512],
  ["pwa-maskable-512x512.png", maskable],
  ["apple-touch-icon.png", apple],
]

await Promise.all(files.map(([name, data]) => writeFile(join(publicDir, name), data)))

console.log(`wrote ${files.length} icons to ${publicDir}`)
