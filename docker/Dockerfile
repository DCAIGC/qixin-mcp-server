FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

ENV MCP_SSE=true
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start:sse"]