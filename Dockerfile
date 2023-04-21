FROM node:16.18.1
WORKDIR /usr/src/app

ENV PORT=8000
ENV BOT_TOKEN=6091369472:AAGphXDFZmdaVRDA5uwf-GI1dT2vs_PWdIg
ENV QUEUE_STEP=1
ENV SLEEP_PERIOD_IN_MS=30000
ENV CHECK_PERIOD_IN_MS=30000

COPY package.json /usr/src/app/
RUN yarn install --production=true
COPY dist /usr/src/app/dist

VOLUME /usr/src/app/dist/db
CMD ["yarn", "start"]
