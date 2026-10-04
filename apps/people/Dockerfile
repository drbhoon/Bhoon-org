FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci --ignore-scripts && npm --prefix client ci

COPY . .
RUN npm run build && npm prune --omit=dev && npm --prefix client prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/index.js"]
