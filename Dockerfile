FROM node:22-alpine AS build

WORKDIR /app

# Match packageManager in package.json (lockfile is npm 11).
RUN corepack enable && corepack prepare npm@11.9.0 --activate

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG API_URL
ARG TOKEN_STORAGE_ENCRYPTION_KEY

RUN test -n "$API_URL" && test -n "$TOKEN_STORAGE_ENCRYPTION_KEY" || \
  (echo "API_URL and TOKEN_STORAGE_ENCRYPTION_KEY build args are required" >&2 && exit 1)

RUN sed -i "s|__API_URL__|${API_URL}|g" src/environments/environment.docker.ts && \
    sed -i "s|__TOKEN_STORAGE_ENCRYPTION_KEY__|${TOKEN_STORAGE_ENCRYPTION_KEY}|g" src/environments/environment.docker.ts

RUN npm run build -- --configuration=docker

FROM node:22-alpine AS run

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /app/dist/skemex.ui ./dist/skemex.ui

EXPOSE 4000

CMD ["node", "dist/skemex.ui/server/server.mjs"]
