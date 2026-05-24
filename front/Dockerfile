# Frontend Dockerfile for Next.js

FROM node:20-alpine AS development

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start development server with webpack (not turbopack)
CMD ["npm", "run", "dev"]
