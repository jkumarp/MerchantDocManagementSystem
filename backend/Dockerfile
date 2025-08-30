FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend/ ./backend/

# Generate Prisma client
RUN npx prisma generate --schema=./backend/prisma/schema.prisma

# Build the application
RUN npm run build:api

EXPOSE 8080

CMD ["npm", "run", "start:api"]