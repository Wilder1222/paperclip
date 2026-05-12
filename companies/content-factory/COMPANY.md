---
name: 自媒体内容工厂
description: AI 独立开发者个人 IP 公司——以 AI 独立开发者身份，通过 AI Agent 驱动的流水线工作流，在抖音、小红书双平台持续分享 AI 相关内容、知识与实践经验，积累双平台粉丝与专业影响力
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
  - ai
  - indie-developer
references:
  - name: Shoshin（多话题短视频内容引擎）
    url: https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin
  - name: Loopy AI（创意内容生成公司）
    url: https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai
mission: >
  以 AI 独立开发者身份建立可持续增长的知识型个人 IP，通过双平台内容矩阵持续分享 AI 相关内容、
  知识与实践经验，积累专业影响力，建立受众信任基础，实现双平台粉丝持续增长。
goals:
  - 成为 AI 独立开发者垂直领域抖音 + 小红书头部知识 IP（90 天基础期）
  - 每周 20 条双平台 AI 内容（工具测评/实践经验/知识科普），爆款率 ≥ 15%
  - 90 天内双平台粉丝净增 20k
---

# 自媒体内容工厂

## 战略使命

> **以 AI 独立开发者身份建立可持续增长的知识型个人 IP，通过双平台内容矩阵持续分享 AI 相关内容、知识与实践经验，积累专业影响力，建立受众信任基础，实现双平台粉丝持续增长。**

本公司的存在不是为了发内容，而是为了**建立一个真实的、可信任的 AI 独立开发者专业人格（IP）**。内容是手段，影响力是护城河，粉丝增长是核心目标。

### 使命拆解

| 层次 | 目标 | 说明 |
|------|------|------|
| **使命层** | 知识型个人 IP 建立 | 在垂直领域成为受众信任的专家声音 |
| **品牌层** | 双平台专业形象 | 抖音建立快速认知，小红书沉淀深度口碑 |
| **内容层** | 每周 20 条内容流水线 | 稳定供给是算法和受众双重信任的基础 |
| **增长层** | 双平台粉丝持续增长 | 内容曝光 → 受众信任 → 粉丝积累 |

---

## 90 天 OKR

### Objective：成为 AI 独立开发者垂直领域抖音 + 小红书头部知识 IP

| KR | 指标 | 90 天目标 |
|----|------|---------|
| KR1（增长） | 双平台粉丝净增 | 20k（抖音 + 小红书合计） |
| KR2（产能） | 每周稳定发布内容条数 | 20 条/周（短视频 + 图文混合） |
| KR3（质量） | 内容爆款率 | ≥ 15%（达到账号爆款阈值的内容比例） |

---

## 公司核心架构

### 组织设计原则

本公司采用**项目制 + 流水线 + 双线汇报**架构：
- **项目组织线**（ceo 统筹）：具体平台运营与 IP 打造按项目编组推进，按项目目标分配资源与节奏
- **内容生产线**（strategy-lead 统筹）：选题 → 脚本 → 制作，三岗并行，strategy-lead 担任质量门
- **运营决策线**（ceo 统筹）：发布、数据、战略，三岗直接汇报 CEO

```
                    ┌─────────────────────┐
                    │         CEO         │  内容公司负责人
                    │  战略决策 · OKR 看板  │  reportsTo: null
                    └──────────┬──────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   ┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐
   │  Strategy Lead   │  │  Publisher   │  │   Growth Analyst   │
   │ 内容战略与选题负责人 │  │  Operator    │  │  数据分析与复盘迭代  │
   └────────┬─────────┘  │ 发布与排期运营  │  └────────────────────┘
     ┌──────┼──────┐     └──────────────┘
     ▼      ▼      ▼
 ┌───────┐┌──────┐┌───────────┐
 │Trend  ││Script││  Video    │
 │Resear.││Writer││ Producer  │
 │选题研究││脚本文案││制作说明专员│
 └───────┘└──────┘└───────────┘
```

### 团队说明

**内容生产团队**（strategy-lead 管理）
- 负责完整内容生产链路：热点研究 → 脚本创作 → 制作说明
- 每周一到周四为主要工作窗口
- 四岗协同，strategy-lead 为质量审核门

**运营决策团队**（ceo 直管）
- publisher-operator：执行发布，维护内容日历，首评运营
- growth-analyst：数据监控，周期复盘，三分法策略建议
- 每周五为复盘节点，growth-analyst → CEO → strategy-lead 形成策略闭环

---

## 7 个核心 Agent

