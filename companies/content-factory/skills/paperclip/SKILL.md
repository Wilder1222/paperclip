---
name: paperclip
description: Paperclip 平台任务编排、子任务拆解与状态推进能力
tags:
  - paperclip
  - task-management
  - coordination
source:
  - name: paperclipai/paperclip · skills/paperclip（官方 Paperclip 技能：API、Routines、Workflows 参考文档）
    url: https://github.com/paperclipai/paperclip/tree/main/skills/paperclip
---

# Paperclip 任务管理技能

## 能力范围

本技能为 Agent 提供在 Paperclip 控制平面上进行任务编排、子任务拆解和状态推进的操作能力，是所有 Agent 协同工作的基础技能。

---

## 核心操作

### 任务状态推进
- 接到任务后，立即更新状态为"进行中"
- 完成任务后，更新状态并附上产出链接/文档
- 遇到阻塞，更新状态为"阻塞"并注明 **负责人** 和 **所需行动**

### 子任务拆解（长任务必须拆解）
- 预计超过 2 小时的任务必须拆解为子 Issue
- 每个子 Issue 有明确负责人、预计完成时间、验收标准
- 并行可执行的子任务同时创建，不串行等待

### 进度留档
- 每完成一个里程碑，在任务评论中留下进度记录
- 格式：**[时间] 完成：[内容] → 下一步：[行动] → 负责人：[name]**
- 不允许"静默"完成任务（必须有记录）

---

## 内容工厂任务流转规则

### 选题任务流
```
trend-researcher 创建选题池 Issue
→ 完成后：@strategy-lead 审核
→ strategy-lead 审核通过：更新状态"已批准"，分配脚本 Issue 给 script-writer
→ strategy-lead 退回：添加修改批注，重新分配给 trend-researcher
```

### 脚本任务流
```
script-writer 接收脚本任务
→ 完成后：提交脚本包，@strategy-lead 审核
→ strategy-lead 通过：分配制作 Issue 给 video-producer + publisher-operator
→ strategy-lead 退回：添加具体批注，重新分配给 script-writer
```

### 制作发布任务流
```
video-producer 完成制作包
→ 通知 publisher-operator：制作包已就绪
→ publisher-operator 发布：更新发布链接，@growth-analyst 开始监控
→ growth-analyst 收到通知：72 小时后出初步数据报告
```

### 周期性任务
- trend-researcher：每周一自动创建"本周选题池"任务
- growth-analyst：每周五自动创建"本周周报"任务
- publisher-operator：每周日自动创建"下周发布日历"任务

---

## 阻塞处理规范

遇到任何阻塞，必须在 5 分钟内标注：

```
🚫 阻塞
- 阻塞原因：[具体描述]
- 负责人：[需要行动的 Agent 名]
- 所需行动：[具体要做什么]
- 预计解除时间：[如果知道的话]
- 临时替代方案：[如果有的话]
```

不允许"静默等待"阻塞，必须主动触发责任人。

---

## 预算与资源边界

- 每个任务开始前确认当前预算状态
- 不得擅自超出分配预算
- 如需追加资源，创建一个"资源追加申请"子 Issue 上报给 CEO
- 遇到 pause/cancel 指令立即停止当前工作，保存进度快照
