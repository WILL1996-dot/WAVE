# WAVES — React Native / Expo application

WAVES is a dark, privacy-first social app prototype based on the supplied Figma PDF designs and the WAVES ERD. The mobile client is built with **React Native + Expo + TypeScript**. Supabase is optional and remains disabled until project credentials and database policies are added.

## Included in this development pass

- Welcome, sign-up, strong-password guidance, email verification screen, profile setup, Casual/Hot zone selection, login and password-reset flows.
- Shared account shell and five-tab navigation aligned to the expanded Figma source: Feed, Casual, Hot, Chat, Profile. Following/reminders and Alerts/activity remain accessible through Feed shortcuts and the Profile menu.
- Casual profile discovery, detailed profiles, sample mutual-match screen and filters.
- Cross-zone inbox, new-match rail, search and locally interactive chat demo.
- Social feed with Stories, For You/Clubs toggle, post cards, local likes, a comments sheet, story viewer, and composer actions for Post, Story, Go Live, Club Room and Casual Boost.
- Profile content tabs (Posts/Media/Saved) and a Wallet screen with a demo credit balance, packages and filtered transaction activity. Purchases are intentionally disabled until a provider and server-side ledger are integrated.
- Hot Zone creator discovery, live-room UI and room chat demo; creator profile and creator dashboard.
- Club Zones directory, membership-request interactions and club activity screen.
- Nearby-map design using illustrative pins only. **No GPS is read or uploaded by the prototype.**
- Account privacy and safety UI: app lock, hidden previews, capture-protection preference, discovery/location toggles, read receipts, blocked-account and data-request entry points.
- Native screen-capture prevention hook from Expo ScreenCapture, with web excluded. Platform and device limits still apply.
- Optional Supabase Auth client scaffold using platform SecureStore for session storage. With no credentials, the app runs in demo mode.
- Screen map, implementation status, detailed review of the second Figma ZIP, and database migration notes in `docs/` and `database/`.

## Run locally

### Requirements

- Node.js 22.13.x or newer (Expo SDK 57 toolchain requirement)
- npm
- Expo Go or Android emulator / iOS simulator (iOS simulator requires macOS)

### Start the app

Open a terminal in `WAVES/app`:

```bash
npm install
npx expo install --fix
npx expo start --clear
```

Scan the QR code with Expo Go or open an emulator. Expo's terminal shortcuts can open Android (`a`), iOS simulator (`i`, macOS only) or web (`w`). Web is for preview only; native capture protections do not apply in a browser.

The project targets Expo SDK 57. The `npx expo install --fix` command checks and aligns native module versions with the installed Expo SDK before starting.

### Type check

```bash
npm run typecheck
```

## Demo mode

The app starts on the welcome page. Create an account to go through onboarding. In local demo mode, use any non-empty email and password on the login screen. Likes, chat messages, club join requests and live-room chat currently update local UI state only: they are not synced across devices and are not persisted on a server. Feed posts, stories, comments, wallet activity and names/photos are demo/local-state previews based on the supplied Figma designs. They reset when the app state is lost and are not persisted to Supabase yet.

## Supabase connection — later phase

1. Create a Supabase project.
2. Convert the approved ERD into versioned PostgreSQL migrations. Read `database/README.md` first; DBML is not executable SQL.
3. Add constraints, indexes, functions/triggers, Row Level Security policies and Storage policies. Test cross-user authorization before exposing tables.
4. In `WAVES/app`, copy `.env.example` to `.env` and set the project URL and publishable key:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

5. Restart Expo after changing environment values.

**Never put a Supabase `service_role` key or any secret/service credential inside the React Native app.** Only a public/publishable client key belongs here, paired with correct RLS. When Supabase is configured, this scaffold uses Auth for sign-up, login, sign-out and password-reset requests. Profile persistence, feed APIs, messaging, media upload, location RPCs, club membership and realtime calls still need migrations/server functions and then explicit app integration.

## Integrations still required before launch

- Supabase schema migrations, RLS and Storage policies, server-side authorization, age-verification provider, reporting/block enforcement and privacy request workflows.
- End-to-end encryption using an established audited protocol/library, including key rotation, linked devices, secure attachment encryption and recovery rules. Current demo chat is not encrypted.
- Realtime chat sync and push notifications with generic private-content payloads.
- Audio/video provider and server-issued call/room credentials. Current call and live-stream controls are UI only.
- Location permission flow, recipient-specific grants, PostGIS nearby queries, expiry/revocation and abuse protections. Current map uses illustrative pins only.
- Native privacy testing on supported iOS/Android devices. Capture protection is not a guarantee against external cameras or compromised devices.
- Moderation, adult eligibility, payments/tips if enabled, data retention and product/store-policy review.

## Project layout

```text
WAVES/
  README.md
  database/README.md
  docs/SCREEN_MAP.md
  docs/IMPLEMENTATION_STATUS.md
  docs/FIGMA_ZIP_REVIEW.md
  app/
    App.tsx
    index.ts
    app.json
    package.json
    .env.example
    assets/photos/
    src/components/UI.tsx
    src/data/mock.ts
    src/lib/supabase.ts
    src/screens/OnboardingScreens.tsx
    src/screens/MainScreens.tsx
    src/screens/FeedScreen.tsx
    src/screens/FeatureScreens.tsx
    src/theme.ts
```
