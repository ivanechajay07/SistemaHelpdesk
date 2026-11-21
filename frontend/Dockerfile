# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_PUBLIC_APP_URL=
ENV VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL
ARG VITE_IDLE_TIMEOUT_MINUTES=15
ENV VITE_IDLE_TIMEOUT_MINUTES=$VITE_IDLE_TIMEOUT_MINUTES
RUN npm run build

# Run stage: Nginx sin privilegios (usuario nginx, puerto 8080)
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
