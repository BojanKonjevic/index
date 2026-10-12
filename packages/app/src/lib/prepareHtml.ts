/** Prepares stored HTML for the sandboxed blob-URL iframe.
 *
 *  Notebook exports fix the prompt gutter at 64px, which clips three-digit
 *  prompts (Out[114]:). Widen it at render time so every seeded notebook is
 *  fixed without touching stored bytes.
 *
 *  Relative and root-absolute subresource references (images, styles) would
 *  otherwise resolve to unusable blob: URLs inside the iframe. Pin them to
 *  the document's own directory with a <base> tag instead, replacing any
 *  pre-existing one: exporter-emitted bases point at the author's local
 *  disk or the original site and would break resolution the same way.
 *  The sandbox stays tight (page JS keeps running isolated, fetch/XHR stay
 *  blocked); only classic subresource loads are affected.
 *
 *  Exported images with no dimensions would also render at full media
 *  resolution and blow out phone layouts, so images are capped at the
 *  container width while keeping aspect ratio. Per-image slide-faithful
 *  sizes belong in the stored bytes, this is only the overflow guard. */
export function prepareHtmlBytes(data: Uint8Array, url: string, origin: string): string {
  let text = new TextDecoder()
    .decode(data)
    .replace(/--jp-cell-prompt-width:\s*64px/g, "--jp-cell-prompt-width: 96px")
  const base = new URL(url, origin)
  base.pathname = base.pathname.replace(/[^/]*$/, "")
  const headExtras =
    `<base href="${base.href.replace(/"/g, "%22")}">` +
    `<style>img{max-width:100%;height:auto}</style>`
  // Only the head region counts: a <base> lookalike inside a comment or
  // body markup must neither match nor be replaced.
  const headClose = /<\/head\s*>/i.exec(text)
  const headRegion = headClose ? text.slice(0, headClose.index) : text
  if (/<base[^>]*>/i.test(headRegion)) {
    text = text.replace(/<base[^>]*>/i, headExtras)
  } else if (/<head[^>]*>/i.test(text)) {
    text = text.replace(/<head[^>]*>/i, (match: string) => `${match}${headExtras}`)
  } else {
    text = `${headExtras}${text}`
  }
  return text
}
