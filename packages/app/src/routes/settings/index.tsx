import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings/")({
  component: () => <div className="p-8 text-center text-lg text-muted-foreground">Podešavanja</div>,
})
