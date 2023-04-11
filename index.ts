import express from 'express';
import BotSvc from './services/botSvc'
import DbSvc from './services/dbSvc'
import PriceCheckerSvc from './services/priceCheckerSvc';

import dotenv from 'dotenv';
dotenv.config();

const {PORT} = process.env;
const app = express();

const start = async () => {
  try {
    app.listen(PORT, () => console.log(`App have been listening on ${PORT} port`));
    DbSvc.checkDbExisting();
    BotSvc.createTgBotListener();
    PriceCheckerSvc.fetchAddresses();
  } catch (e) {
    console.log(e);
  }
}

start();