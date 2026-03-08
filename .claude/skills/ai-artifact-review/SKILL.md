---
name: ai-artifact-review
description: Review and correct AI writing patterns in content. Use when checking if content sounds AI-generated, removing AI tells, cleaning up AI writing, or humanizing content. Triggers on "review for AI artifacts", "check for AI writing", "does this sound like AI", "clean up this content", "humanize this". Can accept keyword constraints to preserve important terms during cleanup.
context: fork
agent: general-purpose
---

# AI Artifact Review

Review content for AI writing patterns and correct them while preserving substance.

## Quick Start

1. Read the content file
2. Run four passes (structural → vocabulary → sentence patterns → content quality)
3. Fix issues in order: delete → substitute → rewrite
4. If keyword constraints provided, preserve high-priority terms

## Review Process

### Pass 1: Structural (fix as you go)

Scan for formatting artifacts:

- `**Bold Header:** description` bullet pattern
- Title Case In Every Heading
- Em dashes (—) — replace all with commas, parentheses, or restructure
- Markdown syntax in wrong context
- Citation artifacts (`utm_source=openai`, `turn0search0`, `oaicite`)

These are mechanical fixes. Correct immediately.

### Pass 2: Vocabulary (collect, then batch fix)

Search for high-signal words:

```
delve, tapestry, interplay, landscape (figurative), underscore,
garner, pivotal, crucial, testament, vibrant, showcasing,
fostering, enhancing, groundbreaking, renowned, enduring
```

Search for verb inflation:

- "serves as" / "stands as" → "is"
- "utilizes" → "uses"
- "facilitates" → "helps"

Collect all instances before fixing to avoid creating new repetition.

See [references/detection-patterns.md](references/detection-patterns.md) for full vocabulary list.

### Pass 3: Sentence Patterns (collect by type, batch fix)

**Trailing -ing clauses** (usually delete):

- "...highlighting its importance"
- "...reflecting broader trends"

**Parallelisms** (simplify):

- "Not only X, but also Y" → "X and Y"

**Rule of three** (reduce):

- "fast, reliable, and secure" → keep one or rewrite

**Weasel words** (cite or delete):

- "Experts argue..." → name the expert or remove

### Pass 4: Content Quality (assess holistically first)

**Vague significance** (delete unless cited):

- "plays a crucial role"
- "is a testament to"

**Boilerplate sections**:

- "Challenges and Future Outlook"
- Conclusions that just restate

**Puffery** (substantiate or delete):

- "revolutionary", "groundbreaking", "industry-leading"

Assess the full document before editing. Some patterns may be valid with evidence.

## Fix Priority

1. **Delete** — If removing loses nothing, remove it
2. **Substitute** — Simple swaps (serves as → is)
3. **Rewrite** — Only when point is valid but phrasing is formulaic

Delete first. Often eliminates need for rewriting.

Example progression:

```
Original: "The platform serves as a pivotal force, highlighting its commitment to innovation."
After delete: "The platform serves as a pivotal force."
After substitute: "The platform is a pivotal force."
After judgment: Delete entire sentence (no evidence of "pivotal")
```

## Keyword Constraints

When provided coverage output from geo-content-optimizer, respect keyword priorities:

```
=== HIGH PRIORITY WORDS (cover 50% of achievable) ===
kubernetes: 47 queries
deployment: 32 queries

=== MEDIUM PRIORITY WORDS (cover next 30%) ===
orchestration: 8 queries
```

**Rules:**

- **High priority**: Never remove. Rewrite surrounding context if awkward.
- **Medium priority**: Keep. Can restructure sentence.
- **Low priority**: Can remove if creating obvious AI tells.

When keyword appears in AI-tell construction, rewrite to preserve keyword:

- "Kubernetes serves as a pivotal platform" → "Kubernetes is the deployment target"

## Output Summary

After review, report:

- Issues found by category (counts)
- Changes made
- Keywords preserved (if constraints provided)
- Items flagged for manual review

## Not AI Writing

Don't over-correct:

- Perfect grammar (skilled writers exist)
- Formal tone (appropriate in technical content)
- Domain jargon (expertise, not AI)
- Content before Nov 2022 (predates ChatGPT)

See [references/detection-patterns.md](references/detection-patterns.md) § False Positives.
