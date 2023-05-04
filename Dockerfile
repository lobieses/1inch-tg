FROM node:16.18.1

ENV WORKDIR = /usr/src/app/
ENV WORKDIR_DIST = ./dist/
ENV WORKDIR_DB = ./dist/db/

WORKDIR $WORKDIR

COPY .env .
COPY package.json .
COPY yarn.lock .

RUN yarn install --production=true --frozen-lockfile

COPY dist ./dist/

VOLUME /usr/src/app/dist/db

CMD ["yarn", "start"]
