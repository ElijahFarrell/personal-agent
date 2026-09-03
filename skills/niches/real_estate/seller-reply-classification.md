---
name: seller-reply-classification
description: Tag inbound seller SMS as ignore, later, human_now, or deal for land and wholesale.
---

# Seller reply tags

Use the latest inbound plus recent thread context. Prefer the most specific tag.

## ignore
Do not draft. Mark handled.

Examples: `STOP`, `unsubscribe`, `wrong number`, `not the owner`, `remove me`, abuse.

## later
Seller is real but not ready. Store a one-line follow-up in notes. Do not send now.

Examples: `maybe later`, `next year`, `not right now`, `call me in the spring`.

Land cue: `no in March, try September` is later, not a dead lead.

## human_now
Live interest that needs the operator. Draft an SMS.

Examples: `yes`, `how much?`, `make me an offer`, `what's your number`, `call me`, an explicit asking price (`$40k`, `8k an acre`).

## deal
Transaction-critical. Draft, and push to a call if they want one.

Examples: contract, title, closing date, wire instructions, property access, `buyer is ready`, `send the agreement`.

## Land vs house cues
- Land: acres, APN, county, road/access, taxes, seller finance, per-acre talk.
- House: beds/baths, occupancy, repairs, assignment, closing timeline, asking price.

If both appear, tag from intent (opt-out still wins). Never invent a price.
