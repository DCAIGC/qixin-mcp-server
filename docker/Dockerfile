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

# Copy start script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Use start script
CMD ["/app/start.sh"]