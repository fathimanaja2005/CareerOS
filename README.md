# CareerOS

An AI-scored profile review for new graduates. Paste your resume and LinkedIn text, name the
role you're targeting, and get:

- A **resume score** and a **LinkedIn score** (0–100), with "scored out of X points" shown so
  partial input is transparent.
- A breakdown table with score bars and a one-line reason per area.
- Strengths, prioritised top fixes, resume line rewrites (with copy buttons), LinkedIn headline
  options and an About rewrite.
- Missing skills for the target role, and a confidence note.

A second tab, **Job match**, compares one job description with your profile: a match score, the
skills the job names that you already show, the ones you don't, and the gaps to close first.

Scores are **computed in code**, not by the model: the model only supplies per-area scores, and
`lib/scoring.ts` clamps them and does the arithmetic.

---

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Zod for validating the model's JSON
- Google Gemini API (`gemini-3.5-flash-lite`) via plain `fetch` — no SDK, one config constant to swap providers
- Deployable on Vercel's free tier (single API route, no database)

## Project structure

```
app/
  layout.tsx              root layout
  page.tsx                tab shell: top nav + one card per agent
  globals.css             Tailwind entry
  api/analyze/route.ts    POST: validate body -> runAgent(profileAgent)
  api/match/route.ts      POST: validate body -> runAgent(matchAgent)
components/
  ResultsView.tsx         profile score cards, breakdowns, rewrites, headlines
  MatchResults.tsx        match score, breakdown, matched/missing skills, gaps
  CopyButton.tsx          copy-to-clipboard
  PlaceholderText.tsx     highlights [placeholders] in rewrites
  agents/                 one UI card per agent
    ProfileCard.tsx
    MatchCard.tsx
    TextField.tsx         labelled textarea with a character counter
lib/
  agents/
    run.ts                runAgent(): model call -> JSON -> Zod (one retry) -> postProcess
    shared.ts             shared breakdown/fix schemas and types
    registry.ts           tab labels, in order
    profile/              prompt.ts, schema.ts, index.ts (config + scoring)
    match/                prompt.ts, schema.ts, index.ts (config + scoring)
  llm.ts                  callModel() + LLM_CONFIG (provider/model/temperature/timeout)
  rubric.ts               profile area names + maxima (the single source of truth)
  scoring.ts              clamping + normalisation maths
  rate-limit.ts           in-memory per-IP limiter
tests/
  scoring.test.ts         unit tests for lib/scoring.ts
  consistency.mjs         runs each sample 3x and prints score spread
  samples/                3 fictional profiles
```

## Agents

An agent is four things, all of them local to its folder:

1. `prompt.ts` — the system prompt and `buildUserInput()`.
2. `schema.ts` — the Zod schema for the reply, plus the rubric and result type.
3. `index.ts` — the `AgentConfig` object (prompt + schema + `buildUserInput`) and an optional
   `postProcess` that scores, orders and renames the validated output.
4. A UI card in `components/agents/`, plus its tab label in `lib/agents/registry.ts`.

`runAgent()` in `lib/agents/run.ts` does the rest for every agent: it calls the model, extracts the
JSON, validates it with Zod, retries once on invalid JSON, and returns a friendly `LlmError` when it
still fails. Routes only validate the request body and call `runAgent(agent, input)`.

To add a third agent, copy the `match/` folder, point it at a new prompt and schema, add its card
and register the tab. Nothing in `run.ts`, `llm.ts` or the other agents changes.

## 1. Setup

Requires Node.js 20.9+ (this project was built and tested on Node 26).

```bash
npm install
```

### Add your Gemini key

1. Create a free key at <https://aistudio.google.com/apikey>.
2. Put it in `.env.local` (already git-ignored):

```bash
GEMINI_API_KEY=your_key_here
```

`.env.local` is listed in `.gitignore`, and the key is only read inside
`app/api/analyze/route.ts` → `lib/llm.ts`, which runs on the server. It is never included in the
client bundle and is sent to Gemini in an `x-goog-api-key` header, not in a URL.

### Environment variables

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes | — | Gemini API key. Read on the server only (`lib/llm.ts`), sent in a header, never in the client bundle. |
| `RATE_LIMIT_MAX` | No | `10` | Analyses allowed per IP per window. Leave it at the default in production. |
| `RATE_LIMIT_WINDOW_MINUTES` | No | `10` | Length of the rate-limit window. |

Locally these go in `.env.local` (git-ignored). On Vercel they go in **Settings → Environment
Variables**. Only `GEMINI_API_KEY` is needed in production; the rate-limit variables are optional.

Both rate-limit values are read once when the module loads, so restart `npm run dev` after changing
them. A higher `RATE_LIMIT_MAX` in your local `.env.local` (for example `200`) is fine for running
the consistency script repeatedly — keep the deployed value at the default 10.

