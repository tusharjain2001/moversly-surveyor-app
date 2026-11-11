// Settings come from .env (see .env.example). EXPO_PUBLIC_ values are built into the app,
// so never put secrets here.

/** Our AI survey server (room scans, item list, voice-note transcripts). */
export const SURVEY_API_URL = (process.env.EXPO_PUBLIC_SURVEY_API_URL || "https://instant-booking.moversly.com/ai").replace(/\/$/, "");

/** The Moversly tech team's API (login, leads, saving the survey items). */
export const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || "https://api.moversly.com").replace(/\/$/, "");

/** Sample customers instead of the real API: set EXPO_PUBLIC_USE_MOCK=true for a demo without a login. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "true";
