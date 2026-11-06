# Build & runtime stage for Velvet & Brass Social Club
FROM node:22-slim

WORKDIR /app

# Copy package manifests first for layer caching
COPY package*.json ./

# Install dependencies (including tsx for running server.ts directly)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy application source
COPY . .

# Build Vite frontend into /app/dist
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start full-stack Express + WebSocket server
CMD ["npx", "tsx", "server.ts"]
