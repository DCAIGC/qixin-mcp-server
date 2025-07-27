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