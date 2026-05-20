# 《供采管家》生产环境部署与运维指南

本指南详细记录了系统的生产环境部署架构、自动化部署配置、以及常用的运维指令。敏感数据（如 SSH 登录密码等）已安全隔离存储在项目根目录的本地环境变量文件 `.env.deploy` 中，**切勿将密码或敏感信息直接提交到公共 Git 仓库中**。

---

## 1. 生产服务器配置

*   **云服务器提供商**：腾讯云（Tencent Cloud）
*   **公网 IP**：`1.117.58.118`
*   **SSH 登录用户**：`ubuntu`
*   **SSH 端口**：`22`
*   **代码托管仓库**：`https://github.com/davidkingggg/-.git`

> [!WARNING]
> 由于当前密码已在聊天记录中流转，为了服务器安全，**建议在正式交接并启用免密登录前，先通过终端重置一次服务器登录密码**。

---

## 2. 系统服务与反向代理架构

### 2.1 Web 服务器 (Nginx)
Nginx 在生产服务器上作为反向代理，负责接收公网 `80` 端口（或 `443` HTTPS 端口）的请求，并将其转发到本地 Next.js 服务所运行的 `3000` 端口上。

### 2.2 Systemd 服务进程管理
Next.js 应用程序在服务器上使用守护进程进行常驻管理：
*   **服务名称**：`mimo-license.service` (系统授权服务)
*   **控制指令**：
    *   **重启服务**：`sudo systemctl restart mimo-license.service`
    *   **查看状态**：`sudo systemctl status mimo-license.service`
    *   **查看运行日志**：`sudo journalctl -u mimo-license.service -n 100 -f`

---

## 3. 核心服务监控与激活端点

*   **健康状态检查 (Health Check)**：`http://1.117.58.118/health`
*   **授权激活端点 (Activation)**：`http://1.117.58.118/activate`

---

## 4. 自动化部署流程设计

当前项目在 `scripts/deploy-systemd.sh` 中包含标准的部署脚本。若未来需要执行部署，该脚本的流程如下：

如果服务器尚未配置免密 sudo，需要在本地临时环境变量中提供 `SUDO_PASSWORD`。不要把密码写入脚本或提交到仓库。

1.  **本地代码打包**：在本地开发环境打包修改过的文件（排除 `node_modules`、`.next` 及本地 `dev.db` 备份等）。
2.  **上传临时包**：通过 SCP 传输至腾讯云服务器的 `/tmp` 目录。
3.  **云端备份**：在服务器上自动对现有的 SQLite 数据库（位于持久化数据目录）制作带时间戳的预备份。
4.  **云端热解包**：将新代码解压到目标目录，执行 `npm ci` 安装生产依赖。
5.  **数据迁移与构建**：
    ```bash
    npx prisma generate
    npx prisma migrate deploy
    npm run build
    ```
6.  **进程平滑重启**：重启 `mimo-license.service` 进程，并自动执行 Nginx 与后端健康状态检查验证。

---

## 5. 数据传输稳定性基线（2026-05-20）

当前生产部署唯一入口是 `scripts/deploy-systemd.sh`。不要再用单文件 `scp`、手工覆盖页面组件、或直接在服务器上改构建产物；这些做法会绕过数据库链接修复和部署后校验，容易让运行时连到空库。

生产数据库只有一个真实位置：

```text
/home/ubuntu/personal-workship-data/dev.db
```

部署脚本必须保证以下两个路径都是指向上面持久库的软链接：

```text
/home/ubuntu/personal-workship/prisma/dev.db
/home/ubuntu/personal-workship/.next/standalone/prisma/dev.db
```

每次 `npm run build` 后都必须重新执行软链接修复，因为 standalone 构建可能重新生成 `prisma/dev.db` 文件。这个文件如果变成 0 字节普通文件，页面会连接到空库并出现 `SupplierDevelopmentProcess table does not exist` 一类服务端错误。

标准部署流程：

1. 本地生成完整发布包，排除 `.next`、`node_modules`、本地 `.env`、本地 SQLite 数据库和临时日志。
2. 上传发布包到服务器 `/tmp`。
3. 部署前备份生产数据库、WAL/SHM/JOURNAL 文件，并保留上一版应用快照。
4. 服务器端解包、写入生产 `DATABASE_URL`、生成 Prisma Client、执行 `prisma migrate deploy`。
5. 执行 `npm run build` 后复制 `_next/static` 到 standalone 目录。
6. 强制修复 `prisma/dev.db` 和 `.next/standalone/prisma/dev.db` 两个软链接。
7. 重启 `personal-workship.service`。
8. 验证 `/login`、`/api/auth/init`、`/quote-compare`、`/purchase-board`、`/quotes`、`/health`、`/api/auth/me` 未登录返回 401、`/api/data-health` 未登录返回 401、静态资源、数据库健康脚本和 systemd 服务状态。

回滚原则：

- 应用回滚使用部署前保留的 `pre-deploy-app-*.tar.gz` 快照。
- 数据回滚使用 `pre-deploy-*.sqlite` 快照，必要时同时恢复对应 `-wal`、`-shm`、`-journal` 文件。
- 回滚后仍必须重新修复两个数据库软链接，并运行数据健康检查。
