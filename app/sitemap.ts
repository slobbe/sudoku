import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slobbe.github.io/sudoku";

const routes = [
  "/",
  "/play",
  "/daily",
  "/settings",
  "/statistics/overall",
  "/statistics/daily",
  "/profile",
  "/privacy",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
  }));
}
