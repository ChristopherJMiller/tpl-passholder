export interface UserSession {
  session: string;
  patronID: string;
  patronEmail: string;
  firstName: string;
  lastName: string;
  allowReservations: boolean;
  hasReservations: boolean;
  currentReservationCount: number;
}

export interface AttractionList {
  attractionCount: number;
  attractionList: Attraction[];
}

export interface Attraction {
  ID?: string;
  attractionID?: string;
  name: string;
  attractionOffersCount: number;
  offers?: AttractionOffer[];
}

export interface AttractionOffer {
  venueName: string;
  offerID: string;
  attractionID: string;
  attractionVenueID: string;
  internalOfferName: string;
  offerDescription: string;
  offersFrequency: string;
  offersQuantity: string;
  startTime: string;
  endTime: string;
  libraryFrequency: string;
  libraryQuantity: string;
  dates: string[];
  date: string;
}
