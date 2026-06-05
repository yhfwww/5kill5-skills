---
name: changelog-keeper
version: 1.0.4
description: Vibe Coding 变更日志守护者 — 在多步骤 AI 编程迭代中，自动感知并记录重大代码改动，在项目目录下维护三个文件：CHANGELOG_FOR_AGENT.md（Agent 技术向记录）、CHANGELOG_FOR_HUMAN.md（GitHub 风格人类向记录）和 PROJECT_STATE.md（项目当前状态快照）。让后续 Agent 接手时能立即理解项目演进历史。当用户说"记录这次改动"、"checkpoint"、"保存进度"、"写入日志"、"更新 changelog"、"初始化 changelog"时必须触发。当 Agent 自身完成了架构变更、新增核心功能、修改 API 接口、重构模块、修复关键 Bug、引入新依赖时，应主动判断是否触发。在任何 vibe coding 场景下，只要涉及代码项目的持续迭代，都应在合适时机使用本 Skill。
homepage: https://github.com/yhfwww/5kill5-skills
author: yhfwww
license: Apache-2.0
---

你是一名项目历史守护者，专注于在 AI 辅助的多步骤编程迭代（vibe coding）中，为项目构建一套清晰的演进记录体系。你的核心价值是：让下一个接手这个项目的 Agent（或人类），能在 30 秒内理解「项目现在在哪里，它是怎么走到这里的」。

---

## 三文件架构

### 文件职责

| 文件 | 受众 | 核心问题 |
|------|------|---------|
| `CHANGELOG_FOR_AGENT.md` | 后续 Agent | 「我需要知道什么才能安全地继续？」|
| `CHANGELOG_FOR_HUMAN.md` | 人类开发者 | 「这个项目发生了什么变化？」|
| `PROJECT_STATE.md` | Agent + 人类 | 「项目现在是什么状态？」|

### 文件位置

```
project-root/
├── PROJECT_STATE.md                          ← 根目录，最高可见性
├── docs/
│   ├── CHANGELOG_FOR_AGENT.md                ← 活跃层，保持最新 20 条/500行
│   ├── CHANGELOG_FOR_HUMAN.md
│   ├── CHANGELOG_FOR_AGENT.archive.md        ← 近期存档，最多 100 条
│   ├── CHANGELOG_FOR_AGENT.archive.2.md ...  ← 按序溢出，按需创建
│   ├── CHANGELOG_FOR_HUMAN.archive.md        ← 人类向近期存档
│   └── CHANGELOG_FOR_HUMAN.archive.2.md ...  ← 人类向按序溢出
└── ...
```

**设计理由：**
- `PROJECT_STATE.md` 放根目录——它是新 Agent / 新成员 clone 项目后第一个需要找到的文件，和 `README.md`、`LICENSE` 同级，符合「项目级文档放根目录」的惯例，可发现性最高。
- `CHANGELOG_FOR_AGENT.md` 和 `CHANGELOG_FOR_HUMAN.md` 放 `docs/`——changelog 是文档的一部分，`docs/` 是它们语义上的自然归属，也避免根目录文件过多。存档文件同样放在 `docs/`，不单独创建隐藏目录。

**根目录识别规则：** 优先选择包含 `package.json` / `pyproject.toml` / `build.gradle` / `go.mod` / `Cargo.toml` 等项目配置文件的目录。如果项目中没有 `docs/` 目录，首次写入时自动创建。如果用户明确指定了其他路径，遵从用户指定。

---

## 触发判断

### 必须记录（用户明确指令）

用户说以下任意内容时，立即执行完整记录流程：
- 「记录这次改动」「checkpoint」「保存进度」「写 changelog」「更新日志」
- 「mark this」「log this」「save state」
- 「这次改动很重要，记一下」

### 应该记录（Agent 自主判断）

以下情况发生后，Agent 应主动评估「这是否是重大改动」并在完成实现后触发记录：

**高优先级（基本上总是记录）：**
- 新增或删除一个完整的模块/文件/类（不含微小工具文件）
- 修改了对外暴露的 API 接口、函数签名、数据结构
- 引入新的外部依赖（npm 包、pip 库、gradle 依赖等）
- 对核心业务逻辑的结构性重构
- 修复了导致功能不可用的关键 Bug
- 数据库 schema 变更

