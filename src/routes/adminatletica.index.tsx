import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/adminatletica/")({
  component: () => <Navigate to="/adminatletica/clubes" replace />,
});
