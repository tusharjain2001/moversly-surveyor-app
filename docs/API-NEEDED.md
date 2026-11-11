# Moversly API used by the app

From the tech team's document "API For Mobile App" (Nov 2026). All calls go to
`https://api.moversly.com`; the code is in `src/api/backend.ts` and `src/lib/saveRequest.ts`.

| Step | Call | What the app uses |
|---|---|---|
| Login | `POST /api/v1/auth/login` `{user_name, password}` | the access token (kept in the phone's secure storage) |
| User | `GET /api/v1/auth/user-info` (Bearer token) | name and role for "Hi, …" |
| Leads | `GET /api/v1/order/my-orders/for-app?show-summary=true` (Bearer token) | `matching_orders`: name, phone, email, from / to address, moving date, appointment date and status, lead status, shipment mode, volume, order no. (`request_id`) |
| Save the survey | `POST /api/v1/order/create-order-for-pricing`, **one call with all rooms**, same `order_id` | `room_name` = the room names joined by commas ("LIVING ROOM, BED ROOM 1"), every room's items (`name`, `dimensions` "L x W x H" cm, `quantity`, `volumeFt3`, `volumeM3`, `weightKg` per unit), survey totals |
| Read the order | `GET /api/v1/order/{order_id}` (also used by the Moving to India page) | the customer's details, sent back unchanged when saving (see below) |

## What we found when testing (on a test order)

- **The save call needs the customer's details.** With only the fields in the document it
  fails with `500 "Name is null"`. It needs `shipment_mode`, `shipment_type`, `moving_type`,
  `moving_date`, `name`, `email`, `phone`, `origin_country`, `destination_country`.
- **It overwrites the order with what it is sent** (addresses not sent became "null"). So the
  app first reads the order and sends the customer's own details back unchanged. Checked: the
  name, email, phone, addresses, moving date and move type stay the same.
- **Each call replaces the items sent before**: after saving three rooms one by one, only the last
  one was on the order. The tech team will change `room_name` to a list; until then the app sends
  all rooms in one call (room names joined by commas), the same as the Moving to India page, so
  every item is kept. Which item is in which room isn't stored yet.
- Room names are sent in their format: LIVING ROOM, DINING ROOM, MASTER BED ROOM, BED ROOM 2,
  KITCHEN, BALCONY, STORAGE; other rooms in capitals. Waiting for their list.
- Weights: the AI gives none, so 110 kg per m³ (same as the Moving to India page).

## Not in the API (stay on the phone for now)

- Item photos (the AI's picture of each item).
- Voice notes, their transcripts and typed notes.
- Dashboard counts (completed / pending): not in the document, so not shown.
