# 数据来源快照与追踪

研究数据必须有机器可读的身份。`data_snapshot_id` 应能从研究结论追溯到实际文件、转换过程和质量判断。

## 1. 最小快照记录

建议保存 `data-snapshot.json`，至少包括：

```json
{
  "snapshot_id": "provider-venue-dataset-utc-range-hash",
  "provider": "CryptoHFTData",
  "client_version": "...",
  "access_method": "python-sdk|rest|s3",
  "exchange": "...",
  "market_type": "spot|derivatives",
  "data_types": ["trades"],
  "symbols": ["BTCUSDT"],
  "requested_interval_utc": ["...", "..."],
  "obtained_files": [],
  "missing_files": [],
  "schema_digest": "...",
  "gap_check_at_utc": "...",
  "quality_status": "ACCEPTED_WITH_LIMITATIONS",
  "limitations": []
}
```

文件列表中的每个对象应记录路径、大小、SHA-256、行数、首尾时间、下载时间和实际 schema 摘要。不要把 API key、临时 S3 secret 或完整认证响应写入快照。

## 2. 与研究和运行事件关联

回测、shadow 和 dry-run 的 `run-manifest.json` 或结构化事件应携带：

```text
data_snapshot_id → feature/build version → signal → risk.decision → order plan
```

数据转换、过滤、去重、重采样、填补和单位换算都要有版本或配置指纹。原始文件保留在受控数据目录，派生文件不能覆盖原始数据。

## 3. 修订管理

每次研究重跑前检查供应商的数据缺口和修订页。若文件沿用相同对象路径但内容可能改变，必须重新校验哈希并生成新的 snapshot ID。受影响实验应标记旧结果是否失效、是否重跑以及新旧结果差异；不能静默覆盖研究报告。

## 4. 交付报告

研究交付至少同时提供：请求范围、获得范围、缺口、质量状态、数据快照文件、转换代码版本、关键单位和时钟假设、已知修订、未验证项。这样代理或复核者无需依赖聊天记录即可复现数据入口和判断结果边界。
