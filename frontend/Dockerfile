FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# We skip copying the code directly if we are using docker-compose volumes for hot-reloading!
# But we copy it anyway for the initial image configuration.
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
