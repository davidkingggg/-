# 第 1–9 阶段总交接文档

更新时间：2026-05-10
稳定基线：`phase-9c-complete`（提交 `46a7f16`）

## 当前状态

本项目已完成第 1–9 阶段的本地单人版集成采购工作库建设。当前总验收标签为 `phase-9c-complete`。

- `npm run prisma:migrate` — Already in sync，最后 migration 为 Phase 出（2026-05-09）
- `npm run prisma:seed` — 通过（幂等）
- `npm run lint` — 通过（0 errors，仅预存 4 个 warning）
- `npm run build` — 通过（Turbopack + TypeScript）
- `git diff --check` — 通过
- `git status --short` — 空

已知非阻断事项：

- `npm run lint` 保留 4 个既有 warning（3 个来自 Phase 8D archive API 的 eslint-disable 指令，1 个来自 DevelopmentProcessForm），均非 9C 引入。
- Turbopack build 有一条无关 NFT list 警告（来自 `lib/backup-utils.ts` 的文件系统操作），不影响构建。

## 阶段与标签

| 阶段 | 提交 | 标签 | 主要交付 |
|------|------|------|----------|
| 第 1 阶段 | 初始 | — | 项目基础、文档基线、Next.js + Prisma + SQLite |
| 第 2 阶段 | `28e4326` | `phase-2-complete` | 系统设置、品类、人员、供应商、联系人、风险标签、种子数据 |
| 第 3 阶段 | `208333d` | `phase-3-complete` | 报价单 CRUD、报价明细、CSV 导入导出、逻辑归档 |
| 第 4 阶段 | `d3901b5` | `phase-4-complete` | 报价对比、代表报价、价格统计、CSV 导出 |
| 第 5 阶段 | `0bc2339` | `phase-5-complete` | 供应商评分（七大维度）、自动评级同步、调研/考察记录 |
| 第 6 阶段 | `f69c4a6` | `phase-6-complete` | 供应商开发看板、采购执行看板、流程规范校验 |
| 第 7A | `e4ad51a` | `phase-7a-complete` | 待办中心（多源聚合） |
| 第 7B | `c1bd39c` | `phase-7b-complete` | 老板汇报（自动汇总，Markdown/CSV 导出） |
| 第 7C | `dc7278a` | `phase-7c-complete` | 行政事项模块 |
| 第 7D | `9608a0f` | `phase-7d-complete` | 销售/商务资料模块 |
| 第 7E | `fac121e` | `phase-7e-complete` | 首页仪表盘统计增强 |
| 第 7 总验收 | `fac121e` | `phase-7-complete` | 7A–7E 总体验收 |
| 第 8A | `7a51b3a` | `phase-8a-complete` | 数据质量检查仪表盘 |
| 第 8B | `fb2121e` | `phase-8b-complete` | 本地数据库备份与恢复 |
| 第 8C | `3120aed` | — | CSV 导入导出加固、模板下载、错误报告 |
| 第 8D-1 | `c46fe6b` | `phase-8d-1-complete` | 数据质量检查增强与 CSV 导出 |
| 第 8D-2 | `5153210` | `phase-8d-2-complete` | 备份恢复运维基线补齐 |
| 第 8D-3 | `167fd9f` | `phase-8d-3-complete` | CSV 导入导出回归样例库 |
| 第 8D-4 | `783d672` | `phase-8d-4-complete` | 归档数据查看与恢复 |
| 第 9A | `f15f89c` | `phase-9a-complete` | 供应商 CSV 正式导入 |
| 第 9B | `49ba6ce` | `phase-9b-complete` | 附件路径中心 |
| 第 9C | `46a7f16` | `phase-9c-complete` | 品类商务支持资料包 |

## 数据模型总览（16 张表）

### 核心主数据

- **Category**：品类，作为供应商、报价、评分、调研、开发流程、采购流程、销售资料的主分类。含 `isArchived` / `archivedAt`。
- **Supplier**：供应商，归属一个品类，关联联系人、风险标签、报价、评分、调研、流程。含归档字段。
- **Person**：内部人员，用于负责人、需求提交人、销售/商务配合人员、评分人等。使用 `isActive` 停用。

### 业务记录

- **QuoteSheet / QuoteItem**：报价单及报价明细。报价对比基于明细的 `compareKey` 和报价日期取代表报价。含归档字段。
- **SupplierScore**：供应商评分（七大维度 100 分制），自动计算并同步推荐等级。含归档字段。
- **InvestigationRecord**：供应商调研/考察记录。含归档字段。
- **SupplierDevelopmentProcess**：供应商开发流程，跟踪线索收集到推荐入库全流程。含归档字段。
- **PurchaseExecutionProcess**：采购执行流程，含金额/合同/发票/到货/验收字段。含归档字段。
- **AdminTask**：行政事项，独立于供应链主线。含归档字段。
- **SalesMaterial**：销售/商务资料，含核心卖点/优势/风险提示/正式正文。含归档字段。

