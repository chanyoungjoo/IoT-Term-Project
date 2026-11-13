# AirClass 웹 + 앱(웹 빌드)을 nginx 하나로 서빙하는 이미지
# - /      → 관리자 웹 (web/, React + Vite)
# - /app/  → 사용자 앱 웹 빌드 (app/, Expo + react-native-web)
# 라즈베리파이(arm64)에서도 그대로 빌드된다 (node, nginx 공식 이미지가 멀티 아키텍처)

# ── 1단계: 관리자 웹 빌드 ─────────────────────────────
FROM node:22-bookworm-slim AS web
WORKDIR /src
COPY shared ./shared
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci --no-audit --no-fund
COPY web ./web
# 규칙 테스트를 통과해야만 이미지를 만든다
RUN cd web && npm test && npm run build

# ── 2단계: 사용자 앱 웹 빌드 ──────────────────────────
FROM node:22-bookworm-slim AS app
WORKDIR /src
COPY shared ./shared
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci --no-audit --no-fund
COPY app ./app
# 라즈베리파이 메모리에서 Metro 번들링이 죽지 않게 힙 상한을 정해 둠
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN cd app && npm run build:web

# ── 3단계: nginx로 서빙 ──────────────────────────────
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /src/web/dist /usr/share/nginx/html
COPY --from=app /src/app/dist /usr/share/nginx/html/app
EXPOSE 80
