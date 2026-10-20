import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, BottomNav, Button, Card, EmptyState, Eyebrow, Heading, IconButton, Logo, Muted, Pill, Screen, SectionTitle, ZoneToggle } from '../components/UI';
import { clubs, creators, datingPeople, initialMessages, photos, schedule, Person } from '../data/mock';
import { AppTab, theme, Zone } from '../theme';
import { BasicProfile } from './OnboardingScreens';
import { FeedScreen } from './FeedScreen';
import { getPrivateImageSource } from '../lib/media';
import { supabase } from '../lib/supabase';
import { useWavesPresence } from '../lib/useWavesPresence';

export type MainProps = {
  zone: Zone; setZone: (z: Zone) => void; tab: AppTab; setTab: (t: AppTab) => void;
  navigate: (route: string) => void; profile: BasicProfile;
  setSelectedPerson: (person: Person) => void; setSelectedClub: (club: typeof clubs[number]) => void; onSignOut: () => Promise<void>;
  onlineUserIds?: ReadonlySet<string>; presenceReady?: boolean; ownStatusVisible?: boolean;
  setOwnOnlineStatus?: (visible: boolean) => Promise<void>;
};

type ProfileDbRow = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  interests?: string[] | null;
  avatar_path?: string | null;
  profile_visibility?: string | null;
  show_online_status?: boolean | null;
};

function toWavesPerson(row: ProfileDbRow, photo: any, extras?: { online?: boolean; subtitle?: string; roomTitle?: string; categories?: string[]; zone?: Zone }) {
  return {
    id: row.id,
    name: row.display_name || 'WAVES Member',
    // DOB is private account data. Discovery deliberately does not fetch age.
    age: undefined,
    subtitle: extras?.subtitle || (row.username ? `@${row.username}` : 'WAVES member'),
    location: 'Location hidden',
    bio: row.bio || '',
    interests: row.interests || extras?.categories || [],
    photo: photo || photos.alex,
    online: Boolean(extras?.online),
    showOnlineStatus: row.show_online_status === true,
    verified: false,
    roomTitle: extras?.roomTitle,
    categories: extras?.categories || row.interests || [],
    zone: extras?.zone,
  } as Person & { showOnlineStatus?: boolean };
}

type PresenceAwarePerson = Person & { showOnlineStatus?: boolean };

function presenceLabel(person: Person, p: Pick<MainProps, 'onlineUserIds' | 'presenceReady'>) {
  if (!supabase) return person.online ? 'Online' : 'Offline';
  const statusPerson = person as PresenceAwarePerson;
  if (statusPerson.showOnlineStatus !== true) return 'Status hidden';
  if (!p.presenceReady) return 'Checking status…';
  return p.onlineUserIds?.has(person.id) ? 'Online' : 'Offline';
}

function isPresenceOnline(person: Person, p: Pick<MainProps, 'onlineUserIds' | 'presenceReady'>) {
  if (!supabase) return Boolean(person.online);
  return (person as PresenceAwarePerson).showOnlineStatus === true
    && Boolean(p.presenceReady)
    && Boolean(p.onlineUserIds?.has(person.id));
}

function AppHeader({ zone, onFilters }: { zone: Zone; onFilters?: () => void }) {
  const tint = zone === 'casual' ? theme.colors.coral : theme.colors.violet;
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}><Logo /><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border }}><Ionicons name={zone === 'casual' ? 'heart' : 'flame'} color={tint} size={13} /><Text style={{ color: theme.colors.text, fontSize: 10, fontWeight: '800' }}>{zone === 'casual' ? 'CASUAL ZONE' : 'HOT ZONE'}</Text></View>{onFilters ? <IconButton icon="options-outline" onPress={onFilters} size={36} /> : null}</View></View>;
}

