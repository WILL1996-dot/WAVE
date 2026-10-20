import { Zone } from '../theme';

export const photos = {
  maya: require('../../assets/photos/maya.jpg'),
  nova: require('../../assets/photos/nova.jpg'),
  alex: require('../../assets/photos/alex.jpg'),
  creator2: require('../../assets/photos/creator2.jpg'),
  creator3: require('../../assets/photos/creator3.jpg'),
  club1: require('../../assets/photos/club1.jpg'),
  club2: require('../../assets/photos/club2.jpg'),
  club3: require('../../assets/photos/club3.jpg'),
  room: require('../../assets/photos/room.jpg'),
  couple: require('../../assets/photos/couple.jpg'),
};

export type Person = { id: string; name: string; age?: number; subtitle: string; location: string; photo: any; zone: Zone; verified?: boolean; online?: boolean; bio?: string; interests?: string[] };

export const datingPeople: Person[] = [
  { id: 'maya', name: 'Maya', age: 27, subtitle: 'Architect', location: 'Brooklyn', photo: photos.maya, zone: 'casual', verified: true, online: true, bio: 'Good coffee, small gigs and getting lost in a new city.', interests: ['Coffee', 'Live music', 'Design', 'Weekend hikes'] },
  { id: 'amara', name: 'Amara', age: 26, subtitle: 'Photographer', location: 'Brooklyn', photo: photos.creator2, zone: 'casual', verified: true, online: true, bio: 'Collecting small moments, great records and stories from strangers.', interests: ['Photography', 'Music', 'Travel', 'Art'] },
  { id: 'eli', name: 'Eli', age: 29, subtitle: 'Music producer', location: 'Queens', photo: photos.alex, zone: 'casual', verified: false, online: false, bio: 'Sunday markets, late-night playlists and trying new restaurants.', interests: ['Music', 'Food', 'Film', 'Running'] },
];

export const creators: Person[] = [
  { id: 'nova', name: 'Nova Reed', subtitle: 'DJ · Music', location: 'Live now', photo: photos.nova, zone: 'hot', online: true, bio: 'Late-night vinyl, warm grooves and a little room to breathe.' },
  { id: 'amara-creator', name: 'Amara', subtitle: 'Dance · Culture', location: 'Live in 20 min', photo: photos.creator2, zone: 'hot', online: true, bio: 'Movement, community and good energy.' },
  { id: 'eli-creator', name: 'Eli Brooks', subtitle: 'Conversation', location: 'Upcoming', photo: photos.creator3, zone: 'hot', online: false, bio: 'Conversations about music, creativity and everything between.' },
];

export const clubs = [
  { id: 'view-point', name: 'View Point Club Room', category: 'Music · Nightlife', members: '2.4k members', photo: photos.club1, live: true, liveText: 'Nova Reed is live', description: 'Late-night conversations, DJs, new sounds and community nights.' },
  { id: 'after-hours', name: 'After-hours Sessions', category: 'Music · Social', members: '1.8k members', photo: photos.club2, live: true, liveText: '3 hosts live', description: 'A relaxed room for music discovery and friendly conversation.' },
  { id: 'dance-room', name: 'Dance Culture Room', category: 'Dance · Culture', members: '940 members', photo: photos.club3, live: false, liveText: 'Next event Saturday', description: 'Move, learn, share and meet people around dance and culture.' },
];

export const initialMessages = [
  { id: 'maya', name: 'Maya', subtitle: 'CASUAL ZONE · MATCH', text: 'Saturday at 11 works! ☕', time: '2m', photo: photos.maya, unread: true, zone: 'casual' as Zone, online: true },
  { id: 'amara', name: 'Amara', subtitle: 'CASUAL ZONE · MATCH', text: 'Your playlist looks amazing.', time: '1h', photo: photos.creator2, unread: false, zone: 'casual' as Zone, online: false },
  { id: 'nova', name: 'Nova Reed', subtitle: 'HOT ZONES · CREATOR', text: 'Your member replay playlist is ready.', time: '3h', photo: photos.nova, unread: true, zone: 'hot' as Zone, online: true },
  { id: 'eli', name: 'Eli Brooks', subtitle: 'CASUAL ZONE · FRIEND', text: 'Found a little jazz bar for Friday.', time: '1d', photo: photos.creator3, unread: false, zone: 'casual' as Zone, online: false },
];

export const schedule = [
  { day: 'FRI, OCT 16', time: '8:00 PM', title: 'The creative reset', host: 'Eli Brooks · Conversation', photo: photos.creator3 },
  { day: 'SAT, OCT 17', time: '9:00 PM', title: 'Soul selections', host: 'Nova Reed · Music', photo: photos.nova },
  { day: 'SUN, OCT 18', time: '6:00 PM', title: 'Sunday groove lab', host: 'Amara · Dance', photo: photos.creator2 },
];
