# 市场数据质量闸门

数据质量是研究准入条件。以下检查未通过时，研究可以继续作为探索性分析，但不能把结果标记为可复现回测、执行成本证据或上线依据。

## 1. 下载前

- 交易所、市场、symbol、数据集和 UTC 边界已明确；
- symbol 已通过当前发现接口确认，未从名称推断；
- 已检查数据集适用市场和目标时段的 ingestion/status；
- 已查阅供应商的 known gaps、corrections、venue notes 和版本说明；
- 已完成小样本计划并估算文件数、磁盘、并发和限流。

## 2. 文件级

每个对象至少检查：

- HTTP/下载结果和文件哈希；
- Parquet 可读性、实际 schema、行数和列精度；
- 首尾时间、时间单位、UTC 转换和文件边界；
- 重复 ID、时间逆序、空文件、null、异常数值和明显缺口；
- 请求对象、实际获得对象、失败对象和未找到对象是否分别记录。

缺失文件、空文件、字段缺失、采集器停机和“没有成交”是不同状态，不能统一转换为零。

## 3. 数据集级

- trades：检查 trade ID 连续性、重复、重连缺口和成交数量单位；
- orderbook：检查 snapshot 起点、update ID 链、sequence gap、reset、empty snapshot、crossed book；
- mark/funding：检查观察时间与结算时间，不能重复累计 indicative observations；
- open interest：检查数量单位、名义价值、采样频率和重复快照；
- liquidations：区分 order、filled、average price 和实际事件身份；
- ticker：确认所有 rolling 字段的窗口和单位，不聚合为伪 OHLCV。

## 4. 研究准入结果

研究记录必须给出以下之一：

- `ACCEPTED`：覆盖、schema、单位、时间和重放检查通过；
- `ACCEPTED_WITH_LIMITATIONS`：缺口或 partial data 已量化，并且不会破坏当前问题；
- `EXPLORATORY_ONLY`：可用于观察，但缺少完整性或语义证据；
- `REJECTED`：数据不可解释、无法重放、关键时段缺失或修订状态不明。

不要通过自动补零、前向填充或开启 partial-data 选项来掩盖缺口。若业务确实需要稠密序列，保留原始观测、单独的 imputation mask 和填补规则。
