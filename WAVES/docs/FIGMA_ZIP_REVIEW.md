# Figma ZIP Review — Build WAVES Social Media App

## Review outcome

The uploaded `Build WAVES Social Media App.zip` is a **Vite + React web prototype source project**, not a native React Native project and not just a bundle of exported screens. It includes components for the feed, casual discovery, Hot Zone/live discovery, inbox, one chat view, profile, and a create-action bottom sheet. WAVES's existing Expo/React Native project is kept as the native source of truth; the web ZIP was reviewed for design and behavior and its most useful product patterns were ported into native components.

## Files reviewed

- `package.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, and `src/lib/utils.ts` — app entry, routing/state structure, overall dark visual system, and utilities.
- `src/components/views/HomeFeed.tsx` — WAVES header, For You/Clubs toggle, Stories rail, social post cards, likes/comments/share actions, club/community cards.
- `src/components/views/CasualZone.tsx` — swipe-card discovery, profile information overlay, pass/like actions, empty state.
- `src/components/views/HotZone.tsx` — live discovery search, topic filters, live stream cards, viewer counts and premium markers.
- `src/components/views/Messages.tsx` — inbox search, new-match rail, unread badges, online indicators and call shortcuts.
- `src/components/views/ChatRoom.tsx` — message bubbles, audio/video call affordances, attachment/camera/microphone and composer affordances.
- `src/components/views/Profile.tsx` — profile statistics, wallet and credit balance, content tabs (posts/media/saved), privacy/settings/wallet menu patterns.
- `src/components/modals/CreateModal.tsx` — create sheet for post/story, live, Casual boost and club room.
- `src/components/views/HotZone.tsx` and styles were compared with existing native live discovery to avoid replacing flows already built in Expo.
- Project config/lock files and Figma Make helper files were inspected for project type and dependencies. Web-only dependencies such as `framer-motion` and `lucide-react` were not added to the native project.

## Important additions ported to WAVES React Native

### 1. Feed becomes a first-class destination

- Added a native Feed tab and aligned bottom navigation to **Feed, Casual, Hot, Chat, Profile**.
- Added WAVES header shortcuts to Nearby Map and Alerts.
- Added horizontal story rail with story-preview modal.
- Added a local demo feed using bundled image assets, with For You and Clubs views.
- Added post cards, likes/unlikes, comment modal with add-comment interaction, and a share placeholder that does not use the system clipboard.
- Feed content clearly labels itself by Casual or Hot zone, based on the last authorized mode selected.

### 2. Create flow

- Added a floating create button and a native bottom-sheet-style create menu.
- Added Post and Story composer screens with local preview publishing.
- Added bundled sample-image attachment toggle until a native media picker and private Storage upload pipeline are implemented.
- Added Go Live, Club Room and Casual Boost shortcuts; Hot Zone access remains subject to the app's adult-eligibility gate. Live provider integration is still a separate task.

### 3. Profile and wallet

- Added a WAVES Wallet summary to the profile.
- Added a Wallet detail view with balance, demo credit packages, activity filter (All/Received/Spent), and recent transaction examples.
- Purchase buttons intentionally explain that no payment has been made; real payments and ledger changes require a provider and trusted server transactions.
- Added profile content tabs for Posts, Media and Saved to reflect the supplied profile design. These currently show bundled preview assets and are not persisted data.
- Added direct access from the profile menu to Following/reminders and Alerts/activity, preserving those existing screens while matching the five-tab Figma navigation.

## Visual system retained

- Deep charcoal/navy surfaces and borders.
- Coral primary actions for social/dating interactions.
- Violet emphasis for Hot Zone/creator/live-room experiences.
- Mint for positive/verified states and muted gold for wallet/credits.
- Rounded story avatars, compact cards, profile metrics and layered image overlays.

## ERD alignment

The new UI is structured to align with entities in the approved ERD:

- Feed/posts/comments/reactions: `posts`, `post_media`, `media_assets`, `comments`, `post_reactions`, `saved_posts`, `stories`, `story_views`, `hashtags`, `post_hashtags`, `post_music`.
- Friends and dating: `user_connections`, `dating_swipes`, `dating_matches`, `profile_interests`, `mode_profiles`.
- Inbox/calls: `conversations`, `conversation_members`, `messages`, `message_attachments`, `message_receipts`, `call_sessions`, `call_participants`.
- Clubs and live: `clubs`, `club_memberships`, `club_profiles`, `club_rooms`, `club_live_sessions`, `club_live_participants`, `club_room_messages`, `club_session_access_requests`.
- Wallet: `credit_wallets`, `credit_transactions`, `club_tips`.
- Privacy: `user_settings`, `location_share_grants`, `live_locations`, `age_verifications`, `device_registry`, `device_security_events`, `privacy_requests`, `admin_audit_logs`.

## Prototype boundaries

- Feed, stories, reactions, post comments, wallet rows and composer publishing currently use local React state/demo assets. They reset when the app state is lost and are not stored in Supabase yet.
- No real image/video picker, upload, audio/video transport, payment checkout, credit settlement or story expiration scheduler is enabled yet.
- The web prototype cannot directly be run as the production React Native app; design and interaction patterns were ported to native components instead.
- Existing secure screen capture hook, background masking, Hot Zone gating and privacy messaging remain intact. This does not guarantee prevention of every screenshot on every OS or against external cameras.
