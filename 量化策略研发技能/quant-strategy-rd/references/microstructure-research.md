# 微观结构研究

## 1. 订单簿重放

订单簿文件中的一行不必代表完整订单簿。研究实现必须按交易所文档确认 snapshot、增量更新、价格档位删除、序列号和 reset 规则，并记录每次重建的有效区间。

出现以下情况时，丢弃当前本地 book，等待下一个可验证 snapshot：

- update ID 断裂、倒退或跨序列；
- snapshot 与后续 update 无法建立顺序；
- reconnect 后状态未知；
- 盘口出现 crossed/locked 状态且没有文档化解释；
- 供应商标记该小时 replay 未验证。

只有有效 book 状态才能计算 best bid/ask、mid、spread、depth 和可见滑点。结果必须称为 visible-book estimate；它不包含隐藏流动性、队列位置、未来撤单、延迟和实际成交概率。

## 2. 成交与订单流

使用 trades 时明确选择 event time 或 receive time，并保留原始整数时间戳。maker/taker、买卖方向和 aggressor side 不能跨交易所直接类比；聚合 bar 时声明 UTC bucket 边界、重复处理、数量单位和缺口。

## 3. 资金费、OI 与清算

- funding：按结算周期和实际结算语义归一化；观察值不能重复当作现金流；
- open interest：与价格和成交量按明确容忍度做 backward as-of join；不能用未来值填补；
- liquidations：按可证明的事件身份去重；同时报告订单量和实际填充量的区别；
- 跨交易所研究：先核对合约规格、乘数、结算资产、价格标尺和费率口径。

## 4. 执行成本

从有效 orderbook 状态计算假设订单的逐档成交成本，分别记录：可见深度、未成交数量、手续费、延迟、冲击和其他市场规则。不能仅凭 candles 或 ticker 证明盘中成交顺序、队列位置或真实滑点。
