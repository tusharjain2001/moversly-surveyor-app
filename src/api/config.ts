// Settings come from .env (see .env.example). EXPO_PUBLIC_ values are built into the app,
// so never put secrets here.

/** Our AI survey server (room scans, item list, voice-note transcripts). */
export const SURVEY_API_URL = (process.env.EXPO_PUBLIC_SURVEY_API_URL || "https://instant-booking.moversly.com/ai").replace(/\/$/, "");

/** The tech team's API (login, appointments, saving surveys). Not given to us yet. */
export const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

/** Sample data until the tech team's API is ready. Turns off by itself once BACKEND_URL is set. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK ? process.env.EXPO_PUBLIC_USE_MOCK === "true" : !BACKEND_URL;