function CasualDiscover({ p }: { p: MainProps }) {
  const [index, setIndex] = useState(0);
  const [likes, setLikes] = useState(0);
  const [members, setMembers] = useState<Person[]>(supabase ? [] : datingPeople);
  const [loadingMembers, setLoadingMembers] = useState(Boolean(supabase));

  useEffect(() => {
    let cancelled = false;
    const loadMembers = async () => {
      if (!supabase) {
        if (!cancelled) { setMembers(datingPeople); setLoadingMembers(false); }
        return;
      }
      setLoadingMembers(true);
      try {
        const { data: authResult, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authResult.user) { if (!cancelled) setMembers([]); return; }
        const { data: rows, error } = await supabase
          .from('profiles')
          .select('id, display_name, username, bio, interests, avatar_path, profile_visibility, show_online_status')
          .eq('profile_visibility', 'public')
          .neq('id', authResult.user.id)
          .order('created_at', { ascending: false })
          .limit(60);
        if (error) throw error;
        const mapped: Person[] = await Promise.all((rows ?? []).map(async (row: ProfileDbRow) => {
          const photo = row.avatar_path ? await getPrivateImageSource(row.avatar_path) : null;
          return toWavesPerson(row, photo, { subtitle: row.username ? `@${row.username}` : 'WAVES member', zone: 'casual' });
        }));
        if (!cancelled) { setMembers(mapped); setIndex(0); }
      } catch (error) {
        if (!cancelled) {
          setMembers([]);
          Alert.alert('Could not load members', error instanceof Error ? error.message : 'Please try again.');
        }
      } finally { if (!cancelled) setLoadingMembers(false); }
    };
    void loadMembers();
    return () => { cancelled = true; };
  }, []);

  const person = members.length ? members[index % members.length] : null;
  if (!person) {
    return <>
      <AppHeader zone={p.zone} onFilters={() => p.navigate('Filters')} />
      <View style={{ paddingTop: 20 }}>
        <Eyebrow>CASUAL ZONE</Eyebrow>
        <Heading size={27}>{loadingMembers ? 'Finding your people…' : 'Your next connection'}</Heading>
        <Muted style={{ marginTop: 7, marginBottom: 16 }}>{loadingMembers ? 'Loading public WAVES member profiles.' : supabase ? 'No other public member profiles are available yet. New members will appear here when they complete a public profile.' : 'No profiles are available in this preview.'}</Muted>
        {!loadingMembers ? <EmptyState icon="people-outline" title="No members to show yet" body="When more people join WAVES and make their profiles public, you will discover them here." /> : null}
      </View>
    </>;
  }

  return <>
    <AppHeader zone={p.zone} onFilters={() => p.navigate('Filters')} />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 }}><Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '800' }}>Your next connection</Text><Text style={{ color: theme.colors.muted, fontSize: 11 }}>{supabase ? 'Public WAVES profiles' : 'Curated demo profiles'}</Text></View>
    <Pressable onPress={() => { p.setSelectedPerson(person); p.navigate('DatingProfile'); }} style={{ borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border }}>
      <ImageBackground source={person.photo} resizeMode="cover" style={{ height: 432, justifyContent: 'space-between' }}>
        <View style={{ padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(17,17,26,0.78)' }}><Ionicons name="shield-checkmark" size={13} color={theme.colors.success} /><Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{supabase ? 'PUBLIC PROFILE' : person.verified ? 'Photo verified' : 'Demo profile'}</Text></View><View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(17,17,26,0.78)', flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 6, height: 6, borderRadius: 5, backgroundColor: isPresenceOnline(person, p) ? theme.colors.success : theme.colors.subtle }} /><Text style={{ color: 'white', fontSize: 10 }}>{presenceLabel(person, p)}</Text></View></View>
        <View style={{ padding: 18, paddingTop: 56, backgroundColor: 'rgba(12,12,20,0.82)' }}><Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: '900' }}>{person.name}{person.age ? `, ${person.age}` : ''}</Text><Text style={{ color: '#EEEAF7', fontSize: 12, fontWeight: '700', marginTop: 5 }}>{person.subtitle} · {person.location}</Text><Text style={{ color: '#D6D3DF', fontSize: 13, lineHeight: 19, marginTop: 11 }}>{person.bio || 'Here for good conversations, shared interests and new experiences.'}</Text><View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 13 }}>{(person.interests || []).slice(0, 5).map(interest => <Pill key={interest} active>{interest}</Pill>)}</View></View>
      </ImageBackground>
    </Pressable>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginTop: 16 }}>
      <IconButton icon="arrow-undo" onPress={() => setIndex(Math.max(0, index - 1))} size={48} background={theme.colors.surface} bordered />
      <IconButton icon="close" onPress={() => setIndex(index + 1)} size={60} color={theme.colors.muted} background={theme.colors.surface2} bordered />
      <IconButton icon="star" onPress={() => { if (supabase) Alert.alert('Super like not connected', 'WAVES will save likes and matches after the matching workflow is added.'); else Alert.alert('Super like sent', `You let ${person.name} know you're interested.`); setLikes(likes + 1); setIndex(index + 1); }} size={48} color={theme.colors.violet} background={theme.colors.violetTint} />
      <IconButton icon="heart" onPress={() => { if (supabase) Alert.alert('Likes coming next', 'Your discovery is using real profiles. Likes and mutual matches will be connected in the matching development step.'); else if (person.id === 'maya' || likes === 0) { p.setSelectedPerson(person); p.navigate('Match'); } else { Alert.alert('Like sent', `Your like for ${person.name} has been saved in this demo.`); } setLikes(likes + 1); setIndex(index + 1); }} size={58} color="#221116" background={theme.colors.coral} />
    </View>
    <Text style={{ textAlign: 'center', color: theme.colors.subtle, fontSize: 10, marginTop: 10 }}>Undo · Pass · Super like · Like</Text>
    <Card style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 11 }}><View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: theme.colors.coralTint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="location-outline" size={20} color={theme.colors.coral} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 12 }}>Nearby, never exposed</Text><Muted style={{ fontSize: 11 }}>Only approximate distance is shown when a permitted location feature is implemented. Precise location stays private.</Muted></View><Ionicons name="shield-checkmark" size={20} color={theme.colors.success} /></Card>
  </>;
}

