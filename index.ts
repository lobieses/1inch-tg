import express from 'express';
import BotSvc from './services/bot/botSvc';
import DbSvc from './services/db/dbSvc';

import dotenv from 'dotenv';
dotenv.config();

const { PORT } = process.env;
const app = express();

const start = async () => {
    try {
        app.listen(PORT, () => console.log(`App have been listening on ${PORT} port`));
        DbSvc.checkDbExisting();
        await BotSvc.prepareApp();
        await BotSvc.startPriceListening();
    } catch (e) {
        console.log(e);
    }
};

start();
