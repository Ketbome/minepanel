import { GITHUB_REPOSITORY } from "@/lib/providers/constants";

// AI coding agents show up as regular users when they author commits; the list is for people
const AI_AGENTS = ["copilot", "copilot-swe-agent", "claude", "claude-code", "codex", "openai-codex", "chatgpt-codex-connector", "devin-ai-integration", "cursoragent", "cursor-agent", "google-labs-jules", "jules", "sweep-ai", "coderabbitai", "gemini-code-assist", "amazon-q-developer", "aider"];

const isPerson = ({ login, type }: GitHubContributor) => type === "User" && !login.endsWith("[bot]") && !AI_AGENTS.includes(login.toLowerCase());

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
      .filter(isPerson)
      .map(({ login, avatar_url, html_url, contributions }) => ({ login, avatar: avatar_url, url: html_url, contributions })),
  });
}
