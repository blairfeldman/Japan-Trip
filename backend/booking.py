"""Read a booking confirmation with Claude.

The app already parses confirmations offline with regexes
(`app/src/services/bookingParse.ts`) and that keeps working with no network.
This is the better path when the phone has signal: it handles Japanese prose,
odd layouts, and confirmations that never write a date in a format a regex
would recognise.

Deliberately returns raw facts — an ISO date and a wall-clock time — rather
than a trip day number. Mapping a date onto "day 6 of the trip" is the app's
job, it already does it, and it keeps this endpoint from needing to know
anything about the itinerary.
"""

import os
from typing import Any

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
EXTRACT_MODEL = os.environ.get("EXTRACT_MODEL", "claude-haiku-4-5-20251001")

BOOKING_TOOL = {
    "name": "record_booking",
    "description": "Record the travel booking described in a confirmation message.",
    "input_schema": {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": ["Flight", "Train", "Restaurant", "Hotel", "Activity"]},
            "title": {"type": "string", "description": "Short title: the operator or venue and the route if any."},
            "sub": {"type": "string", "description": "One line: time, party size, seat, confirmation, paid status."},
            "date": {
                "type": ["string", "null"],
                "description": "The date the booking is FOR, as YYYY-MM-DD. Null if the message doesn't say. Not the date the email was sent.",
            },
            "time": {
                "type": ["string", "null"],
                "description": "Start time on a 24-hour clock as HH:MM. Null if not stated.",
            },
            "confirmation": {"type": ["string", "null"], "description": "Booking or confirmation reference."},
            "prepaid": {"type": "boolean", "description": "True if already paid, false if payable on arrival."},
            "confidence": {"type": "string", "enum": ["Confident", "Check date"]},
        },
        "required": ["kind", "title", "sub", "date", "time", "confirmation", "prepaid", "confidence"],
    },
}

BOOKING_SYSTEM = """You read travel booking confirmations and pull out the essentials. They are often in Japanese.

Rules:
- `date` is the date the booking is FOR, never the date the message was sent. If the message only says "tomorrow" or gives no date, return null.
- Never invent a confirmation number, a time, or a date. Null is the right answer when the message doesn't say.
- `title` should be recognisable at a glance in a day planner: the operator or venue, plus the route for transport.
- confidence: "Confident" when the date and time are stated outright; "Check date" when you inferred either, or when the message is ambiguous.
- Japanese dates like 10月6日 mean October 6. Japanese times are usually already 24-hour."""


def parse_booking(text: str) -> dict[str, Any]:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    from anthropic import Anthropic  # lazily imported so tests need no SDK

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=EXTRACT_MODEL,
        max_tokens=600,
        system=BOOKING_SYSTEM,
        tools=[BOOKING_TOOL],
        tool_choice={"type": "tool", "name": "record_booking"},
        messages=[{"role": "user", "content": text[:6000]}],
    )
    for block in message.content:
        if block.type == "tool_use":
            return dict(block.input)
    raise RuntimeError("model returned no tool_use block")
