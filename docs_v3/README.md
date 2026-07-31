# docs_v3 — current documentation

Written 30 Jul 2026. This is the live set. `docs/`, `docs_v2/` and `booking.md` are superseded and kept for reference only.

Every document here pairs a technical version with a plain-English version of the same content. Read the plain one when the engineering framing stops making the product feel real, and use it to validate ideas with vendors and incubators.

| Document | What it decides | Audience |
|---|---|---|
| **`build.md`** | What Kritva is, the three contract types, how escrow works, why photography is first | Ishan |
| **`plain.md`** | Same, no jargon | Keshav, incubators, vendors |
| **`mvp-photography.md`** | Every screen, every click, the architecture, the build order | Ishan |
| **`mvp-photography-plain.md`** | Same, no jargon — **show this to three real photographers before building** | Keshav, photographers |
| **`remediation.md`** | ⚠️ **Read before writing code.** Findings from five code reviews, ordered P0–P5, with corrections to the documents above | Ishan |

**`remediation.md` supersedes parts of `mvp-photography.md`** — notably the Milestone 0 list, §2.5, and several §3.3 state-machine claims. Where they disagree, remediation wins; it was written later and against verified code.

## The rule these documents follow

Every claim about existing code was read from the repository and cites a file and line. Every number is a design decision we chose, never a market claim. Anything unknown is listed as unknown, with the name of the person who can answer it — never guessed.

The older documents were generated from a short description of the idea. Their framing may be sound, but **every number, metric, target and timeline in them is invented** and none of it should reach an investor.

## The rule for deciding what to build next

> Finish one category until a real vendor's bank account receives real money. Anything that doesn't serve that is later.