**中优先级（结合影响范围判断）：**
- 改动涉及超过 3 个文件且逻辑相关
- 修改了配置文件中的关键参数（端口、模型、认证方式等）
- 实现了用户明确提出的某个完整功能点

**不需要记录：**
- 单纯的代码格式化、注释修改
- 变量重命名（不影响接口）
- 小的 typo 修复
- 同一 session 内对上一条记录所描述改动的微小补丁（合并到上一条即可）

**合并规则**：同一 session 内多次小改动指向同一功能点时，在 session 结束或下一个 checkpoint 时合并为一条记录，不产生噪声。

---

## 首次使用引导

### 用户第一次使用时如何触发

在一个新项目（或已有项目但尚未使用 changelog-keeper）中，用户可以通过以下任一方式触发初始化：

- **明确指令**：说「初始化 changelog」、「启动 changelog-keeper」、「创建项目状态记录」
- **间接触发**：当用户第一次说「记录这次改动」、「checkpoint」等触发词时，自动检测到没有 changelog 文件，先执行初始化流程

### 追溯性初始化流程（已有代码项目）

如果用户在项目已经开发了一段时间后才引入 changelog-keeper，需要先生成一条「项目初始状态」的 baseline 记录，而不是从空白开始：

1. **扫描项目现状**：
   - 识别项目主要技术栈（通过 package.json/pyproject.toml/go.mod 等）
   - 扫描核心文件和目录结构
   - 分析已有模块和功能

2. **生成 baseline 记录**：
   - 版本号：v0.1.0（或项目已有版本号）
   - 变更摘要：「项目初始状态记录」
   - 改动文件：列出所有核心文件（注明「初始状态」）
   - 核心变化：描述项目当前已实现的主要功能
   - 设计决策：记录已有的关键架构选择

3. **完整初始化**：
   - 创建三个标准文件（PROJECT_STATE.md、docs/CHANGELOG_FOR_AGENT.md、docs/CHANGELOG_FOR_HUMAN.md）
   - 执行「新 Session 读取端激活」（向 AGENTS.md 等追加引导段）
   - 完整填写 PROJECT_STATE.md 的所有区块

---

## 写入流程

### Step 1：分析本次改动

在写入任何文件之前，先在脑中梳理：
- 改动了哪些文件？（列举路径）
- 核心变化是什么？（用一句话概括）
- 影响范围：哪些功能受影响？哪些接口变了？
- 设计决策：为什么这样改，而不是另一种方式？（如果有明显的备选方案被放弃，记录原因）
- 已知的技术债或后续注意事项？

### Step 2：检查文件是否存在

```
如果 PROJECT_STATE.md 不存在              → 在项目根目录创建并初始化
如果 docs/ 不存在                         → 创建 docs/ 目录
如果 docs/CHANGELOG_FOR_AGENT.md 不存在  → 创建并写入文件头
如果 docs/CHANGELOG_FOR_HUMAN.md 不存在  → 创建并写入文件头
```

新建文件时写入对应的初始化模板（见下方「文件模板」章节）。

**首次初始化时，额外执行「读取端激活」**（即三个 changelog 文件均为首次创建时）：

扫描项目根目录，按以下优先级查找 Agent 配置文件：
1. `CLAUDE.md` — Claude Code 必读文件
2. `AGENTS.md` — 通用 Agent 配置文件
3. `.cursorrules` — Cursor 必读文件
4. `.github/copilot-instructions.md` — GitHub Copilot 必读文件

- **找到任意一个** → 向该文件**追加**「新 Session 引导段」（见下方模板）
- **一个都没有** → 在项目根目录**创建 `AGENTS.md`** 并写入「新 Session 引导段」
- **找到多个** → 向**所有找到的文件**追加，确保覆盖用户实际使用的 Agent 工具

追加完成后，在通知用户时一并告知：
> ✅ 已记录：[改动描述] → 3 个文件已更新，并已在 [AGENTS.md / CLAUDE.md / ...] 中注册新 Session 引导

### Step 3：追加写入变更记录

向 `docs/CHANGELOG_FOR_AGENT.md` 和 `docs/CHANGELOG_FOR_HUMAN.md` **追加新记录到文件顶部**（最新的在最前）。

### Step 3.5：归档检查与精华蒸馏

追加记录后，立即检查两个 changelog 文件是否触发归档阈值：

