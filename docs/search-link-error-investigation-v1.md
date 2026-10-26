# Search 链路异常与压力测试调研方案 v1

日期：2026-10-19。代码基线：`f1af0ca`。

本版本完成静态代码调研与测试设计；未修改搜索或 UI 代码，未调用线上 API、注入故障或执行压测。代码观察与待复现风险分别标注，不能将本方案视为测试结果。

## 1. 需求和范围

- 团队请求：把 **Database 移到 Dataset type 正下方**，位于 Taxa 折叠区之前。
- 先厘清搜索依赖、错误路径和回归范围，再决定具体实现及测试执行。
- 暂将 “link error” 理解为请求链路异常；同时覆盖分享／直达 URL、搜索结果到 dataset 详情、DOI 等链接异常。如果团队已有具体报错链接、操作步骤或截图，应先用它建立首个复现用例。
- 分开衡量：异常处理是否正确、快速操作是否产生状态错乱、服务在并发下的容量。仅增加请求量无法验证前两项。

## 2. 已确认的代码结构

| 环节 | 当前行为 | 代码入口 |
| --- | --- | --- |
| 搜索入口 | Toolbar 创建 `neotoma/search/All`；当前模板为 advanced search | `neotoma/form/Toolbar.js:283`、`neotoma/search/template/all.html` |
| Dataset type | 位于顶部；变化后清理 Taxa，加载 TaphonomySystems，并更新 taxon store | `neotoma/search/All.js:100` |
| Database | 位于 Metadata；加载 ConstituentDatabases，用 databaseid 作为标识 | `neotoma/search/template/metadata.html:15`、`neotoma/search/Metadata.js:287` |
| 参数组装 | Dataset type 为顶层 `datasetTypeId`；Database 为 `metadata.databaseId`；另有 taxa、time、space、tokens | `neotoma/search/All.js:189`、`neotoma/search/Metadata.js:181` |
| 主搜索 | JSONP GET `/v1.5/apps/Search`，把完整参数 JSON 编入 `search` query | `neotoma/search/All.js:230` |
| 成功结果 | 发布 NewResult，创建搜索记录并把站点加载到地图；界面允许保留多个搜索 | `neotoma/app/app.js:187` |
| 直达链接 | 支持 datasetids、siteids、search 中的 databaseId/personId 等入口 | `neotoma/app/app.js:256`、`neotoma/app/neotoma.js` |
| 网络实现 | 使用仓库自带的 Dojo 1.9.3 request/script 和 request/watch | `js/dojo/1.9.3/dojo/request/script.js`、`watch.js` |

主流程：打开搜索 → 加载字典 → 设置筛选及联动 → 组装参数 → StartBusy → JSONP Search → 处理结果 → NewResult → 搜索列表与地图 → 详情及相关链接。

默认 API 地址在 `index.html:31` 指向 `https://api.neotomadb.org/`。本地启动网页并不等于请求隔离；测试入口必须显式拦截请求或指向专用环境。

仓库另有 Basic、working、before 等文件；不根据文件名假定它们是活动路径，不把备份文件纳入本次修改范围。当前未发现 package.json 或现成测试入口；执行前需建立独立测试装置。

## 3. Database 上移的实施调研

目标顺序：Dataset type → Database → Taxa → Time → Space → Metadata。

Database 当前同时参与 Metadata 的初始化、clearAll 和参数读取，直接将 select 从 metadata.html 剪切到 all.html 会改变 attach-point 所属组件，可能使 `this.database` 失效。

建议评估两种实现：

| 方案 | 优点 | 必须验证 |
| --- | --- | --- |
| 移动原有控件 DOM，保留 Metadata 的控件引用 | 参数来源与字典加载逻辑改动少 | Dojo 生命周期、销毁与重开、Tab 顺序、布局和样式；不能仅以视觉正确判定通过 |
| 将 Database 的所有权迁到 All | 控件归属与页面结构一致 | 同步迁移加载、清空、取值逻辑；继续输出原有 `metadata.databaseId`，不得创建第二套值来源 |

先用隔离原型验证第一种的生命周期；若依赖跨组件 DOM 导致不稳定，选择第二种。此处是候选方案，尚未实现或确认兼容性。

接口契约：不新增 Dataset type → Database 的筛选依赖；保持原有 databaseid、空值省略及查询语义。同一组输入在移动前后的规范化 Search 参数必须一致（排除 JSONP callback 和动态日期差异）。

