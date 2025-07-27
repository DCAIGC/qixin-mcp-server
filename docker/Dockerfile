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

# Default to SSE mode, can be overridden with environment variables
CMD ["sh", "-c", "if [ \"$MCP_STREAMABLE_HTTP\" = \"true\" ]; then npm run start:streamable-http; else npm run start:sse; fi"]