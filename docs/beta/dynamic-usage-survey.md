---
title: Dynamic Usage Survey (C5)
sidebar_position: 2
description: Aggregated beta-team results for dynamic interop usage — template for RC exit.
section: beta
---

# Dynamic Usage Survey (C5)

Structured survey completed by each v1.0 beta team before RC exit. Aggregate
results inform launch messaging and post-1.0 interop priorities.

> **Status:** Awaiting beta teams. Do not publish fabricated numbers.

## Per-team results

| Team | LOC (SJS) | `dynamic` count | per kLOC | Top reasons (M8 set) | `doctor --json` link |
|------|-----------|-----------------|----------|----------------------|----------------------|
| _TBD_ | | | | | |

## Aggregate

| Metric | Value | Threshold |
|--------|-------|-----------|
| Teams reporting | 0 / 3 | 3 required |
| Weighted `dynamic` rate | — | ≤ 20 % |

If aggregate **> 20 %**, file [`docs/known-issues/dynamic-rate-v1.md`](../known-issues/dynamic-rate-v1.md) and prioritise post-1.0 interop work.

## How teams contribute

See [Beta Program](./index.md) — each team attaches `superjs doctor --json` output
and classification per [`spec/dts-dynamic-reasons.md`](https://github.com/hbarve1/super-js/blob/main/spec/dts-dynamic-reasons.md).
