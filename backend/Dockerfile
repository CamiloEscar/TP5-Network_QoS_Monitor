FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

ENV PORT=3000
EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" >/dev/null || exit 1

CMD ["node", "server.js"]
