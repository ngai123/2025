# Project Aura – Frontend (React + Vite)

Fast React frontend powered by Vite and React Router. Axios is centralized and reads the backend base URL from Vite env. Tailwind and styled-components handle styling; Framer Motion is available for animations.

## Key Folders
- `src/App.jsx` – route definitions and theme initialization
- `src/main.jsx` – app entry; loads Locator UI only in dev
- `src/api/axios.js` – Axios instance; reads `VITE_API_BASE_URL`
- `src/api/services/*` – API wrappers (`userService`, `profileService`, `messageService`, `matchService`, `commonService`)
- `src/components/SignUp/*` – onboarding (`Welcome`, `AccountCreation`, `ProfilePicture`, `IDVerification`, `VoiceSetupScreen2`)
- `src/components/*` – core pages (`MainPage`, `MatchingPage`, `ChatRoute`, `Inbox`, `Discover`, `SettingsPage`, `Report`)

## Prerequisites
- Node.js 18+ (recommended 20+) and npm 9+

## Setup
```bash
cd Project-Aura-Development/frontend
npm install
```

## Environment
Create a `.env` file in `Project-Aura-Development/frontend`:
```
VITE_API_BASE_URL=http://localhost:8000
```
- Axios uses this value as `baseURL` and falls back to `http://localhost:8000` if not set.
- If the backend runs elsewhere, update the URL accordingly (e.g., tunnel or cloud).

## Run (Development)
```bash
npm run dev
```
- Opens the app on `http://localhost:5173/`.
- Onboarding flow lives at `http://localhost:5173/account-creation`.
- The email registration form is hidden initially; click "Sign in with Email" to reveal inputs.

## Build & Preview
```bash
npm run build
npm run preview  # serves the production build locally
```

## Linting
```bash
npm run lint
```

## Routes (App.jsx)
- `/` → `Welcome`
- `/account-creation` → `AccountCreation`
- `/profile` → `ProfileSetup`
- `/edit-profile` → `EditProfile`
- `/profile-picture` → `ProfilePicture`
- `/id-verification` → `IDVerification`
- `/voice-setup` → `VoiceSetupScreen2`
- `/main` → `MainPage`
- `/chat` and `/chat/:id` → `ChatRoute`
- `/report`, `/report/submain`, `/report/upload` → report pages

## Auth & API
- `src/api/axios.js` injects `Authorization: Bearer <token>` if `localStorage.access_token` or `localStorage.token` is present.
- `userService.register(payload)` posts to `/users/register` using snake_case keys (`phone_number`, `country_code`, etc.).
- On success, `current_user_id` is stored and flow navigates to `/profile`.

## Styling
- Tailwind: configured via `tailwind.config.js` with `content: ./src/**/*.{js,jsx,ts,tsx}`.
- Global theme variables are injected in `App.jsx` and persisted via `localStorage('aura-theme')`.
- Styled-components available for component-level styling.

## Windows Note
- Locator UI is conditionally loaded in development; the Babel plugin is disabled on Windows via `vite.config.js` to avoid path issues. `main.jsx` loads runtime only when `import.meta.env.DEV`.

## Troubleshooting
- Dev server not opening: ensure port `5173` is free or check the terminal for Vite output.
- API 404/CORS: verify backend at `http://localhost:8000`, and confirm `VITE_API_BASE_URL` in `.env`.
- Registration errors: ensure all required fields are filled; password length ≥ 8.

## Useful Scripts
- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – serve the built app locally
- `npm run lint` – run ESLint

## Font Type
# Embed code in the <head> of your html
`<style>
@import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&display=swap');
</style>`

# Josefin Sans: CSS class for a variable style

`.josefin-sans-<uniquifier> {
  font-family: "Josefin Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}`

## Color Palette
# https://coolors.co/visualizer/e2ddb4-ff7f7f-ffa0a0-ffbebe-f9f4e2