import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slobbe.github.io/sudoku";

const routes = [
  "/",
  "/play",
  "/daily",
  "/daily/archive",
  "/easy-sudoku",
  "/medium-sudoku",
  "/hard-sudoku",
  "/evil-sudoku",
  "/solver",
  "/analyzer",
  "/how-to-play",
  "/settings",
  "/statistics",
  "/profile",
  "/techniques",
  "/techniques/naked-single",
  "/techniques/hidden-single",
  "/techniques/naked-pairs",
  "/techniques/hidden-pairs",
  "/techniques/pointing-pairs",
  "/techniques/box-line-reduction",
  "/techniques/x-wing",
  "/techniques/swordfish",
  "/techniques/uniqueness",
  "/leaderboard",
  "/about",
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
