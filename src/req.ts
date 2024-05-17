import { AttractionList, UserSession } from './lib';

export async function login(id: string, pin: string): Promise<UserSession> {
  const res = await fetch(
    'https://epass-ca.quipugroup.net/epass_server.php?dataType=json&method=Login&language=en',
    {
      credentials: 'include',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.5',
        'x-epass-clientID': '16',
        // Hard Coded in https://epass-ca.quipugroup.net/Clients/16/ePASSClient.js
        'x-epass-clientKey': '26fb1bbcf05a68a0bbcff31cb74cb23f',
        'x-epass-patronNumber': id,
        'x-epass-patronPassword': pin,
        'x-epass-patronID': '0',
        'x-epass-libraryID': '1',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      referrer: 'https://epass-ca.quipugroup.net/?clientID=16&libraryID=1',
      method: 'GET',
      mode: 'cors',
    },
  );

  return (await res.json()) as UserSession;
}

export async function attractions(patron: string): Promise<AttractionList> {
  const res = await fetch(
    'https://epass-ca.quipugroup.net/epass_server.php?dataType=json&method=ePASS_Search&functionFile=Attractions&searchType=Attractions&dateSelected=None&limits=&language=en',
    {
      credentials: 'include',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.5',
        'x-epass-clientID': '16',
        'x-epass-clientKey': '26fb1bbcf05a68a0bbcff31cb74cb23f',
        'x-epass-patronID': patron,
        'x-epass-libraryID': '1',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      referrer: 'https://epass-ca.quipugroup.net/?clientID=16&libraryID=1',
      method: 'GET',
      mode: 'cors',
    },
  );

  return (await res.json()) as AttractionList;
}
