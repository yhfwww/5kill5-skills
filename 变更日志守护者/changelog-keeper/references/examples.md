# 示例输出参考

本文件展示三个 changelog 文件在真实 vibe coding 场景中的完整示例输出，用于帮助 Agent 对齐格式预期和写作质量标准。

---

## 场景背景

一个 Python + FastAPI 的语音助手后端项目，经历了三次迭代：
1. 初始化项目结构 + 基础 API
2. 接入 Silero VAD 实现语音活动检测
3. 修复 WebSocket 断连问题 + 优化延迟

---

## CHANGELOG_FOR_AGENT.md 示例

```markdown
# CHANGELOG_FOR_AGENT.md
> 本文件由 changelog-keeper skill 自动维护，供后续 Agent 快速理解项目演进历史。
> 最新记录在最前。每条记录包含完整的技术上下文，包括文件路径、影响范围、设计决策。
> 接手项目前，请先读取最近 3-5 条记录以获取充分上下文。

---

## [v0.3.0] 2025-06-03 14:22

**变更摘要**：修复 WebSocket 断连 + 降低端到端延迟至 280ms

### 改动文件
- `app/ws/connection_manager.py` — 新增心跳保活机制（30s ping/pong）
- `app/pipeline/asr_pipeline.py` — 将 Whisper 推理从同步改为 asyncio.to_thread
- `app/config.py` — 新增 `WS_HEARTBEAT_INTERVAL` 和 `ASR_TIMEOUT_MS` 配置项

### 核心变化
WebSocket 连接现在通过后台任务发送心跳帧维持连接，解决了客户端 60s 超时断连问题。
ASR 推理改为线程池异步调用，避免阻塞主事件循环，实测端到端延迟从 420ms 降至 280ms。

### 影响范围
- **接口变更**：无（WebSocket 消息格式未变）
- **依赖变更**：无
- **行为变更**：WebSocket 连接现在会每 30s 收到一次服务端 ping，客户端需处理 pong 响应（标准 WebSocket 协议，大多数客户端自动处理）

### 设计决策
考虑过用 nginx 层配置 keepalive，但为了不引入额外基础设施依赖，选择在应用层实现。
asyncio.to_thread 比 ThreadPoolExecutor 手动管理更简洁，且 Python 3.9+ 标准库支持，无额外依赖。

### 后续注意事项
- 心跳间隔 30s 是保守值，如客户端网络环境好可以调高到 60s
- ASR 线程池默认使用 CPU 核心数，高并发场景可能需要调整 `max_workers`

---

## [v0.2.0] 2025-06-03 11:05

**变更摘要**：接入 Silero VAD 实现服务端语音活动检测

### 改动文件
- `app/pipeline/vad_processor.py` — 新增文件，封装 Silero VAD 推理逻辑
- `app/ws/audio_handler.py` — 新增 VAD 前置过滤，只有检测到语音的帧才送入 ASR
- `requirements.txt` — 新增 `torch==2.3.0` 和 `silero-vad==4.0.0`
- `app/config.py` — 新增 `VAD_THRESHOLD`（默认 0.5）和 `VAD_WINDOW_MS`（默认 96ms）配置

### 核心变化
在 WebSocket 音频接收链路中插入 VAD 节点：客户端推送原始 PCM 帧 → VAD 过滤静音 → 有效语音帧进入 ASR 队列。
使用 silero-vad 的 ONNX 版本（非 PyTorch 版）以降低推理延迟至 < 5ms/帧。

### 影响范围
- **接口变更**：WebSocket 消息协议新增可选字段 `vad_active: bool`，标识当前帧是否被 VAD 判定为语音
- **依赖变更**：新增 torch（仅 CPU 版，约 200MB）和 silero-vad
- **行为变更**：ASR 不再对每一帧音频都调用，CPU 占用预计下降 40-60%

### 设计决策
选择 Silero VAD 而非 WebRTC VAD 的原因：前者准确率更高，对中文语音的误触发率更低。
选择 ONNX 运行时而非 PyTorch 推理：避免 GPU 依赖，适合 CPU-only 部署环境。

### 后续注意事项
- torch CPU 版体积较大，Docker 镜像会增加约 220MB，考虑后续用 ONNX Runtime 单独替换
- VAD_THRESHOLD=0.5 在安静环境测试良好，嘈杂环境建议调低至 0.3

---

## [v0.1.0] 2025-06-03 09:30

**变更摘要**：项目初始化，FastAPI + WebSocket 基础框架搭建完成

### 改动文件
- `app/main.py` — FastAPI 应用入口，注册路由和生命周期事件
- `app/ws/router.py` — WebSocket 端点 `/ws/audio`
- `app/ws/connection_manager.py` — 连接管理器，支持多客户端并发
- `app/pipeline/asr_pipeline.py` — ASR 流水线骨架（faster-whisper 集成）
- `app/config.py` — 环境变量配置中心
- `requirements.txt` — 初始依赖：fastapi, uvicorn, faster-whisper, websockets
- `Dockerfile` — 基于 python:3.11-slim

### 核心变化
建立了基础的 WebSocket 音频流处理框架。客户端通过 /ws/audio 端点推送 PCM 音频流，服务端通过 faster-whisper 进行 ASR 转写并实时回传文本。

### 影响范围
- **接口变更**：首次建立，WebSocket 端点 `/ws/audio`，消息格式见 `docs/ws_protocol.md`
- **依赖变更**：全新依赖，见 requirements.txt
- **行为变更**：首次可运行版本

---
```

