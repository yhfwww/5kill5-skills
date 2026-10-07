# 版本化发布包

本参考适用于需要交付、托管或可回退的策略。目标是从同一份已验证源码生成独立、可校验的 `<策略名>-<版本号>` 包，例如 `mean-reversion-v1.3.2`；该包不是开发工作区的随意复制，也不包含任何真实资金凭据或运行私有状态。

## 1. 版本与来源

- 以项目唯一的版本源为准：优先受保护 Git tag/发布元数据，其次为语言项目元数据中的版本字段。若用户没有版本方案，可使用语义化版本；日期、构建号和目标平台可作为附加构建标识，不能替代可追溯的发布版本。
- 打包前校验代码版本、CLI/status 输出版本、文档发布说明、配置 schema/迁移版本和 manifest 中的版本一致。任何一个不一致均应失败，而不是静默挑选一个版本。
- 默认从干净、固定的 commit/tag 构建。若用户明确允许带未提交变更的测试包，manifest 的 `source.dirty` 必须为 `true` 并记录 diff 摘要/哈希；它不得被称为正式可复现发布。

## 2. 包结构与内容

构建脚本应在可配置的输出目录创建一个全新的独立目录；常见布局如下：

```text
release/
  <strategy>-<version>/
    src/ or package source/
    scripts/                    # launcher、发布校验和平台入口
    config.example.*
    docs/                       # 策略、研究、日志、运行与部署说明
    tests/ and required fixtures/
    deploy/                     # systemd/Task Scheduler 相关文件
    LICENSE and required third-party notices/
    release-manifest.json
    CHECKSUMS.sha256
  <strategy>-<version>.zip      # Windows 交付时需要
  <strategy>-<version>.tar.gz   # Linux 交付时需要
```

名称、源码目录与压缩格式可随语言和交付方式调整，但不得改变“目录名、manifest、校验清单及其内容彼此一致”的原则。若某些部署只需要源码包，则不把 `node_modules`、Python 虚拟环境、编译缓存或本机构建产物带入包；由部署端依据锁文件安装依赖。若必须交付平台二进制或离线依赖，应按平台/架构单独命名，并记录许可证、来源和哈希。

发布包完成后是不可变交付物：`artifacts` 只列出业务载荷文件，不包含 `release-manifest.json`、`CHECKSUMS.sha256`、压缩包本身或事后验证报告；`CHECKSUMS.sha256` 校验全部业务载荷及 `release-manifest.json`，但绝不校验自身。压缩包哈希和事后验证报告写入包目录外、同版本且受保护的发布记录（例如 `release-index.json` 或 CI artifact）。这样没有自指哈希，也不会因验证后回写而破坏包的完整性。

使用**明确允许清单**收集文件，而非递归复制整个工作目录。通常纳入：实际源码、锁文件、测试与公开夹具、操作脚本、示例配置、迁移工具、部署文件、策略/日志/运维文档和许可证。始终排除：

- `.env`、生产配置、私钥、助记词、API token、认证头和钱包文件；
- `runtime/`、真实状态、PID/锁、数据库、订单/账户日志、交易签名、缓存和临时文件；
- 未许可分发的上游源码、依赖或审计证据。

## 3. 打包与验证入口

每个可部署策略应提供项目实际可运行的 `build-release` 与 `verify-release` 命令；可以是一个跨平台 CLI，也可以提供 PowerShell 和 Bash wrapper。两者均须从脚本路径定位项目根目录、接受明确的版本/输出参数、使用非零退出码报告失败，并在输出中只显示非敏感路径与摘要。

`build-release` 至少执行：

1. 验证版本来源、允许的工作树状态、依赖锁文件和所需文档；
2. 在空的目标目录按允许清单复制文件，拒绝路径逃逸、重复文件和未批准的私密文件；
3. 对业务载荷计算 SHA-256，先生成不可变的 manifest，再生成校验“业务载荷 + manifest”的 `CHECKSUMS.sha256`；
4. 生成所需 `.zip`/`.tar.gz`，并将压缩包本身的哈希写入包外同版本发布记录；
5. 输出版本、目标路径、文件数、总大小、校验结果及“未包含真实配置/运行状态”的事实。

`verify-release` 至少执行：

1. 在干净的临时目录解包或读取发布目录，验证 manifest 和 `CHECKSUMS.sha256`；
2. 断言必需的环境 bootstrap、启动/停止/状态/日志脚本、示例配置、策略研究笔记、日志规范、部署文档、锁文件和许可证存在；
3. 扫描发布包是否误含私密配置、运行时状态或常见凭据模式；发现时失败并报告文件名，不输出敏感内容；
4. 在不使用真实凭据、不连接真实交易账户的条件下运行配置解析、离线测试或 smoke check（由项目实际运行时决定）；
5. 将验证结果和已知未验证项写入包目录外、同版本的验证报告或 CI artifact；不得修改已校验的发布目录、manifest 或校验清单。

验证脚本不能通过删除失败文件、忽略哈希错误或仅看命令退出成功来宣称发布有效。

## 4. `release-manifest.json` 最小字段

manifest 是发布包的机器可读身份证明，推荐包含：

```json
{
  "manifest_version": 1,
  "strategy_id": "stable-name",
  "release_version": "1.3.2",
  "created_at_utc": "2026-10-04T03:15:30Z",
  "source": { "git_commit": "...", "git_tag": "...", "dirty": false },
  "build": { "runtime": "...", "lockfile_sha256": "...", "config_schema_version": "..." },
  "artifacts": [{ "path": "src/main.py", "bytes": 123, "sha256": "..." }],
  "build_checks": { "checks_passed": ["allow-list", "hashes"], "limitations": [] }
}
```

字段可扩展，但不保存密钥、账户标识、真实仓位、私密路径或可广播交易。部署前/后验证结果属于不可变包之外的同版本发布记录，需引用该包的版本、manifest 哈希和压缩包哈希。发布后的 `status --json`、运行 manifest 和日志事件应携带 `release_version` 与 `config_fingerprint`，使分析代理能判断一条事件属于哪个交付物。

## 5. 跨平台发布、升级与回退

同一逻辑版本可产生 Windows 与 Linux 均可部署的源码包；平台差异应位于 launcher、服务定义和可选二进制依赖，不能污染核心策略行为。针对平台二进制、架构或运行时差异，使用明确后缀（例如 `-windows-x64`），不要让同名包承载不同内容。

服务器升级前先验证包哈希和 manifest，再停止策略、对账实际仓位与未完成订单、备份受保护状态，并部署新版本到新目录。切换服务入口应指向完整验证过的版本目录。回退仅切换到已验证的旧包及兼容配置；绝不从旧包恢复过期状态来覆盖已经变化的外部账户事实。

每次正式发布都应保留对应的包、manifest、哈希、验证报告、发布说明和关联策略卡版本。这样 Codex 或其他代理无需依赖聊天记忆，就能分析“服务器运行的是什么、是否完整、与研究/配置版本是否匹配”。
