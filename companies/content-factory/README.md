# 自媒体内容工厂

> 一家由 AI Agent 驱动的知识 IP 内容公司，以流水线方式生产双平台（抖音 + 小红书）内容，覆盖选题 → 脚本 → 制作 → 发布 → 复盘全链路。

## 公司简介

自媒体内容工厂是一个完整的 AI 驱动内容团队，专为**知识 IP 账号**打造。7 个核心 Agent 协同运作，按流水线模式每周稳定产出 20 条内容，支撑 90 天内双平台粉丝净增 20k 的战略目标。

**目标平台**：抖音 + 小红书（双平台同权）

**内容方向**：知识 IP（干货输出、专业人设建立、课程/付费社群转化）

---

## 工作流（流水线模式）

```
业务目标 + 账号定位 + 素材库
         ↓
[阶段1 周一] 选题  ── trend-researcher 产出选题池(50条)
         ↓
[阶段2 周二] 审核  ── strategy-lead 圈定20条，下发选题决策表
         ↓
[阶段3 周二~四] 生产  ── script-writer(脚本) + video-producer(制作包) 并行
         ↓
[阶段4 周四~五] 发布  ── publisher-operator 按日历发布 + 首评运营
         ↓
[阶段5 周五] 复盘  ── growth-analyst 周报 → ceo + strategy-lead 策略迭代
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

## 战略目标（90 天）

| 目标 | 描述 | 指标 |
|------|------|------|
| **增长** | 双平台粉丝净增 | 20k（抖音 + 小红书） |
| **产能** | 每周内容产出 | 20 条/周（短视频+图文） |
| **质量** | 内容爆款率 | ≥ 15%（达到账号爆款阈值） |
| **商业化** | 知识 IP 变现闭环 | 建立付费咨询/课程/社群转化路径 |

---

## 技能包

| 技能 | 说明 |
|------|------|
| `content-research` | 热点抓取、竞品拆解、关键词聚类 |
| `platform-playbook` | 抖音/小红书算法、规则、内容结构 |
| `hook-writing` | 6 种钩子类型、标题公式、质量检查 |
| `script-production` | 口播脚本、图文文案、分镜文档模板 |
| `publishing-ops` | 最优时段、标签策略、A/B 测试、首评运营 |
| `analytics-review` | 核心指标体系、三分法复盘、爆款拆解 |
| `compliance-check` | 违禁词、广告法、知识 IP 特殊合规 |
| `paperclip` | 任务编排、子任务拆解、状态推进 |

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
