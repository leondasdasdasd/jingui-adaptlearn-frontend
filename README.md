# 自适应学习纯前端包

这是从 `question-test-main` 抽出的教师端 + 学生端前端仓库，适合在 AI Studio 或本地继续优化视觉、交互与动效。

## 技术基线

- React `16.14.0`
- DVA `2.4.1` / React Router 4
- Vite `4.5.14`
- 主路由：`/#/adaptive-learning/*`
- 样式作用域：`.adaptive-learning-root`

不要升级到 React 18/19，不要改成 iframe。画板使用 Fabric，不使用要求 React 18 的 tldraw。

## 本地运行

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

访问：`http://leon.local.yungu-inc.org:5180/#/adaptive-learning/teacher/textbook-lessons`

学生入口：`http://leon.local.yungu-inc.org:5180/#/adaptive-learning/student/home`

## 数据边界

```text
页面 -> application/domain -> repository/adapter -> 同源 API
```

- `/api/*`：测验平台登录、课程、班级和学生。
- `/adaptive-api/*`：生成、批改、语音与 OpenMAIC BFF。
- `/classroom-api/*`：由 BFF 校验登录态后访问课堂服务。
- `/openmaic/*`、`/_next/*`：OpenMAIC 前端运行时。

`src/services/` 中的课程、班级和学生 adapter 是显式占位实现，不提供模拟花名册。接入真实测验项目时必须替换为宿主实现。

纯视觉修改和生产构建不要求启动后端；真实登录、班级、学生、生成、课堂与学习链路需要对应本机服务。

## 当前范围

- 教师内容准备、矩阵、插槽、按插槽新增题、质检、发布和开课。
- 一堂课关联多个课时，选课与关联课时分离。
- 学生真实账号主页、诊断、学习、练习、反馈、结果与历史。
- 教师课堂、学生详情与课堂报告。
- OpenMAIC 教师后台保留，默认学生视图，专业模式显式开启。
- 中英文资源快照与云谷课堂 2.0 主题样式。

## 安全边界

仓库不包含后端、数据库、Cookie、token、服务密钥、真实 `.env`、`node_modules` 或构建产物。不要把服务端密钥改成 `VITE_*` 变量，因为它们会进入浏览器构建结果。
