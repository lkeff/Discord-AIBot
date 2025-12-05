# Using Debian slim for better security patch coverage
# Note: Base image may contain known vulnerabilities pending upstream patches
FROM node:22-slim

# Update system packages to fix vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port if needed (Discord bots typically don't need this)
# EXPOSE 3000

# Start the bot
CMD ["npm", "start"]