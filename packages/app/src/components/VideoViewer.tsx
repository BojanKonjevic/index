import { useI18n } from "@/hooks/useI18n"

const YOUTUBE_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//

function getYouTubeEmbedUrl(url: string): string | null {
  if (!YOUTUBE_RE.test(url)) return null
  try {
    const u = new URL(url)
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed${u.pathname}`
    const v = u.searchParams.get("v")
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`
    return null
  } catch {
    return null
  }
}

export default function VideoViewer({ url }: { url: string }) {
  const { t } = useI18n()
  const embedUrl = getYouTubeEmbedUrl(url)

  if (embedUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-4xl aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-4xl">
        <video controls className="w-full rounded" preload="metadata">
          <source src={url} />
          <p>{t("viewer.load_error_fmt", { type: t("materialType.video") })}</p>
        </video>
      </div>
    </div>
  )
}
