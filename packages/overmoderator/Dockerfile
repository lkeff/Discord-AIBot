# Using Ubuntu LTS for better compatibility and database connectivity
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
# - curl, ca-certificates, gnupg: for NodeSource setup
# - postgresql-client, libpq-dev: database connectivity
# - build-essential, python3: native module compilation
# - ffmpeg: audio/voice processing
# - iputils-ping, dnsutils: network debugging
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y \
        curl \
        ca-certificates \
        gnupg \
        postgresql-client \
        libpq-dev \
        build-essential \
        python3 \
        ffmpeg \
        iputils-ping \
        dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Verify Node.js installation
RUN node --version && npm --version

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application files
COPY . .

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Expose port for health checks (optional)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]