import { Telegraf } from 'telegraf';
import DbSvc from './dbSvc';
import PriceCheckerSvc from './priceCheckerSvc';

import dotenv from 'dotenv';
import { IComparedTokens } from './modules';
import { chainsData } from '../1inchApiMaps/networks';
import { tokensToFind } from '../1inchApiMaps/tokenAddresses';

dotenv.config();

const { BOT_TOKEN } = process.env;

class BotSvc {
    bot;

    constructor() {
        this.bot = new Telegraf(BOT_TOKEN as string);
    }

    sendPriceDifferenceTrigger(triggeredTokens: IComparedTokens) {
        const listeners = DbSvc.getListeners();
        const response = this.priceDifferenceResponseCreator(triggeredTokens);
        listeners.forEach((listenerId: string) =>
            this.bot.telegram.sendMessage(listenerId, response).catch((e) => {
                console.log('ERROR ON SEND MESSAGE!', e);
                if (e.response.error_code === 403 || e.response.error_code === 400) {
                    DbSvc.removeListener(e.on.payload.chat_id);
                }
            }),
        );
    }

    priceDifferenceResponseCreator(triggeredTokens: IComparedTokens) {
        return Object.keys(triggeredTokens).reduce((acc, tokenSymbol) => {
            const fromNetwork = Object.keys(chainsData).find((id) => chainsData[id].CHAIN_NAME === triggeredTokens[tokenSymbol].min.network) as string;
            const toNetwork = Object.keys(chainsData).find((id) => chainsData[id].CHAIN_NAME === triggeredTokens[tokenSymbol].max.network) as string;
            console.log(toNetwork);
            //@ts-ignore
            const fromTokenFromNetwork = tokensToFind['USDT'][fromNetwork] ? tokensToFind['USDT'][fromNetwork] : 'USDT';
            //@ts-ignore
            const toTokenFromNetwork = tokensToFind[tokenSymbol][fromNetwork] ? tokensToFind[tokenSymbol][fromNetwork] : tokenSymbol;

            //@ts-ignore
            const toTokenToNetwork = tokensToFind[tokenSymbol][toNetwork] ? tokensToFind[tokenSymbol][toNetwork] : tokenSymbol;
            //@ts-ignore
            const fromTokenToNetwork = tokensToFind['USDT'][toNetwork] ? tokensToFind['USDT'][toNetwork] : 'USDT';

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

    createTgBotListener() {
        // @ts-ignore
        this.bot.launch().then(() => this.bot.start());

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
            if (DbSvc.isListenerExist(ctx.update.callback_query.message.chat.id)) {
                ctx.editMessageText('You already listen prices');
                return;
            }
            console.log('user joined', ctx.update.callback_query.from.username);
            DbSvc.addListener(ctx.update.callback_query.message.chat.id);
            ctx.editMessageText('You have been added to listeners');
        });

        this.bot.command('start_listening', (ctx) => {
            if (DbSvc.isListenerExist(ctx.update.message.chat.id)) {
                ctx.reply('You already listen prices');
                return;
            }
            console.log('user joined', ctx.update.message.from.username);
            DbSvc.addListener(ctx.update.message.chat.id);
            ctx.reply('You have been added to listeners');
        });

        this.bot.command('stop_listening', (ctx) => {
            if (!DbSvc.isListenerExist(ctx.update.message.chat.id)) {
                ctx.reply("You don't listen prices yet");
                return;
            }
            DbSvc.removeListener(ctx.update.message.chat.id);
            ctx.reply('You have been removed from listeners');

            if (!DbSvc.getListeners().length) {
            }
        });

        console.log('users', DbSvc.getListeners());
        PriceCheckerSvc.startPriceChecking(this.sendPriceDifferenceTrigger.bind(this));
    }
}

export default new BotSvc();