最小回归：仅选 Database、仅选 Dataset type、两者组合、与每个折叠区组合、Clear all、折叠／展开 Metadata、关闭重开、窗口缩放、键盘 Tab、数据库字典加载失败及晚到。确认 Database 始终只有一份控件，且不会随 Metadata 折叠而隐藏。

## 4. 优先风险清单

| 优先级 | 静态观察 | 待复现的用户影响 |
| --- | --- | --- |
| P0 | All.doSearch 成功回调先发布 StopBusy；失败回调仅 alert，没有 StopBusy | 请求失败后可能持续 loading，无法继续搜索 |
| P0 | 主请求未设置 timeout；本地 request/watch 仅在传入 timeout 时设置超时起点，JSONP 依赖 callback 完成 | 请求挂起、返回普通 HTML 或 callback 未执行时可能无法结束等待 |
| P1 | datasetTypeChanged、Space.unit1Changed/unit2Changed 的异步回调未见请求代次校验 | 快速切换 A→B，A 晚返回后可能覆盖 B 的选项 |
| P1 | DatasetTypes、ConstituentDatabases 等初始化调用仅提供成功回调 | 字典失败后可能表现为空列表，与“没有数据”难以区分；需检查恢复路径 |
| P1 | 主搜索未见显式进行中请求计数／取消；loading 由公共 topic 控制 | 若能产生重叠请求，先完成的请求可能提前结束 loading；需先验证正常 UI 能否触发 |
| P1 | 直达 search 参数在匹配关键字后直接 JSON.parse 并读取 metadata | 畸形 JSON、错误结构或错误类型的链接可能中断初始化 |
| P1 | Search 将筛选 JSON 放在 GET URL 中 | 大量 taxa／空间条件可能触发 URL 长度边界；实际限制需由网关与后端配置确认 |
| P2 | NewResult 发布 `request: this.searchRequest`，All.js 中未见该字段赋值 | 搜索记录中的请求信息可能缺失；需跟踪其消费者后再判断影响 |

上述优先级是调研排序，不是已验证的事故等级。特别注意：多次有意搜索本来会新增多个结果；不能直接引入“只保留最后一次搜索”的规则。联动选项应与当前选择一致，搜索结果则应正确对应各次提交。

## 5. 测试设计

### A. 正常基线与参数契约

准备固定、脱敏的响应 fixtures 和预期 siteid/datasetid 集合，避免线上数据变动干扰比较。覆盖：空条件（tokens 为空／非空）、单条件、两两组合、一个全条件组合、零结果、正常多结果；同时覆盖时间边界、自定义提交日期及无效输入。记录每次请求、响应、搜索名、结果 ID 集合与数量，而不只比对总数。

### B. 链路故障矩阵

| 场景 | 注入方式／位置 | 检查点 |
| --- | --- | --- |
| 断网、请求中断、持续 pending | 字典、Search、详情分别注入 | 是否结束忙碌状态、保留输入、说明失败；恢复后能否再次操作 |
| 延迟与乱序 | A 延迟 5 秒，B 延迟 0.2 秒；切换类型／地区、Clear all 后让旧响应到达 | 当前选项不被过期响应污染；每次搜索结果仍绑定自己的提交 |
| HTTP 404/429/500/502/503 | 测试服务分别返回状态码及不同响应体 | 浏览器实际收到什么、是否有 callback、提示及恢复行为；不能假定 JSONP 能读取状态码 |
| HTTP 200 但业务失败 | 合法 callback 包裹 success:false | 不新增伪成功结果、loading 可结束、筛选可保留 |
| JSONP 协议异常 | 不调用 callback、错误 callback、普通 JSON、HTML、截断脚本 | 能识别失败或在约定等待上限后退出；记录 pending 和脚本异常 |
| 数据结构异常 | data 缺失／null／错误类型、site.datasets 缺失、部分记录损坏 | 不静默显示不完整成功结果，列表与地图状态一致 |
| 结果渲染失败 | 在本地装置使列表或地图阶段失败 | 能区分 API 成功与页面渲染失败，检查是否留下半完成结果 |
| 链接异常 | 无效／不存在／重复 IDs，畸形 search JSON，metadata 缺失，错误编码 | 页面仍可恢复，提示可理解；不把无权限与不存在混为一谈 |
| 结果／外部链接异常 | dataset 详情、DOI、下载地址的本地模拟失败 | 原搜索结果保留；区分站内错误与第三方不可用 |

