# 1. Builder Aşaması: Uygulamayı derle
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY proto ./proto
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build  # package.json'daki build script'inin "tsc" çalıştırdığından emin ol

FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/proto ./proto

EXPOSE 3000 50051

CMD ["node", "dist/app.js"]