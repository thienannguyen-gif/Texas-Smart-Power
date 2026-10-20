// "Last updated" for the disclaimer page = when docs/DISCLAIMER.md last changed,
// taken from git at build time (NOT the build or deploy time, which would
// change on every deploy even if the text did not).
//
// Order of sources, first one that gives a trustworthy answer wins:
//   1. git log for the file. In a shallow clone (Vercel clones shallowly) the
//      oldest fetched commit looks as if it touched every file, so an answer
//      that points at the shallow boundary is NOT trusted; the clone is first
//      deepened with `git fetch --unshallow` once, if possible.
//   2. The GitHub API's latest commit for that path (public repos; also works
//      when there is no .git folder at all, e.g. a CLI deploy).
//   3. Nothing: the page then says the date is unavailable instead of showing
//      a blank or a wrong date.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DISCLAIMER_PATH = "docs/DISCLAIMER.md";

export type DateSource = "git" | "github" | "unavailable";

export interface DateDeps {
  /** Trimmed stdout of `git <args>`, or null if git is missing or it fails. */
  git: (args: string[]) => string | null;
  /** Commits at the shallow boundary (empty if the clone is complete). */
  readShallow: () => string[];
  /** Committer date (ISO) of the latest commit touching `url`'s path, or null. */
  fetchLatestDate: (url: string) => Promise<string | null>;
  env: Record<string, string | undefined>;
}

function githubRepo(deps: DateDeps): string | null {
  const remote = deps.git(["config", "--get", "remote.origin.url"]);
  const fromRemote = remote?.match(
    /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/,
  );
  if (fromRemote) return `${fromRemote[1]}/${fromRemote[2]}`;
  const { VERCEL_GIT_REPO_OWNER: owner, VERCEL_GIT_REPO_SLUG: slug } = deps.env;
  return owner && slug ? `${owner}/${slug}` : null;
}

export async function resolveDisclaimerDate(
  deps: DateDeps,
): Promise<{ iso: string | null; source: DateSource }> {
  const inGit = deps.git(["rev-parse", "--git-dir"]) !== null;

  if (inGit) {
    let shallow = deps.git(["rev-parse", "--is-shallow-repository"]) === "true";
    if (shallow) {
      deps.git(["fetch", "--unshallow", "--quiet"]); // may fail; that is fine
      shallow = deps.git(["rev-parse", "--is-shallow-repository"]) === "true";
    }

    const sha = deps.git(["log", "-1", "--format=%H", "--", DISCLAIMER_PATH]);
    const iso = deps.git(["log", "-1", "--format=%cI", "--", DISCLAIMER_PATH]);
    const atBoundary =
      shallow && sha !== null && deps.readShallow().includes(sha);
    if (sha && iso && !atBoundary) return { iso, source: "git" };
  }

  const repo = githubRepo(deps);
  if (repo) {
    const ref = deps.env.VERCEL_GIT_COMMIT_SHA;
    const url =
      `https://api.github.com/repos/${repo}/commits` +
      `?path=${encodeURIComponent(DISCLAIMER_PATH)}&per_page=1` +
      (ref ? `&sha=${ref}` : "");
    const iso = await deps.fetchLatestDate(url);
    if (iso) return { iso, source: "github" };
  }

  return { iso: null, source: "unavailable" };
}

/** The real dependencies: git in the repo root, the GitHub API, process.env. */
export function realDeps(repoRoot: string): DateDeps {
  const git = (args: string[]): string | null => {
    try {
      return execFileSync("git", args, {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 60_000,
      }).trim();
    } catch {
      return null;
    }
  };

  return {
    git,
    readShallow: () => {
      const file = git(["rev-parse", "--git-path", "shallow"]);
      if (!file) return [];
      try {
        return readFileSync(resolve(repoRoot, file), "utf8")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    },
    fetchLatestDate: async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/vnd.github+json",
            "user-agent": "texas-smart-power-build",
          },
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok) return null;
        const body: unknown = await response.json();
        const date = (
          body as Array<{ commit?: { committer?: { date?: string } } }>
        )[0]?.commit?.committer?.date;
        return typeof date === "string" ? date : null;
      } catch {
        return null;
      }
    },
    env: process.env,
  };
}