故障注入需覆盖浏览器发出的 script 请求，而不只拦截 fetch/XHR。成功 fixture 必须读取当次 callback 参数并返回合法调用。HTTP 状态和 JSONP 是否完成分别记录；持续 pending 由测试装置设置观察截止时间，不能因此声称应用已有 timeout。

### C. 操作与容量压力分开执行

1. 本地交互压力：快速切换筛选、重复点击、搜索中关闭／重开、清空后再搜；每组先 10 次，再 50 次。重复提交是否可由实际 UI 产生要单独记录，不能把直接调用内部函数的结果当作用户操作复现。
2. 本地渲染压力：使用 100／1,000／10,000 个站点的合成响应，分别改变每站 dataset 数；记录结果表、地图和重复搜索／删除后的资源变化。这是合成规模探索，不代表生产规模或容量承诺。
3. 隔离环境服务负载：先 1 个虚拟用户，再 2、5、10 个；每档建议 5 分钟，用户操作间隔 2–5 秒，同时设请求速率硬上限。实际上限由服务负责人根据环境容量确定后写入运行配置。记录请求并发和 RPS，不能只记录虚拟用户数。
4. 负载混合：普通查询为主、组合查询及大结果查询为辅；先单独测正常负载，再加入 1%／5%／20% 的可控故障。前端恢复用浏览器验证，服务吞吐用协议层测量；两者结果不可互相替代。

不对公共生产 API、地图瓦片、DOI 或第三方站点做压力请求。测试运行前列明允许的目标地址并阻止其他出站请求；生产容量测试另行由服务负责人确定窗口和预算。

## 6. 指标和通过条件草案

- 正确性：固定输入的参数契约和结果 ID 集合 100% 符合基线；列表、地图与搜索记录无串用、非预期重复或遗漏。
- 恢复性：每个失败场景记录从触发到提示／退出 loading 的时间；网络恢复后，用户能保留或重新选择条件并成功提交。最大等待时间尚需产品与服务负责人结合基线确定，未确定前不宣称通过。
- 并发一致性：联动控件与当前选择一致；每次有意提交均有可追踪的终态；是否禁止重复提交需先确定交互约定。
- 性能：分别统计 API 完成耗时和端到端可交互耗时的 p50/p95/p99、吞吐、非注入错误率、pending 数；注入错误不混入服务正常失败率。只有样本量足够时才解释分位数。
- 资源：服务侧 CPU、内存、连接池、队列及慢查询（需后端观测权限）；浏览器记录长任务、内存趋势、存留控件／script 数量和 UI 卡顿。不能只凭前端响应时间定位数据库问题。
- 暂定停测线：出现未注入错误率 >5% 持续 1 分钟、p95 超过本轮基线 3 倍持续 1 分钟、监控触发负责人约定的资源告警、结果错误、浏览器失去响应或请求落到非测试地址时，立即停止加压并保存证据。这些是保守运行边界，不是产品 SLO。

每条证据包含：case ID、代码版本、目标环境、时间、筛选参数快照（去掉 tokens）、请求序号、故障配置、预期／实际结果、console 与网络记录、恢复操作。HAR、query 和日志在分享前移除访问 tokens。

## 7. 执行顺序与交付物

| 阶段 | 工作 | 出口 |
| --- | --- | --- |
| 0：当前版本 | 静态链路梳理、风险登记、测试矩阵 | 本文；尚无运行结论 |
| 1：建立基线 | 补充真实 link error 示例，确认预期行为；建立本地 fixture／故障装置与参数快照 | 可重复的正常用例、目标白名单、测试记录模板 |
| 2：优先复现 | 先测 loading、callback 缺失、字典失败、乱序、畸形链接 | 每个问题有最小复现与影响范围，区分缺陷和产品规则空白 |
| 3：Database 原型 | 验证控件迁移候选方案与生命周期，执行参数等价及布局回归 | 独立的小改动及验证证据，不夹带搜索语义重构 |
| 4：隔离压力 | 在目标环境和监控就绪后分档运行，触发停测线即停止 | 吞吐／延迟曲线、瓶颈证据、容量边界及恢复记录 |
| 5：修复评审 | 按实测证据拆分 timeout/loading、联动乱序、URL 解析等修复 | 各自独立、可回滚的修改与回归结果 |

建议先完成阶段 1–2，再决定代码调整。正式执行前需补齐：link error 的实际含义和案例、测试环境与负责人、容量预算及停测监控、期望等待上限、重复搜索约定。当前可直接推进的是本地隔离装置和基线设计；不因缺少容量数据而猜测生产压测参数。
