import { createClient } from 'redis';
import { attractions, login } from './req';
import { Telegraf } from 'telegraf';
import { chatAttractions, chatLogin, chatMe, chatStart } from './chat';
import {
  DbAttractionOffer,
  get_all_attractions_db,
  set_attraction_db,
} from './db';

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

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  await bot.launch(() => {
    console.log('Telegram Launched');
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refresh() {
  const delayMs = Math.floor(Math.random() * 1000); // Up to 1 second
  const delay = delayMs * 60 * 5; // up to 5 minutes

  console.log(`Sleeping for ${delay / 60 / 1000} minutes before starting`);

  await sleep(delay);

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
  const offers: Partial<DbAttractionOffer>[] = attrList.attractionList.map(
    (attr) => {
      return {
        attractionID: attr.attractionID,
        offersFrequency: attr.offers?.at(0)?.offersFrequency,
        offersQuantity: attr.offers?.at(0)?.offersQuantity,
        startTime: attr.offers?.at(0)?.startTime,
        endTime: attr.offers?.at(0)?.endTime,
        firstAvailable: attr.offers?.at(0)?.date,
        name: attr.name,
      };
    },
  );

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

  const additions: DbAttractionOffer[] = offers
    .filter(
      (offer) =>
        offer.attractionID !== undefined &&
        offer.firstAvailable !== undefined &&
        currentTable[offer.attractionID] === undefined,
    )
    .map((offer) => {
      // New addition
      return {
        attractionID: offer.attractionID!,
        offersFrequency: offer.offersFrequency!,
        offersQuantity: offer.offersQuantity!,
        startTime: offer.startTime!,
        endTime: offer.endTime!,
        firstAvailable: offer.firstAvailable!,
        name: offer.name!,
      };
    });
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

  console.log('Done!');
}

if (process.env.MODE?.toLowerCase() === 'refresh') {
  refresh();
} else {
  main();
}
