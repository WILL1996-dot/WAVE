# WAVES Screen Map

The visual direction follows the supplied Figma exports: deep charcoal/navy surfaces, coral-pink primary actions, violet Hot Zone/creator accents, soft rounded cards, editorial headings and high-contrast text.

| Design area | Current prototype implementation | Notes |
|---|---|---|
| Welcome to WAVES | `WelcomeScreen` | Hero image, onboarding CTA, login CTA |
| Social Feed | `FeedScreen` | For You/Clubs switch, Stories rail/viewer, posts, local likes/comments, share placeholder |
| Create menu and composer | `FeedScreen` | Floating create action for post/story, go live, club room and Casual Boost; local post/story preview |
| Create account | `SignUpScreen` | Name, email, date of birth, 18+ acknowledgement |
| Create password | `CreatePasswordScreen` | Password requirements checklist |
| Verify email | `VerifyEmailScreen` | Demo continuation or Supabase confirmation gate |
| Build your profile | `BuildProfileScreen` | Display name, bio, interest chips, photo picker placeholder |
| Choose your zone | `ChooseZoneScreen` | Casual and Hot Zone cards; adult birthdate gate for Hot Zone in demo UI |
| Casual Zone discovery | `CasualDiscover` | Profile card, pass, super-like and like actions |
| Dating profile | `DatingProfileScreen` | About, interests, privacy reminder, message/like actions |
| Match screen | `MatchScreen` | Mutual match illustration and conversation CTA |
| Casual filters | `FiltersScreen` | Distance, age, intent and active-profile filters |
| Shared inbox | `InboxTab` | Across-zone tabs, search, new matches and conversations |
| Conversation with Maya | `ChatScreen` | Local interactive chat; not yet encrypted or synchronized |
| Hot Zone live discovery | `HotDiscover` / `LiveDiscoveryScreen` | Creator/room cards and topic search |
| Live room | `LiveRoomScreen` | Demo chat, follow, raise hand, mute; no actual media transport |
| Club Zones directory | `ClubDirectoryScreen` | Club cards, membership-request interaction, activity navigation |
| Club activity | `ClubActivityScreen` | Club overview, room access and creator navigation |
| Creator profile | `CreatorProfileScreen` | Creator information and actions |
| Creator dashboard | `CreatorDashboardScreen` | Stream metadata form, category chips and reminder toggle |
| Following / upcoming streams | `FollowingTab` | Creator cards and schedule previews |
| Shared notifications | `AlertsTab` | Mark-as-read UI and settings shortcut |
| Account privacy and safety | `SettingsScreen` | Local privacy toggles, device/data request entry points |
| Wallet / credits | `WalletScreen` | Demo balance, packages and activity filter; no real payment or credit mutation |
| Profile posts/media/saved | `ProfileTab` | Three content tabs matching Figma profile; bundled sample images until feed/media APIs exist |
| Nearby map | `NearbyMapScreen` | Stylized illustrative map; no GPS calls |
| Edit shared profile | `EditProfileScreen` | Local profile editing and interests |

The initial Figma ZIP included PDF design exports. The additional `Build WAVES Social Media App.zip` is a Vite/React web prototype containing component source. Its feed, create modal, profile wallet/content tabs and live-discovery patterns were reviewed and ported to React Native. The provided designs are the primary visual reference. Detail screens added during implementation use the same component/theme system and are intended as an initial extension, not a replacement of approved design decisions.
