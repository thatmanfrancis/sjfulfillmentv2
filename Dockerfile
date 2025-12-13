# 1. Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --frozen-lockfile
COPY . .
ENV NEXT_IGNORE_TYPE_ERRORS=1
RUN npm run build

# 2. Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
RUN npm ci --omit=dev
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