## 2. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>, paste a profile, and press **Analyze my profile**.

If the key is missing you'll get a clear message instead of a crash: "The AI service isn't
configured yet…".

## 3. Tests

Unit tests for the scoring maths (no API key needed):

```bash
npm test
```

Covers: null areas excluded from both totals, clamping above `max` and below 0, rounding,
all-null sections, empty breakdowns, rubric ordering/maxima, and a perfect score of 100.

### Consistency check

With the dev server running in another terminal:

```bash
npm run consistency
```

This sends each sample in `tests/samples/` through the real API three times and prints the
normalised resume/LinkedIn scores, their spread (max − min) and their mean. A spread of 0–5 means
the low temperature is doing its job.

It makes `RUNS × 3` = 9 requests, and the API allows 10 per IP per 10 minutes. If you re-run it
immediately, wait for the window to reset or raise the limit in `.env.local`:

```bash
RATE_LIMIT_MAX=50
```

Then restart `npm run dev`.

## 4. How it works

1. `POST /api/analyze` accepts `{ resumeText, linkedinText, targetRole }`.
2. It validates: `targetRole` required, at least one text required, each text capped at 15,000
   characters, per-IP rate limit applied.
3. `callModel()` sends the system prompt + user input to Gemini at `temperature: 0.2`, with a
   55s timeout and one retry on timeouts, 429s, 5xx and network errors.
4. The reply is parsed and validated with Zod. If it isn't valid JSON or doesn't match the
   schema, the model is asked once more; after that the user gets a friendly error.
5. `applyRubric()` puts the breakdown in rubric order with the rubric's maxima, then
   `clampBreakdown()` + `computeSectionScore()` produce, per section:
   - `pointsAwarded` = sum of non-null scores
   - `scoredOutOf` = sum of `max` for non-null areas
   - `normalisedScore` = `round(points / scoredOutOf * 100)`, or `null` if nothing was scored
6. The API returns the result as JSON; the page renders it.

**Privacy:** the resume and LinkedIn text are used in memory for the request only. They are not
written to a database, a file, or the logs, and the app stores nothing between requests.

**The prompts** live in `lib/agents/<agent>/prompt.ts`. The profile prompt's rubric must match
`lib/rubric.ts`, which drives validation, scoring and the UI; the match prompt's rubric is
`MATCH_RUBRIC` in `lib/agents/match/schema.ts`. You can reword either prompt freely as long as the
JSON shape still matches that agent's schema.

**Switching providers:** edit `LLM_CONFIG` in `lib/llm.ts` (`provider`, `model`, `temperature`,
`timeoutMs`, `retries`) and add the matching case in `buildRequest()`. Nothing else needs to change.

## 5. Deploy to Vercel (free tier)

1. Push the project to a GitHub/GitLab/Bitbucket repository.
2. Go to <https://vercel.com/new> and import that repository.
3. Vercel detects Next.js automatically. Leave the build settings as they are
   (build command `next build`, output `.next`).
4. Before clicking Deploy, open **Environment Variables** and add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your key from AI Studio
   - **Environments:** Production, Preview (and Development if you want)
5. Click **Deploy**. The first build takes a minute or two.
6. Open the deployment URL and run one analysis to confirm the key is wired up.

Leave the optional rate-limit variables unset in production so they keep their defaults (see
[Environment variables](#environment-variables)).

Notes for the free tier:

- The route declares `maxDuration = 60`, which fits Vercel Hobby's function limit.
- The rate limiter is in memory, so it is per warm instance. That is fine for a demo; for strict
  limits use a shared store such as Upstash Redis.
- To rotate the key, update the environment variable in Vercel and redeploy.

## 6. Known limitations

- **Scores vary between runs.** The model sets the per-area scores, so the same profile can land a
  few points apart. Recent consistency runs show a section spread of roughly 1–7 points, and the
  LinkedIn half is the noisier one.
- **The rate limiter is in memory.** It is per warm function instance, resets on cold starts and
  redeploys, and is a guard against accidental hammering, not a security boundary. Use a shared
  store (e.g. Upstash Redis) if you need real limits.
- **Free-tier quota is small.** Bursts of requests return 429 from Gemini; the app retries once and
  then shows a friendly error.
- **Nothing is saved.** There are no accounts and no history — a refresh loses the review.
- **Text only.** No PDF or DOCX upload; paste up to 15,000 characters per field.
- **Some areas can't be judged.** Photo, banner, activity and network signals aren't in pasted text,
  so those areas come back as "Not provided" rather than a score.
- **It's guidance, not a hiring decision.** The review is a heuristic second opinion; unusual resume
  formats can be misread.
- **One model, one provider.** `LLM_CONFIG` in `lib/llm.ts` pins the model; switching providers is a
  code change, not a setting.
