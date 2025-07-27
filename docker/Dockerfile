FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without running prepare script
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Now build the project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Set environment variables
ENV PORT=3000

EXPOSE 3000

# Create start script directly in the image
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh

# 启动脚本 - 根据环境变量选择运行模式

echo "Environment variables:"
echo "MCP_STREAMABLE_HTTP=$MCP_STREAMABLE_HTTP"
echo "MCP_SSE=$MCP_SSE"

if [ "$MCP_STREAMABLE_HTTP" = "true" ]; then
    echo "Starting in Streamable HTTP mode..."
    exec node dist/server.js --streamable-http
elif [ "$MCP_SSE" = "true" ]; then
    echo "Starting in SSE mode..."
    exec node dist/server.js --sse
else
    # 默认使用 SSE 模式（适合 Docker 部署）
    echo "No mode specified, defaulting to SSE mode..."
    exec node dist/server.js --sse
fi
EOF

RUN chmod +x /app/start.sh

# Use start script
CMD ["/app/start.sh"]