### 辅助数据

- **SupplierContact**：供应商联系人，一个供应商可多个。含归档字段。
- **RiskTag / SupplierRiskTag**：供应商风险标签（多对多）。
- **SystemSetting**：系统键值配置。
- **Attachment**：附件路径记录，通过 `relatedType` + `relatedId` 关联到任意业务对象。含归档字段。**仅管理路径，不处理真实文件。**

### 归档覆盖

全部核心表（除 Person、RiskTag、SupplierRiskTag、SystemSetting 外）均使用 `isArchived` + `archivedAt` 逻辑归档。Person 使用 `isActive` 替代。全系统无物理删除行为。

## 功能模块全景

### 页面（27 个路由）

| 路由 | 功能 | 阶段 |
|------|------|------|
| `/` | 首页仪表盘 | 7E |
| `/tasks` | 待办中心（多源聚合） | 7A |
| `/categories` | 品类管理 | 2 |
| `/suppliers` + `/new` + `/[id]` | 供应商管理 | 2 |
| `/people` | 人员管理 | 2 |
| `/settings` | 系统设置 | 2 |
| `/quotes` + `/new` + `/[id]` | 报价管理 | 3 |
| `/quote-compare` | 报价对比 | 4 |
| `/scores` + `/new` + `/[id]/edit` | 供应商评分 | 5 |
| `/investigations` | 调研/考察记录 | 5 |
| `/development-board` | 供应商开发看板 | 6 |
| `/purchase-board` | 采购执行看板 | 6 |
| `/boss-report` | 老板汇报 | 7B |
| `/sales-materials` | 销售/商务资料 | 7D |
| `/admin-tasks` | 行政事项 | 7C |
| `/data` | 数据导入导出 | 8C |
| `/data-quality` | 数据质量检查 | 8A |
| `/backup` | 本地备份恢复 | 8B |
| `/archive` | 归档数据管理 | 8D-4 |
| `/attachments` | 附件路径中心 | 9B |
| `/category-package` | 品类商务支持资料包 | 9C |

### API 端点（48 个）

CRUD 覆盖全部实体 + 导入/导出/对比/备份/数据质量/归档恢复/资料包生成。

### 工具库（16 个 lib 模块）

| 模块 | 用途 |
|------|------|
| `db.ts` | Prisma Client 单例 |
| `csv-utils.ts` | CSV 解析/校验/导出/错误报告（含 BOM/转义/日期/布尔/税率/数值解析） |
| `csv-template-utils.ts` | CSV 模板定义和下载（报价明细 + 供应商） |
| `price-utils.ts` | Decimal 安全转换、价格格式化 |
| `quote-compare.ts` | 代表报价计算 |
| `score-utils.ts` | 评分计算、等级判定、供应商推荐等级同步 |
| `boss-report-utils.ts` | 老板汇报数据聚合 |
| `sales-material-utils.ts` | 销售资料筛选/格式化/导出 |
| `dashboard-utils.ts` | 仪表盘统计 |
| `data-quality-utils.ts` | 数据质量检查引擎 |
| `backup-utils.ts` | 本地备份文件管理 |
| `task-aggregation.ts` | 待办多源聚合 |
| `task-status-utils.ts` | 流程状态判断 |
| `workflow-constants.ts` | 流程枚举常量（开发阶段/采购阶段/优先级/状态） |
| `workflow-validation.ts` | 流程校验（供应商/品类存在性和归档状态） |
| `category-package-utils.ts` | 品类资料包数据查询和 Markdown/CSV 渲染 |

## 关键业务口径

### 待办中心口径

- 数据来源：供应商开发流程 + 采购执行流程 + 行政事项
- 默认只展示 `isArchived=false` 且状态未关闭的事项
- 本周待办、超期待办、老板决策、销售配合、行政事项分区由 `lib/task-aggregation.ts` 聚合
- 7E dashboard 复用同一聚合工具，避免口径漂移

### 老板决策口径

- `needBossDecision=true`、`isArchived=false`、状态未关闭
- 供应商开发流程排除"已完成"和"淘汰"
- 采购执行流程排除"已完成"
- 不因创建日期不在本周而漏掉当前仍需决策的事项

### 报价对比口径

- 同一 `compareKey` 下同一供应商仅取最新一条记录作为"代表报价"
- 指定报价阶段时仅在该阶段内取最新
- 严格排除已归档数据

### CSV 导入事务模式

