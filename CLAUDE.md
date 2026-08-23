# CLAUDE.md

Instructions for any AI coding assistant (Claude Code, Cursor, Copilot, etc.) working in this repo. Most people editing this project are students, often non-technical, "vibe coding" with an AI tool. These rules exist to keep the AI from confidently inventing things — wrong formulas, wrong APIs, wrong assumptions — that a non-technical student has no way to catch. Follow them even if a request doesn't mention them explicitly.

## 1. Domain logic comes from BRIEF.md, not memory or guessing

`BRIEF.md` — which you write yourself before building (see `docs/architecture-blueprint.md`'s intro for how: raw source material → NotebookLM synthesis → `BRIEF.md`) — is the single source of truth for product/domain rules: the stability filter (V-trap/hump), TOU detection cascade, the ranking formula and its weights, and the bill simulator's interpolation rule.

- Before writing or changing any code that touches scoring, filtering, or TOU detection, re-read the relevant section of `BRIEF.md`. Do not recall the formula from earlier in the conversation or "how these things are usually done" — read it fresh from the file.
- If `BRIEF.md` doesn't cover the situation (a new formula, a new filter, a new data field), say so explicitly and ask before inventing a rule. Do not silently pick a reasonable-sounding default for product logic — constants like `Fee_max = $395` or `STEEP_DECLINE_REFERENCE = 0.2` are exactly the kind of number that looks fine but is wrong if guessed.
- If code and `BRIEF.md` disagree, that's a bug in one of the two — flag the mismatch, don't quietly follow whichever one you noticed first.

## 2. Ask, don't assume, when a requirement is ambiguous

If a request could reasonably mean two different things, or depends on a decision that isn't written down anywhere in the repo, stop and ask instead of picking one and moving forward. This is more important than being fast. A wrong guess costs a non-technical student far more than a clarifying question does — they usually can't tell the difference between working code and code that merely runs.

Signs a question is needed rather than a guess:

- The behavior touches money, ranking, or what gets shown/hidden to a user (see section 1).
- Two parts of the repo imply different answers (e.g. `docs/architecture-blueprint.md` vs `BRIEF.md` vs existing code).
- The "obvious" implementation requires a constant, threshold, or business rule that isn't stated anywhere.

## 3. Never claim something works without running it

"This should work" is not a finding — it's a guess wearing the clothes of a finding. Before saying a change is done, fixed, or working:

- Run `npm run build` (from `frontend/`) or the relevant typecheck/build command and confirm it actually passes — don't infer success from the edit looking correct.
- For UI changes, actually run the app (`npm run dev`) and exercise the change in the browser. Don't describe expected behavior as observed behavior.
- If you can't verify something (no way to run it, a flaky external dependency, etc.), say that plainly instead of asserting it works.

## 4. Don't invent APIs, packages, or file paths

- Before importing a package, confirm it's already a dependency in `package.json` or `frontend/package.json`. Don't assume a library exists or has a particular function signature — check its actual usage elsewhere in this repo, or its installed types in `node_modules`.
- Before referencing a file, function, or endpoint, confirm it exists (Read/Grep it) rather than assuming based on naming conventions from other projects.
- This app has exactly one datastore (Vercel Blob) and no database — don't introduce SQL, Prisma, or a second datastore on the assumption one might be there.

## 5. State uncertainty out loud

If you're not sure whether something is correct, say "I'm not sure" or "this is an assumption" rather than presenting a guess with confident phrasing. A flagged assumption is easy for a student to catch and correct; a confident wrong answer usually isn't caught until it's live.

## 6. Git and branch discipline

Never commit directly to `main`. Confirm `git status` shows a feature branch before making changes, and if it shows `main`, stop and create a branch first rather than proceeding.

## 7. Pre-commit gate

Set up a Husky pre-commit hook that runs Prettier on staged files, then `npm run typecheck` (root `api/` + `frontend/`), on every commit (see `docs/architecture-blueprint.md` §9). It exists to catch the most common symptom of AI-hallucinated code (a call to something that doesn't actually exist) before it reaches `main`. Don't bypass it with `--no-verify`.