function HotDiscover({ p }: { p: MainProps }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('For you');
  const [creatorPeople, setCreatorPeople] = useState<Person[]>(supabase ? [] : creators);
  const [loadingCreators, setLoadingCreators] = useState(Boolean(supabase));
  const isDatabaseMode = Boolean(supabase);

  useEffect(() => {
    let cancelled = false;
    const loadCreators = async () => {
      if (!supabase) { if (!cancelled) { setCreatorPeople(creators); setLoadingCreators(false); } return; }
      setLoadingCreators(true);
      try {
        const { data: creatorRows, error: creatorError } = await supabase
          .from('creator_profiles')
          .select('user_id, stage_name, bio, categories, verification_status, is_active')
          .eq('verification_status', 'approved')
          .eq('is_active', true)
          .limit(60);
        if (creatorError) throw creatorError;
        const approved = creatorRows ?? [];
        if (!approved.length) { if (!cancelled) setCreatorPeople([]); return; }
        const userIds = approved.map(row => row.user_id);
        const [{ data: profileRows, error: profileError }, { data: sessions, error: sessionError }] = await Promise.all([
          supabase.from('profiles').select('id, display_name, username, bio, interests, avatar_path, profile_visibility, show_online_status').in('id', userIds),
          supabase.from('live_sessions').select('host_id, title, description, category, status, zone_type').eq('zone_type', 'hot_live').in('status', ['scheduled', 'live']).limit(100),
        ]);
        if (profileError) throw profileError;
        if (sessionError) throw sessionError;
        const profilesById = new Map<string, ProfileDbRow>((profileRows ?? []).map(row => [row.id, row as ProfileDbRow] as const));
        const mapped = await Promise.all(approved.map(async creator => {
          const profile = profilesById.get(creator.user_id);
          if (!profile) return null;
          const avatar = profile.avatar_path ? await getPrivateImageSource(profile.avatar_path) : null;
          const session = (sessions ?? []).find(item => item.host_id === creator.user_id && item.status === 'live') || (sessions ?? []).find(item => item.host_id === creator.user_id);
          const categories = creator.categories ?? [];
          return toWavesPerson({ ...profile, display_name: creator.stage_name || profile.display_name, bio: creator.bio || profile.bio }, avatar, {
            online: session?.status === 'live',
            subtitle: categories.length ? categories.join(' · ') : 'WAVES Creator',
            roomTitle: session?.title || `${creator.stage_name || profile.display_name}'s creator room`,
            categories,
            zone: 'hot',
          });
        }));
        if (!cancelled) setCreatorPeople(mapped.filter((person): person is Person => Boolean(person)));
      } catch (error) {
        if (!cancelled) { setCreatorPeople([]); Alert.alert('Could not load creators', error instanceof Error ? error.message : 'Please try again.'); }
      } finally { if (!cancelled) setLoadingCreators(false); }
    };
    void loadCreators();
    return () => { cancelled = true; };
  }, []);

  const categories = isDatabaseMode ? ['For you', 'Trending', 'New', 'Music', 'Talk', 'Dance', 'Lifestyle', 'Community'] : ['For you', 'Trending', 'New', 'Nearby', 'Premium', 'Music', 'Talk', 'Dance', 'Lifestyle'];
  const streamItems = creatorPeople.map((creator, index) => {
    const extra = creator as Person & { roomTitle?: string; categories?: string[] };
    const tags = extra.categories?.length ? extra.categories : (creator.interests?.length ? creator.interests : ['Creator']);
    return {
      creator,
      title: isDatabaseMode ? (extra.roomTitle || `${creator.name}'s creator room`) : (index === 0 ? 'Late-night vinyl club' : index === 1 ? 'Movement, culture and good energy' : 'Creative conversations after dark'),
      viewers: isDatabaseMode ? (creator.online ? 'LIVE' : 'Upcoming') : (index === 0 ? '1.2k' : index === 1 ? '482' : 'Upcoming'),
      tags,
      premium: !isDatabaseMode && index === 0,
      trending: creator.online || (!isDatabaseMode && (index === 0 || index === 1)),
      isNew: !isDatabaseMode && (index === 1 || index === 2),
      nearby: !isDatabaseMode && index !== 2,
    };
  });
  const filteredStreams = streamItems.filter(item => {
    const matchesQuery = !query || `${item.creator.name} ${item.creator.subtitle} ${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'For you' || (category === 'Trending' && item.trending) || (category === 'New' && item.isNew) || (category === 'Nearby' && item.nearby) || (category === 'Premium' && item.premium) || item.tags.some(tag => tag.toLowerCase() === category.toLowerCase());
    return matchesQuery && matchesCategory;
  });

  return <>
    <AppHeader zone="hot" onFilters={() => p.navigate('ClubDirectory')} />
    <View style={{ marginTop: 10 }}><Eyebrow color={theme.colors.violet}>LIVE DISCOVERY</Eyebrow><Heading size={27}>Turn the night up.</Heading><Muted style={{ marginTop: 7 }}>Approved creators and scheduled/live rooms. Hot Zone access is restricted to eligible adults with the required membership.</Muted></View>
    <View style={{ height: 48, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9, marginTop: 18 }}><Ionicons name="search-outline" color={theme.colors.muted} size={18} /><TextInput value={query} onChangeText={setQuery} placeholder="Search creators or topics" placeholderTextColor={theme.colors.subtle} contextMenuHidden style={{ color: theme.colors.text, flex: 1, fontSize: 12 }} /><IconButton icon="options-outline" size={30} background="transparent" onPress={() => p.navigate('Filters')} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 6 }} contentContainerStyle={{ gap: 7, paddingRight: 12 }}>{categories.map(label => <Pill key={label} active={category === label} color={theme.colors.violet} onPress={() => setCategory(label)}>{label === 'Trending' ? 'Trending 🔥' : label === 'Premium' ? '✦ Premium' : label}</Pill>)}</ScrollView>
    <SectionTitle title={category === 'For you' ? 'Discover creators' : category} action="See all" onAction={() => p.navigate('LiveDiscovery')} />
    {loadingCreators ? <View style={{ alignItems: 'center', paddingVertical: 28 }}><Muted>Loading approved creators…</Muted></View> : null}
    {filteredStreams.map(item => <Pressable key={item.creator.id} onPress={() => { p.setSelectedPerson(item.creator); p.navigate('CreatorProfile'); }} style={{ height: 202, marginBottom: 13, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border }}><ImageBackground source={item.creator.photo} style={{ flex: 1, justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}><View style={{ flexDirection: 'row', gap: 6 }}><Pill active color={theme.colors.violet}>{item.creator.online ? '● LIVE NOW' : 'CREATOR'}</Pill>{item.premium ? <Pill active color={theme.colors.yellow}>✦ PREMIUM</Pill> : null}</View><View style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(16,16,24,0.82)' }}><Text style={{ color: 'white', fontSize: 10 }}>{isDatabaseMode ? (item.creator.online ? 'Live room' : 'Creator profile') : `◉ ${item.viewers}`}</Text></View></View><View style={{ padding: 14, backgroundColor: 'rgba(14,14,22,0.82)' }}><Text style={{ color: 'white', fontWeight: '900', fontSize: 18 }}>{item.creator.name}</Text><Text style={{ color: isPresenceOnline(item.creator, p) ? theme.colors.mint : (item.creator as PresenceAwarePerson).showOnlineStatus === true ? '#D4D1DC' : '#B8B5C3', fontSize: 9, fontWeight: '800', marginTop: 3 }}>{presenceLabel(item.creator, p)}</Text><Text style={{ color: '#DAD6E9', fontSize: 11, marginTop: 3 }}>{item.title}</Text><View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>{item.tags.slice(0, 3).map(tag => <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)' }}><Text style={{ color: '#F2EFFA', fontSize: 9, fontWeight: '700' }}>{tag}</Text></View>)}</View></View></ImageBackground></Pressable>)}
    {!loadingCreators && filteredStreams.length === 0 ? <EmptyState icon="search-outline" title={isDatabaseMode ? 'No approved creators yet' : 'No streams found'} body={isDatabaseMode ? 'Creators appear here after their profile is approved and activated. Live status is shown only when a permitted session is available.' : 'Try a different search or choose another category.'} action={query || category !== 'For you' ? 'Clear filters' : undefined} onAction={() => { setCategory('For you'); setQuery(''); }} /> : null}
    <SectionTitle title="Club Zones" action="Explore all" onAction={() => p.navigate('ClubDirectory')} />
    <Card style={{ padding: 0, overflow: 'hidden' }}><Image source={photos.club1} style={{ width: '100%', height: 145 }} resizeMode="cover" /><View style={{ padding: 14 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Heading size={18}>Your room. Your people.</Heading><Ionicons name="people" size={20} color={theme.colors.violet} /></View><Muted style={{ marginTop: 5 }}>Member communities with scheduled events, live rooms and their own atmosphere.</Muted><Button title="Browse Club Zones" onPress={() => p.navigate('ClubDirectory')} variant="violet" compact style={{ marginTop: 13 }} /></View></Card>
    <Muted style={{ fontSize: 10, marginTop: 15, textAlign: 'center' }}>Adult eligibility, membership and session access are enforced by Supabase policies.</Muted>
  </>;
}

function DiscoverTab(p: MainProps) { return <Screen><CasualOrHot p={p} /></Screen>; }
function CasualOrHot({ p }: { p: MainProps }) { return p.zone === 'casual' ? <CasualDiscover p={p} /> : <HotDiscover p={p} />; }

function formatInboxTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

type InboxDisplayItem = {
  id: string; name: string; text: string; subtitle: string; time: string;
  photo: any; online: boolean; unread: boolean; unreadCount: number; zone: string; person: Person; conversationId?: string;
};

function InboxTab(p: MainProps) {
  const [zoneFilter, setZoneFilter] = useState<'all' | Zone>('all');
  const [search, setSearch] = useState('');
  const [realInbox, setRealInbox] = useState<InboxDisplayItem[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    let cancelled = false;
    const loadInbox = async () => {
      if (!supabase) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData.user;
        if (!user) { if (!cancelled) setRealInbox([]); return; }
        const { data: conversationRows, error: conversationsError } = await supabase.from('conversations').select('id, zone, created_at').order('created_at', { ascending: false }).limit(100);
        if (conversationsError) throw conversationsError;
        const conversations = conversationRows ?? [];
        if (!conversations.length) { if (!cancelled) setRealInbox([]); return; }
        const conversationIds = conversations.map(row => row.id);
        const [{ data: memberRows, error: membersError }, { data: messageRows, error: messagesError }] = await Promise.all([
          supabase.from('conversation_members').select('conversation_id, user_id, last_read_at').in('conversation_id', conversationIds).is('left_at', null),
          supabase.from('messages').select('id, conversation_id, sender_id, message_type, body, media_path, created_at').in('conversation_id', conversationIds).is('deleted_at', null).order('created_at', { ascending: false }).limit(500),
        ]);
        if (membersError) throw membersError;
        if (messagesError) throw messagesError;
        const { data: unreadRows, error: unreadError } = await supabase.rpc('get_my_unread_message_counts');
        if (unreadError) throw unreadError;
        const unreadByConversation = new Map<string, number>(
          (unreadRows ?? []).map((row: { conversation_id: string; unread_count: number | string }) => [row.conversation_id, Number(row.unread_count)] as const)
        );
        const peerByConversation = new Map<string, string>();
        for (const member of memberRows ?? []) if (member.user_id !== user.id && !peerByConversation.has(member.conversation_id)) peerByConversation.set(member.conversation_id, member.user_id);
        const peerIds = Array.from(new Set([...peerByConversation.values()]));
        const { data: profileRows, error: profilesError } = peerIds.length ? await supabase.from('profiles').select('id, display_name, username, bio, interests, avatar_path, profile_visibility, show_online_status').in('id', peerIds) : { data: [], error: null };
        if (profilesError) throw profilesError;
        const profilesById = new Map<string, ProfileDbRow>((profileRows ?? []).map(row => [row.id, row as ProfileDbRow] as const));
        const latestByConversation = new Map<string, any>();
        for (const message of messageRows ?? []) if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
        const mapped: Array<InboxDisplayItem | null> = await Promise.all(
          conversations.map(async (conversation): Promise<InboxDisplayItem | null> => {
          const peerId = peerByConversation.get(conversation.id);
          if (!peerId) return null;
          const profile = profilesById.get(peerId);
          const avatar = profile?.avatar_path ? await getPrivateImageSource(profile.avatar_path) : null;
          const latest = latestByConversation.get(conversation.id);
          const preview = !latest ? 'Start a conversation' : latest.message_type === 'image' ? 'Photo' : latest.message_type === 'voice' ? 'Voice message' : latest.body || 'Message';
          const unreadCount = unreadByConversation.get(conversation.id) ?? 0;
          const conversationZone: Zone = conversation.zone === 'hot' ? 'hot' : 'casual';
          const showOnlineStatus = profile?.show_online_status === true;
          const peerOnline = showOnlineStatus && Boolean(p.presenceReady) && Boolean(p.onlineUserIds?.has(peerId));
          const person: Person & { conversationId: string; showOnlineStatus?: boolean } = { id: peerId, name: profile?.display_name || 'WAVES Member', age: undefined, subtitle: profile?.username ? `@${profile.username}` : 'WAVES member', location: 'Location hidden', bio: profile?.bio || '', interests: profile?.interests || [], photo: avatar || photos.alex, online: peerOnline, showOnlineStatus, verified: false, zone: conversationZone, conversationId: conversation.id };
          return { id: conversation.id, name: person.name, text: preview, subtitle: `${String(conversation.zone).toUpperCase()} ZONE`, time: latest?.created_at ? formatInboxTime(latest.created_at) : formatInboxTime(conversation.created_at), photo: avatar || photos.alex, online: peerOnline, unread: unreadCount > 0, unreadCount, zone: conversationZone, person, conversationId: conversation.id };
          })
        );
        if (!cancelled) {
          setRealInbox(mapped.filter((item): item is InboxDisplayItem => item !== null));
        }
      } catch (error) {
        if (!cancelled) { setRealInbox([]); Alert.alert('Could not load inbox', error instanceof Error ? error.message : 'Please try again.'); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void loadInbox();
    return () => { cancelled = true; };
  }, []);

  const demoItems: InboxDisplayItem[] = initialMessages.map(m => {
    const person = (m.id === 'maya' ? datingPeople[0] : creators.find(c => c.id === m.id) || datingPeople[1]) as Person;
    return { ...m, person, zone: m.zone, unreadCount: m.unread ? 1 : 0, conversationId: undefined } as InboxDisplayItem;
  });
  const sourceItems = supabase ? realInbox : demoItems;
  const filtered = sourceItems.filter(m => (zoneFilter === 'all' || m.zone === zoneFilter) && `${m.name} ${m.text}`.toLowerCase().includes(search.toLowerCase()));
  const unreadTotal = filtered.reduce((total, item) => total + item.unreadCount, 0);

  return <Screen><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}><View><Heading size={27}>Inbox</Heading><Muted>Across both zones, your conversations.</Muted>{unreadTotal > 0 ? <Text style={{ color: theme.colors.coral, fontSize: 11, fontWeight: '800', marginTop: 5 }}>{unreadTotal} unread {unreadTotal === 1 ? 'message' : 'messages'}</Text> : <Muted style={{ fontSize: 10, marginTop: 5 }}>You're all caught up.</Muted>}</View><IconButton icon="create-outline" onPress={() => Alert.alert('New message', 'Open a member or creator profile to start a permitted direct conversation.')} /></View>
    <ZoneToggle value={zoneFilter === 'hot' ? 'hot' : 'casual'} onChange={z => setZoneFilter(z)} />
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 20 }}><Pill active={zoneFilter === 'all'} onPress={() => setZoneFilter('all')}>All</Pill><Pill active={zoneFilter === 'casual'} onPress={() => setZoneFilter('casual')}>Casual</Pill><Pill active={zoneFilter === 'hot'} onPress={() => setZoneFilter('hot')}>Hot</Pill></View>
    {!supabase ? <><SectionTitle title="New matches" action="View all" onAction={() => p.navigate('DatingProfile')} /><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 17, paddingRight: 20 }}>{datingPeople.map(person => <Pressable key={person.id} onPress={() => { p.setSelectedPerson(person); p.navigate('DatingProfile'); }} style={{ alignItems: 'center', width: 66 }}><Avatar source={person.photo} size={56} border online={person.online} /><Text style={{ color: theme.colors.text, marginTop: 7, fontSize: 11, fontWeight: '700' }}>{person.name}</Text></Pressable>)}</ScrollView></> : null}
    <View style={{ height: 48, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9, marginBottom: 16 }}><Ionicons name="search" color={theme.colors.muted} size={18} /><TextInput value={search} onChangeText={setSearch} placeholder="Search conversations" placeholderTextColor={theme.colors.subtle} contextMenuHidden style={{ flex: 1, color: theme.colors.text, fontSize: 12 }} /><IconButton icon="options-outline" size={30} background="transparent" onPress={() => Alert.alert('Inbox privacy', 'Only conversations allowed by your account and server-side membership policies are listed.')} /></View>
    {loading ? <View style={{ alignItems: 'center', paddingVertical: 24 }}><Muted>Loading protected conversations…</Muted></View> : null}
    {filtered.map(m => <Pressable key={m.id} onPress={() => { p.setSelectedPerson(m.person); p.navigate('Chat'); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderColor: '#272735', gap: 12, backgroundColor: m.unread ? 'rgba(255,130,117,0.045)' : 'transparent' }}><Avatar source={m.photo} size={51} online={m.online} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.text, fontWeight: m.unread ? '900' : '700', fontSize: 13 }}>{m.name}</Text><Text style={{ color: m.unread ? theme.colors.coral : theme.colors.subtle, fontSize: 10, fontWeight: m.unread ? '800' : '400' }}>{m.time}</Text></View><Text style={{ color: m.zone === 'hot' ? theme.colors.violet : theme.colors.coral, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 3 }}>{m.subtitle}</Text><Text style={{ color: isPresenceOnline(m.person, p) ? theme.colors.mint : theme.colors.subtle, fontSize: 9, fontWeight: '700', marginTop: 3 }}>{presenceLabel(m.person, p)}</Text><Text numberOfLines={1} style={{ color: m.unread ? theme.colors.text : theme.colors.muted, fontWeight: m.unread ? '700' : '400', fontSize: 11, marginTop: 4 }}>{m.text}</Text></View>{m.unreadCount > 0 ? <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.coral }}><Text style={{ color: '#211216', fontSize: 10, fontWeight: '900' }}>{m.unreadCount > 99 ? '99+' : m.unreadCount}</Text></View> : <Ionicons name="checkmark-done-outline" color={theme.colors.subtle} size={16} />}</Pressable>)}
    {!loading && filtered.length === 0 ? <EmptyState icon="chatbubble-outline" title="No conversations yet" body={supabase ? 'Saved conversations will appear here. Visit a real member or approved creator profile to start a conversation when their message permissions allow it.' : 'Try another search or switch your inbox filter.'} /> : null}
    <Muted style={{ fontSize: 10, marginTop: 18 }}>Chats and image attachments use conversation-level Supabase access policies. End-to-end encryption is not implemented yet.</Muted>
  </Screen>;
}

function FollowingTab(p: MainProps) {
  return <Screen><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Eyebrow>YOUR FRONT ROW</Eyebrow><Heading size={28}>Following</Heading></View><IconButton icon="calendar-outline" onPress={() => Alert.alert('Your calendar', 'Your live reminders and upcoming streams are shown below.')} /></View><View style={{ marginTop: 17, marginBottom: 18 }}><ZoneToggle value={p.zone} onChange={p.setZone} /></View>
    <View style={{ flexDirection: 'row', gap: 9, marginBottom: 24 }}><Card style={{ flex: 1, padding: 13 }}><Text style={{ color: theme.colors.muted, fontSize: 10 }}>Following</Text><Heading size={23}>3</Heading></Card><Card style={{ flex: 1, padding: 13 }}><Text style={{ color: theme.colors.muted, fontSize: 10 }}>Memberships</Text><Heading size={23}>1</Heading></Card></View>
    <SectionTitle title="Live from your people" action="View all" onAction={() => p.navigate('LiveDiscovery')} />
    <Pressable onPress={() => { p.setSelectedPerson(creators[0]); p.navigate('LiveRoom'); }} style={{ height: 208, borderRadius: 23, overflow: 'hidden', marginBottom: 24 }}><ImageBackground source={photos.nova} style={{ flex: 1, justifyContent: 'space-between' }}><View style={{ padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}><Pill active color={theme.colors.violet}>● LIVE · NOVA REED</Pill><Pill>1.2k watching</Pill></View><View style={{ padding: 16, backgroundColor: 'rgba(14,14,22,0.78)' }}><Heading size={21}>Late-night vinyl club</Heading><Text style={{ color: theme.colors.violet, fontSize: 12, fontWeight: '800', marginTop: 5 }}>Join Nova →</Text></View></ImageBackground></Pressable>
    <SectionTitle title="On your calendar" action="Manage reminders" onAction={() => p.navigate('Settings')} /><Muted style={{ fontSize: 10, marginBottom: 13 }}>All times ET · Reminders are on for these streams.</Muted>
    {schedule.map((item, i) => <Pressable key={item.title} onPress={() => { p.setSelectedPerson(creators[i]); p.navigate('CreatorProfile'); }} style={{ flexDirection: 'row', gap: 12, padding: 13, borderRadius: 17, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 }}><Image source={item.photo} style={{ width: 70, height: 82, borderRadius: 12 }} /><View style={{ flex: 1, justifyContent: 'center' }}><Text style={{ color: theme.colors.violet, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>{item.day} · {item.time}</Text><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, marginTop: 6 }}>{item.title}</Text><Muted style={{ fontSize: 10, marginTop: 3 }}>{item.host}</Muted></View><Ionicons name="notifications" color={theme.colors.violet} size={17} /></Pressable>)}
  </Screen>;
}

type AlertDisplayItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  readAt: string | null;
  notificationType: string;
  resourceType: string | null;
  resourceId: string | null;
  icon: any;
  color: string;
  route?: string;
};

function AlertsTab(p: MainProps) {
  const [read, setRead] = useState<string[]>([]);
  const [databaseAlerts, setDatabaseAlerts] = useState<AlertDisplayItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(Boolean(supabase));

  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      if (!supabase) { setLoadingAlerts(false); return; }
      setLoadingAlerts(true);
      try {
        const { data: authResult, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authResult.user) { if (!cancelled) setDatabaseAlerts([]); return; }
        const { data, error } = await supabase
          .from('notifications')
          .select('id, notification_type, title, body, resource_type, resource_id, read_at, created_at')
          .eq('user_id', authResult.user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        const mapped: AlertDisplayItem[] = (data ?? []).map(row => {
          const isMessage = row.notification_type === 'new_message';
          const isLive = row.notification_type.toLowerCase().includes('live');
          const isSecurity = row.notification_type.toLowerCase().includes('security');
          return {
            id: row.id,
            title: row.title,
            body: row.body || 'You have a new WAVES update.',
            time: formatInboxTime(row.created_at),
            readAt: row.read_at,
            notificationType: row.notification_type,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            icon: isMessage ? 'chatbubble-ellipses' : isLive ? 'radio' : isSecurity ? 'shield-checkmark' : 'notifications',
            color: isMessage ? theme.colors.coral : isLive ? theme.colors.violet : isSecurity ? theme.colors.yellow : theme.colors.mint,
          };
        });
        if (!cancelled) setDatabaseAlerts(mapped);
      } catch (error) {
        if (!cancelled) {
          setDatabaseAlerts([]);
          Alert.alert('Could not load notifications', error instanceof Error ? error.message : 'Please try again.');
        }
      } finally { if (!cancelled) setLoadingAlerts(false); }
    };
    void loadAlerts();
    return () => { cancelled = true; };
  }, []);

  const demoAlerts: AlertDisplayItem[] = [
    { id: 'match', icon: 'heart', color: theme.colors.coral, title: "It's a match!", body: 'You and Maya liked each other.', time: '12m', readAt: read.includes('match') ? new Date().toISOString() : null, notificationType: 'match', resourceType: null, resourceId: null, route: 'Match' },
    { id: 'nova', icon: 'radio', color: theme.colors.violet, title: 'Nova Reed is live', body: 'Late-night vinyl club just started.', time: '38m', readAt: read.includes('nova') ? new Date().toISOString() : null, notificationType: 'live', resourceType: null, resourceId: null, route: 'LiveRoom' },
    { id: 'follow', icon: 'calendar', color: theme.colors.mint, title: 'Stream reminder', body: 'Soul selections starts tomorrow at 9 PM.', time: '1h', readAt: read.includes('follow') ? new Date().toISOString() : null, notificationType: 'reminder', resourceType: null, resourceId: null, route: 'Following' },
    { id: 'security', icon: 'shield-checkmark', color: theme.colors.yellow, title: 'Your privacy is protected', body: 'Review your screen capture and account privacy controls.', time: '1d', readAt: read.includes('security') ? new Date().toISOString() : null, notificationType: 'security', resourceType: null, resourceId: null, route: 'Settings' },
  ];
  const alerts = supabase ? databaseAlerts : demoAlerts;
  const unreadCount = alerts.filter(alert => !alert.readAt).length;

  const markOneRead = async (alertItem: AlertDisplayItem) => {
    if (supabase && !alertItem.readAt) {
      const readAt = new Date().toISOString();
      setDatabaseAlerts(current => current.map(item => item.id === alertItem.id ? { ...item, readAt } : item));
      const { error } = await supabase.from('notifications').update({ read_at: readAt }).eq('id', alertItem.id).is('read_at', null);
      if (error) {
        setDatabaseAlerts(current => current.map(item => item.id === alertItem.id ? { ...item, readAt: null } : item));
        Alert.alert('Could not mark notification read', error.message);
        return;
      }
    } else if (!supabase) {
      setRead(current => current.includes(alertItem.id) ? current : [...current, alertItem.id]);
    }

    if (alertItem.resourceType === 'conversation' || alertItem.notificationType === 'new_message') {
      p.setTab('Inbox');
      return;
    }
    if (alertItem.resourceType === 'live_session' || alertItem.route === 'LiveRoom') {
      p.navigate('LiveDiscovery');
      return;
    }
    if (alertItem.route) p.navigate(alertItem.route);
  };

  const markAllRead = async () => {
    if (!unreadCount) return;
    if (!supabase) {
      setRead(demoAlerts.map(item => item.id));
      return;
    }
    const { data: authResult, error: authError } = await supabase.auth.getUser();
    if (authError || !authResult.user) {
      Alert.alert('Could not update notifications', authError?.message || 'Please sign in again.');
      return;
    }
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: readAt }).eq('user_id', authResult.user.id).is('read_at', null);
    if (error) {
      Alert.alert('Could not mark notifications read', error.message);
      return;
    }
    setDatabaseAlerts(current => current.map(item => item.readAt ? item : { ...item, readAt }));
  };

  return <Screen>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <View><Heading size={27}>Alerts</Heading><Muted>Things happening around your WAVES.</Muted><Text style={{ color: unreadCount ? theme.colors.coral : theme.colors.muted, fontSize: 11, fontWeight: '800', marginTop: 5 }}>{unreadCount ? `${unreadCount} unread ${unreadCount === 1 ? 'alert' : 'alerts'}` : 'All caught up'}</Text></View>
      <Pressable onPress={() => void markAllRead()}><Text style={{ color: theme.colors.coral, fontSize: 11, fontWeight: '800' }}>Mark all read</Text></Pressable>
    </View>
    <ZoneToggle value={p.zone} onChange={p.setZone} />
    <SectionTitle title="Recent notifications" />
    {loadingAlerts ? <View style={{ alignItems: 'center', paddingVertical: 22 }}><ActivityIndicator color={theme.colors.coral}/><Muted style={{ marginTop: 8 }}>Loading notifications…</Muted></View> : null}
    {alerts.map(a => <Pressable key={a.id} onPress={() => { void markOneRead(a); }} style={{ flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#292938', gap: 12, backgroundColor: !a.readAt ? 'rgba(255,130,117,0.045)' : 'transparent' }}>
      <View style={{ width: 43, height: 43, borderRadius: 15, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={a.icon} size={20} color={a.color}/></View>
      <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={{ color: theme.colors.text, fontWeight: !a.readAt ? '900' : '700', fontSize: 13, flex: 1 }}>{a.title}</Text><Text style={{ color: theme.colors.subtle, fontSize: 10 }}>{a.time}</Text></View><Muted style={{ fontSize: 11, marginTop: 4 }}>{a.body}</Muted></View>
      {!a.readAt ? <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: theme.colors.coral, marginTop: 5 }} /> : <Ionicons name="checkmark-done-outline" size={15} color={theme.colors.subtle}/>}
    </Pressable>)}
    {!loadingAlerts && alerts.length === 0 ? <EmptyState icon="notifications-outline" title="You're all caught up" body={supabase ? 'New message alerts will appear here as messages arrive.' : 'Your demo notifications will appear here.'}/> : null}
    <Card style={{ marginTop: 24 }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Notification privacy</Text><Muted style={{ fontSize: 11, marginTop: 5 }}>Message alerts do not include the message text or private photos in their preview.</Muted><Button title="Manage notifications" onPress={() => p.navigate('Settings')} variant="secondary" compact style={{ marginTop: 12 }}/></Card>
  </Screen>;
}

function ProfileTab(p: MainProps) {
  const [profileAvatar, setProfileAvatar] = useState<any>(photos.alex);

  useEffect(() => {
    let cancelled = false;
    const loadProfileAvatar = async () => {
      if (!supabase) {
        if (!cancelled) setProfileAvatar(photos.alex);
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        if (!cancelled) setProfileAvatar(photos.alex);
        return;
      }
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_path')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      const imageSource = profileRow?.avatar_path ? await getPrivateImageSource(profileRow.avatar_path) : null;
      if (!cancelled) setProfileAvatar(imageSource ?? photos.alex);
    };
    void loadProfileAvatar().catch(() => {
      if (!cancelled) setProfileAvatar(photos.alex);
    });
    return () => { cancelled = true; };
  }, []);

  const [profileContentTab, setProfileContentTab] = useState<'posts' | 'media' | 'saved'>('posts');
  const [profileTiles, setProfileTiles] = useState<any[]>(supabase ? [] : (profileContentTab === 'posts' ? [photos.couple, photos.room, photos.maya] : profileContentTab === 'media' ? [photos.nova, photos.creator2, photos.creator3] : [photos.club1, photos.club2, photos.club3]));
  const [loadingProfileTiles, setLoadingProfileTiles] = useState(Boolean(supabase));
  useEffect(() => {
    let cancelled = false;
    const loadProfileTiles = async () => {
      if (!supabase) {
        const demoTiles = profileContentTab === 'posts' ? [photos.couple, photos.room, photos.maya] : profileContentTab === 'media' ? [photos.nova, photos.creator2, photos.creator3] : [photos.club1, photos.club2, photos.club3];
        if (!cancelled) { setProfileTiles(demoTiles); setLoadingProfileTiles(false); }
        return;
      }
      setLoadingProfileTiles(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData.user;
        if (!user) { if (!cancelled) setProfileTiles([]); return; }
        let mediaRows: Array<{ id: string; media_path: string | null }> = [];
        if (profileContentTab === 'saved') {
          const { data: saves, error: savesError } = await supabase.from('post_saves').select('post_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60);
          if (savesError) throw savesError;
          const ids = (saves ?? []).map(row => row.post_id);
          if (ids.length) {
            const { data, error } = await supabase.from('posts').select('id, media_path').in('id', ids).not('media_path', 'is', null);
            if (error) throw error;
            mediaRows = data ?? [];
          }
        } else {
          const { data, error } = await supabase.from('posts').select('id, media_path').eq('author_id', user.id).not('media_path', 'is', null).order('created_at', { ascending: false }).limit(60);
          if (error) throw error;
          mediaRows = data ?? [];
          if (profileContentTab === 'media') {
            const { data: storyRows, error: storyError } = await supabase.from('stories').select('id, media_path').eq('author_id', user.id).not('media_path', 'is', null).gt('expires_at', new Date().toISOString()).limit(60);
            if (storyError) throw storyError;
            mediaRows = [...mediaRows, ...(storyRows ?? [])];
          }
        }
        const sources = await Promise.all(mediaRows.map(row => row.media_path ? getPrivateImageSource(row.media_path) : null));
        if (!cancelled) setProfileTiles(sources.filter((source): source is { uri: string } => Boolean(source)));
      } catch (error) {
        if (!cancelled) { setProfileTiles([]); Alert.alert('Could not load your media', error instanceof Error ? error.message : 'Please try again.'); }
      } finally { if (!cancelled) setLoadingProfileTiles(false); }
    };
    void loadProfileTiles();
    return () => { cancelled = true; };
  }, [profileContentTab]);
  const menu = [
    { icon: 'create-outline' as const, label: 'Edit shared profile', sub: 'Photos, bio and interests', route: 'EditProfile' },
    { icon: 'location-outline' as const, label: 'Nearby map', sub: 'Control who can see your location', route: 'Map' },
    { icon: 'videocam-outline' as const, label: 'Creator studio', sub: 'Your live dashboard and stream setup', route: 'CreatorDashboard' },
    { icon: 'people-outline' as const, label: 'Club Zones', sub: 'Memberships and live rooms', route: 'ClubDirectory' },
    { icon: 'play-circle-outline' as const, label: 'Following & reminders', sub: 'Creators and upcoming streams', route: '__Following' },
    { icon: 'notifications-outline' as const, label: 'Alerts & activity', sub: 'Matches, updates and security alerts', route: '__Alerts' },
    { icon: 'settings-outline' as const, label: 'Account, privacy & safety', sub: 'Security, visibility, blocked users', route: 'Settings' },
  ];
  return <Screen><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}><Heading size={28}>Your profile</Heading><IconButton icon="settings-outline" onPress={() => p.navigate('Settings')} /></View><Card style={{ alignItems: 'center', paddingVertical: 22 }}><View style={{ width: 90, height: 90, borderRadius: 32, overflow: 'hidden', marginBottom: 13, borderWidth: 2, borderColor: theme.colors.coral }}><Image source={profileAvatar} resizeMode="cover" style={{ width: 90, height: 90 }} /></View><Heading size={22}>{p.profile.displayName || p.profile.firstName || 'Alex Morgan'}</Heading><Muted style={{ marginTop: 4 }}>{p.profile.email || 'alex.morgan@email.com'} · Demo profile</Muted><View style={{ flexDirection: 'row', gap: 7, marginTop: 13 }}><Pill active>Profile ready</Pill><Pill color={theme.colors.violet} active>{p.zone === 'casual' ? 'Casual Zone' : 'Hot Zones'}</Pill></View><Button title="Edit profile" onPress={() => p.navigate('EditProfile')} variant="secondary" compact style={{ marginTop: 17, minWidth: 155 }} /></Card>
    <Card style={{ marginTop: 14, padding: 0, overflow: 'hidden', backgroundColor: '#332B21', borderColor: '#69542D' }}><View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={{ color: '#F4DCA7', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }}>WAVES WALLET</Text><View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 7 }}><Text style={{ color: '#FFF8E7', fontWeight: '900', fontSize: 27 }}>2,450</Text><Text style={{ color: '#E5C785', fontSize: 11, fontWeight: '800' }}>credits</Text></View><Text style={{ color: '#D2BE92', fontSize: 10, marginTop: 4 }}>Demo balance · no payment provider connected</Text></View><View style={{ alignItems: 'flex-end', gap: 8 }}><Ionicons name="wallet" size={26} color="#F4CA79"/><Button title="Wallet" compact variant="secondary" onPress={() => p.navigate('Wallet')} /></View></View></Card>
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 }}><Card style={{ flex: 1 }}><Ionicons name="heart-outline" size={21} color={theme.colors.coral} /><Heading size={22} style={{ marginTop: 8 }}>12</Heading><Muted style={{ fontSize: 10 }}>Likes</Muted></Card><Card style={{ flex: 1 }}><Ionicons name="people-outline" size={21} color={theme.colors.violet} /><Heading size={22} style={{ marginTop: 8 }}>8</Heading><Muted style={{ fontSize: 10 }}>Connections</Muted></Card><Card style={{ flex: 1 }}><Ionicons name="radio-outline" size={21} color={theme.colors.mint} /><Heading size={22} style={{ marginTop: 8 }}>3</Heading><Muted style={{ fontSize: 10 }}>Following</Muted></Card></View>
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: theme.colors.border, marginBottom: 10 }}>{([{ key: 'posts', icon: 'grid-outline', label: 'Posts' }, { key: 'media', icon: 'images-outline', label: 'Media' }, { key: 'saved', icon: 'bookmark-outline', label: 'Saved' }] as const).map(item => <Pressable key={item.key} onPress={() => setProfileContentTab(item.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: profileContentTab === item.key ? 2 : 0, borderColor: theme.colors.coral, flexDirection: 'row', justifyContent: 'center', gap: 6 }}><Ionicons name={item.icon} size={16} color={profileContentTab === item.key ? theme.colors.coral : theme.colors.subtle}/><Text style={{ color: profileContentTab === item.key ? theme.colors.text : theme.colors.subtle, fontSize: 10, fontWeight: '800' }}>{item.label}</Text></Pressable>)}</View>
    {loadingProfileTiles ? <View style={{ paddingVertical: 16 }}><Muted>Loading your photos…</Muted></View> : profileTiles.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 23 }}>{profileTiles.map((tile, index) => <Pressable key={`${profileContentTab}-${index}`} onPress={() => Alert.alert(profileContentTab === 'saved' ? 'Saved photo' : profileContentTab === 'media' ? 'Your media' : 'Your post photo', 'This image was loaded from your WAVES media records. A full-screen media viewer will be connected next.')} style={{ width: '32%' }}><Image source={tile} resizeMode="cover" style={{ width: '100%', height: 105, borderRadius: 10, backgroundColor: theme.colors.surface2 }}/></Pressable>)}</View> : <View style={{ marginBottom: 23 }}><EmptyState icon="images-outline" title={profileContentTab === 'saved' ? 'No saved photos yet' : profileContentTab === 'media' ? 'No media yet' : 'No photo posts yet'} body={supabase ? 'Photos you upload to posts and unexpired stories will appear here.' : 'This demo profile has no media to show.'} /></View>}
    <SectionTitle title="Your WAVES" />{menu.map((m, i) => <Pressable key={m.label} onPress={() => { if (m.route === '__Following') p.setTab('Following'); else if (m.route === '__Alerts') p.setTab('Alerts'); else p.navigate(m.route); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderColor: '#292938' }}><View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: m.route === 'Settings' ? theme.colors.coralTint : theme.colors.surface2 }}><Ionicons name={m.icon} size={20} color={m.route === 'Settings' ? theme.colors.coral : theme.colors.muted} /></View><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>{m.label}</Text><Muted style={{ fontSize: 10, marginTop: 3 }}>{m.sub}</Muted></View><Ionicons name="chevron-forward" size={17} color={theme.colors.subtle} /></Pressable>)}
    <Button title="Sign out" onPress={() => { void p.onSignOut(); }} variant="ghost" icon="log-out-outline" style={{ marginTop: 25 }} />
  </Screen>;
}

export function MainTabScreen(p: MainProps) {
  const presence = useWavesPresence();
  const screenProps: MainProps = { ...p, onlineUserIds: presence.onlineUserIds, presenceReady: presence.ready, ownStatusVisible: presence.ownStatusVisible, setOwnOnlineStatus: presence.setOwnStatusVisible };
  let content: React.ReactNode;
  if (screenProps.tab === 'Feed') content = <FeedScreen zone={screenProps.zone} setTab={screenProps.setTab} navigate={screenProps.navigate} setSelectedClub={screenProps.setSelectedClub} />;
  else if (screenProps.tab === 'Discover') content = <DiscoverTab {...screenProps} />;
  else if (screenProps.tab === 'Casual') content = <CasualDiscover p={{ ...screenProps, zone: 'casual' }} />;
  else if (screenProps.tab === 'Hot') content = <HotDiscover p={{ ...screenProps, zone: 'hot' }} />;
  else if (screenProps.tab === 'Chat' || screenProps.tab === 'Inbox') content = <InboxTab {...screenProps} />;
  else if (screenProps.tab === 'Following') content = <FollowingTab {...screenProps} />;
  else if (screenProps.tab === 'Alerts') content = <AlertsTab {...screenProps} />;
  else content = <ProfileTab {...screenProps} />;
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}><View style={{ flex: 1 }}>{content}</View><BottomNav active={screenProps.tab} onSelect={screenProps.setTab} /></View>;
}
