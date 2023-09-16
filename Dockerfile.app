FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

WORKDIR /usr/src/app/web-client
RUN npm install
RUN npm run build

WORKDIR /usr/src/app
EXPOSE 8080
CMD ["node", "server.mjs"]