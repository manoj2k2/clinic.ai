# syntax=docker/dockerfile:1

# ----- Production deps -----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Use ci if lockfile exists; fallback to install
RUN npm ci --omit=dev || npm install --omit=dev

# ----- Builder -----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install dev deps for build; fallback if no lockfile
RUN npm ci || npm install
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

# ----- Runtime -----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

EXPOSE 3001

CMD ["node", "dist/index.js"]