| Agent | 中文职位 | 核心职责 | 汇报对象 | Agent 文件 |
|-------|---------|---------|---------|-----------|
| **ceo** | 内容公司负责人 | 战略决策、OKR 推进、全局调度 | — | [agents/ceo](./agents/ceo/AGENTS.md) |
| **strategy-lead** | 内容战略与选题负责人 | 选题审核、流水线质量门、内容方法论 | ceo | [agents/strategy-lead](./agents/strategy-lead/AGENTS.md) |
| **trend-researcher** | 热点与竞品研究员 | 双平台热点抓取、竞品拆解、每周 50 条选题池 | strategy-lead | [agents/trend-researcher](./agents/trend-researcher/AGENTS.md) |
| **script-writer** | 脚本与文案创作者 | 钩子×3 + 正文 + 互动问题 + CTA，双平台适配脚本包 | strategy-lead | [agents/script-writer](./agents/script-writer/AGENTS.md) |
| **video-producer** | 视频/图文制作说明专员 | 拍摄清单 + 剪辑指令 + 封面文案，零沟通成本制作包 | strategy-lead | [agents/video-producer](./agents/video-producer/AGENTS.md) |
| **publisher-operator** | 发布与排期运营专员 | 双平台发布、标签策略、A/B 标题、首评运营 | ceo | [agents/publisher-operator](./agents/publisher-operator/AGENTS.md) |
| **growth-analyst** | 数据分析与复盘迭代专员 | 周报 + 爆款拆解 + "继续/停止/实验"三分法策略 | ceo | [agents/growth-analyst](./agents/growth-analyst/AGENTS.md) |

---

## 10 个核心 Skill

所有技能均参考公开 GitHub 优秀案例设计，来源见各技能文件：

| Skill | 说明 | 参考来源 |
|-------|------|---------|
| [brand-voice-system](./skills/brand-voice-system/SKILL.md) | IP 声音体系：语气轴、平台差异化、禁止表达 | [00PZ/oopz-inc · brand-voice-system](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/brand-voice-system) |
| [audience-profiles](./skills/audience-profiles/SKILL.md) | 受众画像：痛点、欲望、消费习惯、平台分布 | [00PZ/oopz-inc · audience-profiles](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/audience-profiles) |
| [hook-writing](./skills/hook-writing/SKILL.md) | 20+ 钩子模式库，按心理触发类型分类 | [00PZ/oopz-inc · hooks-library](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/hooks-library) |
| [content-research](./skills/content-research/SKILL.md) | 热点抓取、竞品拆解、关键词聚类 | [Construct-AI-primary · creative-content-generation](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai) |
| [platform-playbook](./skills/platform-playbook/SKILL.md) | 抖音/小红书算法、规则、内容结构 | [00PZ/oopz-inc · tiktok-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/tiktok-playbook) + [instagram-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/instagram-playbook) |
| [script-production](./skills/script-production/SKILL.md) | 口播脚本、图文文案、分镜文档模板 | [00PZ/oopz-inc · content-types](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-types) |
| [publishing-ops](./skills/publishing-ops/SKILL.md) | 最优时段、标签策略、A/B 测试、首评运营 | [00PZ/oopz-inc · content-calendar](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-calendar) |
| [analytics-review](./skills/analytics-review/SKILL.md) | 核心指标体系、三分法复盘框架、爆款拆解 | [00PZ/oopz-inc · analyst agent pattern](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/analyst) |
| [compliance-check](./skills/compliance-check/SKILL.md) | 平台违禁词、广告法合规、知识 IP 特殊风险 | [00PZ/oopz-inc · compliance-rules](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/compliance-rules) |
| [paperclip](./skills/paperclip/SKILL.md) | 任务编排、子任务拆解、状态推进 | [paperclipai/paperclip · skills/paperclip](https://github.com/paperclipai/paperclip/tree/main/skills/paperclip) |

---

## 内容生产流水线

```
输入：业务目标 + 账号定位 + 素材库
         ↓
[阶段1 每周一] 选题
  trend-researcher 产出《选题池（50 条）》
  → strategy-lead 审核，圈定 20 条，下发《选题决策表》
         ↓
[阶段2 每周二] 脚本
  script-writer 产出《脚本包》（钩子×3 / 正文 / 互动问题 / CTA）
  → strategy-lead 24h 内审核
         ↓
[阶段3 每周二~四] 制作
  video-producer 产出《制作包》（拍摄清单 / 剪辑指令 / 封面文案）
  → publisher-operator 接收并入发布队列
         ↓
[阶段4 每周四~五] 发布
  publisher-operator 按平台规范发布 + 打标签 + 首评运营
         ↓
[阶段5 每周五] 复盘
  growth-analyst 产出《周报 + 爆款拆解 + 三分法策略》
  → ceo + strategy-lead 接收，驱动下周迭代
```

---

## 架构参考

本公司架构设计参考了以下公开优秀案例：

- **Shoshin**（多话题短视频内容引擎）：[00PZ/oopz-inc](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin)
  — 多平台并行发布架构、hooks-library 动态迭代机制、brand-voice-system 设计
- **Loopy AI**（创意内容生成公司）：[Construct-AI-primary/agent-companies-core](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai)
  — 内容策略师 + 深度研究员 + 营销专员的三角配合模式
