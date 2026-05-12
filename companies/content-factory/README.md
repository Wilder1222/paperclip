# 自媒体内容工厂

> **战略使命：建立可持续增长的知识型个人 IP，通过双平台内容矩阵积累专业影响力，构建从内容曝光到付费知识产品的变现闭环。**

一家由 AI Agent 驱动的知识 IP 内容公司，覆盖抖音 + 小红书双平台，以流水线方式生产内容，以数据驱动迭代。

## 战略使命

本公司的存在不是为了发内容，而是为了**建立一个真实的、可信任的专业人格（IP）**。

| 层次 | 目标 |
|------|------|
| 使命层 | 知识型个人 IP 建立，在垂直领域成为受众信任的专家声音 |
| 品牌层 | 双平台专业形象（抖音快速认知 + 小红书深度口碑） |
| 内容层 | 每周 20 条内容流水线，稳定供给算法和受众双重信任 |
| 变现层 | 内容→私信→付费咨询/社群/课程 |

## 90 天 OKR

| KR | 指标 | 目标 |
|----|------|------|
| KR1（增长） | 双平台粉丝净增 | 20k |
| KR2（产能） | 每周发布内容 | 20 条/周 |
| KR3（质量） | 爆款率 | ≥ 15% |
| KR4（变现） | 知识付费路径 | 至少 1 条上线 |

---

## 公司架构

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


---

## 组织架构

| Agent | 职务 | 汇报对象 | 核心技能 |
|-------|------|---------|---------|
| **ceo** | 内容公司负责人 | — | paperclip |
| **strategy-lead** | 内容战略与选题负责人 | ceo | content-research, platform-playbook, hook-writing, paperclip |
| **trend-researcher** | 热点与竞品研究员 | strategy-lead | content-research, platform-playbook, paperclip |
| **script-writer** | 脚本与文案创作者 | strategy-lead | hook-writing, script-production, compliance-check, paperclip |
| **video-producer** | 视频/图文制作说明专员 | strategy-lead | script-production, platform-playbook, paperclip |
| **publisher-operator** | 发布与排期运营专员 | ceo | publishing-ops, platform-playbook, compliance-check, paperclip |
| **growth-analyst** | 数据分析与复盘迭代专员 | ceo | analytics-review, paperclip |

### 汇报结构

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

## 技能包（含 GitHub 来源）

| 技能 | 说明 | GitHub 来源 |
|------|------|------------|
| `brand-voice-system` | IP 声音体系：语气轴、平台差异化、禁止表达 | [Shoshin · brand-voice-system](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/brand-voice-system) |
| `audience-profiles` | 受众画像：痛点地图、欲望清单、双平台行为分布 | [Shoshin · audience-profiles](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/audience-profiles) |
| `hook-writing` | 20+ 钩子模式，按心理触发类型分类 | [Shoshin · hooks-library](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/hooks-library) |
| `content-research` | 热点抓取、竞品拆解、关键词聚类 | [Shoshin · intelligence-seed](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/intelligence-seed) |
| `platform-playbook` | 抖音/小红书算法、规则、内容结构 | [Shoshin · tiktok-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/tiktok-playbook) + [instagram-playbook](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/instagram-playbook) |
| `script-production` | 口播脚本、图文文案、分镜文档模板 | [Shoshin · content-types](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-types) + [repurpose-engine](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/repurpose-engine) |
| `publishing-ops` | 最优时段、标签策略、A/B 测试、首评运营 | [Shoshin · content-calendar](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-calendar) |
| `analytics-review` | 核心指标体系、三分法复盘、爆款拆解 | [Shoshin · analyst agent](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/analyst) |
| `compliance-check` | 违禁词、广告法、知识 IP 特殊合规 | [Shoshin · compliance-rules](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/compliance-rules) |
| `paperclip` | 任务编排、子任务拆解、状态推进 | [paperclipai/paperclip · skills/paperclip](https://github.com/paperclipai/paperclip/tree/main/skills/paperclip) |

### Agent 参考来源

所有 Agent 设计均参考以下开源公司包：

| Agent | GitHub 参考 |
|-------|-----------|
| ceo | [Loopy AI · vision-loopy-ceo](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai) · [Shoshin · chief-of-staff](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/chief-of-staff) |
| strategy-lead | [Shoshin · strategist](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/strategist) · [Loopy AI · maya-loopy-content-strategist](https://github.com/Construct-AI-primary/agent-companies-core/tree/main/companies/loopy-ai) |
| trend-researcher | [Shoshin · scout](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/scout) · [Shoshin · researcher](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/researcher) |
| script-writer | [Shoshin · writer](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/writer) |
| video-producer | [Shoshin · content-types](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/content-types) · [repurpose-engine](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/skills/repurpose-engine) |
| publisher-operator | [Shoshin · scheduler](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/scheduler) |
| growth-analyst | [Shoshin · analyst](https://github.com/00PZ/oopz-inc/tree/main/companies/shoshin/agents/analyst) |

---

## 项目与任务

### 项目 1：冷启动增长 (`cold-start-growth`)

启动阶段（两周），从 0 建立内容生产能力：

1. **账号定位文档**（strategy-lead）→ CEO 审批
2. **首批 50 条选题池**（trend-researcher）→ strategy-lead 审核
3. **首批 10 条内容生产与发布**（全流水线）
4. **首周数据复盘**（growth-analyst）→ 输出迭代策略

### 项目 2：生产线标准化 (`content-factory-v1`)

固化阶段，将验证有效的流程沉淀为 SOP：

1. **提示词模板库**（strategy-lead）
2. **发布 SOP 文档**（publisher-operator）
3. **复盘 SOP 文档**（growth-analyst）
4. **内容质量评分表**（strategy-lead）

### 周期性任务

- **每周一 09:00**：trend-researcher 自动启动选题池生产
- **每周五 14:00**：growth-analyst 自动启动周报生产

---

## 快速开始

### 导入到 Paperclip

```bash
paperclipai company import --from ./companies/content-factory
```

### 启动步骤

1. **导入公司包**：运行以上命令
2. **创建账号定位文档**：将任务分配给 strategy-lead
3. **配置账号信息**：在 publisher-operator 的 Agent 设置中添加平台账号信息
4. **启动冷启动项目**：激活 `cold-start-growth` 项目的第一个任务

---

## 参考链接

- [Agent Companies Specification](https://agentcompanies.io/specification)
- [Paperclip](https://github.com/paperclipai/paperclip)
