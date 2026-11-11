# Moversly Surveyor app

Android app (iPhone later, same code) for Moversly's surveyors. The surveyor logs in, sees the
customers booked for a home survey, visits them, scans each room with the AI, corrects the
items, records the discussion (turned into text), checks the total volume and submits.

Built with **Expo SDK 58** (React Native, TypeScript) and Expo Router. All libraries are free and
open source (MIT).

## Screens

| Screen | File |
|---|---|
| Login | `src/app/login.tsx` |
| Dashboard: hello, completed / pending, Today · Upcoming · Completed | `src/app/(app)/index.tsx` |
| Customer details: call, WhatsApp, email, address (map), move details, Start survey | `src/app/(app)/customer/[id].tsx` |
| Select rooms (tick, add a room), open a scanned room | `src/app/(app)/survey/[id]/rooms.tsx` |
| One room: record, or add items without recording; progress; item list, rescan, next room | `src/app/(app)/survey/[id]/room/[roomId].tsx` |
| Camera (5–90 s video, no sound) | `src/app/(app)/survey/[id]/record/[roomId].tsx` |
| Edit item: name, quantity, L × W × H cm, volume, notes, delete | `src/app/(app)/survey/[id]/item/[roomId]/[itemId].tsx` |
| Add item: search the item list, or add any name | `src/app/(app)/survey/[id]/add/[roomId].tsx` |
| Customer discussion: voice recordings with transcripts, typed notes | `src/app/(app)/survey/[id]/notes.tsx` |
| Survey summary: rooms, total cft / m³, submit | `src/app/(app)/survey/[id]/summary.tsx` |
| Survey completed | `src/app/(app)/survey/[id]/done.tsx` |

No pricing for now (the client hasn't decided whether surveyors should see it).

## Where data comes from

| What | From | File |
|---|---|---|
| Login, user, leads, saving the survey items | **The tech team's API** (`api.moversly.com`, their "API For Mobile App" document) | `src/api/backend.ts`, `src/lib/saveRequest.ts`, `docs/API-NEEDED.md` |
| Room scan (video → items with sizes and photos), item list | Our AI server, same as the Moving to India page | `src/api/survey.ts` |
| Voice notes → text | Our AI server: `POST /ai/transcribe`, Whisper on the Modal GPU | `src/api/survey.ts`, `moversely/ai/survey/transcribe.py` |

A survey is kept on the phone (`surveys.json` in the app's documents folder) until it is
submitted, so closing the app doesn't lose it. The login token is in the phone's secure storage.

## Run it

```bash
npm install
npx expo start          # scan the QR code with the Expo Go app (Android)
npx expo start --web    # quick look in a browser (no camera)
npm run typecheck
npx expo lint
```

Camera and microphone need a real phone. Expo Go works for trying it out. For a test build to
share (APK link), use Expo's cloud build: `npx eas-cli@latest build -p android --profile preview`
(needs a free Expo account; `eas.json` is created the first time).

## Settings

Copy `.env.example` to `.env`:

- `EXPO_PUBLIC_SURVEY_API_URL`: our AI server (default `https://instant-booking.moversly.com/ai`).
- `EXPO_PUBLIC_BACKEND_URL`: the tech team's API (default `https://api.moversly.com`).
- `EXPO_PUBLIC_USE_MOCK=true`: demo with sample customers and no real login.

`EXPO_PUBLIC_` values are built into the app, so never put secrets in them.

## Still to do

- Open questions for the tech team (`docs/API-NEEDED.md`): keeping all rooms on the order, room names, item photos, voice notes.
- Real logo and app icon (the logo is a placeholder in the design's style: `src/components/Logo.tsx`).
- Play Store account and listing.
