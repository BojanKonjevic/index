import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => (
    <div className="mx-auto max-w-[560px] px-6 pt-[100px]">
      <p className="text-center text-lg text-muted-foreground">Početna</p>
    </div>
  ),
})
