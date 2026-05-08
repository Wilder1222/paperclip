# 产品规划审阅 — 2026-05-07

> 基于对项目目标文档、发布记录和 Roadmap 的系统性审阅，梳理当前实现状态并规划下一步产品功能。

---

## 项目定位

Paperclip 是**自主 AI 公司的控制平面**——管理公司、组织架构、AI Agent 员工、任务/Issues、预算、心跳调度和看板治理。

核心原则：它是 AI 公司的操作系统，自己不运行 Agent，而是编排 Agent。Agent 在各自环境中运行并向控制平面汇报。

---

## 已完成的 V1 功能（截至 v2026.428.0）

### 核心控制平面

| 模块 | 状态 | 关键发布版本 |
|---|---|---|
| 公司生命周期 CRUD | ✅ 完成 | 基线已有 |
| Agent 管理 + 组织树 | ✅ 完成 | v2026.403 |
| Issues/任务体系（父子/阻断/单一分配人/子树） | ✅ 完成 | v2026.416 |
| Heartbeat 调度 + 取消 + 活性续接 | ✅ 完成 | v2026.427 |
| 预算硬停 + 支出追踪 | ✅ 完成 | v2026.403 |
| 活动日志（审计） | ✅ 完成 | 基线已有 |
| Agent API 密钥（哈希存储）| ✅ 完成 | 基线已有 |
| Board 审批工作流（多阶段签核） | ✅ 完成 | v2026.416 |
| 插件系统 + 外部 Adapter 动态加载 | ✅ 完成 | v2026.416 |
| 多人类用户 + 邀请流 + 公司成员权限 | ✅ 完成 | v2026.427 |
| 定时例程 (Routines) | ✅ 完成 | v2026.403 |
| 技能管理器 (Skills Manager) | ✅ 完成 | v2026.416 |
| Issue 聊天线程（assistant-ui 渲染） | ✅ 完成 | v2026.416 |
| 结构化线程交互（提案/表单/确认卡片） | ✅ 完成 | v2026.427 |
| 运行时恢复 + Watchdog + 活性检测 | ✅ 完成 | v2026.427 |
| 子 Issue 工作流清单（依赖感知） | ✅ 完成 | v2026.427 |
| Issue 子树暂停/取消/恢复 | ✅ 完成 | v2026.427 |
| 生产力审查服务（停滞/高翻腾检测） | ✅ 完成 | v2026.428 |
| Issue 全文搜索（三元索引） | ✅ 完成 | v2026.416 |
| Issue 交叉引用关系（反向链接） | ✅ 完成 | v2026.427 |
| 公司导入/导出（CLI + portability 合约） | ✅ 完成 | v2026.403 |

### Beta 功能（已上线，稳定性待验证）

| 模块 | 状态 | 说明 |
|---|---|---|
| 环境系统 + e2b 沙箱 Provider | 🔶 Beta | v2026.427，环境租约生命周期，插件化 Provider |
| MCP Server (`@paperclipai/mcp-server`) | 🔶 Beta | v2026.416，将 Paperclip API 暴露为 MCP 工具 |
| 执行工作空间 (Execution Workspaces) | 🔶 Beta | v2026.403，工作区生命周期管理 |

---

## Roadmap 待完成项分析

### 优先级 1 — 近期高价值

#### 1. Artifacts & Work Products（制品与工作产出）
- **当前缺口**：Agent 运行的输出文件、文档、预览链接不是一等公民；工作"完成"仅停留在状态变更
- **产品价值**：`PRODUCT.md` 明确要求"Output-first"——工作完成的标志是可见结果
- **工作范围**：
  - 新增 `work_products` 表（附着在 Issue 上，支持 file/link/preview-url 三种类型）
  - Agent API：`POST /issues/:id/work-products`
  - Board UI：Issue 详情侧边栏展示工作产出列表
  - 与现有附件系统集成（`attachment_max_bytes` 已有限额）

#### 2. Deep Planning（深度规划）
- **当前缺口**：Issue 有描述字段，但缺乏可修订的计划文档和执行前审查循环
- **产品价值**：战略型工作需要 Agent 在执行前明确规划，防止方向偏差；支撑更高自主度的安全运营
- **工作范围**：
  - Issue 文档支持"计划"类型，带审批门控（执行前需 Board 批准）
  - 复用现有 document revision 系统（v2026.403 已有基础）
  - Agent API 支持提交计划并请求审批

