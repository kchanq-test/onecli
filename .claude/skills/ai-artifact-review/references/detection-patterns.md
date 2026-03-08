# AI Writing Detection Patterns

Reference guide for identifying and correcting AI-generated content patterns. Based on Wikipedia's "Signs of AI Writing" documentation.

## Table of Contents

- [Vocabulary](#vocabulary)
- [Verb Inflation](#verb-inflation)
- [Sentence Patterns](#sentence-patterns)
- [Structural Tells](#structural-tells)
- [Content Quality Issues](#content-quality-issues)
- [Citation Artifacts](#citation-artifacts)
- [False Positives](#false-positives)

---

## Vocabulary

### High-Signal Words

These words appear disproportionately in AI-generated text post-2023:

```
additionally (starting sentences), align with, crucial, delve (pre-2025),
emphasizing, enduring, enhance, fostering, garner, highlight (verb),
interplay, intricate/intricacies, key (adjective), landscape (figurative),
multifaceted, pivotal, robust, seamlessly, showcase, tapestry (figurative),
testament, underscore (verb), valuable, vibrant
```

**Detection:** One or two may be coincidental. Multiple occurrences in the same piece is a strong tell.

**Fix:** Delete or replace with simpler alternatives. "Crucial" → "important" or delete. "Landscape" → "market" or "field". "Tapestry" → delete the metaphor entirely.

### Puffery Words

Promotional language that adds no information:

```
groundbreaking, revolutionary, industry-leading, cutting-edge,
best-in-class, world-class, renowned, nestled, in the heart of,
boasts, vibrant, rich (figurative), profound, natural beauty
```

**Fix:** Delete unless substantiated with evidence. "Groundbreaking AI platform" → "AI platform" or cite what makes it groundbreaking.

---

## Verb Inflation

AI substitutes complex verbs for simple ones:

| AI Pattern                 | Simple Alternative |
| -------------------------- | ------------------ |
| serves as / stands as      | is                 |
| features / boasts / offers | has                |
| represents / marks         | is                 |
| utilizes                   | uses               |
| facilitates                | helps, enables     |
| encompasses                | includes           |
| leverages                  | uses               |
| endeavors                  | tries              |

**Detection:** High density of left-column verbs, especially "serves as" and "utilizes."

**Fix:** Direct substitution. "The platform serves as a deployment layer" → "The platform is a deployment layer."

---

## Sentence Patterns

### Trailing -ing Clauses

Superficial analysis attached to sentences:

```
...highlighting its importance
...underscoring the significance
...reflecting broader trends
...demonstrating commitment to
...emphasizing the need for
...showcasing the potential
...contributing to the overall
...fostering innovation
```

**Detection:** Sentence ends with a present participle phrase that adds no specific information.

**Fix:** Delete the clause. If the point matters, make it a separate sentence with evidence.

Before: "The company launched a new API, highlighting its commitment to developer experience."
After: "The company launched a new API."

### Negative Parallelisms

Balanced constructions to appear thoughtful:

```
Not only X, but also Y
It's not just about X, it's about Y
No X, no Y, just Z
While X, it's important to note Y
```

**Fix:** Simplify. "Not only does it support Python, but also JavaScript" → "It supports Python and JavaScript."

### Rule of Three

Overuse of three-part lists:

```
adjective, adjective, and adjective
X, Y, and Z (when one would suffice)
```

**Detection:** Frequent three-item lists, especially adjectives.

**Fix:** Keep one item, or rewrite as prose if all three matter.

### False Ranges

"From X to Y" constructions where X and Y aren't on a real scale:

- "From startups to enterprises" ✓ (real scale: company size)
- "From deployment to monitoring" ✗ (not endpoints of a scale)
- "From security to scalability" ✗ (unrelated concepts)

**Fix:** Rewrite as a list or delete. "From security to scalability" → "security and scalability."

### Weasel Attributions

Vague authority claims:

```
Experts argue...
Observers note...
Industry reports suggest...
Studies show...
Some critics argue...
```

**Fix:** Name the source or delete. "Experts argue this approach is effective" → cite the expert or remove the claim.

---

## Structural Tells

### Bold-Header Bullet Lists

```markdown
- **Header:** Description text here
- **Another Header:** More description
```

This pattern (bullet + inline bold header + colon + description) is characteristic of AI output.

**Fix:** Convert to prose paragraphs, or use actual subheadings if structure is needed.

### Title Case Headings

AI defaults to Title Case For All Headings instead of sentence case.

**Fix:** Use sentence case: "How to deploy agents" not "How To Deploy Agents."

### Em Dashes

Em dashes (—) have become strongly associated with AI writing. Even when used correctly, they trigger suspicion.

**Rule:** Remove all em dashes. No exceptions.

**Fix:** Replace with commas, colons, parentheses, or restructure the sentence.

| Original                                          | Fixed                                           |
| ------------------------------------------------- | ----------------------------------------------- |
| The platform — built for scale — handles millions | The platform, built for scale, handles millions |
| One thing matters — speed                         | One thing matters: speed                        |
| The API (— surprisingly —) worked                 | The API, surprisingly, worked                   |

### Section Summaries

Older AI patterns (2023-2024):

```
In summary...
In conclusion...
Overall...
To summarize...
```

Also: "Challenges and Future Outlook" sections with boilerplate content.

**Fix:** Delete summary sections. If a conclusion is needed, make it substantive.

---

## Content Quality Issues

### Vague Significance Claims

```
plays a crucial role in...
is a testament to...
reflects the broader trend of...
marks a significant shift in...
serves as a reminder that...
underscores the importance of...
```

**Detection:** Claims about importance without specific evidence.

**Fix:** Delete, or substantiate with facts. "This marks a significant shift" → explain what shifted and why it matters, or delete.

### Undue Emphasis on Legacy/Impact

AI inflates importance:

```
enduring legacy
lasting impact
indelible mark
deeply rooted
pivotal moment
key turning point
```

**Fix:** Delete unless historically accurate and cited.

### Speculation Disguised as Analysis

```
This likely reflects...
This suggests that...
This demonstrates a commitment to...
This positions the company to...
```

**Fix:** Either cite evidence or delete the speculation.

---

## Citation Artifacts

### URL Parameters

```
utm_source=openai
utm_source=chatgpt.com
utm_source=copilot.com
referrer=grok.com
```

**Fix:** Remove UTM parameters from URLs.

### Markup Fragments

```
turn0search0
oaicite
contentReference[oaicite:0]{index=0}
[attached_file:1]
[web:1]
grok_card
```

**Fix:** Delete these fragments entirely.

### Curly Quotes

ChatGPT uses curly quotes ("...") and apostrophes ('). Mixed with straight quotes indicates AI editing.

**Fix:** Standardize to straight quotes for technical content, or all curly for prose.

---

## False Positives

Do NOT flag as AI writing:

- **Perfect grammar** — skilled writers exist
- **Formal tone** — appropriate in technical content
- **Academic/unusual words** — may indicate domain expertise
- **Mixed registers** — can indicate technical writer with casual style
- **Content before Nov 2022** — predates ChatGPT
- **Letter-like formatting** — cultural/professional norms

### Context Matters

- "Landscape" is fine when literal (physical landscape)
- "Underscore" is fine when meaning underline character
- "Crucial" can be appropriate for genuinely critical points
