FROM node:12.18.2
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000/tcp
EXPOSE 3001/tcp
CMD [ "npm", "start" ]
