# AirClass API 서버 이미지 (AirChat → Claude Haiku)
# - nginx(airclass 컨테이너)가 /api/ 요청을 이 컨테이너의 3000번 포트로 넘긴다
# - API 키는 이미지에 넣지 않고, 실행할 때 server/.env 에서 환경변수로 받는다
FROM node:22-bookworm-slim
WORKDIR /srv

# 규칙 기준값(THRESHOLDS)을 앱·웹과 같이 쓰기 위해 shared도 복사
COPY shared ./shared
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund
COPY server/src ./server/src

WORKDIR /srv/server
ENV NODE_ENV=production
# root가 아닌 기본 node 사용자로 실행
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