---

## CHANGELOG_FOR_HUMAN.md 示例

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [v0.3.0] - 2025-06-03

### Fixed
- 修复了客户端连接 60 秒后自动断开的问题

### Changed
- 语音识别速度提升，端到端响应时间从约 420ms 降低至约 280ms

---

## [v0.2.0] - 2025-06-03

### Added
- 新增语音活动检测（VAD）：系统现在能自动识别用户是否在说话，不再对静音片段做无效处理
- CPU 占用显著降低（预计减少 40-60%）

### Dependencies
- 新增：`silero-vad` v4.0 — 语音活动检测模型

---

## [v0.1.0] - 2025-06-03

### Added
- 初始版本，支持通过 WebSocket 实时传输音频并获得语音转文字结果
- 支持多客户端同时连接
- Docker 部署支持
```

---

## PROJECT_STATE.md 示例（v0.3.0 后的状态）

```markdown
# PROJECT_STATE.md
> 本文件由 changelog-keeper skill 维护，反映项目**当前**状态快照。
> 每次重大变更后自动更新（覆盖写入，非追加）。

_最后更新：2025-06-03 14:22_

---

## 项目概览

- **项目名称**：voice-assistant-backend
- **技术栈**：Python 3.11 / FastAPI / faster-whisper / Silero VAD / WebSocket
- **项目阶段**：🚧 早期开发（核心链路可用，待生产加固）

## 当前目录结构（核心文件）

```
voice-assistant-backend/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 环境变量配置中心
│   ├── ws/
│   │   ├── router.py        # WebSocket 端点 /ws/audio
│   │   ├── connection_manager.py  # 多客户端连接管理 + 心跳
│   │   └── audio_handler.py # 音频帧处理 + VAD 过滤
│   └── pipeline/
│       ├── vad_processor.py # Silero VAD 封装
│       └── asr_pipeline.py  # faster-whisper ASR（异步）
├── requirements.txt
├── Dockerfile
└── docs/
    └── ws_protocol.md       # WebSocket 消息格式说明
```

## 核心模块状态

| 模块 | 状态 | 说明 |
|------|------|------|
| WebSocket 服务 | ✅ 可用 | 支持多并发，心跳保活已实现 |
| VAD 语音检测 | ✅ 可用 | Silero VAD ONNX 版，< 5ms/帧 |
| ASR 语音转写 | ✅ 可用 | faster-whisper，异步调用，~280ms |
| TTS 语音合成 | ❌ 未实现 | 计划接入 CosyVoice 2 |
| 用户认证 | ❌ 未实现 | 当前无鉴权，不适合生产环境 |

## 已知问题 & 技术债

- [ ] Docker 镜像体积偏大（torch CPU 版约 220MB），考虑替换为纯 ONNX Runtime
- [ ] 无用户认证机制，WebSocket 端点完全开放
- [ ] ASR 线程池 max_workers 未优化，高并发场景性能待测试
- [ ] 缺少完整的错误处理和日志记录

## 上次 Session 未完成的任务

- 接入 TTS 模块（CosyVoice 2），完成「语音 → 语音」完整链路
- 评估是否需要在 Nginx 层增加 WebSocket 代理配置

## 关键设计决策记录

- **选择 Silero VAD 而非 WebRTC VAD**：中文语音准确率更高，误触发率更低
- **ASR 使用 asyncio.to_thread**：避免 GPU 推理阻塞主事件循环，无额外依赖
- **心跳在应用层实现**：避免引入 Nginx 等基础设施依赖，保持部署简单
```

---

## 写作质量标准

通过上面的示例，可以总结以下质量标准供参考：

**CHANGELOG_FOR_AGENT.md 好记录的特征：**
- 文件路径精确到具体文件，不含糊
- 「为什么」和「怎么做」都说清楚
- 后续注意事项是真正有用的警告，不是废话
- 技术术语使用准确，面向能读懂代码的读者

**CHANGELOG_FOR_HUMAN.md 好记录的特征：**
- 没有文件路径，没有函数名
- 描述的是「用户/产品层面发生了什么」
- 一个条目一句话，简洁有力
- 非技术人员也能大致理解

**PROJECT_STATE.md 好状态快照的特征：**
- 「上次 Session 未完成的任务」是最有价值的字段，不能空着
- 模块状态表格一眼就能看出项目完成度
- 技术债诚实记录，不粉饰
- 设计决策记录防止后续 Agent 走回头路
