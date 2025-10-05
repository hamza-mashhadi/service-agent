FROM node:24.9.0-alpine3.21
WORKDIR /usr/src/app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/index.js"]