# Content Factory

> **Strategic Mission: Build a sustainably growing knowledge-based personal IP, accumulate professional influence through a dual-platform content matrix, and create a complete monetisation loop from content exposure to paid knowledge products.**

An AI-agent-driven knowledge-IP content company covering Douyin + Xiaohongshu; it operates as a social-media operations company where platform operations and IP building are organised by projects, with content produced through a standardised pipeline and iterated through data.

## Strategic Mission

This company exists not merely to publish content but to **establish an authentic, trustworthy professional persona (IP)**.

| Layer | Goal |
|-------|------|
| Mission | Build a knowledge-based personal IP — become the trusted expert voice in the vertical |
| Brand | Dual-platform professional image (rapid recognition on Douyin + deep reputation on Xiaohongshu) |
| Content | 20-piece-per-week pipeline — consistent supply is the foundation of trust with algorithm and audience |
| Monetisation | Content → DM → paid consulting / community / course |

## 90-Day OKRs

| KR | Metric | Target |
|----|--------|--------|
| KR1 (Growth) | Net new followers across both platforms | 20 k |
| KR2 (Output) | Pieces published per week | 20 / week |
| KR3 (Quality) | Viral rate | ≥ 15% |
| KR4 (Monetisation) | Paid-knowledge path | At least 1 live |

---

## Org Structure

```
                    ┌─────────────────────┐
                    │         CEO         │
                    └──────────┬──────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   ┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐
   │  Strategy Lead   │  │  Publisher   │  │   Growth Analyst   │
   └────────┬─────────┘  │  Operator    │  └────────────────────┘
     ┌──────┼──────┐     └──────────────┘
     ▼      ▼      ▼
 ┌───────┐┌──────┐┌───────────┐
 │Trend  ││Script││  Video    │
 │Resear.││Writer││ Producer  │
 └───────┘└──────┘└───────────┘
```

### Project-Based Operating Principles

- The company uses projects as the primary operating unit for platform operations and IP building (e.g. cold-start growth, pipeline standardisation)
- Each project has clear goals, owners, milestones, and review checkpoints for cross-role delivery

---

## Agents

| Agent | Role | Reports To | Core Skills |
|-------|------|------------|-------------|
| **ceo** | Head of Content Company | — | paperclip, brand-voice-system, audience-profiles |
| **strategy-lead** | Content Strategy & Topic Lead | ceo | content-research, platform-playbook, hook-writing, brand-voice-system, audience-profiles, paperclip |
| **trend-researcher** | Trend & Competitor Researcher | strategy-lead | content-research, platform-playbook, audience-profiles, paperclip |
| **script-writer** | Script & Copywriter | strategy-lead | hook-writing, script-production, brand-voice-system, audience-profiles, compliance-check, paperclip |
| **video-producer** | Video/Graphics Production Spec Specialist | strategy-lead | script-production, platform-playbook, brand-voice-system, paperclip |
| **publisher-operator** | Publishing & Scheduling Operator | ceo | publishing-ops, platform-playbook, compliance-check, paperclip |
| **growth-analyst** | Data Analyst & Iteration Specialist | ceo | analytics-review, audience-profiles, paperclip |

### Reporting Structure

```
CEO
├── Strategy Lead
│   ├── Trend Researcher
│   ├── Script Writer
│   └── Video Producer
├── Publisher Operator
└── Growth Analyst
```

---

## Skills (with GitHub Sources)

| Skill | Description | GitHub Source |
|-------|-------------|--------------|
| `brand-voice-system` | IP voice system: tone axes, platform differentiation, prohibited expressions | [Shoshin · brand-voice-system](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/brand-voice-system) |
| `audience-profiles` | Audience personas: pain-point map, desire vocabulary, dual-platform behaviour | [Shoshin · audience-profiles](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/audience-profiles) |
| `hook-writing` | 20+ hook patterns categorised by psychological trigger | [Shoshin · hooks-library](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/hooks-library) |
| `content-research` | Trend capture, competitor analysis, keyword clustering | [Shoshin · intelligence-seed](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/intelligence-seed) |
| `platform-playbook` | Douyin/Xiaohongshu algorithm, rules, content structure | [Shoshin · tiktok-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/tiktok-playbook) + [instagram-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/instagram-playbook) |
| `script-production` | Voiceover scripts, graphic copy, storyboard templates | [Shoshin · content-types](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-types) + [repurpose-engine](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/repurpose-engine) |
| `publishing-ops` | Optimal timing, hashtag strategy, A/B testing, first-comment ops | [Shoshin · content-calendar](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-calendar) |
| `analytics-review` | Core metric system, keep/stop/try review, viral breakdown | [Shoshin · analyst agent](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/analyst) |
| `compliance-check` | Prohibited words, advertising law, knowledge-IP-specific compliance | [Shoshin · compliance-rules](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/compliance-rules) |
| `paperclip` | Task orchestration, sub-task decomposition, status progression | [paperclipai/paperclip · skills/paperclip](https://github.com/paperclipai/paperclip/tree/main/skills/paperclip) |

### Agent Reference Sources

All agent designs reference the following open-source company packages:

| Agent | GitHub Reference |
|-------|-----------------|
| ceo | [Loopy AI · vision-loopy-ceo](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai) · [Shoshin · chief-of-staff](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/chief-of-staff) |
| strategy-lead | [Shoshin · strategist](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/strategist) · [Loopy AI · maya-loopy-content-strategist](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai) |
| trend-researcher | [Shoshin · scout](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/scout) · [Shoshin · researcher](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/researcher) |
| script-writer | [Shoshin · writer](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/writer) |
| video-producer | [Shoshin · content-types](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-types) · [repurpose-engine](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/repurpose-engine) |
| publisher-operator | [Shoshin · scheduler](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/scheduler) |
| growth-analyst | [Shoshin · analyst](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/analyst) |

---

## Projects & Tasks

### Project 1: Cold-Start Growth (`cold-start-growth`)

Launch phase (two weeks) — build content production capability from zero:

1. **Account Positioning Document** (strategy-lead) → CEO approval
2. **First Topic Pool of 50** (trend-researcher) → strategy-lead review
3. **First 10 Pieces — Full Pipeline Production & Publishing** (all agents)
4. **Week-1 Data Review** (growth-analyst) → iteration strategy

### Project 2: Pipeline Standardisation (`content-factory-v1`)

Consolidation phase — solidify validated processes into SOPs:

1. **Prompt Template Library** (strategy-lead)
2. **Publishing SOP Document** (publisher-operator)
3. **Review SOP Document** (growth-analyst)
4. **Content Quality Scorecard** (strategy-lead)

### Recurring Tasks

- **Every Monday 09:00 CST**: trend-researcher auto-triggers topic pool production
- **Every Friday 14:00 CST**: growth-analyst auto-triggers weekly report production

---

## Quick Start

### Import to Paperclip

```bash
paperclipai company import --from ./companies/content-factory
```

### Setup Steps

1. **Import company package** — run the command above
2. **Create account positioning document** — assign task to strategy-lead
3. **Configure account credentials** — add platform account details in publisher-operator's Agent settings
4. **Launch cold-start project** — activate the first task of `cold-start-growth`

---

## Reference Links

- [Agent Companies Specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)
