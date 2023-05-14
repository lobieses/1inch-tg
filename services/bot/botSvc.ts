import { Telegraf } from 'telegraf';
import { injectable, inject } from 'inversify';
import { IChainsData, IComparedTokens, ITokensMap, ITokensToFind, IUSDTTokenMap } from '@type/types';
import { chainsData, tokensToFind } from '@constants/constants';

import dotenv from 'dotenv';
import { TYPES } from '../../DI/types';
import { IDBSvc } from '@services/db/dbSvc';
import { IPriceCheckerSvc } from '@services/priceChecker/priceCheckerSvc';
import { IQueueSvc } from '@services/queue/queueSvc';

dotenv.config();

const { BOT_TOKEN, QUEUE_STEP, CHECK_PERIOD_IN_MS, SLEEP_PERIOD_AFTER_API_ERROR_IN_MS } = process.env;

export interface IBotSvc {
    prepareApp: () => Promise<void>;
    startPriceListening: () => void;
}

@injectable()
export class BotSvc implements IBotSvc {
    private readonly bot;
    private readonly chainsData: IChainsData;
    private tokensMap: ITokensMap | null;
    private USDTTokenMap: IUSDTTokenMap | null;
    private tokensToFind: ITokensToFind;

    constructor(
        @inject(TYPES.IDBSvc) private readonly dbSvc: IDBSvc,
        @inject(TYPES.IPriceCheckerSvc) private readonly priceCheckerSvc: IPriceCheckerSvc,
        @inject(TYPES.IQueueSvc) private readonly queueSvc: IQueueSvc<string>,
    ) {
        this.bot = new Telegraf(BOT_TOKEN as string);
        this.tokensMap = null;
        this.USDTTokenMap = null;
        this.chainsData = chainsData;
        this.tokensToFind = tokensToFind;
    }

    public async prepareApp() {
        this.bot.start((ctx) =>
            ctx.reply(
                '🚀 Welcome to the Interport Cross-Chain Arbitrage Bot! 🚀\n\n' +
                    "We're here to help you discover arbitrage opportunities across multiple chains in real-time. Stay tuned for notifications, and let's make the most of the cross-chain trading potential together! Happy trading! ",
                {
                    reply_markup: {
                        inline_keyboard: [[{ text: 'Start listening', callback_data: 'start_listening' }]],
                    },
                },
            ),
        );

        this.bot.action('start_listening', (ctx) => {
            if (!ctx.update.callback_query.message) return;
            if (this.dbSvc.isListenerExist(ctx.update.callback_query.message.chat.id)) {
                ctx.editMessageText('You already listen prices');
                return;
            }
            console.log('user joined', ctx.update.callback_query.from.username);
            this.dbSvc.addListener(ctx.update.callback_query.message.chat.id);
            ctx.editMessageText('You have been added to listeners');
        });

        this.bot.command('start_listening', (ctx) => {
            if (this.dbSvc.isListenerExist(ctx.update.message.chat.id)) {
                ctx.reply('You already listen prices');
                return;
            }
            console.log('user joined', ctx.update.message.from.username);
            this.dbSvc.addListener(ctx.update.message.chat.id);
            ctx.reply('You have been added to listeners');
        });

        this.bot.command('stop_listening', (ctx) => {
            if (!this.dbSvc.isListenerExist(ctx.update.message.chat.id)) {
                ctx.reply("You don't listen prices yet");
                return;
            }
            this.dbSvc.removeListener(ctx.update.message.chat.id);
            ctx.reply('You have been removed from listeners');

            if (!this.dbSvc.getListeners().length) {
            }
        });

        console.log('users', this.dbSvc.getListeners());

        const { commonTokensMap, USDTTokenMap } = await this.priceCheckerSvc.prepareAddressesMap(Object.keys(chainsData), this.tokensToFind);

        this.tokensMap = commonTokensMap;
        this.USDTTokenMap = USDTTokenMap;
        this.queueSvc.registerQueue(Object.keys(commonTokensMap), Number(QUEUE_STEP) as unknown as number);
    }

