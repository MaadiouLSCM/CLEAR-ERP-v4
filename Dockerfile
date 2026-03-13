FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
CMD npx prisma db push --accept-data-loss && node dist/main.js
