# 5kill5-skills

面向 AI Agent 的技能（Skills）与插件集合，由 [yhfwww](https://github.com/yhfwww) 维护，开源。

每条技能就是一个可复制的目录：`SKILL.md` 定义触发条件、边界和工作流程，`references/` 放细则规范，`scripts/` 与 `assets/` 放可执行资产。技能本身不绑定模型，适用于 Claude Code、Codex、Trae 等支持 `SKILL.md` 约定的 Agent。

## 技能一览

| 目录 | 技能名 | 用途 | 典型触发 |
|---|---|---|---|
| [人味写作技能](人味写作技能/human-writing/SKILL.md) | `human-writing` | 双模式人类化写作：写作模式从零创作有「人味」的文章，润色模式去除 AI 味；段落式写作，支持个性化学习 | 写文章、改稿、去 AI 腔 |
| [小说创作技能](小说创作技能/ai-novel-creator/SKILL.md) | `ai-novel-creator` | 8000–20000 字短篇小说创作：结构化提示词、三幕结构、角色设定、分章写作与连贯性检查 | 写短篇、列大纲、检查章节连贯性 |
| [微信总编技能](微信总编技能/wechat-editor-in-chief/SKILL.md) | `wechat-editor-in-chief` | 微信公众号文章全流程：素材整理、研究选材、写作改稿、配图、排版，交付 Markdown 与可带格式复制正文的 HTML | 写公众号、改稿、排版发布前整理 |
| [需求澄清助手技能](需求澄清助手技能/req-clarifier/SKILL.md) | `req-clarifier` | 把模糊零散的想法整理成结构化规格文档，通过专业追问补全缺口 | 「帮我整理需求」「我有个想法」「写 PRD」 |
| [追问](追问/second-question/SKILL.md) | `second-question` | 不给答案，只给用户没想到的下一个问题：识别未经验证的假设、未说明的权衡 | 「问我个问题」「帮我想想我漏了什么」 |
| [变更日志守护者](变更日志守护者/changelog-keeper/SKILL.md) | `changelog-keeper` | 维护 `CHANGELOG_FOR_AGENT.md`、`CHANGELOG_FOR_HUMAN.md`、`PROJECT_STATE.md`，让后续 Agent 快速接手项目演进历史 | 「checkpoint」「保存进度」「记录这次改动」 |
| [量化策略研发技能](量化策略研发技能/quant-strategy-rd/SKILL.md) | `quant-strategy-rd` | 量化策略研究与交易系统开发审查：数据质量、回测验证、执行状态机、风控、对账、日志、部署与密钥管理 | 策略规格、回测审查、执行恢复、上线准备 |

其中微信总编与量化策略研发额外附有 `技能说明.md`，用于记录适用范围、目录结构和维护约定。

## 安装

技能是纯文件，安装即复制。把技能对应的子目录整体拷到 Agent 的技能目录，保留 `references/`、`scripts/`、`assets/` 等子结构：

```text
~/.claude/skills/        # Claude Code
~/.codex/skills/         # Codex
~/.agents/skills/        # 通用 Agent 约定
```

示例（Windows PowerShell，以 `human-writing` 为例）：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse ".\人味写作技能\human-writing" "$env:USERPROFILE\.claude\skills\"
```

装完重启或重新加载 Agent 会话，使它重新扫描技能目录。部分技能之间存在引用关系（例如微信总编会引用 `human-writing`），需要一并安装才能获得完整能力；缺失时技能会提示不可用，而不是静默跳过。

## 使用

直接用自然语言描述任务，Agent 会依据 `SKILL.md` 的触发条件自动匹配。也可以在支持斜杠命令的客户端里显式调用。带 `argument-hint` 的技能给出了推荐写法，例如：

```text
req-clarifier 我想做一个内部审批系统，先帮我澄清需求
ai-novel-creator 写一篇 10000 字悬疑短篇
```

想手动确认某条技能的行为边界，直接打开它的 `SKILL.md`；细则和示例通常在同目录的 `references/` 下。

## DSH 插件

[DSH插件/dsh-session-manager](DSH插件/dsh-session-manager/README.md) 是 DeepSeek Harness（DSH）Web UI 的会话管理插件，用于浏览已保存会话、查看详情并按二次确认删除会话。安装方式、实现原理、安全检查与已知限制见该目录下的 README。

注意它的许可是 MIT，与仓库根目录不同。

## 仓库结构

```text
5kill5-skills/
├── README.md
├── LICENSE                  # Apache-2.0
├── 人味写作技能/human-writing/
├── 小说创作技能/ai-novel-creator/
├── 微信总编技能/wechat-editor-in-chief/
├── 需求澄清助手技能/req-clarifier/
├── 追问/second-question/
├── 变更日志守护者/changelog-keeper/
├── 量化策略研发技能/quant-strategy-rd/
└── DSH插件/dsh-session-manager/
```

## 使用须知

- 技能是给 Agent 的指令与规范，不保证输出质量；最终判断仍由使用者负责。
- `quant-strategy-rd` 不提供投资建议，不构成任何收益承诺。默认不连接交易所、不读取密钥、不下单；实盘、资金与密钥操作必须有使用者明确授权，并由使用者自行承担风险。
- 各技能中的流程与阈值是针对通用场景的默认值，接入具体项目时应以项目实际事实为准。

## 贡献

欢迎 issue 与 PR。改动某条技能时，请同步更新该技能目录下的 `SKILL.md` 及受影响的自述文档，保持触发条件、流程与参考文档索引一致。

## 许可证

仓库整体采用 [Apache License 2.0](LICENSE)。`DSH插件/dsh-session-manager/` 目录内为 MIT，以该目录自带的 `LICENSE` 为准。
