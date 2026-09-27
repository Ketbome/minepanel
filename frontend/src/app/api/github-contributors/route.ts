import { GITHUB_REPOSITORY } from "@/lib/providers/constants";

interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

export async function GET() {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/contributors?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return Response.json({ contributors: null }, { status: 502 });
  }

  const contributors = (await response.json()) as GitHubContributor[];

  return Response.json({
    contributors: contributors
      .filter((contributor) => contributor.type === "User")
      .map(({ login, avatar_url, html_url, contributions }) => ({ login, avatar: avatar_url, url: html_url, contributions })),
  });
}
