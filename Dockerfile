FROM node:16.18.1

ENV WORKDIR = /usr/src/app
ENV WORKDIR_DIST = usr/src/app/dist
ENV WORKDIR_DB = usr/src/app/dist/db

WORKDIR $WORKDIR

COPY .env $WORKDIR
COPY package.json $WORKDIR
COPY yarn.lock $WORKDIR

RUN yarn install --production=true --frozen-lockfile

COPY dist $WORKDIR_DIST

VOLUME $WORKDIR_DB

CMD ["yarn", "start"]
