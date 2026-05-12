---
name: paperclip
description: Paperclip platform task orchestration, sub-task decomposition, and status-progression capability
tags:
  - paperclip
  - task-management
  - coordination
source:
  - name: paperclipai/paperclip · skills/paperclip (official Paperclip skill — API, Routines, Workflows reference docs)
    url: https://github.com/paperclipai/paperclip/tree/main/skills/paperclip
---

# Paperclip Task Management Skill

## Scope

This skill gives agents the ability to orchestrate tasks, decompose sub-tasks, and progress statuses on the Paperclip control plane — the foundational skill for all agent collaboration.

---

## Core Operations

### Task Status Progression
- After receiving a task, immediately update status to "In Progress"
- After completing a task, update status and attach the output link / document
- When blocked, update status to "Blocked" and specify the **owner** and **required action**

### Sub-Task Decomposition (Required for Long Tasks)
- Any task estimated to take more than 2 hours must be decomposed into sub-issues
- Each sub-issue has a clear owner, estimated completion time, and acceptance criteria
- Sub-tasks that can be run in parallel are created simultaneously — no serial waiting

### Progress Documentation
- Leave a progress record in the task comment at every milestone
- Format: **[Time] Completed: [what] → Next: [action] → Owner: [name]**
- "Silent" completions are not allowed — every completion must be documented

---

## Content Factory Task Flow Rules

### Topic Task Flow
```
trend-researcher creates Topic Pool issue
→ On completion: @strategy-lead for review
→ strategy-lead approves: update status to "Approved"; assign Script issue to script-writer
→ strategy-lead returns: add revision annotations; reassign to trend-researcher
```

### Script Task Flow
```
script-writer receives Script task
→ On completion: submit script package; @strategy-lead for review
→ strategy-lead approves: assign Production issue to video-producer + publisher-operator
→ strategy-lead returns: add specific annotations; reassign to script-writer
```

### Production & Publishing Task Flow
```
video-producer completes production package
→ Notify publisher-operator: production package is ready
→ publisher-operator publishes: update publish link; @growth-analyst to begin monitoring
→ growth-analyst receives notification: initial data report at 72 hours
```

### Recurring Tasks
- trend-researcher: auto-creates "This Week's Topic Pool" task every Monday
- growth-analyst: auto-creates "This Week's Weekly Report" task every Friday
- publisher-operator: auto-creates "Next Week's Publishing Calendar" task every Sunday

---

## Blocker Handling Protocol

When any blocker is encountered, annotate within 5 minutes:

```
🚫 BLOCKED
- Blocker reason: [specific description]
- Owner: [agent name who needs to act]
- Action required: [exactly what needs to be done]
- Estimated resolution time: [if known]
- Temporary workaround: [if available]
```

"Silent waiting" on a blocker is not allowed — proactively trigger the responsible party.

---

## Budget and Resource Boundaries

- Confirm current budget status before starting each task
- Do not exceed the allocated budget without authorisation
- If additional resources are needed, create a "Resource Addition Request" sub-issue and escalate to the CEO
- On receiving a pause/cancel instruction, immediately stop current work and save a progress snapshot
