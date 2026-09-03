# 锦龟自适应学习前端

可独立运行的教师端与学生端前端包，包含课程内容生成、认知矩阵、题目插槽、课堂发布、学生学习与测评流程。

## 学生学习模式

- 上新课：不做前测，直接进入当前课时学习。
- 打基础：先完成前测，再按知识层级逐步解锁学习。
- 查缺补漏：先完成单元测试，再学习和练习薄弱知识点。

三种模式由学生进入目录后在顶层自主选择，并通过唯一主操作进入对应流程。已有活动学习进度时会隐藏模式选择器，保留“继续学习”入口；切换到其他课时后可重新选择模式。教师端沿用现有开课与内容管理流程。

## 本地运行

```bash
nvm use
npm install
npm run dev
```

访问 `http://leon.local.yungu-inc.org:3000/`。开发服务器监听 `0.0.0.0`，并已允许该云主机域名。

开发服务默认连接真实接口，不会拦截请求。仅在需要独立演示时显式启用模拟数据：

```bash
VITE_ENABLE_ADAPTIVE_MOCKS=true npm run dev
```

启用后，终端会显示“当前使用模拟课堂与测评数据 / Mock classroom and assessment data are active.”。

## 接口边界

- `/adaptive-api`：自适应学习服务，默认代理到 `http://127.0.0.1:8787/api`。
- `/classroom-api`：课堂服务，默认代理到 `http://127.0.0.1:8787`。
- `/openmaic-api`：OpenMAIC 服务，默认代理到 `http://127.0.0.1:3101`。
- `/api`：现有测验平台网关，默认代理到 `https://task.daily.yungu-inc.org`。

可在本地 `.env` 中通过 `DEV_ADAPTIVE_BFF_PROXY_TARGET`、`DEV_OPENMAIC_PROXY_TARGET` 和 `DEV_API_PROXY_TARGET` 覆盖目标地址。仓库不包含 Cookie、令牌或真实环境密钥。

## 主要入口

- 教师端：`/#/adaptive-learning/teacher/textbook-lessons`
- 学生目录：`/#/adaptive-learning/today`
- 学生主页：`/#/adaptive-learning/student/home`

角色切换浮层仅用于独立包验收。真实接入时，身份和课程上下文仍以平台接口返回为准。

单元自适应测评的后端算法尚未实现，产品规则见 [单元自适应测评算法文档](./docs/unit-adaptive-assessment-algorithm.md)。
