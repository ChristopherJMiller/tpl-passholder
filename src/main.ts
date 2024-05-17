import { attractions, login } from './req';

async function main() {
  const id = process.env.ID!;
  const pin = process.env.PIN!;

  const session = await login(id, pin);
  console.log(
    'Logged in as',
    session.firstName,
    session.lastName,
    'id',
    session.patronID,
  );

  const attrList = await attractions(session.patronID);

  console.log();
  console.log('Found', attrList.attractionCount, 'attractions');
  attrList.attractionList.forEach((attr) => {
    const id = attr.ID ?? attr.attractionID ?? 'N/a';
    console.log(`(ID ${id}) ${attr.name}`);
    if (attr.offers) {
      attr.offers.forEach((offer) => {
        console.log(
          `${offer.libraryQuantity} passes ${offer.libraryFrequency}`,
        );
        console.log(`Next available day: ${offer.date}`);
      });
    } else {
      console.log(
        'No passes available, offer terms not supplied when no passes available',
      );
    }
    console.log();
  });
}

main();
