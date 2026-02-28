FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# We need to build the next app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 8080

# Next.js standalone mode config creates a standalone folder with all dependencies
# But by default it's not enabled, we must enable it in next.config.ts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Note: Nextjs 15+ standalone outputs the server.js to the root of standalone folder
# We also need to copy the content folder so `fs.readFileSync` works
COPY --from=builder /app/src/content ./src/content

EXPOSE 8080
CMD ["node", "server.js"]
