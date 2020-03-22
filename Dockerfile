FROM node:12 as build

COPY . /discord-bot

WORKDIR /discord-bot

RUN npm install && \
    npm run build && \
    npm prune --production && \
    npm cache clean --force && \
    rm -R src/

WORKDIR /discord-bot/bin

ENV NODE_ENV production

CMD [ "node", "index.js" ]
