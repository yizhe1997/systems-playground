FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development
ENV PORT=3002
EXPOSE 3002

CMD ["npm", "run", "dev"]
