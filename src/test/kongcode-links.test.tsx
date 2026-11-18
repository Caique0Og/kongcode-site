import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

async function renderKongCode() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/kongcode"] }),
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return screen.findByRole("navigation", { name: "Links do KongCode" });
}

describe("KongCode page", () => {
  it("shows every EM BREVE item after all the active links", async () => {
    const nav = await renderKongCode();
    const items = Array.from(nav.querySelectorAll(".kong-link"));
    const comingSoon = items.map((el) => (el.textContent ?? "").includes("EM BREVE"));

    expect(comingSoon).toContain(true);
    const lastActive = comingSoon.lastIndexOf(false);
    const firstSoon = comingSoon.indexOf(true);
    expect(lastActive).toBeGreaterThanOrEqual(0);
    expect(firstSoon).toBeGreaterThan(lastActive);
  });

  it("links the liquor site and the Instagram account", async () => {
    const nav = await renderKongCode();
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("https://www.familiabachiega.com.br");
    expect(hrefs.some((h) => h?.includes("instagram.com/atleticaimpacta"))).toBe(true);
  });
});
