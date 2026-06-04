import { createRootRoute, Outlet } from "@tanstack/react-router"

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-[#f5f5f4]">
      <Outlet />
    </div>
  ),
})
