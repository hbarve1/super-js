---
title: Beta Program
sidebar_position: 1
description: How to join the SuperJS v1.0 beta — expectations, onboarding, and feedback channels.
---

# Beta Program

SuperJS v1.0 will ship after a short **release-candidate (RC)** cycle exercised by
friendly teams in production-like environments. This page is the public contract for
participants and maintainers.

> **Status:** Recruiting has not started. RC tags are not published yet. Watch
> [v1.0 RC Status](../roadmap/v1.0-rc-status.md) for timeline updates.

## Goals

- Validate real-world migration from TypeScript / prototype SJS at ≥1k LOC per team.
- Surface blocker bugs before `1.0.0` GA.
- Collect structured **`dynamic` usage** data (C5) to inform post-1.0 interop work.

## Participant commitments

Each beta team agrees to:

1. Run `superjs@1.0.0-rc.X` (exact RC announced when published) for ≥4 weeks.
2. Maintain **≥1,000 lines** of SJS in a non-toy project (app, library, or service).
3. File issues for bugs with repro steps; label blockers `severity=blocker`.
4. Join a **weekly 30-minute check-in** (async write-up acceptable) for the first month.
5. Complete the **`dynamic` usage survey** (see below) before RC exit.
6. Optional: provide a short testimonial or case study for launch (not required).

## Maintainer commitments

- Respond to beta issues within **2 business days**.
- Ship RC patch releases for blockers only during the RC window.
- Publish aggregated (anonymized) survey results at GA.

## Onboarding checklist

When RC.1 is tagged:

```bash
# 1. Install RC (version TBD)
npm install -D @superjsorg/cli@1.0.0-rc.1

# 2. Initialize or migrate
superjs init          # greenfield
# or
superjs migrate from-prototype --from ./legacy-src

# 3. Baseline health
superjs doctor --json > beta-doctor-baseline.json

# 4. Open a tracking issue
# Title: [Beta] <team name> — v1.0 RC feedback
# Include: repo link (if public), stack, LOC estimate, contact
```

## `dynamic` usage survey (C5)

Each team runs before RC exit:

1. `superjs doctor --json` — attach output to the team tracking issue.
2. Count `dynamic` occurrences per kLOC:

```bash
node scripts/count-dynamic.mjs ./your-sjs-project
```

3. Classify each use by reason per [`spec/dts-dynamic-reasons.md`](https://github.com/hbarve1/super-js/blob/main/spec/dts-dynamic-reasons.md).
4. Maintainer aggregates into `docs/beta/dynamic-usage-survey.md`.

If aggregate `dynamic` rate exceeds **20%** across teams, we file
`docs/known-issues/dynamic-rate-v1.md` and prioritize post-1.0 interop work.

## Apply

Beta slots are limited to **three teams** for v1.0. To express interest before RC.1:

1. Open a [GitHub Discussion](https://github.com/hbarve1/super-js/discussions) titled **Beta interest — &lt;team/org&gt;**.
2. Include: project description, approximate LOC, target start date, and whether the repo can be public.

Maintainers will confirm participants when `1.0.0-rc.1` is ready.
