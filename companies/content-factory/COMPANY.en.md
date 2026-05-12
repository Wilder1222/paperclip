---
name: Content Factory
description: A knowledge-IP-first AI agent company that runs a pipeline workflow on Douyin and Xiaohongshu, building sustainable professional influence and monetising it through paid knowledge products
slug: content-factory
schema: agentcompanies/v1
version: 2.0.0
license: MIT
authors:
  - name: Wilder1222
tags:
  - personal-ip
  - knowledge-creator
  - social-media
  - douyin
  - xiaohongshu
  - pipeline
references:
  - name: Shoshin (multi-niche short-form content engine)
    url: https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin
  - name: Loopy AI (creative content generation company)
    url: https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai
mission: >
  Build a sustainably growing knowledge-based personal IP, accumulate professional
  influence through a dual-platform content matrix, and create a complete monetisation
  loop from content exposure → audience trust → paid knowledge products.
goals:
  - Become a top knowledge IP on Douyin + Xiaohongshu in the chosen vertical (90-day foundation)
  - Publish 20 pieces of dual-platform content per week with a viral rate ≥ 15%
  - Establish a paid-knowledge conversion path (community / consulting / course)
  - Net +20 k followers across both platforms within 90 days
---

# Content Factory

## Strategic Mission

> **Build a sustainably growing knowledge-based personal IP, accumulate professional influence through a dual-platform content matrix, and create a complete monetisation loop from content exposure to paid knowledge products.**

This company exists not merely to publish content but to **establish an authentic, trustworthy professional persona (IP)**. Content is the means; influence is the moat; paid knowledge products are the monetisation exit.

### Mission Breakdown

| Layer | Goal | Description |
|-------|------|-------------|
| **Mission layer** | Knowledge-based personal IP | Become the trusted expert voice in a vertical |
| **Brand layer** | Dual-platform professional image | Douyin for rapid recognition; Xiaohongshu for deep-rooted reputation |
| **Content layer** | 20-piece-per-week pipeline | Consistent supply is the foundation of trust with both algorithm and audience |
| **Monetisation layer** | Paid knowledge product loop | Content → DM → paid consulting / community / course |

---

## 90-Day OKRs

### Objective: Become a top knowledge IP on Douyin + Xiaohongshu in the chosen vertical

