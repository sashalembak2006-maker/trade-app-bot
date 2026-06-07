# PRIME TRADE BOT — multi-stage build (api | bot | collector)
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/bot/package.json apps/bot/
COPY apps/collector/package.json apps/collector/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm install
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/bot apps/bot
COPY apps/collector apps/collector
COPY apps/web apps/web
RUN npm run build -w @trade-app/shared \
  && npm run build -w @trade-app/api \
  && npm run build -w @trade-app/bot \
  && npm run build -w @trade-app/collector \
  && npm run build -w @trade-app/web

FROM node:22-bookworm-slim AS api
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start:prod"]

FROM node:22-bookworm-slim AS bot
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/bot ./apps/bot
WORKDIR /app/apps/bot
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

FROM node:22-bookworm-slim AS collector
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/collector ./apps/collector
WORKDIR /app/apps/collector
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
