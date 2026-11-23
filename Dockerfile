FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY api ./api
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV PORT=3000
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-ssr ./dist-ssr
COPY server.mjs package.json ./
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