| KR | Metric | 90-Day Target |
|----|--------|--------------|
| KR1 (Growth) | Net new followers across both platforms | 20 k (Douyin + Xiaohongshu combined) |
| KR2 (Output) | Pieces published per week | 20 / week (short video + graphics mix) |
| KR3 (Quality) | Viral rate | ≥ 15% (pieces that hit the account's viral threshold) |
| KR4 (Monetisation) | Paid-knowledge conversion path | At least 1 live path (consulting / community / course) |

---

## Core Architecture

### Organisational Design Principles

The company uses a **project-based + pipeline + dual reporting-line** architecture:
- **Project operating line** (CEO-owned): platform operations and IP building are organised and executed by projects, with resources and cadence managed per project goals
- **Content production line** (strategy-lead owns): Topic → Script → Production, three roles in parallel with strategy-lead as the quality gate
- **Operations decision line** (CEO owns): Publishing, data, and strategy — three roles report directly to the CEO

```
                    ┌─────────────────────┐
                    │         CEO         │  Head of Content Company
                    │  Strategy · OKR Hub │  reportsTo: null
                    └──────────┬──────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   ┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐
   │  Strategy Lead   │  │  Publisher   │  │   Growth Analyst   │
   │ Content Strategy │  │  Operator    │  │  Data & Iteration  │
   └────────┬─────────┘  │  Publishing  │  └────────────────────┘
     ┌──────┼──────┐     └──────────────┘
     ▼      ▼      ▼
 ┌───────┐┌──────┐┌───────────┐
 │Trend  ││Script││  Video    │
 │Resear.││Writer││ Producer  │
 └───────┘└──────┘└───────────┘
```

### Team Notes

**Content Production Team** (managed by strategy-lead)
- Owns the full content production chain: trend research → script → production spec
- Main work window: Monday to Thursday
- Four roles in sync; strategy-lead is the quality gate

**Operations Decision Team** (CEO direct reports)
- publisher-operator: executes publishing, maintains content calendar, posts first comments
- growth-analyst: monitors data, runs periodic reviews, delivers keep/stop/try recommendations
- Friday is the review checkpoint; growth-analyst → CEO → strategy-lead forms the strategy feedback loop

---

## 7 Core Agents

| Agent | Role | Core Responsibility | Reports To | File |
|-------|------|---------------------|------------|------|
| **ceo** | Head of Content Company | Strategic decisions, OKR progress, global coordination | — | [agents/ceo](./agents/ceo/AGENTS.en.md) |
| **strategy-lead** | Content Strategy & Topic Lead | Topic approval, pipeline quality gate, content methodology | ceo | [agents/strategy-lead](./agents/strategy-lead/AGENTS.en.md) |
| **trend-researcher** | Trend & Competitor Researcher | Dual-platform trend capture, competitor analysis, weekly topic pool of 50 | strategy-lead | [agents/trend-researcher](./agents/trend-researcher/AGENTS.en.md) |
| **script-writer** | Script & Copywriter | Hook ×3 + body + engagement question + CTA; dual-platform script package | strategy-lead | [agents/script-writer](./agents/script-writer/AGENTS.en.md) |
| **video-producer** | Video/Graphics Production Spec Specialist | Shot list + editing instructions + cover copy; zero-communication production package | strategy-lead | [agents/video-producer](./agents/video-producer/AGENTS.en.md) |
| **publisher-operator** | Publishing & Scheduling Operator | Dual-platform publishing, hashtag strategy, A/B titles, first-comment operations | ceo | [agents/publisher-operator](./agents/publisher-operator/AGENTS.en.md) |
| **growth-analyst** | Data Analyst & Iteration Specialist | Weekly report + viral breakdown + keep/stop/try strategy | ceo | [agents/growth-analyst](./agents/growth-analyst/AGENTS.en.md) |

---

## 10 Core Skills

All skills are designed with reference to public GitHub examples; see each skill file for sources:

| Skill | Description | Reference Source |
|-------|-------------|-----------------|
| [brand-voice-system](./skills/brand-voice-system/SKILL.en.md) | IP voice system: tone axes, platform differentiation, prohibited expressions | [00PZ/oopz-inc · brand-voice-system](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/brand-voice-system) |
| [audience-profiles](./skills/audience-profiles/SKILL.en.md) | Audience personas: pain points, desires, consumption habits, platform distribution | [00PZ/oopz-inc · audience-profiles](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/audience-profiles) |
| [hook-writing](./skills/hook-writing/SKILL.en.md) | 20+ hook pattern library categorised by psychological trigger | [00PZ/oopz-inc · hooks-library](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/hooks-library) |
| [content-research](./skills/content-research/SKILL.en.md) | Trend capture, competitor analysis, keyword clustering | [Construct-AI-primary · agent-companies-core](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai) |
| [platform-playbook](./skills/platform-playbook/SKILL.en.md) | Douyin/Xiaohongshu algorithm, rules, content structure | [00PZ/oopz-inc · tiktok-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/tiktok-playbook) + [instagram-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/instagram-playbook) |
| [script-production](./skills/script-production/SKILL.en.md) | Voiceover scripts, graphic copy, storyboard templates | [00PZ/oopz-inc · content-types](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-types) |
| [publishing-ops](./skills/publishing-ops/SKILL.en.md) | Optimal timing, hashtag strategy, A/B testing, first-comment operations | [00PZ/oopz-inc · content-calendar](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-calendar) |
| [analytics-review](./skills/analytics-review/SKILL.en.md) | Core metric system, keep/stop/try review framework, viral breakdown | [00PZ/oopz-inc · analyst agent](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/analyst) |
| [compliance-check](./skills/compliance-check/SKILL.en.md) | Platform prohibited words, advertising law compliance, knowledge-IP-specific risks | [00PZ/oopz-inc · compliance-rules](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/compliance-rules) |
| [paperclip](./skills/paperclip/SKILL.en.md) | Task orchestration, sub-task decomposition, status progression | [paperclipai/paperclip · skills/paperclip](https://github.com/paperclipai/paperclip/tree/main/skills/paperclip) |

---

## Content Production Pipeline

```
Input: Business goals + Account positioning + Asset library
         ↓
[Stage 1 – Every Monday] Topic Selection
  trend-researcher produces "Topic Pool (50 items)"
  → strategy-lead reviews; selects 20; issues "Topic Decision Table"
         ↓
[Stage 2 – Every Tuesday] Scripting
  script-writer produces "Script Package" (hook ×3 / body / engagement Q / CTA)
  → strategy-lead reviews within 24 h
         ↓
[Stage 3 – Tuesday–Thursday] Production
  video-producer produces "Production Package" (shot list / editing instructions / cover copy)
  → publisher-operator receives and queues for publishing
         ↓
[Stage 4 – Thursday–Friday] Publishing
  publisher-operator publishes per platform standards + hashtags + first-comment operations
         ↓
[Stage 5 – Every Friday] Review
  growth-analyst produces "Weekly Report + Viral Breakdown + Keep/Stop/Try Strategy"
  → ceo + strategy-lead receive; drives next-week iteration
```

---

## Architecture References

This company's design draws on the following open-source examples:

- **Shoshin** (multi-niche short-form content engine): [00PZ/oopz-inc](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin)
  — multi-platform parallel publishing architecture, dynamic hooks-library iteration, brand-voice-system design
- **Loopy AI** (creative content generation company): [Construct-AI-primary/agent-companies-core](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai)
  — content-strategist + deep-researcher + marketing-specialist triangle collaboration pattern
