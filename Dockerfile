# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm ci

COPY . .

# Build the NextJS application
# Using output: 'standalone' in next.config.js will create a standalone folder
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Set to production mode
ENV NODE_ENV production

# Next.js standalone build copies required files
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/.next/standalone ./
COPY --from=builder /usr/src/app/.next/static ./.next/static

# Expose the listening port
EXPOSE 3000

ENV PORT 3000

# Run the standalone node server
CMD ["node", "server.js"]