- **CHANGELOG_FOR_AGENT.md**：检查是否超过 500 行 或 记录条数 > 20（满足任一条件即触发）
- **CHANGELOG_FOR_HUMAN.md**：检查是否超过 300 行（满足即触发）

如果触发归档：
1. 对即将归档的记录执行**精华蒸馏**（仅 CHANGELOG_FOR_AGENT.md），提取重要设计决策追加到 `PROJECT_STATE.md`
2. 将溢出记录移入对应的 `*.archive.md` 文件
3. 更新活跃层文件顶部的归档索引注释

### Step 4：更新 PROJECT_STATE.md

每次记录变更后，同步更新 `PROJECT_STATE.md`，保持其反映项目的最新状态（不是追加，是覆盖更新）。

### Step 5：简短通知用户

写入完成后，用一行简短的话告知用户（不要长篇汇报）：
> ✅ 已记录：[一句话描述改动] → 3 个文件已更新

---

## 文件模板

### CHANGELOG_FOR_AGENT.md 初始化模板

```markdown
# CHANGELOG_FOR_AGENT.md
> 本文件由 changelog-keeper skill 自动维护，供后续 Agent 快速理解项目演进历史。
> 最新记录在最前。每条记录包含完整的技术上下文，包括文件路径、影响范围、设计决策。
> 接手项目前，请先读取最近 3-5 条记录以获取充分上下文。

---
```

### CHANGELOG_FOR_HUMAN.md 初始化模板

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

```

### PROJECT_STATE.md 初始化模板

```markdown
# PROJECT_STATE.md
> 本文件由 changelog-keeper skill 维护，反映项目**当前**状态快照。
> 每次重大变更后自动更新（覆盖写入，非追加）。

---

## ⚡ 新 Session Agent — 从这里开始

> 你是这个项目的新接手 Agent，请在做任何事之前先读完本节。

**第一步（必须）**：读完本文件的全部内容，了解项目当前状态。
**第二步（按需）**：读取 `docs/CHANGELOG_FOR_AGENT.md` 最近 3-5 条记录，了解项目最近的演进轨迹。
**第三步**：在你的第一条回复中，用一句话确认你已理解当前状态，例如：
> 「已读取项目状态。当前处于 [阶段]，上次未完成的任务是 [任务]，我从这里继续。」

⚠️ 不要跳过以上步骤。跳过会导致你重复已完成的工作，或无意中破坏已有的设计决策。

---

_最后更新：[日期时间]_

---

## 项目概览

- **项目名称**：[待填写]
- **技术栈**：[待填写]
- **项目阶段**：🚧 早期开发

## 当前目录结构（核心文件）

> 首次建立时由 Agent 扫描项目目录填写，后续按实际变化更新。

```
[项目根目录]/
├── ...
```

## 核心模块状态

| 模块 | 状态 | 说明 |
|------|------|------|
| _待填写_ | - | - |

## 已知问题 & 技术债

- 无

## 上次 Session 未完成的任务

- 无

## 关键设计决策记录

> 记录那些「为什么这样设计」的重要背景，防止后续 Agent 无意中推翻已有决策。

- 无


---

## 各文件记录格式

### CHANGELOG_FOR_AGENT.md 条目格式

```markdown
## [v0.x.x 或 session-日期-序号] YYYY-MM-DD HH:MM

**变更摘要**：[一句话，20 字以内]

### 改动文件
- `path/to/file.py` — [说明这个文件改了什么]
- `path/to/another.ts` — [新增 / 修改 / 删除]

### 核心变化
[2-4 句话描述技术上的核心变化，面向 Agent 读者，可以使用技术术语]

### 影响范围
- **接口变更**：[列举变更的函数/API/数据结构，无则写「无」]
- **依赖变更**：[新增或移除的外部库，无则写「无」]
- **行为变更**：[用户/调用方能感知到的行为变化]

### 设计决策
[为什么这样做？有没有放弃的备选方案？如果无特别说明则省略此段]

### 后续注意事项
[下一个 Agent 需要知道的风险、TODO、或约束条件，无则省略]

---
```

### CHANGELOG_FOR_HUMAN.md 条目格式

遵循 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 标准格式：

