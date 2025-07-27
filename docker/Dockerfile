FROM node:20-alpine

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

# Create start script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "Environment variables:"' >> /app/start.sh && \
    echo 'echo "MCP_STREAMABLE_HTTP=$MCP_STREAMABLE_HTTP"' >> /app/start.sh && \
    echo 'echo "MCP_SSE=$MCP_SSE"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'if [ "$MCP_STREAMABLE_HTTP" = "true" ]; then' >> /app/start.sh && \
    echo '    echo "Starting in Streamable HTTP mode..."' >> /app/start.sh && \
    echo '    exec node dist/server.js --streamable-http' >> /app/start.sh && \
    echo 'elif [ "$MCP_SSE" = "true" ]; then' >> /app/start.sh && \
    echo '    echo "Starting in SSE mode..."' >> /app/start.sh && \
    echo '    exec node dist/server.js --sse' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '    echo "No mode specified, defaulting to SSE mode..."' >> /app/start.sh && \
    echo '    exec node dist/server.js --sse' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    chmod +x /app/start.sh

# Use start script
CMD ["/app/start.sh"]