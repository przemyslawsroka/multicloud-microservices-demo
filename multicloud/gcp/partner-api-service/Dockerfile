FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
# Install all dependencies to build TS
RUN npm install
COPY src ./src
RUN npm run build

FROM node:18-slim
WORKDIR /app
COPY package*.json ./
# Install only prod dependencies
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["npm", "start"]
