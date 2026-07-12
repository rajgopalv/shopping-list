FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY mcp-server/package.json ./mcp-server/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY mcp-server/package.json ./mcp-server/
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
EXPOSE 3456
CMD ["node", "server/dist/index.js"]
