import {Telegraf} from 'telegraf';
import DbSvc from './dbSvc';
import PriceCheckerSvc from './priceCheckerSvc';

import dotenv from 'dotenv';
dotenv.config();

const {BOT_TOKEN} = process.env;

class BotSvc {
    bot;
    constructor() {
      this.bot = new Telegraf(BOT_TOKEN as string);
    }

    sendPriceDifferenceTrigger(triggeredTokens: any) {
        const listeners = DbSvc.getListeners();
        const response = this.priceDifferenceResponseCreator(triggeredTokens);
        listeners.forEach((listenerId: any) => this.bot.telegram.sendMessage(listenerId, response));
    }

    priceDifferenceResponseCreator(triggeredTokens: any) {
        return Object.keys(triggeredTokens).reduce((acc, tokenSymbol) => {
            return (
                acc +
                `\t${tokenSymbol}\r\n` +
                `\t\t\t\tMin:   ${triggeredTokens[tokenSymbol].min.network} - ${triggeredTokens[tokenSymbol].min.price}\r\n` +
                `\t\t\t\tMax:   ${triggeredTokens[tokenSymbol].max.network} - ${triggeredTokens[tokenSymbol].max.price}\r\n\r\n`
            )
        }, '⚠ some tokens have difference more than 1% ⚠\n\n');
    }

    createTgBotListener() {
        // @ts-ignore
      this.bot.launch().then(() => this.bot.start());

        this.bot.start((ctx: any) => ctx.reply(
            ('Click on "Start listening" in order to take messages about crypto prices difference. \n\n' +
                ' You will get the message if one of token on multiple networks have difference more or equal 1% between each other'),
            {
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Start listening', callback_data: "start_listening"}],
                    ]
                }
            }
        ))

        this.bot.action('start_listening', (ctx: any) => {
            if (DbSvc.isListenerExist(ctx.update.callback_query.message.chat.id)) {
                ctx.editMessageText('You already listen prices');
                return;
            }
            console.log('user joined', ctx.update.callback_query.from.username);
          DbSvc.addListener(ctx.update.callback_query.message.chat.id);
            ctx.editMessageText('You have been added to listeners');
          PriceCheckerSvc.changeNeedToCheckPrices(true);
        })

        this.bot.command('start_listening', (ctx: any) => {
            if (DbSvc.isListenerExist(ctx.update.message.chat.id)) {
                ctx.reply('You already listen prices');
                return;
            }
            console.log('user joined', ctx.update.message.from.username);
          DbSvc.addListener( ctx.update.message.chat.id);
            ctx.reply('You have been added to listeners');
          PriceCheckerSvc.changeNeedToCheckPrices(true);
        })

        this.bot.command('stop_listening', (ctx: any) => {
            if (!DbSvc.isListenerExist(ctx.update.message.chat.id)) {
                ctx.reply("You don't listen prices yet");
                return;
            }
          DbSvc.removeListener(ctx.update.message.chat.id);
            ctx.reply('You have been removed from listeners');

            if (!DbSvc.getListeners().length) {
              PriceCheckerSvc.changeNeedToCheckPrices(false);
            }
        })

        if (DbSvc.getListeners().length) {
          PriceCheckerSvc.changeNeedToCheckPrices(true);
          PriceCheckerSvc.startPriceChecking(this.sendPriceDifferenceTrigger.bind(this));
        }
    }
}

export default new BotSvc();