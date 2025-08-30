FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

EXPOSE 5173

CMD ["npm", "run", "dev"]