#### 3. CEO Chat（CEO 对话入口）
- **当前缺口**：与 Agent 的交互通过 Issue 评论，缺乏轻量对话入口；运营摩擦较高
- **产品价值**：降低操作摩擦，同时保持"对话仍附着于工作对象"的原则
- **工作范围**：
  - 复用 v2026.427 已有的结构化线程交互基础
  - 对话 → Issue/Approval/Decision 对象的解析层
  - Board UI：公司/Agent 维度的轻量对话入口

---

### 优先级 2 — 中期

#### 4. Memory / Knowledge（记忆与知识库）
- **规划文档**：`doc/plans/2026-03-17-memory-service-surface-api.md` 已有方案
- **工作范围**：Agent 级别的持久记忆 API，公司/项目级别的知识沉淀，与 Issue 上下文集成
- **注意边界**：不演变为通用聊天应用；记忆附着于工作对象，而非独立知识库

#### 5. Enforced Outcomes（强制结果验收）
- **当前缺口**：任务完成停留在状态更新，没有验证合并代码/发布产物等真实结果
- **工作范围**：
  - GitHub PR merge → Issue 自动完成的 webhook 钩子
  - 结果验收 schema 设计（merged_pr / published_artifact / deployed_url 等类型）
  - 与 `work_products` 联动（Artifacts 落地后的自然延伸）

#### 6. Work Queues（工作队列）
- **当前缺口**：周期性工作通过 Routines，但缺乏持续流入的工作流（如支持/分诊）
- **工作范围**：队列定义 + 路由规则 + Agent 消费端 API

---

### 优先级 3 — 长期战略方向

| 方向 | 说明 | 前置依赖 |
|---|---|---|
| MAXIMIZER MODE | 高自主度执行循环，更激进的委派 | 治理层需先稳定 |
| Self-Organization | Agent 提议组织结构调整 | 审批门控需成熟 |
| Automatic Organizational Learning | 自动提取复盘/Playbook | Memory Service 先行 |
| Cloud Deployments | 共享托管模式 | 本地优先已验证 |
| Desktop App | 可访问性改善 | 核心功能稳定后 |

---

## 下一步执行任务清单

### Sprint 1（当前周期）

- [ ] 推进 Environments/e2b 沙箱从 Beta → Stable
  - 清理 API 边界，补充文档
  - 扩展沙箱 Provider 插件合约说明
- [ ] Artifacts & Work Products — 数据模型设计
  - 定义 `work_products` 表 schema
  - Agent API 草案
- [ ] Issue 计划文档增强（Deep Planning Phase 1）
  - Issue 文档支持"计划"类型
  - 执行前审批门控 API

### Sprint 2

- [ ] Artifacts & Work Products — UI 实现
  - Board Issue 详情侧边栏产出列表
  - 上传/链接/预览 URL 三种类型
- [ ] Memory Service MVP
  - 推进 `doc/plans/2026-03-17-memory-service-surface-api.md` 中的方案
- [ ] CEO Chat 轻量入口原型

### Sprint 3+

- [ ] Enforced Outcomes — GitHub webhook 集成
- [ ] Work Queues — 队列定义与路由
- [ ] Deep Planning Phase 2 — 可修订计划文档 + 修订历史

---

## 技术债和风险点

| 项目 | 风险等级 | 说明 |
|---|---|---|
| `feat/externalize-hermes-adapter`（fork 分支） | 中 | 需与上游 plugin-loader 保持对齐 |
| e2b 环境系统 Beta | 中 | API 稳定性待观察，环境租约泄漏需关注 |
| 生产力审查服务阈值 | 低 | v2026.428 新增，需观察误报率并调优 |
| 环境变量 `PAPERCLIP_AGENT_JWT_SECRET` | 低 | v2026.416 已修复硬编码，需确认所有部署已更新 |

---

*文档生成日期：2026-05-07*  
*基于版本：v2026.428.0（最新稳定版）*
