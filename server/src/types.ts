export type Category = 'ramen' | 'sushi' | 'matcha' | 'food' | 'shopping' | 'hotel' | 'sightseeing' | 'transit';

export interface Clip {
  handle: string;
  caption: string;
  savedBy: 'B' | 'Y';
  savedAt: string;
  sourceUrl?: string;
}

export interface SavedPin {
  id: string;
  name: string;
  cat: Category;
  address: string;
  lat: number;
  lng: number;
  sub: string;
  who: 'B' | 'Y' | 'both';
  note?: string;
  hours?: string;
  price?: string;
  clips: Clip[];
  createdAt: string;
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

export interface DbShape {
  pins: SavedPin[];
  inbox: InboxBooking[];
}
