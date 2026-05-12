---
name: compliance-check
description: Pre-publish content compliance capability covering platform community standards, advertising law basics, and knowledge-IP-specific risks
tags:
  - compliance
  - risk
  - content-moderation
source:
  - name: Shoshin · compliance-rules (platform compliance rule library — FTC/FCA/MiCA disclosure templates, 10-item checklist)
    url: https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/compliance-rules
---

# Compliance Check Skill

## Scope

This skill gives agents the ability to perform pre-publish compliance reviews covering platform prohibited words, advertising law requirements, and knowledge-IP-specific risk points — and provides an actionable alternative expression for every risk identified.

---

## Compliance Check Process

Every piece of content must complete the following three-layer check before publishing:

1. **Platform prohibited-word check**: words that directly trigger content removal / suppression
2. **Advertising law compliance check**: statements involving promises, data, or comparisons
3. **Knowledge-IP-specific risks**: liability handling for professional-advice content

---

## Layer 1: Platform Prohibited Words (High Risk)

### Absolutely Banned Words (Direct Removal / Account Suspension Risk)

**Political / social**:
- Do not touch politically sensitive topics, religious disputes, or ethnic tensions
- Do not spread rumours or unverified "insider information"

**Health / medical** (common knowledge-IP risk):
- ❌ Banned: cure, completely healed, guaranteed recovery, fix all
- ✅ Alternative: may be helpful, may assist improvement, some users report positive results

**Financial / earnings**:
- ❌ Banned: guaranteed profit, guaranteed returns, zero risk, monthly income of ¥XX k (absolute claims)
- ✅ Alternative: potential opportunity, achievable with effort, reference case study

**Competitor disparagement**:
- ❌ Banned: "[brand / person] is a scam", worst / most terrible
- ✅ Alternative: different paths suit different people — choose what fits you

---

## Layer 2: Advertising Law Compliance (Medium Risk)

### Superlative Words (Violates Advertising Law)
❌ Banned: best, #1, only, top-tier, ultimate, perfect, final, strongest ever
✅ Alternative: leading, effective, in my experience works well, suitable for X scenario

### Absolute Promises
❌ Banned: guaranteed, definitely, certainly, 100% effective
✅ Alternative: most likely, typically, works for most people, based on my actual experience

### Data Usage Standards
- Data must have a cited source (note "Source: [X]")
- Personal experience data must note "personal actual experience; results may vary"
- Income / effect data must include a disclaimer

---

## Layer 3: Knowledge-IP-Specific Risks

### Professional Advice Content
**High-risk domains**: medical health, legal, financial investment, psychological counselling

**Handling rules**:
- Medical: add "This content is for reference only; please consult a qualified medical professional for your specific situation"
- Legal: add "This content is general knowledge sharing and does not constitute legal advice; please consult a lawyer for your specific situation"
- Financial: add "This content does not constitute investment advice; investing carries risk; exercise caution in decision-making"
- Psychological: add "This content is general knowledge sharing; if you have mental health concerns please seek professional help"

### Citing Others' Content
- Must credit the source (book title / author / original link)
- Directly using others' video / image assets is prohibited (copyright risk)
- Data citations require source attribution

### Private-Domain Lead Compliance
- Xiaohongshu: do not directly post WeChat ID; use "DM me" instead
- Douyin: may place contact details in profile bio; in-video copy directs to "find me on my profile"

---

## Compliance Check Output Format

Each check outputs the following conclusion:

```
[Compliance Check Result]
Status: PASS / REVISION NEEDED / HIGH RISK — HOLD

Items requiring revision (if any):
- Original: [original expression]
  Risk: [violation type]
  Alternative: [replacement expression ready to use]

Disclaimer required (if any):
- [Disclaimer text to add at the end of the content]

Final conclusion:
- Ready to publish / Publish after revision / Recommend abandoning this content
```
