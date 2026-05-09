# 阶段 1：项目骨架初始化计划

我们要构建名为 `boiler-procurement-db` 的 Next.js 本地优先项目，按照您提供的规范文档进行初始化。

## User Review Required

> [!CAUTION]
> **严重环境阻碍：未检测到 Node.js**
> 
> 在尝试初始化 Next.js 项目之前，我检测了当前系统的环境变量，发现**本地尚未安装 Node.js 和 npm**。由于该系统完全基于 Node 生态（Next.js + React + Prisma），并且您的需求要求执行一系列 `npm run` 命令，这使得我无法在当前状态下直接编写和运行项目。
> 
> **请您采取以下任一措施：**
> 1. 请在您的电脑上手动安装 Node.js (推荐 20 LTS 版本)，安装完成后告诉我，我将继续执行。
> 2. 如果您希望我通过命令行帮您下载 Node.js 的便携版并配置到当前环境路径中，请授权我执行下载和解压。

## Proposed Changes

当 Node.js 环境就绪后，我将立刻执行以下动作：

### 1. 项目基础构建
- 创建 `boiler-procurement-db` 项目。
- 执行 `npx create-next-app` 初始化前端骨架。
- 初始化 `Prisma` 与 SQLite 数据库。

### 2. 数据结构构建
根据 `DATA_MODEL.md` 建立初步的 Schema：
#### [NEW] `boiler-procurement-db/prisma/schema.prisma`
包含 16 张核心表（Category, Supplier, Person, Quote, Score 等）及相关枚举。

#### [NEW] `boiler-procurement-db/prisma/seed.ts`
配置虚拟数据：10 个品类、8 家虚拟供应商、内部人员、风控标签等。

### 3. 页面骨架设计
#### [NEW] `boiler-procurement-db/components/layout/AppLayout.tsx`
#### [NEW] `boiler-procurement-db/components/layout/Sidebar.tsx`
#### [NEW] `boiler-procurement-db/components/layout/Header.tsx`
创建涵盖左侧菜单和顶部导航的经典中文后台布局。

#### [NEW] 16个子页面
在 `app/` 目录下按路由规范搭建诸如首页、品类中心、供应商库、报价管理等所有 16 个菜单对应的空页面（占位页面），保证点击导航可正常跳转且不出现 404 白屏。

### 4. 项目规范文档
#### [NEW] `boiler-procurement-db/README.md`
#### [NEW] `boiler-procurement-db/CHANGELOG.md`
将原有的规章文档统一放入 `boiler-procurement-db/docs` 中，并编写项目初版更新记录。

## Verification Plan

在代码全部生成后，我将执行以下步骤验证：
1. `npm install`
2. `npx prisma db push` (或 migrate) 与 `npx prisma db seed`
3. `npm run lint` 与 `npm run build`
4. 运行 `npm run dev` 并在浏览器测试打开系统及点击所有 16 个菜单
5. 输出最终测试结果及“第 1 阶段完成内容”报告。
