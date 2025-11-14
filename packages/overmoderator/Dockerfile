FROM node:18-alpine

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