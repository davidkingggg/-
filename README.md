# Boiler Procurement DB (锅炉行业集成采购平台本地库)

## 1. 项目简介

本项目是一个本地优先的个人工作数据库系统，旨在管理"锅炉行业集成采购平台"的供应链开发和采购流程。

**当前版本**: v0.9.4
**稳定基线**: phase-9c-complete

核心功能涵盖品类管理、供应商开发、报价收集与对比、供应商评分、采购执行流程跟进、老板汇报、销售/商务资料、日常行政、数据质量检查、本地备份恢复、归档管理、附件路径管理以及品类商务支持资料包。

## 2. 技术栈

- **前端框架**: Next.js 16 (App Router), React 19, TypeScript
- **UI & 样式**: Tailwind CSS (v4)
- **数据库**: SQLite (本地存储，不使用任何云服务)
- **ORM**: Prisma

## 3. 本地运行步骤

1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 在浏览器中打开：[http://localhost:3000](http://localhost:3000)

## 4. 数据库初始化步骤

运行数据库迁移（将根据 `schema.prisma` 在本地生成或更新 `dev.db`）：

```bash
npm run prisma:migrate
```

## 5. seed 数据导入步骤

导入预置的品类、虚拟供应商及标签等测试数据：

```bash
npm run prisma:seed
```

## 6. 常用命令

- `npm run dev` : 启动本地开发服务
- `npm run build` : 打包生产环境版本
- `npm run lint` : 运行代码格式及语法检查
- `npm run prisma:migrate` : 运行 Prisma 迁移，同步数据库结构
- `npm run prisma:seed` : 执行数据初始化种子脚本
- `npm run prisma:studio` : 打开可视化的 Prisma 数据库管理界面

## 7. 功能模块清单

### 主数据
- **品类管理** (`/categories`)：品类列表、新增、编辑、归档、多维筛选
- **供应商库** (`/suppliers`)：供应商列表、新增、详情（含联系人/风险标签/报价/评分/流程 Tab）、归档
- **人员管理** (`/people`)：内部人员列表、新增、编辑、停用
- **系统设置** (`/settings`)：键值配置管理

### 报价
- **报价管理** (`/quotes`)：报价单列表、新增、详情（含明细/附件）、CSV 导入导出、归档
- **报价对比** (`/quote-compare`)：按品类/compareKey 分组对比，自动计算最低/最高/平均价，CSV 导出

### 评分与考察
- **供应商评分** (`/scores`)：七大维度评分，自动计算总分和推荐等级，支持人工调整
- **调研/考察记录** (`/investigations`)：考察记录 CRUD，抽屉表单

### 流程看板
- **供应商开发看板** (`/development-board`)：多列看板，按阶段/负责人/优先级筛选
- **采购执行看板** (`/purchase-board`)：采购流程跟踪，金额/合同/发票/到货/验收字段

### 汇报与资料
- **老板汇报** (`/boss-report`)：本周进展、风险汇总、决策事项，支持 CSV 导出
- **销售/商务资料** (`/sales-materials`)：资料 CRUD，支持 CSV 和 Markdown 导出
- **品类商务支持资料包** (`/category-package`)：按品类聚合供应商/报价/评分/风险/决策，预览并可导出 Markdown/CSV

### 待办与行政
- **待办中心** (`/tasks`)：跨模块聚合（开发/采购/行政），本周/超期/老板决策/销售配合分区
- **行政事项** (`/admin-tasks`)：独立管理会议、周报、办公采购等非供应链事项

### 数据工具
- **数据导入导出** (`/data`)：CSV 模板下载、报价 CSV 导入、供应商 CSV 导入、采购审批 CSV 模板入口、各模块导出入口
- **数据质量检查** (`/data-quality`)：重复供应商、缺少联系人/评分、缺失 compareKey 等检查，支持 CSV 导出
- **本地备份恢复** (`/backup`)：SQLite 数据库备份与恢复，恢复前自动安全备份

### 运维管理
- **归档管理** (`/archive`)：统一查看已归档记录，支持按类型筛选和单条恢复
- **附件路径中心** (`/attachments`)：统一查看附件路径记录，按类型/关键词筛选，编辑基础字段，不处理物理文件
- **Agent Token** (`/agent-tokens`)：管理员为 Claude Code CLI、Codex 等内部 agent 创建长期 Bearer Token

## 8. CSV 导入导出说明

### 导入

| 导入类型 | 入口 | 状态 |
|----------|------|------|
| 报价明细 CSV 导入 | `/quotes` 页面 / `/data` 页面 | 正式支持 |
| 供应商 CSV 导入 | `/data` 页面 | 正式支持（Phase 9A） |
| 采购审批 CSV 导入 | `/purchase-board` 页面 / `/data` 页面 | 正式支持 |

导入采用严格事务模式：导入前会完整校验所有行，只要存在任意错误，本次导入不会写入任何数据。失败时页面会展示中文错误报告（行号、字段、原始值、错误原因、修改建议），并可下载错误报告 CSV。

报价和供应商导入中，缺失的品类会自动创建；报价和采购审批导入中，缺失的供应商会自动创建。

### 导出

CSV 导出统一使用中文表头、UTF-8 BOM 和标准 CSV 转义，便于 Excel 打开。支持导出的模块：报价数据、报价对比、老板汇报、销售/商务资料、数据质量检查结果、品类商务支持资料包（Markdown + CSV）。

### 模板下载

- 报价明细导入模板：`/api/csv-templates?type=quote-items`
- 供应商导入模板：`/api/csv-templates?type=suppliers`
- 采购审批导入模板：`/api/csv-templates?type=purchase-processes`

## 8.1 Agent API 调用示例

管理员可在 `/agent-tokens` 创建长期 Token。明文 Token 只展示一次，Claude Code CLI 或其他内部 agent 调用现有 REST API 时使用 Bearer 认证：

```bash
curl -X POST "$APP_URL/api/admin-tasks" \
  -H "Authorization: Bearer pw_agent_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "公司例会组织准备并整理会议纪要",
    "type": "会议",
    "priority": "中",
    "dueDate": "2026-05-25",
    "status": "进行中",
    "notes": "今天早上的行政工作"
  }'
```

Token 权限等同绑定用户。普通用户 Token 不能访问管理员接口；行政事项会自动归属到绑定用户对应的人员。

## 9. 本地备份恢复

`/backup` 页面支持创建数据库备份和从备份文件恢复。

- **备份范围**：仅备份本地 SQLite 数据库文件。不包含附件物理文件、系统环境、Node 依赖或导出 CSV。
- **文件命名**：`personal-workship-v0-9-2-YYYYMMDD-HHMMSS-ms.sqlite`
- **安全机制**：恢复前自动创建 `before-restore` 安全备份；需输入确认短语；文件名白名单 + 路径穿越拦截。
- **重要提示**：恢复后需停止并重新启动本地开发服务再继续使用。

## 10. 归档管理

系统采用逻辑归档机制，不物理删除数据。全部核心业务表均包含 `isArchived` 和 `archivedAt` 字段。

- `/archive` 页面可统一查看和恢复已归档记录（10 种对象类型：品类、供应商、报价单、报价明细、评分、考察记录、开发流程、采购流程、行政事项、销售资料）。
- 恢复操作需二次确认（输入"确认恢复"），每次仅恢复单条记录，不做批量或级联恢复。

## 11. 附件路径中心

`/attachments` 页面统一展示数据库中的附件路径记录。

- **注意**：本功能仅维护数据库记录，不处理真实文件。不检查文件是否存在，不支持上传、下载、预览或扫描。
- 支持按关联类型、文件类型、关键词筛选；可编辑文件名/路径/类型/备注；支持归档。

## 12. 明确不做事项

以下事项在第一版中明确不纳入：

- 登录权限 / 多用户
- 多人实时协作
- 云服务 / 内网服务器部署
- 文件上传（仅记录本地路径）
- AI 自动评分 / 自动总结
- Word / PDF / PPT / ZIP 导出
- 手机端适配
- 复杂统计图表
- 拖拽看板
- 自动提醒通知
- 物理删除数据（默认逻辑归档）

## 13. 常见问题

> 占位：尚未收录常见问题。如有问题请查阅 `docs/` 目录下的相关文档或 `CHANGELOG.md`。
