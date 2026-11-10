FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json server/
COPY packages/shared/package.json packages/shared/
COPY packages/mcp/package.json packages/mcp/

RUN npm ci && npm --prefix server ci

COPY . .

RUN npm run build:deploy && npm --prefix server run build \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/library.db
ENV STATIC_DIR=/app/dist
ENV DEPLOYMENT_API_BASE_URL=/api

VOLUME /data
EXPOSE 3001

CMD ["node", "server/dist/server/src/index.js"]
