FROM node:20-alpine

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
# RUN npm run build

# Start the application
CMD ["npm", "run", "dev"]

EXPOSE 3000
