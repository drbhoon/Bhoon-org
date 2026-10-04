FROM node:22-alpine
WORKDIR /app

COPY services/gateway/package*.json ./services/gateway/
RUN npm --prefix services/gateway ci --omit=dev

COPY services/gateway ./services/gateway
COPY apps/site ./apps/site

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "services/gateway/server.js"]
