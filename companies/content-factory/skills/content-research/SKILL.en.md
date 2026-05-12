---
name: content-research
description: Trend capture, competitor analysis, and keyword-clustering capability for producing an executable topic pool
tags:
  - research
  - social-media
  - content
source:
  - name: Shoshin · intelligence-seed (trending intelligence seeds, weekly external knowledge-source refresh)
    url: https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/intelligence-seed
  - name: Loopy AI · creative-content-generation (creative content research and generation capability)
    url: https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai
  - name: Shoshin · knowledge-base (structured knowledge base supporting competitor and topic research)
    url: https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/knowledge-base
---

# Content Research Skill

## Scope

This skill gives agents the ability to systematically research content directions, including:

1. **Trend monitoring**: Capture real-time trends from Douyin trending charts, Xiaohongshu discovery feed, Weibo top trending, Baidu Index, etc.; identify trend lifecycle (rising / peak / declining)
2. **Competitor analysis**: Analyse high-view content from top accounts in the same vertical; extract topic patterns, hook patterns, content structures
3. **Keyword clustering**: Build and maintain a keyword library in three categories — pain-point words / desire words / situational words

## Topic Evaluation Framework

Every candidate topic must be evaluated on the following dimensions:

| Dimension | Evaluation Question | Output Format |
|-----------|-------------------|---------------|
| Audience pain point | What is the target user's most genuine frustration / desire? | 1 precise sentence |
| Platform fit | Better on Douyin (completion-driven) or Xiaohongshu (search + save-driven)? | Choice + 1-sentence reason |
| Content angle | Which angle works best? | Emotional anchor / pain-point reveal / counter-intuitive / dry-goods list / story narrative |
| Source | Where does the data / case study come from? | Trending keyword / competitor example / industry data / original angle |
| Risk | Compliance risk / platform suppression risk / audience aversion risk? | "None" if none; provide alternative if present |
| Completion-rate prediction | Based on historical data from similar content | High / Medium / Low |

## Competitor Analysis Template

```
Account name:
Platform:
Followers:
Content analysed (title + link / screenshot):
Views / interactions:
Topic angle:
Hook format:
Content structure:
Borrowable elements:
Differentiation opportunity:
```

## Keyword Library Maintenance Rules

- Update once per week; add new entries from trending charts / competitors / high-frequency comment words
- Tag in three categories: pain-point words (user frustration) / desire words (user aspiration) / situational words (usage context)
- Knowledge-IP-specific vocabulary prioritised: [industry terms] / [methodology nouns] / [audience-role words]
- Note each keyword's platform search-volume trend (rising / stable / declining)
