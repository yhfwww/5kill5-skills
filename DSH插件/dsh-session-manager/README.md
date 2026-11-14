# 会话管理（@local/dsh-session-manager）

DSH Web UI 的会话管理插件，第 1 版（第 2 次迭代）。

适用版本：DeepSeek Harness（DSH）0.2.2-rc.1 及同代版本。

## 安装（给新用户）

**方式一（推荐，任何 DSH 用户通用）**：解压本包，在 DSH 会话里对 agent 说：

> 用 plugin_manager 的 install_bundle 安装这个目录：`<解压后的目录路径>`

装完**刷新一次页面（F5）**——新装插件的客户端模块需要一次页面加载才会生效。

**方式二（手动，进阶）**：编辑你的 profile 的 `package.json`
（`<DSH_HOME>/profiles/<profile 名>/package.json`）：

- `dependencies` 增加：`"@local/dsh-session-manager": "link:<解压目录绝对路径>"`
- `dsh.profile.bundles` 数组增加：`"@local/dsh-session-manager"`

然后在 profile 目录执行 `pnpm install`，重启 DSH。

> `@local/` 是本地作用域命名约定，不影响他人安装使用。
> 若将来要发布到 npm 供他人从 GUI 的「插件 → 添加插件」直装，
> 把包名换成自己的 scope、删掉 `private` 字段即可。

**卸载**：插件管理页找到「会话管理」→ 卸载；或让 agent 执行 plugin_manager 的
`remove_bundle`（`@local/dsh-session-manager`）。卸载不会删除已管理过的会话数据。

许可证：MIT（见 [LICENSE](LICENSE)）。

## 入口

侧边栏底部、设置旁边的 **会话管理** 按钮（侧边栏收起时只显示图标），点击后打开独立的中央面板（`main` 槽位，key `session-manager`），不再是设置里的子页面。

若主面板选择不可用（`layout` 服务缺失或 `selectPanel` 抛错），同一个页面会退回 `shell.overlay` 的全窗口覆盖层显示，按钮不会"点了没反应"。

面板右上角有 `刷新` 和 `返回对话`（回到当前会话 / 关闭覆盖层）。

## 语言

插件界面文案固定为中文：`zh` 字典是唯一注册的字典，也是所有语言环境下的兜底文案（英文界面下同样显示中文）。`locale/en.json`、`locale/zh.json` 只保留给插件清单/详情页的元数据用。

## 功能

- 列出当前应用可见的全部已保存会话，按最近活动排序；每行显示标题、工作目录、更新时间、事件数/大小，以及 `运行中`、`打开中`、`子会话`、`空会话` 标记。
- **点击任意一行查看详情**（独立详情视图）：
  - 会话 ID、工作目录、创建时间、最近活动、日志文件绝对路径、事件数、文件大小、格式迁移标记；
  - 上级会话（可点开）、直接子会话（可点开）；
  - 最近 20 条可读消息（用户/助手/工具，跳过后注入的 user-role 上下文），有更早消息时提示；
  - `返回会话列表`、`删除该会话`；被当前应用打开过的会话会在这里**直接写明为什么不能删**。
- 删除需要二次确认：点 `删除` / `删除该会话` → 屏幕上居中的**确认弹窗**（写明标题、"无法恢复"、若带子会话写明数量）→ 再点 `确认永久删除`；点遮罩或按 `Esc` 取消。弹窗是固定定位的模态层，不随页面滚动跑出视野。

## 实现方式

DSH 没有删除会话的 API（会话持久化是只追加的），所以：

- **Host 半**（`index.js`）注册三条需要浏览器身份鉴权的 JSON 路由：
  - `GET /api/session-manager.list`：`sessionController.list` + `sessionQuery.readTitleSnapshots` + `sessionPersistence.list` 组合成列表；
  - `GET /api/session-manager.detail?id=<id>&limit=<n>`：`sessionPersistence.stat`（路径/大小/格式）+ `sessionController.events`（最近消息页）；
  - `POST /api/session-manager.delete`：定位会话的 JSONL 日志目录并整目录删除。
- **Client 半**（`client.js`）注册 `main`（key `session-manager`）与 `sidebar.footer.action`，用同源 `fetch` 调这些路由，文案走 Client locale 服务（中/英）。

## 删除的安全检查（全部通过才动磁盘）

1. 会话 id 只接受安全字符集；
2. 根会话在当前进程里仍是 live Session → 拒绝；会话树里任何会话 live → 整棵树拒绝；
3. 每个待删会话都必须有落盘位置，且文件名是 `session.jsonl` / `session.vN.jsonl[.zstd]` 这类规范名；
4. 每个会话目录必须独占（没有树外会话共用同一目录）；
5. 目录里除了日志文件和 `session.lock` 不能有其它东西；
6. 全部校验完成后，先用 `workspaceRegistry.archiveSession` 把这些会话从应用的侧边栏隐藏（这一步会走应用自己的归档通道，所以**侧边栏立刻同步，不用重启**），再删目录，最后 `unarchiveSession` 把归档集合清干净——此时会话日志已不存在，registry 读取时会把这个失效 id 过滤掉；
7. 归档时若报 `WorkspaceActiveSessionError`（还有后台任务/子会话在跑），整次删除放弃并回滚已归档的会话；
8. 删完顺手清理空的工程目录。registry 不可用时仍会删文件，但返回 `warning`，前端提示"侧边栏可能需要刷新"。

## 已知限制

- **打开中的会话不能删**：被当前应用 resume 过的会话仍是 live Session，直到应用重启才释放。UI 标为 `打开中` 并禁用删除。
- **不清理全文搜索索引**：`session-query-sqlite` 的索引可能暂时仍能搜到已删除会话，直到索引重建。
- **侧边栏可能需要刷新**：会话条目来自 workspace registry，读取时会过滤掉日志已不存在的会话；刷新页面后侧边栏才会同步。
- 列表与侧边栏同源（`sessionController.list`），已归档（archive）的会话不在其中。
- 详情里的"最近消息"只取当前 surface 的 20 条（可被 compaction 替换过），不是完整历史；完整历史请用导出功能。

## 文件

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半：三条鉴权 Fetch 路由、详情组装与删除逻辑 |
| `client.js` | Client 半：中央面板、详情视图、二次确认、locale 字典 |
| `cordis.patch.yml` | 插入 Loader 行 `dsh-session-manager` |
| `locale/{en,zh}.json` | 插件元数据（标题/描述） |
| `icon.svg` | 插件图标 |

安装：`plugin_manager` → `install_bundle`，目标为当前目录。
