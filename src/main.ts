import { createClient } from 'redis';
import { attractions, login } from './req';
import { Telegraf } from 'telegraf';
import { chatAttractions, chatLogin, chatMe, chatStart, chatSubscribe, chatSubscriptions, chatUnsubscribe, handleNotifyingUsers } from './chat';
import {
  DbAttractionOffer,
  get_all_attractions_db,
  set_attraction_db,
} from './db';
import express from 'express';

async function main() {
  console.log('Starting in telegram bot mode');
  console.log('Connecting to Redis DB');
  const client = await createClient({
    url: process.env.URL ?? undefined,
  }).connect();

  console.log('Connecting to Telegram API');
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Supply redis client to telegram middleware
  bot.use(async (ctx, next) => {
    ctx.state['client'] = client;
    await next();
  });

  bot.start(chatStart);
  bot.command('login', chatLogin);
  bot.command('me', chatMe);
  bot.command('attractions', chatAttractions);
  bot.command('subscribe', chatSubscribe);
  bot.command('unsubscribe', chatUnsubscribe);
  bot.command('subscriptions', chatSubscriptions);

  // Endpoint to handle subscriptions
  const refreshApp = express();
  refreshApp.get('/', (_req, res) => {
    handleNotifyingUsers(bot.telegram, client);
    res.send('OK');
  });
  const server = refreshApp.listen(3000, () => {
    console.log('Refresh endpoint listening on http://0.0.0.0:3000');
  })

  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.closeAllConnections();
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.closeAllConnections();
  });

  bot.launch(() => {
    console.log('Telegram Launched');
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refresh() {
  if (process.env.SKIP_WAIT === undefined) {
    const delayMs = Math.floor(Math.random() * 1000); // Up to 1 second
    const delay = delayMs * 60 * 5; // up to 5 minutes

    console.log(`Sleeping for ${delay / 60 / 1000} minutes before starting`);

    await sleep(delay);
  }

  console.log('Starting in refresh mode');

  const id = process.env.ID!;
  const pin = process.env.PIN!;

  console.log('Connecting to Redis DB');
  const client = await createClient({
    url: process.env.URL ?? undefined,
  }).connect();

  console.log('Logging into TPL Session');
  const session = await login(id, pin);

  console.log('Getting Attractions');
  const attrList = await attractions(session.patronID);

  // All current offers
  const offers: DbAttractionOffer[] = attrList.attractionList.map((attr) => {
    return {
      name: attr.name,
      attractionID: attr.attractionID,
      offersFrequency: attr.offers?.at(0)?.offersFrequency,
      offersQuantity: attr.offers?.at(0)?.offersQuantity,
      startTime: attr.offers?.at(0)?.startTime,
      endTime: attr.offers?.at(0)?.endTime,
      firstAvailable: attr.offers?.at(0)?.date,
    };
  });

  console.log(`Found ${offers.length} Attraction Offers`);

  const offerTable: Record<string, Partial<DbAttractionOffer>> = {};
  offers
    .filter((offer) => offer.attractionID !== undefined)
    .forEach((offer) => {
      offerTable[offer.attractionID] = offer;
    });

  const currentEntries = await get_all_attractions_db(client);
  console.log(`Gathered ${currentEntries.length} database entries`);

  const currentTable: Record<string, Partial<DbAttractionOffer>> = {};
  currentEntries
    .filter((offer) => offer.attractionID !== undefined)
    .forEach((offer) => {
      currentTable[offer.attractionID] = offer;
    });

  const additions: DbAttractionOffer[] = offers.filter(
    (offer) =>
      offer.attractionID !== undefined &&
      currentTable[offer.attractionID] === undefined,
  );
  console.log(`Found ${additions.length} additions`);

  const updateEntries = currentEntries.map((entry) => {
    const currentOffer = offerTable[entry.attractionID];

    if (currentOffer) {
      entry.firstAvailable = currentOffer.firstAvailable ?? 'N/a';
      entry.offersFrequency =
        currentOffer.offersFrequency ?? entry.offersFrequency;
      entry.offersQuantity =
        currentOffer.offersQuantity ?? entry.offersQuantity;
    }

    return entry;
  });

  const fullList = updateEntries.concat(additions);

  for (const entry of fullList) {
    console.log(`Setting ${entry.attractionID} ${entry.name}`);
    await set_attraction_db(client, entry);
  }

  await client.disconnect();

  // If a notify url is defined, use it to notify the telegram bot that availability was been refreshed
  if (process.env.NOTIFY_URL) {
    console.log('Notifying telegram bot of refreshed availability');
    await fetch(process.env.NOTIFY_URL);
  }

  console.log('Done!');
}

if (process.env.MODE?.toLowerCase() === 'refresh') {
  refresh();
} else {
  main();
}
