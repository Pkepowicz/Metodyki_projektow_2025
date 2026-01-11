FROM node:24-alpine

WORKDIR /app

COPY leakcheck/package*.json ./

RUN npm install

COPY leakcheck/ .

EXPOSE 8081 19000 19001

CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
