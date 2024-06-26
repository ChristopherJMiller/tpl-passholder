import { createClient } from 'redis';

export type DatabaseClient = ReturnType<typeof createClient>;

export interface DbAttractionOffer {
  name: string;
  attractionID: string;
  offersFrequency?: string;
  offersQuantity?: string;
  startTime?: string;
  endTime?: string;
  firstAvailable?: string;
}

export interface DbUserSession {
  telegramID: string;
  librarySessionID: string;
}

async function set_db_hash(client: DatabaseClient, hash: string, obj: object) {
  let tuples = Object.keys(obj).flatMap((key) => [key, `${obj[key]}`]);

  await client.hSet(hash, tuples);
}

async function get_db_hash(
  client: DatabaseClient,
  hash: string,
): Promise<object | undefined> {
  const getAll = await client.hGetAll(hash);
  if (getAll) {
    return getAll as object;
  } else {
    return undefined;
  }
}

export async function set_attraction_db(
  client: DatabaseClient,
  offer: DbAttractionOffer,
) {
  await set_db_hash(client, `attraction:${offer.attractionID}`, offer);
  await client.sAdd(`attraction:set`, offer.attractionID);
}

export async function get_attraction_db(
  client: DatabaseClient,
  attractionId: string,
): Promise<DbAttractionOffer | undefined> {
  const obj = await get_db_hash(client, `attraction:${attractionId}`);

  if (obj) {
    return obj as DbAttractionOffer;
  } else {
    return undefined;
  }
}

export async function get_all_attractions_db(
  client: DatabaseClient,
): Promise<DbAttractionOffer[]> {
  const keys = await client.sMembers(`attraction:set`);
  const offers = keys.map((key) => get_attraction_db(client, key));
  return Promise.all(offers);
}

export async function set_user_db(
  client: DatabaseClient,
  session: DbUserSession,
) {
  return set_db_hash(client, `user:${session.telegramID}`, session);
}

export async function get_user_db(
  client: DatabaseClient,
  telegramID: string,
): Promise<DbUserSession | undefined> {
  const obj = await get_db_hash(client, `user:${telegramID}`);

  if (obj) {
    return obj as DbUserSession;
  } else {
    return undefined;
  }
}

export interface DbAttractionSubscription {
  // For identification
  telegramID: string;
  // Currently unused, but could be in the future for auto-reservation (if so wished)
  librarySessionID: string;
  // Used to send chat notification
  chatID: number;
}

export async function add_user_notification(
  client: DatabaseClient,
  attractionID: string,
  subscription: DbAttractionSubscription,
) {
  await Promise.all([
    // Track in list of all subscriptions for user
    client.sAdd(`user_subscriptions:${subscription.telegramID}`, attractionID),
    // Add to Subscription's Notification List
    client.sAdd(`subscription:${attractionID}`, JSON.stringify(subscription)),
  ]);
}

export async function remove_user_notification(
  client: DatabaseClient,
  attractionID: string,
  subscription: DbAttractionSubscription,
) {
  await Promise.all([
    client.sRem(`subscription:${attractionID}`, JSON.stringify(subscription)),
    client.sRem(`user_subscriptions:${subscription.telegramID}`, attractionID),
  ]);
}

export async function get_user_notifications(
  client: DatabaseClient,
  telegramID: string,
): Promise<string[] | undefined> {
  return await client.sMembers(`user_subscriptions:${telegramID}`)
}

export async function get_all_attraction_notifications(
  client: DatabaseClient,
  attractionID: string,
): Promise<DbAttractionSubscription[] | undefined> {
  const subscriptions = await client.sMembers(`subscription:${attractionID}`);

  if (subscriptions) {
    return subscriptions.map((sub) => JSON.parse(sub));
  } else {
    return undefined;
  }
}