- 报价 CSV 和供应商 CSV 均采用严格事务模式
- 导入前全量校验所有行，任意错误整文件失败
- 不写入任何部分数据
- 失败时返回结构化中文错误报告（行号/字段/原始值/错误原因/修改建议）

### 供应商 CSV 导入规则

- 供应商名称标准化（trim）比较，CSV 内部重复和系统已有重名均报错
- 每行最多创建 1 个 Supplier 和 0/1 个 SupplierContact
- 不自动创建品类，不自动合并或更新已有供应商

### 归档恢复规则

- 每次仅恢复单条记录，需输入"确认恢复"短语
- 恢复仅设置 `isArchived=false, archivedAt=null`
- 不做批量恢复，不做级联恢复
- 恢复 QuoteSheet 时提示不自动恢复其下已归档明细
- 恢复 SupplierScore 时自动调用 `syncSupplierRecommendedLevel`

### 品类资料包口径

- 单品类，仅未归档数据
- 报价受可选日期范围筛选
- CSV 导出：一行一供应商，报价取最近报价单最低价，评分取最新评分
- 风险标签/推荐等级/评分等级始终展示，内部备注受 `includeNotes` 控制
- 附件路径仅为数据库记录引用，不读取真实文件

## 归档与备份策略

### 逻辑归档

- 全部核心表使用 `isArchived` + `archivedAt` 逻辑归档
- 列表页默认隐藏已归档数据
- 销售/商务资料支持 `includeArchived` URL 参数切换
- `/archive` 页面统一查看和恢复已归档记录（10 种对象类型）
- 不支持物理删除

### 数据库备份

- `/backup` 页面创建 SQLite 数据库备份
- 备份范围：仅 `prisma/dev.db`，不包含附件文件、环境、依赖
- 恢复前自动创建 `before-restore` 安全备份
- 恢复后需停止并重启本地开发服务
- 文件名白名单 + 路径穿越拦截 + 确认短语校验

## 运行与验证说明

当前环境可优先使用便携 Node：

```powershell
$env:Path = "d:\Agents\Antigravity\node-v20.18.0-win-x64;" + $env:Path
```

常用验证命令：

```powershell
npm run prisma:migrate
npm run prisma:seed
npm run lint
npm run build
git diff --check
git status --short
```

Prisma 说明：

- 数据库使用 SQLite，本地文件由 `prisma/schema.prisma` 的 datasource 指定
- 种子脚本 `prisma/seed.ts` 设计为幂等，可重复执行
- 当前最后 migration 为 `20260509171849_add_quotesheet_number_title`（Phase 7 时期）
- 第 8–9 阶段均未新增 migration

Next.js 说明：

- 项目使用 Next.js 16 App Router
- 编码前需遵守根目录 `AGENTS.md`：先查 `node_modules/next/dist/docs/` 中相关文档
- API Route Handler 位于 `app/api/**/route.ts`

## 明确未引入范围

截至第 9 阶段总验收，项目未引入以下能力：

- 登录权限 / 多用户
- 多人实时协作
- 文件上传（服务器端）
- AI 自动评分 / 自动总结
- Word / PDF / PPT / ZIP 导出
- 手机端适配
- 复杂统计图表
- 拖拽看板
- 自动提醒通知
- 云服务 / 内网服务器部署
- 物理删除数据
- 真实附件文件处理（上传/下载/预览/扫描/打包）
- 批量恢复 / 批量删除 / 自动恢复 / 级联恢复归档

## 已知边界与风险

- Attachment 表仅管理路径记录，不校验物理文件是否存在
- 供应商 CSV 导入不支持更新已有供应商，仅做新增
- 品类资料包限于单品类，不做多品类/客户/项目维度
- 附件路径中心不检查文件是否存在，关联对象跳转仅支持 QuoteSheet 和 Supplier
- 备份仅覆盖 SQLite 数据库，不打包附件物理文件

## 后续候选方向

以下方向供参考，不构成承诺或阶段定义：

- 种子数据更新（匹配最新供应商导入能力）
- 全流程回归测试扩展
- 供应商 CSV 导入支持更新已有记录
- 多品类对比资料包
- 附件路径批量校验辅助工具
- README 常见问题补充
- DEVELOPMENT_PLAN.md 补齐第 9 阶段条目

## 维护原则

- 优先保持本地单人工作库定位，避免过早平台化
- 修改业务口径时，应同步更新对应工具函数和文档
- 待办、老板汇报、首页 dashboard 应复用底层统计工具
- 不修改已完成阶段功能，除非是明确 bug 修复或构建阻断
- 新阶段开发前先写范围边界，再实现
- 删除默认使用逻辑归档，不物理删除数据
- 不修改 Prisma schema 时不应新增 migration
