# APIs needed from the Moversly tech team

The surveyor app is built and runs on sample data until these are ready. Each call lives in
`src/api/backend.ts` (one function each), so connecting a real API is a small change.
Names and shapes below are our proposal: change them to whatever suits your backend and
tell us.

All calls: JSON, `Authorization: Bearer <token>` after login, errors as
`{ "message": "..." }` with a normal HTTP status (401 when the login has expired).

## 1. Login

`POST /surveyor/login`

```json
{ "email": "arun@moversly.com", "password": "..." }
```

Response:

```json
{
  "token": "...",
  "user": { "id": "u-1", "name": "Arun Kumar", "role": "Relocation Surveyor", "email": "arun@moversly.com" }
}
```

Questions: how long does the token last? Is there a refresh token? Is there "forgot password"?
Only users with the surveyor role should be able to log in.

## 2. Dashboard counts

`GET /surveyor/stats` → `{ "completed": 38, "pending": 12 }` (for the logged-in surveyor).

## 3. My visits

`GET /surveyor/appointments` → a list of the visits assigned to the logged-in surveyor
(today, upcoming and recently completed):

```json
[
  {
    "id": "a-101",
    "orderId": "05112026_082048_000101",
    "customer": { "name": "John Smith", "phone": "+65 9123 4567", "email": "john.smith@email.com" },
    "origin": "Singapore",
    "destination": "Sydney, Australia",
    "address": "12 Holland Road, #08-03, Singapore 258716",
    "movingDate": "2026-11-12",
    "surveyAt": "2026-11-05T10:00:00+08:00",
    "moveSize": "Full household",
    "status": "pending",
    "source": "Moving to India page"
  }
]
```

- `address`: the full address of the visit. The website forms only collect a city, so who
  adds this, and where?
- `moveSize`: `Full household` | `Partial household` | `A few boxes`.
- `status`: `pending` | `completed`.
- `source`: which website or page the lead came from (optional).

## 4. One visit

`GET /surveyor/appointments/{id}` → one object as above.

## 5. Save the finished survey

`POST /surveyor/appointments/{id}/survey`. This saves the survey and marks the visit completed.
The app builds this in `src/lib/payload.ts`:

```json
{
  "appointment_id": "a-101",
  "order_id": "05112026_082048_000101",
  "started_at": "2026-11-05T02:05:11.000Z",
  "submitted_at": "2026-11-05T02:41:52.000Z",
  "total_items": 23,
  "total_volume_ft3": 404.8,
  "total_volume_m3": 11.46,
  "rooms": [
    {
      "name": "Living Room",
      "method": "video",
      "item_count": 4,
      "volume_ft3": 93.2,
      "items": [
        {
          "name": "Sofa",
          "key": "sofa",
          "length_cm": 200, "width_cm": 90, "height_cm": 85,
          "quantity": 1,
          "unit_volume_ft3": 54.0,
          "volume_ft3": 54.0,
          "volume_m3": 1.53,
          "source": "ai",
          "confidence": "high",
          "note": "Fabric sofa, good condition",
          "image": "data:image/jpeg;base64,..."
        }
      ]
    }
  ],
  "notes": "Customer will arrange parking. Fragile: artwork and piano.",
  "voice_notes": [
    { "recorded_at": "2026-11-05T02:20:03.000Z", "duration_seconds": 156, "transcript": "..." }
  ]
}
```

Questions:

- **Item photos**: each item found by the AI comes with a small JPEG (~20 KB) showing the item
  with its outline. Should we send it inside the item (base64, as above), or upload it with
  `get-upload-url-for-custom-item` + `confirm-image-uploaded`? If the upload route: what is
  `space` (the room name?) and how is the photo linked to the item?
- Should the items also go onto the order with `create-order-for-pricing` (as the
  Moving to India page does), or does this endpoint handle that?
- **Voice notes**: we send the transcript text. Do you also want the audio file? If so, where
  should it be uploaded (S3 upload link)?

## Not needed from you

The room video scan, the item list and the voice-note transcripts come from our own server
(`instant-booking.moversly.com/ai`), the same as the Moving to India page.
