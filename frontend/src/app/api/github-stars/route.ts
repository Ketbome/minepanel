import { GITHUB_REPOSITORY } from "@/lib/providers/constants";

interface GitHubRepository {
  stargazers_count: number;
}

export async function GET() {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return Response.json({ stars: null }, { status: 502 });
  }

  const repository = (await response.json()) as GitHubRepository;

  return Response.json({ stars: repository.stargazers_count });
}
