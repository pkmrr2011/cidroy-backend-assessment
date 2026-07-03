# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY public ./public
COPY .env.example ./

EXPOSE 3000
CMD ["sh", "-c", "node dist/scripts/seed.js && node dist/scripts/seed_auth.js && node dist/server.js"]
