# syntax=docker/dockerfile:1

# ----- Builder -----
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

# ----- Runtime -----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled app and any runtime assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

EXPOSE 3001

CMD ["node", "dist/index.js"]
