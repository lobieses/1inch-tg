import express from 'express';
import { DiConfig } from '@di/di.config';

import dotenv from 'dotenv';
import { TYPES } from '@di/types';
import { IDBSvc } from '@services/db/dbSvc';
import { IBotSvc } from '@services/bot/botSvc';

dotenv.config();

const { PORT } = process.env;
const app = express();

const start = async () => {
    try {
        app.listen(PORT, () => console.log(`App have been listening on ${PORT} port`));

        const DbSvc = DiConfig.get<IDBSvc>(TYPES.IDBSvc);
        const BotSvc = DiConfig.get<IBotSvc>(TYPES.IBotSvc);

        DbSvc.checkDbExisting();
        await BotSvc.prepareApp();
        await BotSvc.startPriceListening();
    } catch (e) {
        console.log(e);
    }
};

start();
