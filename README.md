# 自适应学习前端交接包

这是从 `jingui-adaptlearn-demo` 抽出的 React + Vite 前端源码快照，适合在其他目录或工具中独立进行视觉与交互优化。

## 快照信息

- 导出时间：2026-08-31 UTC
- 来源分支：`codex/full-baseline-20260831`
- 来源提交：`592dccb87c95`
- 内容：导出时工作区内的最新 `src/`、`public/` 与入口文件

## 立即运行

建议使用 Node.js 20 或更高版本。

```bash
npm install
cp .env.example .env.local
npm run dev
```

云主机访问：`http://leon.local.yungu-inc.org:5180`

生产构建检查：

```bash
npm run build
```

## 包含范围

- `src/`：学生端、教师端、共享组件、页面、样式和浏览器端数据逻辑
- `public/`：图标和答题反馈音频
- `index.html`：Vite 页面入口
- `vite.config.js`：独立开发服务与三类后端代理
- `package.json` / `package-lock.json`：仅保留前端运行依赖

不包含后端源码、OpenMAIC 源码、数据库、密钥、`.env`、依赖目录、构建产物和运行日志。

## 后端依赖边界

纯视觉修改和 `npm run build` 不需要后端。真实业务数据与完整交互仍依赖原项目服务：

| 前端路径 | 默认代理目标 | 用途 |
| --- | --- | --- |
| `/api/*` | `http://127.0.0.1:8787` | BFF、登录、生成、批改、语音 |
| `/classroom-api/*` | `http://127.0.0.1:8788` | 课堂、学生、作答、报告 |
| `/openmaic/*`、`/_next/*` | `http://127.0.0.1:3100` | 互动课堂运行时 |

后端地址不同，复制 `.env.example` 为 `.env.local` 后修改三个 `*_PROXY_TARGET`。不要把服务端密钥改成 `VITE_*` 变量；`VITE_*` 会进入浏览器构建产物。

未连接后端时，应用仍可启动，但教师身份、真实课堂数据、生成、批改、语音和互动课堂等页面会显示加载失败或不可用状态，这不是前端包缺文件。

## 优化后回合并

建议在本目录单独初始化 Git，按页面或组件分批提交。回合并到主项目时优先带回 `src/` 和 `public/` 的明确改动，不要用整个目录覆盖主仓库，也不要带回 `.env.local`、`dist/` 或 `node_modules/`。
