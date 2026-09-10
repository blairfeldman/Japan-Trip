import { InboxBooking } from '../types';

export const SEED_INBOX: InboxBooking[] = [
  {
    id: 'inb-jal8', kind: 'Flight', icon: 'AirplaneTakeoff', confidence: 'Confident',
    title: 'JAL 8 · KIX → SFO', sub: 'Tue Oct 6, 17:45 · 2 seats, 41H/41J · conf. WQ8T2M', day: 12,
  },
  {
    id: 'inb-zagin', kind: 'Restaurant', icon: 'ForkKnife', confidence: 'Check date',
    title: 'Tabelog: Torisoba Zagin', sub: 'Confirmation in Japanese · reads Oct 5, 19:00, party of 2 · pay at the counter', day: 11,
  },
  {
    id: 'inb-rapit', kind: 'Train', icon: 'TrainRegional', confidence: 'Confident',
    title: "Nankai Rapi:t · Namba → KIX", sub: 'Tue Oct 6, 14:05 · car 4, seats 3A/3B · ¥1,490 each, paid', day: 12,
  },
];
