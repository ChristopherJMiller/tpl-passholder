import { Context } from 'telegraf';
import { login } from './req';
import {
  DbAttractionOffer,
  get_all_attractions_db,
  get_user_db,
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
