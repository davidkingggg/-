# 第 1-7 阶段总交接摘要

更新时间：2026-05-10

## 当前状态

本项目已完成第 1-7 阶段的本地单人版集成采购工作库建设。当前总验收标签为 `phase-7-complete`，位于提交 `fac121e feat: complete phase 7e dashboard`。

当前已通过最终验证：

- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `git status --short`

已知非阻断事项：

- `npm run lint` 通过，但保留 2 个既有 warning，非 7E 引入。
- `git diff --check` 通过；之前出现过 Windows 行尾提示，不阻断验收。

## 阶段与标签

| 阶段 | 提交 | 标签 | 主要交付 |
| --- | --- | --- | --- |
| 第 1 阶段 | 无独立阶段标签 | 无独立阶段标签 | 项目基础、产品/数据/界面/测试文档基线、Next.js + Prisma + SQLite 本地应用框架 |
| 第 2 阶段 | `28e4326` | `phase-2-complete` | 基础主数据：系统设置、品类、人员、供应商、联系人、风险标签、供应商详情页 |
| 第 3 阶段 | `208333d` | `phase-3-complete` | 报价模块：报价单列表、新增、详情、明细、附件路径、CSV 导入导出、逻辑归档 |
| 第 4 阶段 | `d3901b5` | `phase-4-complete` | 报价对比：代表报价、最低/最高/平均价、CSV 导出、对比页面 |
| 第 5 阶段 | `0bc2339` | `phase-5-complete` | 供应商评分、调研/考察记录、供应商详情联动 |
| 第 6 阶段 | `f69c4a6` | `phase-6-complete` | 供应商开发流程看板、采购执行流程看板、流程校验与详情页联动 |
| 第 7A 阶段 | `e4ad51a` | `phase-7a-complete` | 待办中心：开发、采购、行政事项聚合 |
| 第 7B 阶段 | `c1bd39c` | `phase-7b-complete` | 老板汇报：周报数据、风险/决策汇总、Markdown/CSV 输出 |
| 第 7C 阶段 | `dc7278a` | `phase-7c-complete` | 行政事项模块：独立管理会议、周报、办公采购等事项 |
| 第 7D 阶段 | `9608a0f` | `phase-7d-complete` | 销售/商务资料模块 |
| 第 7E 阶段 | `fac121e` | `phase-7e-complete` | 首页仪表盘统计增强、`GET /api/dashboard`、dashboard 工具与组件 |
| 第 7 阶段总验收 | `fac121e` | `phase-7-complete` | 7A-7E 总体验收通过 |

## 数据模型总览

核心主数据：

- `Category`：品类，作为供应商、报价、评分、调研、开发流程、采购流程、销售资料的主分类。
- `Supplier`：供应商，归属一个品类，关联联系人、风险标签、报价、评分、调研、开发流程、采购流程。
- `Person`：内部人员，用于负责人、需求提交人、销售/商务配合人员、评分人等角色。

业务记录：

- `QuoteSheet` / `QuoteItem`：报价单及报价明细；报价对比基于明细的 `compareKey` 和报价日期取代表报价。
- `SupplierScore`：供应商评分，计算并同步推荐等级。
- `InvestigationRecord`：供应商调研/考察记录。
- `SupplierDevelopmentProcess`：供应商开发流程。
- `PurchaseExecutionProcess`：采购执行流程。
- `AdminTask`：行政事项，独立于供应链主线。
- `SalesMaterial`：销售/商务资料。

辅助数据：

- `RiskTag` / `SupplierRiskTag`：供应商风险标签。
- `SystemSetting`：系统设置。
- `Attachment`：附件路径记录；当前是路径/元数据管理，不是文件上传。

## 关键业务口径

待办中心口径：

- 数据来源包括供应商开发流程、采购执行流程、行政事项。
- 默认只展示未归档且未关闭事项。
- 本周待办、超期待办、老板决策、销售配合、行政事项分区由底层 `lib/task-aggregation.ts` 聚合。
- 7E dashboard 复用同一聚合工具，避免与 `/tasks` 口径漂移。

老板决策口径：

- `needBossDecision=true`。
- 来源为开发流程和采购流程。
- 未归档且状态未关闭。
- 不因创建日期不在本周而漏掉当前仍需决策的事项。

推荐/备选供应商数口径：

- `Supplier.isArchived=false`。
- `recommendedLevel in ['A优先推荐', 'B备选']`。

平台主线与行政事项：

- 平台主线工作指供应商开发和采购执行。
- 行政事项单独展示，不应被误展示为供应链主线风险。
- 综合待办可以包含行政事项，但页面文案必须明确说明。

采购异常/暂停：

- 仅统计采购执行流程中状态为 `异常` 或 `暂停` 的事项。
- 该口径用于首页风险提示，不影响采购看板原有筛选与展示。

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

- 数据库使用 SQLite，本地文件由 `prisma/schema.prisma` 的 datasource 指定。
- 种子脚本 `prisma/seed.ts` 设计为幂等，可重复执行。
- 当前第 7 阶段未新增数据库表，7E 未修改数据库结构。

Next.js 说明：

- 项目使用 Next.js 16 App Router。
- 编码前需遵守根目录 `AGENTS.md`：先查 `node_modules/next/dist/docs/` 中相关文档。
- API Route Handler 位于 `app/api/**/route.ts`。

## 明确未引入范围

截至第 7 阶段总验收，项目未引入以下能力：

- 登录权限
- 多人协作
- 文件上传
- AI 功能
- Word/PDF 导出
- 自动提醒
- 云服务
- 复杂独立 `Task` 表

这些能力如进入第 8 阶段，应先做独立方案评审，不应在维护中顺手加入。

## 第 8 阶段候选方向

以下只是候选方向，不代表已经进入开发：

- 数据质量检查：重复供应商、缺少负责人、缺少截止日期、异常状态长期未关闭等。
- 备份与恢复方案：本地 SQLite 备份、恢复演练、导出归档策略。
- 权限设计预研：如果未来多人使用，再设计角色和访问边界。
- 部署方案预研：本地单机、内网、云端部署的差异和数据安全要求。
- 导入导出增强：在现有 CSV 基础上补充更严格的模板校验和错误报告。
- 运维基线：固定 Node/Prisma/Next 版本、记录升级策略。

## 维护原则

- 优先保持本地单人工作库定位，避免过早平台化。
- 修改业务口径时，应同步更新对应工具函数和文档。
- 待办、老板汇报、首页 dashboard 应复用底层统计工具，避免重复实现。
- 不修改已完成阶段功能，除非是明确 bug 修复或构建阻断。
- 新阶段开发前先写范围边界，再实现。
