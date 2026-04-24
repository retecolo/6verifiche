# syntax=docker/dockerfile:1

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools needed for better-sqlite3 native addon
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Pre-compile seed script so the runner doesn't need tsx or esbuild
RUN node_modules/.bin/esbuild scripts/seed.ts \
      --bundle --platform=node --packages=external \
      --outfile=scripts/seed.js

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Next.js standalone server reads HOSTNAME to determine bind address.
# Set to :: so the container listens on all IPv6 interfaces.
ENV HOSTNAME=::
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output bundles server.js + its own node_modules subset
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Generated Prisma client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# better-sqlite3 native addon and adapter (not bundled by Next.js standalone)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/driver-adapter-utils ./node_modules/@prisma/driver-adapter-utils

# Plain-JS scripts — no Prisma CLI or tsx needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/scripts/setup-db.js ./scripts/setup-db.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed.js ./scripts/seed.js
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 3000

# Create schema on first boot (idempotent), then start the server
CMD ["sh", "-c", "node scripts/setup-db.js && node server.js"]
