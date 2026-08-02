# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_API_TIMEOUT_MS=10000
ARG VITE_DOCUMENT_API_TIMEOUT_MS=120000

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_TIMEOUT_MS=$VITE_API_TIMEOUT_MS \
    VITE_DOCUMENT_API_TIMEOUT_MS=$VITE_DOCUMENT_API_TIMEOUT_MS

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
