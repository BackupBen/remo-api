FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
  libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev \
  libasound2 libxrandr2 libxkbcommon-dev \
  libxfixes3 libxcomposite1 libxdamage1 \
  libatk-bridge2.0-0 libpango-1.0-0 libcairo2 \
  libcups2 fonts-noto-core fonts-noto-color-emoji \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx remotion browser ensure

RUN mkdir -p /app/out

EXPOSE 3001

CMD ["node", "api-server.mjs"]
