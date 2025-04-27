FROM node:18-alpine

WORKDIR /app

# Copy package files first for better cache utilization
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3001

# Create necessary directories
RUN mkdir -p uploads/profile-pictures uploads/media uploads/group-images uploads/posts uploads/products uploads/verification-documents certificates

# Start the application
CMD ["node", "dist/src/index.js"]
