FROM node:20-slim

# Install system dependencies for native modules and build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Default to development mode (will be overridden in production)
ENV NODE_ENV=development

# Use npm run dev for development (with nodemon for hot-reload)
CMD ["npm", "run", "dev"]
