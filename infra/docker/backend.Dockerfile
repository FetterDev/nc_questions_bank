FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
