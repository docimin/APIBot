# Use the LTS version of Node.js
FROM node:24

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install exactly the versions in package-lock.json
RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

# Expose the port your app runs on (default PORT is 3333)
EXPOSE 3333

# Command to run your app
CMD ["node", "index.js"]
