# 更新日志 (Changelog)

所有该项目的显著更改都将记录在此文件中。

## [v0.2.0] - 基础主数据开发

### 已完成内容
- **系统设置页面**：展示 SystemSetting 键值配置，支持编辑 value 和 notes（key 只读）。
- **品类管理**：品类列表、新增、编辑、归档（逻辑删除），支持按优先推广和品类类型筛选，显示标准化程度/售后风险/采购频率。
- **人员管理**：人员列表、新增、编辑、停用，支持按角色和部门筛选。
- **供应商管理**：供应商列表（多维筛选：名称搜索、品类、地区、推荐等级、是否报价/考察、风险标签），新增（独立页面 /suppliers/new），编辑，归档。
- **供应商详情页**：6 个 Tab（基本信息、联系人、风险与备注、关联报价占位、评分与考察占位、采购记录占位），支持在线编辑基本信息、联系人增删改、风险标签绑定/解绑。
- **Prisma Schema 变更**：Category 和 SupplierContact 新增 isArchived/archivedAt 归档字段。
- **种子数据扩充**：10 个品类（含标准化/售后/频率属性）、8 家供应商（含来源/推荐/合作意愿）、8 名内部人员、6 个联系人、5 条风险标签绑定。种子脚本幂等。
- **共享组件**：Toast 全局提示、Modal 弹窗、ConfirmDialog 二次确认。
- **Prisma Client 单例**：lib/db.ts 防止热重载多连接。
- **DATA_MODEL.md 已同步更新**。

### 浏览器功能验收 (Browser Verification)
- [x] **/settings 系统设置**：读取正常，key 只读，value 保存成功，Toast 提示正常。
- [x] **/categories 品类管理**：多维筛选正常，新增/编辑成功，归档后列表自动隐藏。
- [x] **/people 人员管理**：角色筛选正常，新增/编辑成功，停用逻辑正常。
- [x] **/suppliers 供应商列表**：名称搜索（含防抖）正常，归档二次确认（含供应商名称）正常。
- [x] **/suppliers/new 新增页**：支持多联系人动态增减、风险标签多选，提交后自动跳转详情页。
- [x] **/suppliers/[id] 详情页**：6 个 Tab 切换正常，基本信息编辑、联系人 CRUD、风险标签实时同步。

### 数据库变更
- Migration: `add-archive-fields-category-contact`
  - Category 表新增 `isArchived`, `archivedAt`
  - SupplierContact 表新增 `isArchived`, `archivedAt`

### 已知问题
- 无

### 下一阶段计划
- **阶段 3（报价模块）开发**：报价单、报价明细、报价来源记录、报价 CSV 导入导出。

---

## [v0.1.0] - 项目骨架初始化

### 已完成内容
- 初始化 Next.js 项目，配置 TypeScript, ESLint, 和 Tailwind CSS (v4)。
- 配置 Prisma ORM 与本地 SQLite 数据库支持。
- 根据 `DATA_MODEL.md` 完成 16 张核心数据表的 Prisma Schema 初版设计。
- 编写初始化的 seed.ts 脚本，预置 10 个品类、8 家虚拟供应商、内部人员及标签等数据。
- 搭建了符合办公场景的极简中文后台布局，包括左侧固定导航栏（Sidebar）和顶部通栏（Header）。
- 创建了所有主菜单对应的 16 个空页面（包括简单的标题与功能说明）。
- 配置了 README.md 并在 package.json 中配置了常用的 `npm run prisma:*` 脚本。
- 验证了系统的本地启动、数据库初始化及页面基础连通性。

### 未完成内容
- 无（第一阶段已全部完成）。

### 下一阶段计划
- **阶段 2（基础主数据）开发**：包括系统设置、品类管理、人员管理、供应商及其联系人的全流程 CRUD 功能。
