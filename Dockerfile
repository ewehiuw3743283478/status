FROM node:20-bookworm-slim AS build

WORKDIR /app

# Native module fallback (better-sqlite3 prebuilds are preferred on Node 20)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

ENV HOST=0.0.0.0
ENV PORT=5555

EXPOSE 5555

CMD ["node", "status-panel.js"]