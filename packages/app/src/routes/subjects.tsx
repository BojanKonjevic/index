import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/subjects")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/subjects" || location.pathname === "/subjects/") {
      throw redirect({ to: "/", hash: "subjects" })
    }
  },
  component: () => <Outlet />,
})
