# 骑行轨迹可视化

多用户骑行数据可视化平台。支持 GPX / TCX / KML 导入，高德地图展示路线，海拔剖面图、配速/心率着色、月度统计。

---

## 线上部署（Railway 后端 + Vercel 前端）

### 前提

- GitHub 账号（用于连接 Railway 和 Vercel）
- 高德地图 API Key（免费申请：https://console.amap.com）

---

### 第一步：上传代码到 GitHub

1. 在 GitHub 新建一个仓库（public 或 private 均可）
2. 将整个 `cycling-tracker` 文件夹推送上去：

```bash
cd cycling-tracker
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/cycling-tracker.git
git push -u origin main
```

---

### 第二步：Railway 部署后端 + 数据库

#### 2-1 创建项目

1. 打开 https://railway.app 用 GitHub 登录
2. 点击 **New Project → Deploy from GitHub repo**
3. 选择你的仓库，**Root Directory 填 `backend`**
4. Railway 会自动识别 `nixpacks.toml` 开始构建

#### 2-2 添加 PostgreSQL

1. 在项目页面点击 **+ Add Service → Database → PostgreSQL**
2. Railway 自动将 `DATABASE_URL` 注入后端服务的环境变量，无需手动填

#### 2-3 设置后端环境变量

在后端服务 → **Variables** 面板添加：

| 变量名 | 值 |
|--------|-----|
| `JWT_SECRET` | 随便一串长字符串，如 `k9x2mP...`（越长越好） |
| `FRONTEND_URL` | 暂时留空，Vercel 部署完再填 |
| `NODE_ENV` | `production` |

#### 2-4 记下后端地址

部署完成后，Railway 会分配一个域名，例如：
```
https://cycling-tracker-backend-production.up.railway.app
```
**记下这个地址**，下一步要用。

---

### 第三步：Vercel 部署前端

1. 打开 https://vercel.com 用 GitHub 登录
2. 点击 **Add New Project**，选择你的仓库
3. **Root Directory 填 `frontend`**，Framework 选 **Vite**
4. 在 **Environment Variables** 里添加：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_URL` | 上一步 Railway 给的后端地址，如 `https://xxx.railway.app` |

5. 点击 **Deploy**，完成后记下 Vercel 给的域名，如：
```
https://cycling-tracker.vercel.app
```

#### 3-1 更新高德地图 Key

打开 `frontend/index.html`，填入你的高德 Key 后重新 push 到 GitHub，Vercel 会自动重新部署：

```html
securityJsCode: 'YOUR_SECURITY_CODE'
...
key=YOUR_AMAP_KEY
```

#### 3-2 回填 FRONTEND_URL

回到 Railway 后端服务 → Variables，把 `FRONTEND_URL` 填为 Vercel 的域名：
```
https://cycling-tracker.vercel.app
```
Railway 会自动重启服务，让 CORS 生效。

---

### 完成！

打开 Vercel 域名，注册账号即可开始使用。你和朋友各自注册，数据完全隔离。

---

## 本地开发

### 前提

- Node.js 18+
- 本地 PostgreSQL（或用 Docker：`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`）

### 配置本地环境变量

复制后端的 `.env.example` 为 `.env`：

```
cd backend
cp .env.example .env
# 编辑 .env，填入本地 PostgreSQL 连接信息和 JWT_SECRET
```

### 启动

**后端**（双击 `start-backend.bat` 或命令行）：
```bash
cd backend
npm install
npm start
```

**前端**（双击 `start-frontend.bat` 或命令行）：
```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite |
| 地图 | 高德地图 JS API 2.0 |
| 图表 | Recharts |
| 后端 | Node.js + Express |
| 数据库 | PostgreSQL（本地）/ Railway PostgreSQL（线上） |
| 认证 | JWT + bcrypt |
| 部署 | Railway（后端）+ Vercel（前端） |

---

## 目录结构

```
cycling-tracker/
├── backend/
│   ├── src/
│   │   ├── index.js          入口（端口 3001）
│   │   ├── database.js       PostgreSQL 连接池 + 建表
│   │   ├── middleware/
│   │   │   └── auth.js       JWT 签发与验证
│   │   ├── parsers/
│   │   │   └── gpxParser.js  GPX/TCX/KML 解析
│   │   └── routes/
│   │       ├── auth.js       注册/登录 API
│   │       ├── routes.js     路线 CRUD（含用户隔离）
│   │       └── upload.js     文件上传 API
│   ├── .env.example          本地开发环境变量模板
│   ├── railway.json          Railway 部署配置
│   ├── nixpacks.toml         构建配置
│   └── Procfile              启动命令
│
└── frontend/
    ├── src/
    │   ├── App.tsx           主布局
    │   ├── auth.ts           Token 本地存储管理
    │   ├── api/index.ts      API 调用（自动带 token）
    │   ├── types/index.ts    TypeScript 类型
    │   └── components/
    │       ├── AuthPage.tsx       登录/注册页
    │       ├── AMapRoute.tsx      高德地图路线绘制
    │       ├── ElevationChart.tsx 海拔剖面图
    │       ├── FileUploader.tsx   拖拽上传
    │       ├── RouteList.tsx      路线列表
    │       └── StatsPanel.tsx     统计面板
    ├── .env.example          环境变量模板
    ├── vercel.json           Vercel 部署配置
    └── index.html            ← 填入高德地图 Key
```
