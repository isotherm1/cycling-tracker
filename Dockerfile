# syntax=docker/dockerfile:1

# ---- 阶段 1：构建前端 ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
# 先拷依赖清单，利用 Docker 层缓存
COPY frontend/package*.json ./
RUN npm install
# 再拷源码并构建（产物在 /app/frontend/dist）
COPY frontend/ ./
RUN npm run build

# ---- 阶段 2：后端运行时（内置前端产物）----
FROM node:20-slim
WORKDIR /app/backend
# 只装后端生产依赖
COPY backend/package*.json ./
RUN npm install --omit=dev
# 后端源码
COPY backend/ ./
# 把前端构建产物放到后端期望的相对路径：
# backend/src/index.js 里用的是 ../../frontend/dist -> /app/frontend/dist
COPY --from=frontend /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
# Railway 会注入 PORT，后端用 process.env.PORT 监听
CMD ["npm", "start"]
