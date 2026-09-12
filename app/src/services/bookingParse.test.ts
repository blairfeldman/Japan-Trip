/**
 * Confirmation-parsing tests. Run with `npm run test`. These are real-shaped
 * confirmations — the point is that pasting one lands it on the right day.
 */
import { parseBookingText, tripDayFromText, timeFromText, confirmationFromText } from './bookingParse';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra); }
}

console.log('\n-- dates land on the right trip day --');
{
  check('Oct 6 -> day 12', tripDayFromText('Departure Tue Oct 6, 17:45') === 12);
  check('October 6th -> day 12', tripDayFromText('leaving October 6th') === 12);
  check('6 Oct -> day 12', tripDayFromText('on 6 Oct at 5pm') === 12);
  check('2026-09-29 -> day 5', tripDayFromText('check-in 2026-09-29') === 5);
  check('9/26 -> day 2', tripDayFromText('tour on 9/26') === 2);
  check('26/9 (day-first) -> day 2', tripDayFromText('tour on 26/9') === 2);
  check('10月6日 -> day 12', tripDayFromText('出発 10月6日 17:45') === 12);
  check('a date outside the trip is ignored', tripDayFromText('booked on Mar 3') === undefined);
  check('no date at all', tripDayFromText('see you soon') === undefined);
}

console.log('\n-- times --');
{
  check('24h', timeFromText('departs 17:45') === 17.75);
  check('12h pm', timeFromText('at 5:45pm') === 17.75);
  check('12h am', timeFromText('at 8:30am') === 8.5);
  check('midnight 12am', timeFromText('at 12:30am') === 0.5);
  check('bare pm', timeFromText('doors 7pm') === 19);
  check('nonsense rejected', timeFromText('99:99') === undefined);
  check('no time', timeFromText('sometime later') === undefined);
}

console.log('\n-- confirmation codes --');
{
  check('conf.', confirmationFromText('conf. WQ8T2M') === 'WQ8T2M');
  check('Confirmation:', confirmationFromText('Confirmation: ABC12345') === 'ABC12345');
  check('booking #', confirmationFromText('Booking #00008XY') === '00008XY');
  check('none present', confirmationFromText('no code here') === undefined);
}

console.log('\n-- whole confirmations --');
{
  const flight = parseBookingText(`Subject: Your JAL booking
From: noreply@jal.com

JAL 8 KIX to SFO
Tue Oct 6, 17:45
2 seats 41H/41J
Confirmation: WQ8T2M
Payment received`);
  check('flight: kind', flight?.kind === 'Flight', flight?.kind);
  check('flight: day 12', flight?.day === 12, String(flight?.day));
  check('flight: 17:45', flight?.startHour === 17.75, String(flight?.startHour));
  check('flight: conf', flight?.confirmation === 'WQ8T2M');
  check('flight: confident', flight?.confidence === 'Confident');
  check('flight: title from subject', flight?.title === 'Your JAL booking', flight?.title);
  check('flight: sub mentions paid', /paid/.test(flight?.sub ?? ''), flight?.sub);

  const resto = parseBookingText('Table for 2 at Torisoba Zagin, Oct 5 19:00, pay at the counter');
  check('restaurant: kind', resto?.kind === 'Restaurant', resto?.kind);
  check('restaurant: day 11', resto?.day === 11, String(resto?.day));

  const train = parseBookingText('Shinkansen HIKARI 641 Odawara to Kyoto, 9/30 12:07, car 10 seat 12-D');
  check('train: kind', train?.kind === 'Train', train?.kind);
  check('train: day 6', train?.day === 6, String(train?.day));

  const hotel = parseBookingText('Gora Kadan ryokan check-in 2026-09-29, 1 night');
  check('hotel: kind', hotel?.kind === 'Hotel', hotel?.kind);
  check('hotel: day 5', hotel?.day === 5, String(hotel?.day));

  const vague = parseBookingText('Thanks for your order');
  check('no date/time -> Check date', vague?.confidence === 'Check date');
  check('empty input rejected', parseBookingText('') === null && parseBookingText('hi') === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
