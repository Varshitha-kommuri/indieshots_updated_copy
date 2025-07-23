# Optimized production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies for build
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Build backend using index.production.ts (fixed version)
RUN npx esbuild server/index.production.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outfile=dist/server.js

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built application and required directories
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/memory ./memory

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check with proper error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 8080, path: '/health', timeout: 5000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => process.exit(1)); req.end();" || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