    public startPriceListening() {
        setTimeout(async () => {
            if (!this.tokensMap || !this.USDTTokenMap) {
                throw new Error('Tokens not prepared yet');
            }
            const nextQueue = this.queueSvc.next();
            console.log('Next queue: ', nextQueue);

            let prices;

            try {
                prices = await this.priceCheckerSvc.checkPrices(nextQueue, this.tokensMap, this.USDTTokenMap, this.chainsData);
            } catch (e) {
                console.log('CAUGHT ERROR', e);
                this.queueSvc.rollback();
                console.warn('startSleep');

                await new Promise((resolve) => setTimeout(resolve, +(SLEEP_PERIOD_AFTER_API_ERROR_IN_MS as string) - +(CHECK_PERIOD_IN_MS as string)));

                console.warn('endSleep');
                this.startPriceListening();
                return;
            }

            console.log('triggered', prices);

            if (Object.keys(prices).length) this.sendPriceDifferenceTrigger(prices);
            this.startPriceListening();
        }, CHECK_PERIOD_IN_MS as unknown as number);
    }

    private sendPriceDifferenceTrigger(triggeredTokens: IComparedTokens) {
        const listeners = this.dbSvc.getListeners();
        const response = this.priceDifferenceResponseCreator(triggeredTokens);
        listeners.forEach((listenerId: string) =>
            this.bot.telegram.sendMessage(listenerId, response).catch((e) => {
                console.log('ERROR ON SEND MESSAGE!', e);
                if (e.response.error_code === 403 || e.response.error_code === 400) {
                    this.dbSvc.removeListener(e.on.payload.chat_id);
                }
            }),
        );
    }

    private priceDifferenceResponseCreator(triggeredTokens: IComparedTokens) {
        return Object.keys(triggeredTokens).reduce((acc, tokenSymbol) => {
            const fromNetwork = Object.keys(chainsData).find((id) => chainsData[id].CHAIN_NAME === triggeredTokens[tokenSymbol].min.network) as string;
            const toNetwork = Object.keys(chainsData).find((id) => chainsData[id].CHAIN_NAME === triggeredTokens[tokenSymbol].max.network) as string;
            const fromTokenFromNetwork = this.tokensToFind['USDT'][fromNetwork] ? this.tokensToFind['USDT'][fromNetwork] : 'USDT';
            const toTokenFromNetwork = this.tokensToFind[tokenSymbol][fromNetwork] ? this.tokensToFind[tokenSymbol][fromNetwork] : tokenSymbol;
            const toTokenToNetwork = this.tokensToFind[tokenSymbol][toNetwork] ? this.tokensToFind[tokenSymbol][toNetwork] : tokenSymbol;
            const fromTokenToNetwork = this.tokensToFind['USDT'][toNetwork] ? this.tokensToFind['USDT'][toNetwork] : 'USDT';

            return (
                acc +
                `\t${tokenSymbol}\r\n` +
                `\t\t\t\t best for buy: ${triggeredTokens[tokenSymbol].min.network} - ${triggeredTokens[tokenSymbol].min.willGetInToken} ${tokenSymbol} for ${triggeredTokens[tokenSymbol].min.priceInUsdt} USDT\r\n` +
                `\t\t\t\t https://app.interport.fi/${fromNetwork}/${fromNetwork}/${fromTokenFromNetwork}/${toTokenFromNetwork} \r\n\r\n` +
                `\t\t\t\t best for sell: ${triggeredTokens[tokenSymbol].max.network} - ${triggeredTokens[tokenSymbol].max.price} USDT for ${triggeredTokens[tokenSymbol].min.willGetInToken} ${tokenSymbol} \r\n` +
                `\t\t\t\t https://app.interport.fi/${toNetwork}/${toNetwork}/${toTokenToNetwork}/${fromTokenToNetwork} \r\n\r\n`
            );
        }, '⚠ some tokens have difference more than 1% ⚠\n\n');
    }
}
