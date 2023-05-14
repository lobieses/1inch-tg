import { Container } from 'inversify';
import 'reflect-metadata';
import { IPriceCheckerSvc, PriceCheckerSvc } from '@services/priceChecker/priceCheckerSvc';
import { IPriceHandlerSvc, PriceHandlerSvc } from '@services/priceChecker/priceHandlerSvc';
import { DbSvc, IDBSvc } from '@services/db/dbSvc';
import { BotSvc, IBotSvc } from '@services/bot/botSvc';
import { IQueueSvc, QueueSvc } from '@services/queue/queueSvc';
import { TYPES } from './types';

export const DiConfig = new Container();
DiConfig.bind<IPriceCheckerSvc>(TYPES.IPriceCheckerSvc).to(PriceCheckerSvc).inSingletonScope();
DiConfig.bind<IPriceHandlerSvc>(TYPES.IPriceHandlerSvc).to(PriceHandlerSvc).inSingletonScope();
DiConfig.bind<IBotSvc>(TYPES.IBotSvc).to(BotSvc).inSingletonScope();
DiConfig.bind<IDBSvc>(TYPES.IDBSvc).to(DbSvc).inSingletonScope();
DiConfig.bind<IQueueSvc<any>>(TYPES.IQueueSvc).to(QueueSvc);
