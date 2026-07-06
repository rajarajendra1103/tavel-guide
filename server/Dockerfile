# Use the official Playwright Jammy image which includes Node.js and system dependencies for Chromium
FROM mcr.microsoft.com/playwright:v1.42.0-jammy

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose port (Render automatically routes traffic using process.env.PORT)
EXPOSE 3001

# Start the application
CMD [ "npm", "start" ]
