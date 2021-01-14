FROM node:alpine3.12

COPY public /app/public
COPY socketio-file-upload /app/socketio-file-upload
COPY uploads /app/uploads
COPY app.js /app/
COPY package.json /app/

WORKDIR "/app"

RUN npm install

EXPOSE 8089

CMD ["node", "app.js"]
