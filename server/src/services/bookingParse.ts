export interface ParsedBooking {
  kind: 'Flight' | 'Restaurant' | 'Train' | 'Hotel' | 'Activity';
  title: string;
  sub: string;
  confidence: 'Confident' | 'Check date';
}

/**
 * Turns a forwarded confirmation email into the same booking shape the
 * Inbox screen renders. Uses Claude when ANTHROPIC_API_KEY is set (handles
 * confirmations in Japanese, odd formatting, etc. far better than regex);
 * otherwise falls back to a few regexes for the common English patterns —
 * weaker, but keeps the inbox usable without an LLM key.
 */
export async function parseBookingEmail(params: {
  subject: string;
  from: string;
  text: string;
}): Promise<ParsedBooking> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content:
              'Extract a travel booking summary from this forwarded confirmation email (it may be in Japanese). ' +
              'Reply with ONLY compact JSON: {"kind": "Flight|Restaurant|Train|Hotel|Activity", "title": "short title with the operator/venue name", ' +
              '"sub": "one line: date, time, party size, seat/confirmation info, paid vs pay-on-arrival", "confidence": "Confident|Check date"} ' +
              '(use "Check date" if the email is not in English and you are inferring the date).\n\n' +
              `Subject: ${params.subject}\nFrom: ${params.from}\n\n${params.text.slice(0, 6000)}`,
          },
        ],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const raw = json.content?.[0]?.text ?? '{}';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    }
  }

  // Regex fallback — good enough for plain English airline/train confirmations.
  const dateMatch = params.text.match(/\b(\d{1,2}[:.]\d{2}\s?(?:am|pm)?)\b/i);
  const confMatch = params.text.match(/\b(?:conf(?:irmation)?[.:# ]*)([A-Z0-9]{5,10})\b/i);
  const kind: ParsedBooking['kind'] = /flight|airlines?|boarding/i.test(params.subject + params.text)
    ? 'Flight'
    : /train|shinkansen|rapi:?t|romancecar/i.test(params.subject + params.text)
    ? 'Train'
    : /table|reservation|restaurant|tabelog/i.test(params.subject + params.text)
    ? 'Restaurant'
    : /hotel|ryokan|check-?in/i.test(params.subject + params.text)
    ? 'Hotel'
    : 'Activity';

  return {
    kind,
    title: params.subject.slice(0, 80) || params.from,
    sub: [dateMatch?.[1], confMatch ? `conf. ${confMatch[1]}` : null].filter(Boolean).join(' · ') || 'Forwarded booking — details unclear, check the original email',
    confidence: confMatch ? 'Confident' : 'Check date',
  };
}
