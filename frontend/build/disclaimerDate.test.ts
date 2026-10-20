import { describe, expect, it, vi } from "vitest";
import {
  DISCLAIMER_PATH,
  resolveDisclaimerDate,
  type DateDeps,
} from "./disclaimerDate";

const SHA = "a".repeat(40);
const GIT_DATE = "2026-10-20T12:26:23+07:00";
const API_DATE = "2026-10-20T05:26:23Z";

interface Fake {
  hasGit?: boolean;
  shallow?: boolean;
  /** does `git fetch --unshallow` work? */
  unshallowWorks?: boolean;
  boundary?: string[];
  fileSha?: string;
  fileDate?: string;
  remote?: string | null;
  api?: string | null;
  env?: Record<string, string>;
}

function deps(f: Fake = {}) {
  const state = { shallow: f.shallow ?? false };
  const log: string[] = [];
  const fetchLatestDate = vi.fn(async (url: string) => {
    log.push(url);
    return f.api ?? null;
  });
  const d: DateDeps = {
    git: (args) => {
      if (f.hasGit === false) return null;
      const cmd = args.join(" ");
      if (cmd === "rev-parse --git-dir") return ".git";
      if (cmd === "rev-parse --is-shallow-repository")
        return state.shallow ? "true" : "false";
      if (cmd === "fetch --unshallow --quiet") {
        log.push("unshallow");
        if (!f.unshallowWorks) return null;
        state.shallow = false;
        return "";
      }
      if (cmd === `log -1 --format=%H -- ${DISCLAIMER_PATH}`)
        return f.fileSha ?? SHA;
      if (cmd === `log -1 --format=%cI -- ${DISCLAIMER_PATH}`)
        return f.fileDate ?? GIT_DATE;
      if (cmd === "config --get remote.origin.url")
        return f.remote === undefined
          ? "https://github.com/octo/repo.git"
          : f.remote;
      return null;
    },
    readShallow: () => f.boundary ?? [],
    fetchLatestDate,
    env: f.env ?? {},
  };
  return { d, log, fetchLatestDate };
}

describe("resolveDisclaimerDate", () => {
  it("uses the git commit date of the file in a complete clone", async () => {
    const { d, fetchLatestDate } = deps();
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: GIT_DATE,
      source: "git",
    });
    expect(fetchLatestDate).not.toHaveBeenCalled();
  });

  it("deepens a shallow clone first, then trusts git", async () => {
    const { d, log, fetchLatestDate } = deps({
      shallow: true,
      unshallowWorks: true,
      boundary: [SHA],
    });
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: GIT_DATE,
      source: "git",
    });
    expect(log).toContain("unshallow");
    expect(fetchLatestDate).not.toHaveBeenCalled();
  });

  it("does not trust a shallow clone whose answer is the boundary commit; asks GitHub instead", async () => {
    const { d, log } = deps({
      shallow: true,
      unshallowWorks: false,
      boundary: [SHA], // the file's "last commit" is just where history was cut
      api: API_DATE,
    });
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: API_DATE,
      source: "github",
    });
    expect(log.at(-1)).toBe(
      "https://api.github.com/repos/octo/repo/commits?path=docs%2FDISCLAIMER.md&per_page=1",
    );
  });

  it("trusts git in a shallow clone when the file's commit is inside the history", async () => {
    const { d, fetchLatestDate } = deps({
      shallow: true,
      unshallowWorks: false,
      boundary: ["b".repeat(40)],
    });
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: GIT_DATE,
      source: "git",
    });
    expect(fetchLatestDate).not.toHaveBeenCalled();
  });

  it("works with no .git folder at all, using the Vercel repo variables and pinning the commit", async () => {
    const { d, log } = deps({
      hasGit: false,
      api: API_DATE,
      env: {
        VERCEL_GIT_REPO_OWNER: "octo",
        VERCEL_GIT_REPO_SLUG: "repo",
        VERCEL_GIT_COMMIT_SHA: "c".repeat(40),
      },
    });
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: API_DATE,
      source: "github",
    });
    expect(log[0]).toContain("/repos/octo/repo/commits");
    expect(log[0]).toContain(`&sha=${"c".repeat(40)}`);
  });

  it("falls back to GitHub when the file has no commit yet (untracked)", async () => {
    const { d } = deps({ fileSha: "", fileDate: "", api: API_DATE });
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: API_DATE,
      source: "github",
    });
  });

  it("reports unavailable, never a made-up date, when nothing works", async () => {
    const { d } = deps({
      shallow: true,
      unshallowWorks: false,
      boundary: [SHA],
      api: null,
    });
    expect(await resolveDisclaimerDate(d)).toEqual({
      iso: null,
      source: "unavailable",
    });

    const noGit = deps({ hasGit: false });
    expect(await resolveDisclaimerDate(noGit.d)).toEqual({
      iso: null,
      source: "unavailable",
    });
  });

  it("reads the owner and repo from an ssh remote too", async () => {
    const { d, log } = deps({
      fileSha: "",
      fileDate: "",
      remote: "git@github.com:octo/repo.git",
      api: API_DATE,
    });
    await resolveDisclaimerDate(d);
    expect(log[0]).toContain("/repos/octo/repo/commits");
  });
});
