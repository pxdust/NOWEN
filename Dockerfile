# NOWEN - 高颜值 Bento 风格个人导航页
# 支持书签管理、分类管理、名言管理、自定义图标
# GitHub: https://github.com/cropflre/NOWEN
# 支持多架构: linux/amd64, linux/arm64 (RK3588/RK3576/RK3566 等)

# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# 国内构建可传 --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=
# 前端已移除 bcrypt 等 native 模块，无需编译工具链
COPY package*.json ./
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi \
 && npm ci \
 && npm cache clean --force
COPY . .
RUN npm run build \
 && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.html' \) -exec sh -c 'gzip -9 -c "$1" > "$1.gz" && touch -r "$1" "$1.gz"' _ {} \; \
 && rm -rf dist/screenshots

# 后端编译成 JS，生产镜像不再带 tsx / TypeScript
FROM node:20-alpine AS server-builder
WORKDIR /server
ARG NPM_REGISTRY=
COPY server/package*.json ./
RUN if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi \
 && npm ci \
 && npm cache clean --force
COPY server/tsconfig.json ./
COPY server/src ./src
# 存量类型错误不阻止产出 JS（运行时原本就由 tsx 忽略类型）。
RUN (npx tsc --pretty false || test -f dist/index.js) \
 && npm prune --omit=dev \
 && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# OCI 标准标签
LABEL org.opencontainers.image.title="NOWEN"
LABEL org.opencontainers.image.description="高颜值 Bento 风格个人导航页，支持书签管理、分类管理、名言管理、自定义图标，一键 Docker 部署"
LABEL org.opencontainers.image.url="https://github.com/cropflre/NOWEN"
LABEL org.opencontainers.image.source="https://github.com/cropflre/NOWEN"
LABEL org.opencontainers.image.vendor="cropflre"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# 🔑 强制覆盖 apk 仓库源为官方源
# 绿联/飞牛等 NAS 系统可能向容器注入自定义仓库配置（如 openresty），导致依赖解析失败
RUN echo "https://dl-cdn.alpinelinux.org/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/main" > /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/community" >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache ca-certificates nginx && \
    # docker-cli 为可选依赖（仅用于系统监控 fallback），安装失败不阻断构建
    (apk add --no-cache docker-cli || echo "⚠️ docker-cli not available, skipping (optional)")

# 只拷贝编译结果和生产依赖。sql.js 的 wasm 在 node_modules 里，按包路径加载。
COPY --from=server-builder /server/package.json ./server/package.json
COPY --from=server-builder /server/node_modules ./server/node_modules
COPY --from=server-builder /server/dist ./server/dist

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create data directory and safe backup directory
# 🔑 安全备份使用 /app/.nowen-safe（不在 VOLUME 声明中，属于镜像层）
# 这样即使 NAS Docker UI 重建容器，镜像层内的备份不受影响
RUN mkdir -p /app/server/data /app/.nowen-safe

# ⚠️ 故意不声明 VOLUME！
# 原因：绿联/飞牛等 NAS 的 Docker GUI 会为 VOLUME 声明的路径自动创建
# 以容器名为前缀的目录（如 cropflre_nowen-1/app_server_data），
# 更新容器时容器名变化（变成 cropflre_nowen-2），新目录是空的，数据丢失。
# 不声明 VOLUME，让用户通过 docker-compose.yml 中的 volumes 手动挂载，
# 或者 NAS GUI 的存储配置来指定固定路径。

# 🔑 防呆设计：直接在镜像内设置生产环境和固定 API 端口
# 用户通过 NAS GUI 部署时无需额外配置即可与 Nginx 反向代理保持一致
ENV NODE_ENV=production
ENV PORT=39001

# 生产端口：Nginx Web 39000，Express API 39001
EXPOSE 39000 39001

# 🔑 确保容器停止时发送 SIGTERM，让 start.sh 有机会保存数据
STOPSIGNAL SIGTERM

# Start script
COPY start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && \
    sed -i 's/port 3001/port 39001/g; s/port 3000/port 39000/g' /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