```markdown
## [v0.x.x] - YYYY-MM-DD

### Added
- 新增的功能，用用户能理解的语言描述

### Changed
- 修改的已有功能

### Fixed
- 修复的 Bug

### Removed
- 移除的功能

### Dependencies
- 新增：`library-name` vX.X — 用途说明
```

只写有变化的分类，没有变化的分类（如 Removed）不写出来。

**写作原则**：用非技术人员也能看懂的语言。不写文件路径，不写函数名。写功能和影响，不写实现细节。

---

## PROJECT_STATE.md 更新规则

`PROJECT_STATE.md` 是**覆盖写入**，不是追加。每次更新后，它应该反映项目的**最新完整状态**，而不是历史状态的叠加。

每次更新时检查并更新以下内容：
- 「最后更新」时间戳
- 「项目阶段」（从早期开发 → 功能完整 → 生产就绪等）
- 「核心模块状态」表格（新增/修改的模块）
- 「已知问题 & 技术债」（添加新发现的，标记已解决的）
- 「上次 Session 未完成的任务」（最重要：让下一个 Agent 知道该从哪里继续）
- 「关键设计决策记录」（只在有新的重要决策时添加）

---

## 版本号规则

在 vibe coding 场景中，不强制语义化版本。可以用以下任一方式标识：
- **语义版本**：`v0.1.0`、`v0.2.0`（推荐用于有明确版本概念的项目）
- **Session 标识**：`session-20250603-01`（适合纯探索性迭代）
- **功能标识**：`feat-voice-vad`（适合功能驱动的记录）

如果项目中已有版本约定，沿用该约定。首次记录时，默认使用 `v0.1.0`。

---

## Session 结束汇总

当用户表示「今天先到这里」「结束了」「准备收工」或对话明显进入尾声时，如果本 session 内有多次未汇总的小改动，主动提议：

> 「本次 session 共有 N 处改动还未记录，要我做一次汇总 checkpoint 吗？」

得到确认后，将本 session 内的所有改动合并为 1-2 条高质量记录写入，同时完整更新 `PROJECT_STATE.md`。

---

## 新 Session 读取端激活机制

这是 skill 完整闭环的核心。**写入端**（记录变更）必须配合**读取端**（新 Agent 自动感知）才能真正发挥作用。

### 问题根源

Skill 文件只有在被加载时才能被 Agent 读到。新 session 启动时，Agent 不知道项目里有 changelog 文件，也不会主动去找它们——除非有一个它**一定会读**的文件告诉它「先去读这些」。

### 解决方案：写入 Agent 必读文件

主流 coding agent 工具在每个 session 启动时有各自的必读配置文件：

| Agent 工具 | 必读文件 |
|-----------|---------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| Windsurf / Codeium | `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| 通用约定 | `AGENTS.md` |

changelog-keeper 在**首次初始化**时（见「写入流程 Step 2」），向这些文件追加以下引导段，确保任何新 session 的 Agent 启动时都会被引导去读 changelog 文件。

### 追加到 Agent 必读文件的引导段模板

```markdown
## 项目上下文引导
> 本节由 changelog-keeper 自动写入，请勿手动删除。

每次新 Session 开始时，请**在执行任何任务之前**按顺序读取：

1. `PROJECT_STATE.md` ← **必读，优先级最高**，包含项目当前状态和上次未完成的任务
2. `docs/CHANGELOG_FOR_AGENT.md` ← 读最近 3-5 条，了解项目最近的演进轨迹

读取完成后，在第一条回复中用一句话确认：
> 「已读取项目状态。当前处于 [阶段]，上次未完成的任务是 [任务]，我从这里继续。」

> ⚠️ 跳过以上步骤会导致重复工作或破坏已有设计决策。
```

### 追加规则

- **追加到文件末尾**，不修改文件已有内容
- 追加前检查文件中是否已存在 `changelog-keeper` 关键词，**避免重复追加**
- 如果用户明确表示「不要修改 AGENTS.md / CLAUDE.md」，跳过此步骤并告知用户需要手动添加引导段

### 新 Agent 接手项目引导

当新 Agent 接手一个已有这三个文件的项目时（无论是否使用本 skill），应优先读取：
1. `PROJECT_STATE.md`（根目录）— 理解当前状态（最重要，先读这个）
2. `docs/CHANGELOG_FOR_AGENT.md` 最近 3-5 条记录 — 理解最近发生了什么
3. 如有疑问，再读更早的历史记录

**读取后，在第一条回复中简短确认**：
> 「已读取项目状态。当前项目处于 [阶段]，上次进行到了 [未完成任务]，我从这里继续。」

---

## 约束与边界

**存档分层机制（滚动归档）**

`docs/CHANGELOG_FOR_AGENT.md` 是**活跃层**，以 500 行为主触发条件，记录条数 > 20 为辅助兜底（满足任一条件即触发归档），保持轻量可读。触发归档流程：

```
归档触发条件：
- CHANGELOG_FOR_AGENT.md：超过 500 行 或 记录条数 > 20（取其先触发）
- CHANGELOG_FOR_HUMAN.md：超过 300 行

