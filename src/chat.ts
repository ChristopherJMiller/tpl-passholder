import { Context, Telegram } from 'telegraf';
import { login } from './req';
import {
  DatabaseClient,
  DbAttractionOffer,
  add_user_notification,
  get_all_attraction_notifications,
  get_all_attractions_db,
  get_user_db,
  get_user_notifications,
  remove_user_notification,
  set_user_db,
} from './db';
import { format, parse } from 'date-fns';

export async function chatStart(ctx: Context) {
  ctx.reply('To get started, login with `/login <library id> <pin>`');
}

export async function chatLogin(ctx: Context) {
  const chunks = ctx.text.split(' ');

  const libraryId = chunks[1];
  const pin = chunks[2];

  if (libraryId && pin) {
    const session = await login(libraryId, pin);
    await set_user_db(ctx.state['client'], {
      telegramID: `${ctx.from.id}`,
      librarySessionID: session.patronID,
    });
    ctx.reply(
      `Connected your telegram account to ${session.patronID} (${session.firstName} ${session.lastName})`,
    );
  } else {
    ctx.reply('Please supply as `/login <library id> <pin>`');
  }
}

export async function chatMe(ctx: Context) {
  const me = await get_user_db(ctx.state['client'], `${ctx.from.id}`);

  if (me) {
    ctx.reply(`Connected to id ${me.librarySessionID}`);
  } else {
    ctx.reply('Not connected to any account. Use `/login` to begin');
  }
}

const formatDate = (dateStr: string): string => {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(date, 'MM/dd');
  } catch {
    return dateStr;
  }
};

function displayAttraction(attraction: DbAttractionOffer): string {
  let terms = [`\\(${attraction.attractionID}\\)`, `*${attraction.name}*`];

  if (
    attraction.offersFrequency &&
    attraction.offersQuantity &&
    attraction.offersFrequency !== 'undefined' &&
    attraction.offersQuantity !== 'undefined'
  ) {
    terms.push(
      `\\(${attraction.offersQuantity} ${attraction.offersFrequency}\\)`,
    );
  }

  if (
    attraction.firstAvailable !== undefined &&
    attraction.firstAvailable.toLocaleLowerCase() !== 'n/a'
  ) {
    terms.push(formatDate(attraction.firstAvailable));
  }

  return terms.join(' ');
}

export async function chatAttractions(ctx: Context) {
  const attractions = await get_all_attractions_db(ctx.state['client']);

  const dataCollected = attractions.filter(
    (attr) =>
      attr.firstAvailable !== undefined &&
      attr.firstAvailable.toLocaleLowerCase() !== 'n/a',
  );
  const noData = attractions.filter(
    (attr) =>
      attr.firstAvailable === undefined ||
      attr.firstAvailable.toLocaleLowerCase() === 'n/a',
  );

  const markdown = ['Current Attractions:\n']
    .concat(dataCollected.map(displayAttraction))
    .concat(['\nNo Data Collected Yet:\n'])
    .concat(noData.map(displayAttraction))
    .join('\n');

  ctx.replyWithMarkdownV2(markdown);
}

export async function chatSubscribe(ctx: Context) {
  const me = await get_user_db(ctx.state['client'], `${ctx.from.id}`);

  if (!me) {
    await ctx.reply('Please login with /login <library id> <pin> in order to subscribe to attractions');
    return;
  }

  const chunks = ctx.text.split(' ');

  const id = chunks[1];

  if (!id) {
    await ctx.reply('/subscribe <attraction id>');
    return;
  }

  const attractions = await get_all_attractions_db(ctx.state['client']);
  const foundAttraction = attractions.find((attr) => attr.attractionID === id);

  if (!foundAttraction) {
    const text = [
      `Could not find an attraction with ID "${id}"`,
      'Please supply an ID from the following attraction list:',
      ...attractions.map((attr) => `(${attr.attractionID}) ${attr.name}`),
    ].join("\n");

    await ctx.reply(text);
    return;
  }

  await add_user_notification(ctx.state['client'], id, {
    telegramID: me.telegramID,
    librarySessionID: me.librarySessionID,
    chatID: ctx.message.chat.id,
  });

  await ctx.reply(`Sucessfully subscribed to ${foundAttraction.name} availability`);
  return;
}

export async function chatUnsubscribe(ctx: Context) {
  const me = await get_user_db(ctx.state['client'], `${ctx.from.id}`);

  if (!me) {
    await ctx.reply('Please login with /login <library id> <pin> in order to subscribe to attractions');
    return;
  }

  const chunks = ctx.text.split(' ');

  const id = chunks[1];

  if (!id) {
    await ctx.reply('/unsubscribe <attraction id>');
    return;
  }

  const attractions = await get_all_attractions_db(ctx.state['client']);
  const foundAttraction = attractions.find((attr) => attr.attractionID === id);

  if (!foundAttraction) {
    const text = [
      `Could not find an attraction with ID "${id}"`,
      'Please supply an ID from the following attraction list:',
      ...attractions.map((attr) => `(${attr.attractionID}) ${attr.name}`),
    ].join("\n");

    await ctx.reply(text);
    return;
  }

  await remove_user_notification(ctx.state['client'], id, {
    telegramID: me.telegramID,
    librarySessionID: me.librarySessionID,
    chatID: ctx.message.chat.id,
  });

  await ctx.reply(`Sucessfully unsubscribed from ${foundAttraction.name} availability`);
  return;
}

export async function chatSubscriptions(ctx: Context) {
  const me = await get_user_db(ctx.state['client'], `${ctx.from.id}`);

  if (!me) {
    await ctx.reply('Please login with /login <library id> <pin> in order to subscribe to attractions');
    return;
  }

  const [attractions, subscriptions] = await Promise.all([
    get_all_attractions_db(ctx.state['client']),
    get_user_notifications(ctx.state['client'], me.telegramID)
  ]);

  if (!subscriptions || subscriptions.length === 0) {
    await ctx.reply('No offers have been subscribed to');
    return;
  }

  const attractionTable = {};
  attractions.forEach((attr) => {
    attractionTable[attr.attractionID] = attr;
  });

  const text = [
    'Subscriptions:',
    ...subscriptions.filter((id) => attractionTable[id] !== undefined).map((id) => `(${id}) ${attractionTable[id].name}`),
  ].join("\n");

  await ctx.reply(text);
}

export async function handleNotifyingUsers(telegram: Telegram, client: DatabaseClient) {
  const attractions = await get_all_attractions_db(client);

  for (const attr of attractions) {
    if (attr.firstAvailable && attr.firstAvailable.toLocaleLowerCase() !== 'n/a') {
      const attractionSubscriptions = await get_all_attraction_notifications(client, attr.attractionID);
      for (const subscription of attractionSubscriptions) {
        telegram.sendMessage(subscription.chatID, `${attr.name} has a reservation available on ${formatDate(attr.firstAvailable)}!`);
      }
    }
  }
}