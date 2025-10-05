# Build stage
FROM node:24.9.0-alpine3.21 AS builder
WORKDIR /app

# Accept build arguments
ARG VITE_APP_TITLE
ARG VITE_APP_VERSION
ARG VITE_API_BASE_URL
ARG VITE_API_TIMEOUT
ARG VITE_ENABLE_DEBUG
ARG VITE_TENANTS
ARG REQUEST_MANAGER_PORT

# Set environment variables for the build
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_TIMEOUT=$VITE_API_TIMEOUT
ENV VITE_ENABLE_DEBUG=$VITE_ENABLE_DEBUG
ENV VITE_TENANTS=$VITE_TENANTS
ENV REQUEST_MANAGER_PORT=$REQUEST_MANAGER_PORT

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./nginx.conf.template /etc/nginx/conf.d/default.conf.template
EXPOSE 80
CMD envsubst '$REQUEST_MANAGER_PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'