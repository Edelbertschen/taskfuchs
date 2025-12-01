# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy frontend source
COPY . .

# Build frontend - API calls will be proxied by nginx
ARG VITE_API_URL=""
ARG VITE_MS_CLIENT_ID
ARG VITE_MS_TENANT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MS_CLIENT_ID=$VITE_MS_CLIENT_ID
ENV VITE_MS_TENANT_ID=$VITE_MS_TENANT_ID

RUN npm run build

# Build stage for backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
RUN npm ci

# Copy server source and prisma schema
COPY server/ .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Install Node.js for backend
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built frontend to nginx
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy built backend
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/server/node_modules ./server/node_modules
COPY --from=backend-builder /app/server/package*.json ./server/
COPY --from=backend-builder /app/server/prisma ./server/prisma

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Sync database schema (creates tables if missing, updates if needed)' >> /app/start.sh && \
    echo 'cd /app/server && npx prisma db push --skip-generate' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start backend server in background' >> /app/start.sh && \
    echo 'cd /app/server && node dist/index.js &' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start nginx in foreground' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port 8080 (nginx)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["/bin/sh", "/app/start.sh"]
