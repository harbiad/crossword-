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
RUN chmod 0755 /app && chmod 0644 server.mjs package.json && chmod -R a+rX dist dist-ssr
USER node
RUN node --check server.mjs && node --input-type=module -e "import './dist-ssr/generate.js'; import { readFileSync } from 'node:fs'; readFileSync('dist/index.html')"
EXPOSE 3000
CMD ["node", "server.mjs"]
