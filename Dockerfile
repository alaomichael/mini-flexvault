# 1. Base image
FROM node:18-alpine as builder

# 2. Set working directory
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy source files
COPY . .

# 5. Build the app
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose app port (adjust if yours differs)
EXPOSE 3001

# Start the app
CMD ["node", "dist/main"]
