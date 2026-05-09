# Boiler Procurement DB (锅炉行业集成采购平台本地库)

## 1. 项目简介
本项目是一个本地优先的个人工作数据库系统，旨在管理“锅炉行业集成采购平台”的供应链开发和采购流程。核心功能涵盖品类管理、供应商开发、报价收集与对比、供应商评分、采购执行流程跟进以及日常行政与老板汇报。

## 2. 技术栈
- **前端框架**: Next.js (App Router), React, TypeScript
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

## 7. 数据备份说明
> 占位：目前数据全部存储于本地的 `prisma/dev.db` 及上传的附件目录中。后续版本将增加一键打包备份脚本。

## 8. 常见问题
> 占位：尚未收录常见问题。
