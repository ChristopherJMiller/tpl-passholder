import { createClient } from 'redis';

export type DatabaseClient = ReturnType<typeof createClient>;

export interface DbAttractionOffer {
  attractionID: string;
  offersFrequency: string;
  offersQuantity: string;
  startTime: string;
  endTime: string;
  firstAvailable: string;
}

async function set_db_hash(client: DatabaseClient, hash: string, obj: object) {
  let tuples = Object.keys(obj).flatMap((key) => [key, `${obj[key]}`]);

  await client.hSet(hash, tuples);
}

async function get_db_hash(
  client: DatabaseClient,
  hash: string,
): Promise<DbAttractionOffer> {
  return (await client.hGetAll(hash)) as unknown as DbAttractionOffer;
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
): Promise<DbAttractionOffer> {
  return get_db_hash(client, `attraction:${attractionId}`);
}

export async function get_all_attractions_db(
  client: DatabaseClient,
): Promise<DbAttractionOffer[]> {
  const keys = await client.sMembers(`attraction:set`);
  const offers = keys.map((key) => get_attraction_db(client, key));
  return Promise.all(offers);
}
