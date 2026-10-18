# 市场数据源适配

数据源是研究系统的适配层，不是策略经济逻辑的一部分。策略代码应消费经过验证的规范化事件或表，并保留来源字段与原始对象定位；更换供应商时，只替换适配、标准化和质量检查，不改变信号定义。

## 1. 最小数据契约

每次研究先声明：

- 供应方、交易所、市场类型、品种和数据集；
- UTC 起止边界、事件时钟（event time 或 receive time）、允许数据年龄和 join 容忍度；
- 数量、价格、名义价值、合约乘数、费率和资金费的单位；
- 获取方式、客户端/API 版本、查询参数、对象路径和数据快照 ID；
- 已知缺口、修订状态、schema 版本与研究允许的 partial-data 行为。

不要从 symbol 名称推断市场身份、合约规格、历史连续性或数据存在；必须通过供应商的发现接口和实际文件验证。

## 2. CryptoHFTData 适配器

CryptoHFTData 适合历史加密资产研究和回放，提供逐笔 trades、L2 orderbook、ticker、mark price/funding、open interest、liquidations 等数据，覆盖 spot 与 derivatives 的多个交易所。数据通常按 UTC 小时拆分为 Parquet/Zstd 文件，可用 Python SDK、REST API 或 S3/Flat File 获取。

推荐路由：

1. 用当前文档、SDK 元数据和 symbols discovery 确认精确 exchange ID、data type 和 symbol。
2. 检查目标小时的 publication/ingestion status；它只说明发布健康，不证明某个品种的历史完整性。
3. 先获取一个小时文件，检查实际 schema、行数、时间范围、字段精度和时间单位。
4. 研究级批量任务先 dry-run，估算文件数、字节数、磁盘和并发；再用有界并发下载并保存失败对象清单。
5. 研究结果记录对象路径、下载时间、哈希、SDK/API 版本、数据缺口和 correction/gap 页面检查时间。

访问方式按规模选择：Python SDK 适合 DataFrame/Notebook；REST 适合精确文件与跨语言脚本；S3/Flat File 适合多品种、多日期和列式本地查询。匿名 REST 访问存在限流，应读取 RateLimit/Retry-After，不能无限重试。

## 3. 数据集到研究问题

| 数据集 | 适合问题 | 必须保留的边界 |
|---|---|---|
| trades | 订单流、成交方向、成交量、逐笔回放、局部聚合 bar | maker/taker 与 aggressor side 语义；数量单位；成交 ID 缺口和重复 |
| orderbook | spread、可见深度、盘口失衡、可见滑点 | snapshot/update、序列号、reset、重连和 replay 有效性 |
| ticker | 交易所滚动统计和市场状态辅助变量 | 不是 best bid/ask，也不是 finalized OHLCV；不能累加重叠 rolling volume |
| mark_price | mark/index/basis、资金费上下文、清算风险 | funding 是观察值还是结算值；公布时间；下一次 funding 时间 |
| open_interest | 未平仓规模、OI-price-volume 联动 | base/contracts/notional 单位；OI 变化不等于成交量或多空方向 |
| liquidations | 强平事件、压力和级联研究 | order quantity 与 filled quantity；来源可能不完整或聚合 |

CryptoHFTData 的字段、单位和历史行为会随交易所和数据修订变化。实际下载文件 schema 与对应交易所 Wire Format 文档优先于通用示例；不得把统一列名误认为统一经济含义。

## 4. 明确排除

该适配器只提供数据和访问工具，不提供下单、钱包、账户管理、回测引擎或盈利保证。实时 liquidation feed 只能用于当前监控或事件观察；历史回测使用历史文件，不能把实时缓冲区当完整历史。
