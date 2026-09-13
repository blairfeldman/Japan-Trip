export type Category =
  | 'ramen'
  | 'sushi'
  | 'matcha'
  | 'food'
  | 'shopping'
  | 'hotel'
  | 'sightseeing'
  | 'transit';

export type Tag = 'Prepaid' | 'Pay there' | 'Undecided' | '';

export interface ItineraryEvent {
  id: string;
  day: number; // 1-12
  start: number; // decimal 24h hour, e.g. 12.1 = 12:06
  end: number;
  cat: Category;
  title: string;
  sub: string;
  tag: Tag;
  location?: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  booking?: {
    confirmation?: string;
    seatCar?: string;
    paidUsd?: string;
    perPersonUsd?: string;
    cancelBy?: string;
    reserved?: string;
  };
  photoCaption?: string;
}

/** Which of the two of you. `TRIP.travelers` carries the names. */
export type Person = 'B' | 'Y';

export interface SavedPin {
  id: string;
  name: string;
  cat: Category;
  address: string;
  lat: number;
  lng: number;
  sub: string;
  who: Person | 'both';
  note?: string;
  hours?: string;
  price?: string;
  clips: {
    handle: string;
    caption: string;
    savedBy: Person;
    savedAt: string;
    sourceUrl?: string;
    /** Cover frame from the video, when the share could be read. */
    thumbnailUrl?: string;
  }[];
  createdAt: string;
}

export interface Situation {
  id: string;
  label: string;
  icon: string;
  sub: string;
}

export interface Phrase {
  id: string;
  situationId: string;
  en: string;
  romaji: string;
  kana: string;
}

export interface InboxBooking {
  id: string;
  kind: 'Flight' | 'Restaurant' | 'Train' | 'Hotel' | 'Activity';
  icon: string;
  confidence: 'Confident' | 'Check date';
  title: string;
  sub: string;
  day: number;
  raw?: string;
  addedToDay?: boolean;
}