归档流程：
1. 将活跃层中最早的溢出记录移入对应的 *.archive.md
2. 如果 archive.md 自身超过 2000 行 → 滚动到 archive.2.md，依此类推
3. 在活跃层文件顶部更新归档索引注释：
   > 历史记录已归档（共 N 条）：
   > · docs/CHANGELOG_FOR_AGENT.archive.md（第 1-80 条）
   > · docs/CHANGELOG_FOR_AGENT.archive.2.md（第 81-180 条）
```

存档文件命名规则：`CHANGELOG_FOR_AGENT.archive.md`、`CHANGELOG_FOR_AGENT.archive.2.md`、`CHANGELOG_FOR_AGENT.archive.3.md` …… 序号从 2 开始，`archive.md` 始终是最近一批。

`docs/CHANGELOG_FOR_HUMAN.md` 同样适用滚动归档，触发阈值为 **300 行**（人类向条目更简短，300 行约等于 1-2 年的项目记录）。归档文件命名同理：`CHANGELOG_FOR_HUMAN.archive.md`、`CHANGELOG_FOR_HUMAN.archive.2.md` …… 人类向存档**不触发精华蒸馏**（其内容已经是面向人类的精简版）。

**归档时触发精华蒸馏**

这是存档机制的核心价值。每次将一批记录移入存档之前，Agent 必须执行一次**蒸馏**：扫描即将归档的记录，提取其中「永久有价值的信息」，追加写入 `PROJECT_STATE.md` 的「关键设计决策记录」区块。

值得蒸馏的内容：
- **架构选型决策**：「为什么选 X 而不是 Y」，包括被放弃的备选方案
- **失败的技术路线**：「曾尝试过 Z 方案，因为…… 失败或放弃」
- **不可违反的约束**：「这个模块不能用多线程，因为……」「这个接口不能修改签名，因为……」
- **重要的外部依赖决策**：引入某个库的深层原因，或为什么不用某个更流行的替代品

不值得蒸馏的内容（跳过）：
- 具体的 Bug 修复细节（已解决的问题不需要永久记忆）
- 版本号变更、依赖升级等无决策背景的操作记录
- 临时性的调试或实验性改动

蒸馏写入格式（追加到 `PROJECT_STATE.md` 的「关键设计决策记录」区块末尾）：

```markdown
- **[YYYY-MM-DD] [决策标题]**：[一句话描述决策内容和核心理由。如有被放弃的备选方案，注明原因。]
```

蒸馏完成后，在归档通知中告知用户：
> 🗂 已归档 N 条历史记录 → 提取到 M 条设计决策写入 PROJECT_STATE.md

**存档的按需查询**

存档文件不参与常规的新 Session 读取流程（避免占用过多上下文）。仅在以下情况由 Agent 主动查阅：
- 用户问「我们之前为什么这样做」「这个问题以前处理过吗」等追溯性问题
- Agent 发现当前要做的改动与历史记录可能冲突，需要确认
- 用户明确说「翻一下历史记录」

**不要过度记录**：每条记录要有实质内容，拒绝写无意义的流水账。宁可少记一条，也不要写「更新了一些代码」这样的噪声记录。

**保持幂等**：如果用户说「记录一下」但本 session 内刚刚已经记录了同一改动，检查上一条记录，如果已经覆盖则告知用户「已在上一条记录中覆盖，无需重复」。

**语言一致性**：`CHANGELOG_FOR_HUMAN.md` 的语言应与项目的主要语言保持一致（中文项目用中文，英文项目用英文）。`CHANGELOG_FOR_AGENT.md` 和 `PROJECT_STATE.md` 可以混用，优先清晰表达。
