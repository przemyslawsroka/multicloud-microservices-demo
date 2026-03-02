FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install --registry=https://registry.npmjs.org/
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["npx", "ts-node", "server.ts"]
