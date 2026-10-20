import { ProfilePhotoPicker } from '../components/ProfilePhotoPicker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, EmptyState, Eyebrow, Field, Heading, IconButton, Muted, Pill, Screen, SectionTitle, ToggleRow, TopBar } from '../components/UI';
import { clubs, creators, datingPeople, photos, Person } from '../data/mock';
import { AppTab, theme, Zone } from '../theme';
import { BasicProfile } from './OnboardingScreens';
import { supabase } from '../lib/supabase';
import { getPrivateImageSource, removeOwnPrivateImage, uploadPrivateImage } from '../lib/media';
import { useWavesPresence } from '../lib/useWavesPresence';

type Club = typeof clubs[number];
export type FeatureProps = {
  route: string;
  goBack: () => void;
  navigate: (route: string) => void;
  zone: Zone;
  setZone: (zone: Zone) => void;
  profile: BasicProfile;
  updateProfile: (patch: Partial<BasicProfile>) => void;
  selectedPerson: Person;
  setSelectedPerson: (person: Person) => void;
  selectedClub: Club;
  setSelectedClub: (club: Club) => void;
  onSignOut: () => Promise<void>;
  setTab: (tab: AppTab) => void;
  onlineUserIds?: ReadonlySet<string>; presenceReady?: boolean; ownStatusVisible?: boolean;
  setOwnOnlineStatus?: (visible: boolean) => Promise<void>;
};

const line = { borderBottomWidth: 1 as const, borderBottomColor: '#2A2A39' };

function DetailHeader({ title, goBack, action, onAction }: { title: string; goBack: () => void; action?: string; onAction?: () => void }) {
  return <TopBar title={title} onBack={goBack} action={action} onAction={onAction} />;
}


type PresenceAwarePerson = Person & { showOnlineStatus?: boolean };

function getMemberPresence(person: Person, p: Pick<FeatureProps, 'onlineUserIds' | 'presenceReady'>) {
  if (!supabase) return { online: Boolean(person.online), label: person.online ? 'Online' : 'Offline' };
  if ((person as PresenceAwarePerson).showOnlineStatus !== true) return { online: false, label: 'Status hidden' };
  if (!p.presenceReady) return { online: false, label: 'Checking status…' };
  const online = Boolean(p.onlineUserIds?.has(person.id));
  return { online, label: online ? 'Online' : 'Offline' };
}

function useSignedInAvatar() {
  const [avatarSource, setAvatarSource] = useState<any>(photos.alex);
  useEffect(() => {
    let cancelled = false;
    const loadAvatar = async () => {
      if (!supabase) { if (!cancelled) setAvatarSource(photos.alex); return; }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) { if (!cancelled) setAvatarSource(photos.alex); return; }
      const { data: profile, error } = await supabase.from('profiles').select('avatar_path').eq('id', authData.user.id).maybeSingle();
      if (error) throw error;
      const source = profile?.avatar_path ? await getPrivateImageSource(profile.avatar_path) : null;
      if (!cancelled) setAvatarSource(source || photos.alex);
    };
    void loadAvatar().catch(() => { if (!cancelled) setAvatarSource(photos.alex); });
    return () => { cancelled = true; };
  }, []);
  return avatarSource;
}

function FollowMemberButton({ userId }: { userId: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);

  useEffect(() => {
    let cancelled = false;
    const loadFollowing = async () => {
      if (!supabase || !isUuid) return;
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user || authData.user.id === userId) return;
      const { data, error } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', authData.user.id)
        .eq('followed_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!cancelled) setFollowing(Boolean(data));
    };
    void loadFollowing().catch(() => undefined);
    return () => { cancelled = true; };
  }, [userId, isUuid]);

  const toggle = async () => {
    if (loading) return;
    if (!supabase || !isUuid) {
      Alert.alert('Demo profile', 'Following will be saved when this profile is connected to a real WAVES member account.');
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error('Please sign in again.');
      if (user.id === userId) throw new Error('You cannot follow your own account.');

      if (following) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followed_id', userId);
        if (error) throw error;
        setFollowing(false);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, followed_id: userId });
        if (error) throw error;
        setFollowing(true);
      }
    } catch (error) {
      Alert.alert('Could not update follow', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return <Button
    title={loading ? 'Saving…' : following ? 'Following' : 'Follow'}
    variant={following ? 'secondary' : 'violet'}
    compact
    icon={following ? 'checkmark' : 'person-add-outline'}
    onPress={() => void toggle()}
  />;
}

function DatingProfileScreen(p: FeatureProps) {
  const person = p.selectedPerson;
  const presence = getMemberPresence(person, p);
  return <Screen padded={false}>
    <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 8 }}>
      <DetailHeader title="Their profile" goBack={p.goBack} action="•••" onAction={() => Alert.alert('Profile options', 'Choose report or block. These actions will be connected to server-side safety rules.')}/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <ImageBackground source={person.photo} resizeMode="cover" imageStyle={{ borderRadius: 25 }} style={{ height: 420, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 25 }}>
          <View style={{ backgroundColor: 'rgba(12,12,20,0.78)', padding: 18 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>{person.verified ? <Pill active color={theme.colors.mint}>✓ Photo verified</Pill> : null}<Pill active={presence.online} color={presence.online ? theme.colors.mint : theme.colors.subtle}>{presence.online ? '● ' : '○ '}{presence.label}</Pill></View>
            <Heading size={31}>{person.name}{person.age ? `, ${person.age}` : ''}</Heading>
            <Muted style={{ marginTop: 5 }}>{person.subtitle} · {person.location}</Muted>
          </View>
        </ImageBackground>
        <Card style={{ marginTop: 15 }}><SectionTitle title="About"/><Muted>{person.bio || 'Here for good conversations, shared interests and new experiences.'}</Muted></Card>
        <View style={{ marginTop: 15 }}><SectionTitle title="Interests"/><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(person.interests || ['Music', 'Conversation', 'Travel']).map(i => <Pill key={i}>{i}</Pill>)}</View></View>
        <Card style={{ marginTop: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.success}/><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Your privacy matters</Text><Muted style={{ fontSize: 11 }}>Precise location and contact details are not shown on this profile.</Muted></View></Card>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 12, alignItems: 'center' }}><FollowMemberButton userId={person.id} /><Button title="Message" variant="secondary" icon="chatbubble-outline" onPress={() => p.navigate('Chat')} style={{ flex: 1 }}/><Button title="Like" icon="heart" onPress={() => p.navigate('Match')} style={{ flex: 1 }}/></View>
    </View>
  </Screen>;
}

function MatchScreen(p: FeatureProps) {
  const person = p.selectedPerson.id ? p.selectedPerson : datingPeople[0];
  const ownAvatar = useSignedInAvatar();
  return <Screen><View style={{ alignItems: 'center', paddingTop: 25 }}><Eyebrow color={theme.colors.coral}>IT'S A WAVES MOMENT</Eyebrow><Heading size={34} style={{ textAlign: 'center' }}>It's a match!</Heading><Muted style={{ textAlign: 'center', marginTop: 8, maxWidth: 280 }}>You and {person.name} liked each other. This is the start of something new.</Muted>
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 32 }}><Image source={photos.alex} style={{ width: 142, height: 190, borderRadius: 24, borderWidth: 3, borderColor: theme.colors.coral, transform: [{ rotate: '-7deg' }] }}/><View style={{ marginHorizontal: -12, zIndex: 2, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.coral, justifyContent: 'center', alignItems: 'center' }}><Ionicons name="heart" color="#281417" size={25}/></View><Image source={person.photo} style={{ width: 142, height: 190, borderRadius: 24, borderWidth: 3, borderColor: theme.colors.violet, transform: [{ rotate: '7deg' }] }}/></View>
    <Heading size={24} style={{ textAlign: 'center' }}>You + {person.name}</Heading><Muted style={{ textAlign: 'center', marginTop: 7, marginBottom: 27 }}>Say hello when you're ready. No pressure, just possibility.</Muted><Button title={`Message ${person.name}`} icon="chatbubble-ellipses" onPress={() => p.navigate('Chat')} style={{ width: '100%' }}/><Button title="Keep discovering" onPress={() => { p.setTab('Casual'); p.navigate('Main'); }} variant="secondary" style={{ width: '100%', marginTop: 10 }}/><Muted style={{ textAlign: 'center', fontSize: 10, marginTop: 20 }}>Demo interaction · Real matching requires the approved Supabase schema and mutual-like logic.</Muted></View></Screen>;
}

function FiltersScreen(p: FeatureProps) {
  const [distance, setDistance] = useState('25 km');
  const [age, setAge] = useState('25–35');
  const [intent, setIntent] = useState('Relationship');
  const [onlineOnly, setOnlineOnly] = useState(false);
  return <Screen><DetailHeader title="Discovery filters" goBack={p.goBack}/><Eyebrow>{p.zone === 'casual' ? 'CASUAL ZONE' : 'HOT ZONES'} · YOUR PREFERENCES</Eyebrow><Heading size={29}>Find your kind of people.</Heading><Muted style={{ marginTop: 8, marginBottom: 22 }}>Filters are personal and can be updated at any time.</Muted><SectionTitle title="Distance"/><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>{['5 km', '10 km', '25 km', '50 km', '100 km'].map(x => <Pill key={x} active={distance === x} onPress={() => setDistance(x)}>{x}</Pill>)}</View><SectionTitle title="Age range"/><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>{['18–24', '25–35', '30–45', '40+'].map(x => <Pill key={x} active={age === x} onPress={() => setAge(x)}>{x}</Pill>)}</View><SectionTitle title={p.zone === 'casual' ? 'What are you looking for?' : 'Content interests'}/><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>{(p.zone === 'casual' ? ['New friends', 'Relationship', 'Long-term', 'See how it goes'] : ['Music', 'Talk', 'Dance', 'Lifestyle', 'Community']).map(x => <Pill key={x} active={intent === x} color={theme.colors.violet} onPress={() => setIntent(x)}>{x}</Pill>)}</View><ToggleRow title="Show active people first" description="Prioritize recently active profiles. Exact online activity stays private." value={onlineOnly} onValueChange={setOnlineOnly}/><Button title="Apply filters" onPress={() => { Alert.alert('Preferences saved', `Distance: ${distance}\nAge: ${age}\nPreference: ${intent}`); p.goBack(); }} style={{ marginTop: 25 }}/></Screen>;
}

type ChatMessageItem = {
  id: string;
  mine: boolean;
  body: string;
  messageType: 'text' | 'image' | 'voice' | 'system';
  imageSource?: { uri: string } | null;
  createdAt?: string;
};

function ChatScreen(p: FeatureProps) {
  const person = p.selectedPerson.id ? p.selectedPerson : datingPeople[0];
  const memberPresence = getMemberPresence(person, p);
  const attachedConversationId = (person as Person & { conversationId?: string }).conversationId;
  const targetZone = (person as Person & { zone?: Zone }).zone || p.zone;
  const isRealMemberId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person.id);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>(supabase ? [] : [
    { id: '1', mine: false, body: `Hey! Glad we connected, ${p.profile.displayName || 'Alex'}.`, messageType: 'text' },
    { id: '2', mine: true, body: 'Same here! What have you been listening to lately?', messageType: 'text' },
    { id: '3', mine: false, body: 'A lot of soul and indie records. I can send you a playlist.', messageType: 'text' },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(supabase ? 'Loading protected conversation…' : 'Demo conversation · messages are not saved.');

  useEffect(() => {
    let cancelled = false;
    const loadConversation = async () => {
      if (!supabase) {
        setConversationId(null);
        setCurrentUserId(null);
        setMessages([
          { id: '1', mine: false, body: `Hey! Glad we connected, ${p.profile.displayName || 'Alex'}.`, messageType: 'text' },
          { id: '2', mine: true, body: 'Same here! What have you been listening to lately?', messageType: 'text' },
          { id: '3', mine: false, body: 'A lot of soul and indie records. I can send you a playlist.', messageType: 'text' },
        ]);
        setNotice('Demo conversation · messages are not saved.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessages([]);
      setConversationId(null);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const user = authData.user;
        if (!user) throw new Error('Please sign in again to access your messages.');
        if (cancelled) return;
        setCurrentUserId(user.id);

        if (!attachedConversationId && !isRealMemberId) {
          setNotice('This is a sample profile. Open a real member from Discover or an existing conversation to use saved chat.');
          return;
        }
        if (person.id === user.id) throw new Error('You cannot start a conversation with your own account.');

        let actualConversationId = attachedConversationId || null;
        if (!actualConversationId) {
          const { data: openedId, error: openError } = await supabase.rpc('open_direct_conversation', {
            p_target_user_id: person.id,
            p_zone: targetZone === 'hot' ? 'hot' : 'casual',
            p_club_id: null,
            p_live_session_id: null,
          });
          if (openError) throw openError;
          if (typeof openedId !== 'string' || !openedId) {
            throw new Error('WAVES could not open this conversation. Please try again.');
          }
          actualConversationId = openedId;
        }
        if (cancelled) return;
        setConversationId(actualConversationId);

        // Opening a conversation moves this user's read marker forward and clears its in-app message alerts.
        const { error: markReadError } = await supabase.rpc('mark_conversation_read', {
          p_conversation_id: actualConversationId,
        });
        if (markReadError) throw markReadError;

        const { data: rows, error: messagesError } = await supabase
          .from('messages')
          .select('id, sender_id, message_type, body, media_path, created_at')
          .eq('conversation_id', actualConversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(250);
        if (messagesError) throw messagesError;

        const mapped = await Promise.all((rows ?? []).map(async row => {
          const imageSource = row.media_path ? await getPrivateImageSource(row.media_path) : null;
          return {
            id: row.id,
            mine: row.sender_id === user.id,
            body: row.body ?? '',
            messageType: row.message_type as ChatMessageItem['messageType'],
            imageSource,
            createdAt: row.created_at,
          } satisfies ChatMessageItem;
        }));
        if (!cancelled) {
          setMessages(mapped);
          setNotice('Messages and photo attachments are saved in your protected WAVES conversation.');
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'Could not load this conversation.');
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadConversation();
    return () => { cancelled = true; };
  }, [person.id, attachedConversationId, isRealMemberId, targetZone, p.profile.displayName]);

  const sendText = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (!supabase || !conversationId || !currentUserId) {
      if (!supabase) {
        setMessages(prev => [...prev, { id: `${Date.now()}`, mine: true, body, messageType: 'text' }]);
        setText('');
        return;
      }
      Alert.alert('Conversation unavailable', notice || 'Open a real member profile or an existing conversation first.');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: currentUserId, message_type: 'text', body })
        .select('id, sender_id, message_type, body, media_path, created_at')
        .single();
      if (error) throw error;
      setMessages(prev => [...prev, {
        id: data.id,
        mine: true,
        body: data.body ?? body,
        messageType: 'text',
        createdAt: data.created_at,
      }]);
      setText('');
    } catch (error) {
      Alert.alert('Message not sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (sending) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset: ImagePickerAsset = result.assets[0];

      if (!supabase) {
        setMessages(prev => [...prev, {
          id: `${Date.now()}`,
          mine: true,
          body: '',
          messageType: 'image',
          imageSource: { uri: asset.uri },
        }]);
        setNotice('Demo attachment · this image will not persist after the app reloads.');
        return;
      }
      if (!conversationId || !currentUserId) {
        Alert.alert('Conversation unavailable', notice || 'Open a real member profile or an existing conversation first.');
        return;
      }

      setSending(true);
      const path = await uploadPrivateImage(asset, currentUserId, 'messages');
      let rowSaved = false;
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({ conversation_id: conversationId, sender_id: currentUserId, message_type: 'image', media_path: path })
          .select('id, sender_id, message_type, body, media_path, created_at')
          .single();
        if (error) throw error;
        rowSaved = true;
        const imageSource = await getPrivateImageSource(path);
        if (!imageSource) throw new Error('The image was saved, but WAVES could not create its secure preview link. Please reopen the conversation.');
        setMessages(prev => [...prev, {
          id: data.id,
          mine: true,
          body: '',
          messageType: 'image',
          imageSource,
          createdAt: data.created_at,
        }]);
      } catch (error) {
        if (!rowSaved) await removeOwnPrivateImage(path, currentUserId).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      Alert.alert('Could not send photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return <Screen padded={false} scroll={false}>
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <DetailHeader title={person.name} goBack={p.goBack} action="Call" onAction={() => Alert.alert(memberPresence.online ? 'Calling is not configured yet' : memberPresence.label === 'Offline' ? 'User is offline' : 'Online status hidden', memberPresence.online ? 'This member is online, but audio calling still needs the LiveKit call service and secure server-issued token endpoint.' : memberPresence.label === 'Offline' ? 'This member is offline. You can leave a message; calling will be connected in the next development stage.' : 'This member has hidden their online status, so WAVES cannot determine whether they are available. You can still leave a message.')}/>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, ...line }}>
        <Avatar source={person.photo} online={memberPresence.online} size={42}/>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{person.name}</Text>
          <Text style={{ color: memberPresence.online ? theme.colors.mint : theme.colors.subtle, fontSize: 10, fontWeight: '800', marginTop: 3 }}>{memberPresence.label}</Text>
          <Muted style={{ fontSize: 10, marginTop: 3 }}>Private conversation · screen-capture prevention is not a guarantee against external recording</Muted>
        </View>
        <IconButton icon="videocam-outline" onPress={() => Alert.alert(memberPresence.online ? 'Video calling is not configured yet' : memberPresence.label === 'Offline' ? 'User is offline' : 'Online status hidden', memberPresence.online ? 'Video calling needs the LiveKit development build and secure token service. That is the next call integration stage.' : memberPresence.label === 'Offline' ? 'This member is offline. You can leave a message.' : 'This member has hidden their online status. You can leave a message; WAVES cannot determine their availability.')}/>
      </View>

      {loading ? <View style={{ alignItems: 'center', paddingVertical: 16 }}><ActivityIndicator color={theme.colors.coral}/><Muted style={{ marginTop: 8, fontSize: 10 }}>Loading messages…</Muted></View> : null}
      {!loading && notice ? <Text style={{ color: theme.colors.subtle, fontSize: 10, lineHeight: 15, paddingTop: 9 }}>{notice}</Text> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16, gap: 11 }} showsVerticalScrollIndicator={false}>
        {messages.map(message => <View key={message.id} style={{ alignSelf: message.mine ? 'flex-end' : 'flex-start', maxWidth: '84%', backgroundColor: message.mine ? theme.colors.coralTint : theme.colors.surface2, borderRadius: 17, paddingHorizontal: message.messageType === 'image' ? 5 : 13, paddingVertical: message.messageType === 'image' ? 5 : 11, borderBottomRightRadius: message.mine ? 5 : 17, borderBottomLeftRadius: message.mine ? 17 : 5 }}>
          {message.messageType === 'image' ? (message.imageSource ? <Image source={message.imageSource} resizeMode="cover" style={{ width: 220, height: 220, borderRadius: 13, backgroundColor: theme.colors.surface3 }} /> : <View style={{ width: 220, height: 120, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" color={theme.colors.muted} size={25}/><Muted style={{ fontSize: 10, marginTop: 5 }}>Photo unavailable</Muted></View>) : <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 19 }}>{message.body}</Text>}
          <Text style={{ color: theme.colors.subtle, fontSize: 9, marginTop: 5, paddingHorizontal: 5 }}>{message.mine ? 'Sent' : 'Received'}{message.createdAt ? ` · ${new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : supabase ? '' : ' · demo'}</Text>
        </View>)}
        {!loading && !messages.length && supabase && !notice.startsWith('This is a sample') && conversationId ? <Muted style={{ textAlign: 'center', marginTop: 20 }}>No messages yet. Send the first message below.</Muted> : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 9, paddingBottom: 10, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
        <IconButton icon="image-outline" onPress={() => { if (!sending && !loading) void sendImage(); }} />
        <View style={{ flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: theme.colors.surface, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, justifyContent: 'center' }}>
          <TextInput value={text} onChangeText={setText} multiline placeholder="Send a message…" placeholderTextColor={theme.colors.subtle} contextMenuHidden selectTextOnFocus={false} style={{ color: theme.colors.text, maxHeight: 95, fontSize: 13, paddingVertical: 8 }}/>
        </View>
        <IconButton icon={sending ? 'hourglass-outline' : 'paper-plane'} color="#261315" background={theme.colors.coral} onPress={() => { if (!sending && !loading) void sendText(); }}/>
      </View>
      <Muted style={{ textAlign: 'center', fontSize: 9, paddingBottom: 8 }}>Message sync uses Supabase row-level access. End-to-end encryption is not implemented yet.</Muted>
    </View>
  </Screen>;
}

function EditProfileScreen(p: FeatureProps) {
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (!supabase) {
        Alert.alert('Demo mode', 'Your changes have not been saved to Supabase.');
        return;
      }
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult.user) {
        throw new Error('Your session could not be verified. Please log in again.');
      }
      const displayName = (p.profile.displayName || p.profile.firstName || 'WAVES Member').trim().slice(0, 60);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: p.profile.bio.trim().slice(0, 300),
          interests: p.profile.interests.slice(0, 30),
        })
        .eq('id', userResult.user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Your profile record was not found. Please try again.');
      Alert.alert('Profile updated', 'Your profile changes have been saved successfully.');
      p.goBack();
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <Screen>
    <DetailHeader title="Edit shared profile" goBack={p.goBack} action={saving ? 'Saving…' : 'Save'} onAction={() => { if (!saving) void saveProfile(); }} />
    <Card style={{ alignItems: 'center', paddingVertical: 18, marginBottom: 22 }}>
      <ProfilePhotoPicker fallbackSource={photos.alex} />
      <View style={{ alignItems: 'center', marginTop: 14 }}>
        <Heading size={17}>{p.profile.displayName || p.profile.firstName || 'Alex Morgan'}</Heading>
        <Muted style={{ marginTop: 4 }}>Shared identity · One account, two zones</Muted>
        <Muted style={{ fontSize: 10, marginTop: 8, textAlign: 'center' }}>Your photo is stored privately and its storage path is saved to your WAVES profile.</Muted>
      </View>
    </Card>
    <Field label="Display name" value={p.profile.displayName || p.profile.firstName} onChangeText={v => p.updateProfile({ displayName: v })} placeholder="Display name" />
    <Field label="About you" value={p.profile.bio} onChangeText={v => p.updateProfile({ bio: v })} placeholder="Tell people a little about yourself" multiline />
    <SectionTitle title="Interests" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Live music', 'Coffee', 'Design', 'Weekend hikes', 'Travel', 'Cooking', 'Art', 'Fitness', 'Books', 'Photography'].map(i => <Pill key={i} active={p.profile.interests.includes(i)} onPress={() => p.updateProfile({ interests: p.profile.interests.includes(i) ? p.profile.interests.filter(a => a !== i) : [...p.profile.interests, i] })}>{i}</Pill>)}</View>
    <Card style={{ marginTop: 22 }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Separate mode profiles</Text><Muted style={{ marginTop: 6, fontSize: 11 }}>We will add mode-specific names, intent and visibility preferences to match the ERD's MODE_PROFILES structure.</Muted></Card>
  </Screen>;
}

function NearbyMapScreen(p: FeatureProps) {
  const [sharing, setSharing] = useState(false);
  const [friends, setFriends] = useState(true);
  return <Screen><DetailHeader title="Nearby map" goBack={p.goBack} action="Privacy" onAction={() => p.navigate('Settings')}/><Eyebrow>YOUR LOCATION, YOUR CHOICE</Eyebrow><Heading size={28}>Your people, nearby.</Heading><Muted style={{ marginTop: 8, marginBottom: 17 }}>This demo uses illustrative map pins. It does not access GPS or track anyone.</Muted><View style={{ height: 330, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1C2630', borderWidth: 1, borderColor: theme.colors.border, marginBottom: 18 }}><View style={{ position: 'absolute', left: -22, top: 38, width: 440, height: 23, backgroundColor: '#2B3E43', transform: [{ rotate: '-22deg' }] }}/><View style={{ position: 'absolute', left: -10, top: 160, width: 440, height: 18, backgroundColor: '#33464A', transform: [{ rotate: '13deg' }] }}/><View style={{ position: 'absolute', left: 95, top: -30, width: 18, height: 400, backgroundColor: '#33464A', transform: [{ rotate: '27deg' }] }}/><View style={{ position: 'absolute', left: 245, top: -25, width: 15, height: 400, backgroundColor: '#33464A', transform: [{ rotate: '-12deg' }] }} /><View style={{ position: 'absolute', top: 139, left: '42%', width: 54, height: 54, borderRadius: 27, backgroundColor: '#4A373E', borderWidth: 2, borderColor: theme.colors.coral, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="navigate" size={25} color={theme.colors.coral}/></View><View style={{ position: 'absolute', top: 48, left: 54, backgroundColor: theme.colors.surface, padding: 4, borderRadius: 24, borderWidth: 2, borderColor: theme.colors.violet }}><Image source={photos.maya} style={{ width: 38, height: 38, borderRadius: 19 }}/></View><View style={{ position: 'absolute', top: 208, right: 38, backgroundColor: theme.colors.surface, padding: 4, borderRadius: 24, borderWidth: 2, borderColor: theme.colors.mint }}><Image source={photos.creator2} style={{ width: 38, height: 38, borderRadius: 19 }}/></View><View style={{ position: 'absolute', top: 44, right: 32, borderRadius: 12, backgroundColor: 'rgba(14,14,22,0.86)', padding: 8 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 10 }}>Approximate nearby</Text></View><View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(14,14,22,0.88)', borderRadius: 13, padding: 11 }}><Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '800' }}>Live location is off</Text><Text style={{ color: theme.colors.muted, fontSize: 10, marginTop: 3 }}>Precise coordinates are never shown in this prototype.</Text></View></View><Card><ToggleRow title="Share my live location" description="Share exact location only with individually approved friends." value={sharing} onValueChange={setSharing}/><ToggleRow title="Show approximate nearby discovery" description="Allow nearby discovery to show a rough distance only." value={friends} onValueChange={setFriends}/><Muted style={{ fontSize: 10, marginTop: 12 }}>Turning these on here only changes the local demo UI. A real location grant and OS location permission will be required when we implement the feature.</Muted></Card><Button title="Manage approved friends" variant="secondary" onPress={() => Alert.alert('Location sharing', 'Approved recipient-specific location grants will be backed by LOCATION_SHARE_GRANTS in Supabase.')} style={{ marginTop: 14 }}/></Screen>;
}

function ClubDirectoryScreen(p: FeatureProps) {
  const [joined, setJoined] = useState<string[]>(['dance-room']);
  return <Screen><DetailHeader title="Club Zones" goBack={p.goBack}/><Eyebrow color={theme.colors.violet}>FIND YOUR COMMUNITY</Eyebrow><Heading size={29}>Room for your people.</Heading><Muted style={{ marginTop: 7, marginBottom: 20 }}>Join interest-led communities, discover live rooms and follow events.</Muted><Card style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}><Image source={photos.club1} style={{ height: 155, width: '100%' }}/><View style={{ padding: 15 }}><Pill active color={theme.colors.violet}>MEMBER COMMUNITIES</Pill><Heading size={20} style={{ marginTop: 10 }}>A club for every side of you.</Heading><Muted style={{ marginTop: 5 }}>Each club has membership rules and an optional club-specific profile.</Muted></View></Card><SectionTitle title="Explore clubs" action="Create request" onAction={() => Alert.alert('Club proposal', 'Global club creation is admin-only. Members can submit a proposal for review.')}/>{clubs.map(club => { const hasJoined = joined.includes(club.id); return <Card key={club.id} style={{ padding: 0, overflow: 'hidden', marginBottom: 13 }}><Pressable onPress={() => { p.setZone('hot'); }}><Image source={club.photo} style={{ height: 135, width: '100%' }}/></Pressable><View style={{ padding: 14 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><View style={{ flex: 1 }}><Heading size={17}>{club.name}</Heading><Muted style={{ fontSize: 10, marginTop: 4 }}>{club.category} · {club.members}</Muted></View>{club.live ? <Pill active color={theme.colors.violet}>● LIVE</Pill> : <Pill>UPCOMING</Pill>}</View><Muted style={{ marginTop: 9 }}>{club.description}</Muted><View style={{ flexDirection: 'row', gap: 8, marginTop: 13 }}><Button title={hasJoined ? 'Member' : 'Request to join'} compact variant={hasJoined ? 'secondary' : 'violet'} icon={hasJoined ? 'checkmark-circle' : 'people-outline'} onPress={() => setJoined(prev => hasJoined ? prev : [...prev, club.id])} style={{ flex: 1 }}/><Button title="View activity" compact variant="secondary" onPress={() => { p.setSelectedClub(club); p.navigate('ClubActivity'); }} style={{ flex: 1 }}/></View></View></Card>; })}<Muted style={{ fontSize: 10, textAlign: 'center', marginTop: 5 }}>Member access, age eligibility and club roles must be enforced by Supabase policies, not just this screen.</Muted></Screen>;
}

function ClubActivityScreen(p: FeatureProps) {
  const club = p.selectedClub;
  return <Screen><DetailHeader title="Club activity" goBack={p.goBack}/><ImageBackground source={club.photo} imageStyle={{ borderRadius: 23 }} style={{ height: 230, borderRadius: 23, overflow: 'hidden', justifyContent: 'flex-end' }}><View style={{ backgroundColor: 'rgba(13,13,22,0.8)', padding: 16 }}><Pill active color={theme.colors.violet}>{club.live ? 'LIVE ACTIVITY' : 'NEXT EVENT'}</Pill><Heading size={24} style={{ marginTop: 9 }}>{club.name}</Heading><Muted style={{ marginTop: 4 }}>{club.category} · {club.members}</Muted></View></ImageBackground><Muted style={{ marginTop: 16 }}>{club.description}</Muted><SectionTitle title="Room access"/><Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="lock-closed" size={21} color={theme.colors.violet}/><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Members-first experience</Text><Muted style={{ fontSize: 11 }}>Live chat and member-only rooms will require an active membership.</Muted></View></View></Card><Button title={club.live ? 'Enter live room' : 'Set event reminder'} icon={club.live ? 'radio' : 'notifications-outline'} variant="violet" onPress={() => { p.setSelectedPerson(creators[0]); p.navigate('LiveRoom'); }} style={{ marginTop: 17 }}/><Button title="Open creator profile" variant="secondary" onPress={() => { p.setSelectedPerson(creators[0]); p.navigate('CreatorProfile'); }} style={{ marginTop: 10 }}/></Screen>;
}

type LiveDiscoveryItem = {
  person: Person;
  title: string;
  description: string;
  category: string;
  status: 'live' | 'scheduled';
  sessionId?: string;
};

function LiveDiscoveryScreen(p: FeatureProps) {
  const [items, setItems] = useState<LiveDiscoveryItem[]>(supabase ? [] : creators.map((creator, index) => ({
    person: creator,
    title: index === 0 ? 'Late-night vinyl club' : index === 1 ? 'Movement, culture and good energy' : 'Creative conversations after dark',
    description: creator.bio || 'Sample creator session',
    category: 'Community',
    status: (creator.online ? 'live' : 'scheduled') as 'live' | 'scheduled',
  })));
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      if (!supabase) { if (!cancelled) { setItems(creators.map((creator, index) => ({ person: creator, title: index === 0 ? 'Late-night vinyl club' : index === 1 ? 'Movement, culture and good energy' : 'Creative conversations after dark', description: creator.bio || 'Sample creator session', category: 'Community', status: (creator.online ? 'live' : 'scheduled') as 'live' | 'scheduled' }))); setLoading(false); } return; }
      setLoading(true);
      try {
        const zoneType = p.zone === 'hot' ? 'hot_live' : 'club_audio';
        const { data: sessionRows, error: sessionsError } = await supabase
          .from('live_sessions')
          .select('id, host_id, title, description, category, status, scheduled_at, zone_type')
          .eq('zone_type', zoneType)
          .in('status', ['live', 'scheduled'])
          .order('scheduled_at', { ascending: true })
          .limit(60);
        if (sessionsError) throw sessionsError;
        const sessions = sessionRows ?? [];
        if (!sessions.length) { if (!cancelled) setItems([]); return; }
        const hostIds = Array.from(new Set(sessions.map(row => row.host_id)));
        const [{ data: creatorRows, error: creatorsError }, { data: profileRows, error: profilesError }] = await Promise.all([
          supabase.from('creator_profiles').select('user_id, stage_name, bio, categories, verification_status, is_active').in('user_id', hostIds).eq('verification_status', 'approved').eq('is_active', true),
          supabase.from('profiles').select('id, display_name, username, bio, interests, avatar_path, profile_visibility').in('id', hostIds),
        ]);
        if (creatorsError) throw creatorsError;
        if (profilesError) throw profilesError;
        const approvedByUser = new Map<string, any>((creatorRows ?? []).map(row => [row.user_id, row] as const));
        const profilesByUser = new Map<string, any>((profileRows ?? []).map(row => [row.id, row] as const));
        const mapped: Array<LiveDiscoveryItem | null> = await Promise.all(
          sessions.map(async (session): Promise<LiveDiscoveryItem | null> => {
          const creator = approvedByUser.get(session.host_id);
          const profile = profilesByUser.get(session.host_id);
          if (!creator || !profile) return null;
          const avatar = profile.avatar_path ? await getPrivateImageSource(profile.avatar_path) : null;
          const person = {
            id: profile.id,
            name: creator.stage_name || profile.display_name || 'WAVES Creator',
            age: undefined,
            subtitle: session.category || 'WAVES Creator',
            location: 'Location hidden',
            bio: session.description || creator.bio || profile.bio || '',
            interests: creator.categories || profile.interests || [],
            photo: avatar || photos.alex,
            online: session.status === 'live',
            verified: false,
            sessionId: session.id,
            sessionTitle: session.title,
            sessionStatus: session.status,
            zone: p.zone,
          } as Person;
          return {
            person,
            title: session.title,
            description: session.description || creator.bio || '',
            category: session.category || 'Community',
            status: session.status as 'live' | 'scheduled',
            sessionId: session.id,
          };
          })
        );
        if (!cancelled) {
          setItems(mapped.filter((item): item is LiveDiscoveryItem => item !== null));
        }
      } catch (error) {
        if (!cancelled) { setItems([]); Alert.alert('Could not load live sessions', error instanceof Error ? error.message : 'Please try again.'); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void loadSessions();
    return () => { cancelled = true; };
  }, [p.zone]);

  return <Screen>
    <DetailHeader title="Live discovery" goBack={p.goBack}/>
    <Eyebrow color={theme.colors.violet}>LIVE & SCHEDULED ROOMS</Eyebrow>
    <Heading size={29}>Find your next room.</Heading>
    <Muted style={{ marginTop: 7, marginBottom: 18 }}>Only sessions the current account is permitted to discover are listed. Live audio/video playback still requires the streaming provider integration.</Muted>
    {loading ? <View style={{ alignItems: 'center', paddingVertical: 24 }}><ActivityIndicator color={theme.colors.violet}/><Muted style={{ marginTop: 8 }}>Loading available sessions…</Muted></View> : null}
    {items.map(item => <Pressable key={item.sessionId || item.person.id} onPress={() => { p.setSelectedPerson(item.person); p.navigate('LiveRoom'); }} style={{ height: 215, marginBottom: 14, borderRadius: 22, overflow: 'hidden' }}><ImageBackground source={item.person.photo} style={{ flex: 1, justifyContent: 'space-between' }}><View style={{ padding: 13, flexDirection: 'row', justifyContent: 'space-between' }}><Pill active color={theme.colors.violet}>{item.status === 'live' ? '● SESSION LIVE' : 'SCHEDULED'}</Pill><Pill>{item.category}</Pill></View><View style={{ backgroundColor: 'rgba(13,13,22,0.82)', padding: 15 }}><Heading size={20}>{item.title}</Heading><Muted style={{ marginTop: 3 }}>{item.person.name}</Muted><Muted style={{ marginTop: 5 }}>{item.description || 'A WAVES creator session.'}</Muted></View></ImageBackground></Pressable>)}
    {!loading && items.length === 0 ? <EmptyState icon="radio-outline" title={supabase ? 'No sessions available right now' : 'No sample sessions'} body={supabase ? 'Scheduled or live sessions that your account is allowed to view will appear here.' : 'Try again when sample sessions are configured.'} /> : null}
    <Muted style={{ fontSize: 10, marginTop: 8 }}>This screen lists session records; it does not yet connect microphone, audio playback, or live broadcasting.</Muted>
  </Screen>;
}

function LiveRoomScreen(p: FeatureProps) {
  const person = p.selectedPerson.id ? p.selectedPerson : creators[0];
  const sessionDetails = person as Person & { sessionId?: string; sessionTitle?: string; sessionStatus?: string };
  const [chatText, setChatText] = useState('');
  const [roomMessages, setRoomMessages] = useState([{ id: '1', name: 'Jules', text: 'Welcome in! Keep the chat kind.' }, { id: '2', name: 'Sam', text: 'The mix is beautiful tonight.' }, { id: '3', name: 'Nova Reed', text: 'So glad you are here ✨' }]);
  const [following, setFollowing] = useState(false);
  const [muted, setMuted] = useState(false);
  return <Screen padded={false}><View style={{ flex: 1, paddingHorizontal: 16 }}><DetailHeader title="Live room" goBack={p.goBack} action="Report" onAction={() => Alert.alert('Report this room', 'This will open the moderation report flow in the connected product.')}/><ImageBackground source={person.photo} imageStyle={{ borderRadius: 22 }} style={{ height: 260, overflow: 'hidden', justifyContent: 'space-between', padding: 13 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Pill active color={theme.colors.violet}>{sessionDetails.sessionId ? (sessionDetails.sessionStatus === 'live' ? '● SESSION LIVE' : 'SCHEDULED') : '● DEMO ROOM'}</Pill><Pill>{sessionDetails.sessionId ? 'Provider not connected' : 'Sample room'}</Pill></View><View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(12,12,20,0.78)', borderRadius: 12, padding: 10 }}><Text style={{ color: theme.colors.text, fontWeight: '900' }}>{person.name}</Text><Muted style={{ fontSize: 10 }}>{person.subtitle}</Muted></View></ImageBackground><Heading size={22} style={{ marginTop: 15 }}>{sessionDetails.sessionTitle || (person.name === 'Nova Reed' ? 'Late-night vinyl club' : `${person.name}'s live room`)}</Heading><Muted style={{ marginTop: 5 }}>{sessionDetails.sessionId ? 'This session is registered in Supabase, but real live audio/video is not connected yet. The chat below is a local preview.' : 'Music, conversation and community. Sample room — not a live stream yet.'}</Muted><View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 }}><Button title={following ? 'Following' : 'Follow'} compact variant={following ? 'secondary' : 'violet'} icon={following ? 'checkmark' : 'add'} onPress={() => setFollowing(!following)} style={{ flex: 1 }}/><Button title="Raise hand" compact variant="secondary" icon="hand-left-outline" onPress={() => Alert.alert('Request to join', 'Your request can be sent when the live provider and room moderation service are connected.')} style={{ flex: 1 }}/><IconButton icon={muted ? 'volume-mute' : 'volume-high'} onPress={() => setMuted(!muted)}/></View><SectionTitle title="Live chat"/><ScrollView style={{ flex: 1, minHeight: 120 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }} showsVerticalScrollIndicator={false}>{roomMessages.map(m => <View key={m.id} style={{ flexDirection: 'row', gap: 8 }}><View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: theme.colors.violetTint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.colors.violet, fontWeight: '900', fontSize: 10 }}>{m.name.slice(0,1)}</Text></View><View style={{ flex: 1 }}><Text style={{ color: theme.colors.violet, fontWeight: '800', fontSize: 10 }}>{m.name}</Text><Text style={{ color: theme.colors.text, fontSize: 12, marginTop: 2 }}>{m.text}</Text></View></View>)}</ScrollView><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderColor: theme.colors.border }}><TextInput value={chatText} onChangeText={setChatText} placeholder="Join the conversation..." placeholderTextColor={theme.colors.subtle} contextMenuHidden style={{ flex: 1, color: theme.colors.text, backgroundColor: theme.colors.surface, borderRadius: 14, paddingHorizontal: 12, minHeight: 42 }}/><IconButton icon="paper-plane" color="#21131a" background={theme.colors.violet} onPress={() => { if (chatText.trim()) { setRoomMessages(prev => [...prev, { id: `${Date.now()}`, name: p.profile.displayName || 'You', text: chatText.trim() }]); setChatText(''); } }}/></View></View></Screen>;
}

function CreatorProfileScreen(p: FeatureProps) {
  const person = p.selectedPerson.id ? p.selectedPerson : creators[0];
  return <Screen><DetailHeader title="Creator profile" goBack={p.goBack} action="•••" onAction={() => Alert.alert('Creator options', 'Follow, report and block controls will use the connected moderation services.')}/><ImageBackground source={person.photo} imageStyle={{ borderRadius: 24 }} style={{ height: 275, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' }}><View style={{ padding: 17, backgroundColor: 'rgba(12,12,20,0.78)' }}><Pill active color={theme.colors.violet}>CREATOR</Pill><Heading size={27} style={{ marginTop: 9 }}>{person.name}</Heading><Muted>{person.subtitle}</Muted></View></ImageBackground><Muted style={{ marginTop: 15 }}>{person.bio}</Muted><View style={{ flexDirection: 'row', gap: 10, marginTop: 17 }}><Card style={{ flex: 1 }}><Heading size={22}>12.4k</Heading><Muted>Followers</Muted></Card><Card style={{ flex: 1 }}><Heading size={22}>86</Heading><Muted>Streams</Muted></Card><Card style={{ flex: 1 }}><Heading size={22}>4.9</Heading><Muted>Community rating</Muted></Card></View><SectionTitle title="Interests"/><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Music', 'Community', 'Late-night sessions'].map(x => <Pill key={x} color={theme.colors.violet} active>{x}</Pill>)}</View><View style={{ flexDirection: 'row', gap: 8, marginTop: 22 }}><FollowMemberButton userId={person.id}/><Button title="Message creator" icon="chatbubble-outline" variant="secondary" onPress={() => p.navigate('Chat')} style={{ flex: 1 }}/></View><Button title="Open live room" icon="radio" variant="violet" onPress={() => p.navigate('LiveRoom')} style={{ marginTop: 10 }}/></Screen>;
}

function CreatorDashboardScreen(p: FeatureProps) {
  const [title, setTitle] = useState('Late-night listening room');
  const [category, setCategory] = useState('Music');
  const [reminder, setReminder] = useState(true);
  return <Screen><DetailHeader title="Creator studio" goBack={p.goBack}/><Eyebrow color={theme.colors.violet}>YOUR STAGE</Eyebrow><Heading size={29}>Make a moment.</Heading><Muted style={{ marginTop: 7, marginBottom: 19 }}>Prepare a stream and manage your community. Real broadcast hosting will be wired to the selected provider later.</Muted><View style={{ flexDirection: 'row', gap: 10, marginBottom: 19 }}>{[{ title: 'Followers', n: '12.4k', icon: 'people-outline' as const }, { title: 'This month', n: '8.6k', icon: 'eye-outline' as const }].map(x => <Card key={x.title} style={{ flex: 1 }}><Ionicons name={x.icon} size={20} color={theme.colors.violet}/><Heading size={22} style={{ marginTop: 9 }}>{x.n}</Heading><Muted style={{ fontSize: 10 }}>{x.title}</Muted></Card>)}</View><Card><SectionTitle title="Set up a stream"/><Field label="Stream title" value={title} onChangeText={setTitle} placeholder="Name your stream"/><Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '800', marginBottom: 9 }}>Category</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{['Music', 'Conversation', 'Dance', 'Lifestyle'].map(x => <Pill key={x} active={x === category} color={theme.colors.violet} onPress={() => setCategory(x)}>{x}</Pill>)}</View><ToggleRow title="Notify followers" description="Notify followers when your stream starts (generic push by default)." value={reminder} onValueChange={setReminder}/><Button title="Schedule stream" icon="calendar-outline" variant="violet" onPress={() => Alert.alert('Stream saved', `${title}\nCategory: ${category}\nNotifications: ${reminder ? 'on' : 'off'}\n\nThis is a local demo. Scheduling will be saved to Supabase after provider setup.`)} style={{ marginTop: 17 }}/><Button title="Go live" icon="radio" onPress={() => Alert.alert('Broadcast setup', 'Live video requires the selected WebRTC/live-streaming provider and secure server-issued credentials.')} variant="secondary" style={{ marginTop: 10 }}/></Card><SectionTitle title="Upcoming streams"/><Card><View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><Image source={photos.nova} style={{ width: 62, height: 70, borderRadius: 12 }}/><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Soul selections</Text><Muted style={{ fontSize: 10, marginTop: 4 }}>Saturday · 9:00 PM</Muted><Muted style={{ fontSize: 10 }}>Reminder enabled</Muted></View></View></Card></Screen>;
}

function WalletScreen(p: FeatureProps) {
  const [activityFilter, setActivityFilter] = useState<'All' | 'Received' | 'Spent'>('All');
  const activity = [
    { id: 'tx1', label: 'Creator tip', detail: 'Nova Reed · Live room', type: 'Spent' as const, amount: '- 120', time: 'Yesterday', icon: 'heart' as const },
    { id: 'tx2', label: 'Monthly creator reward', detail: 'Creator activity · Demo', type: 'Received' as const, amount: '+ 450', time: 'Oct 14', icon: 'gift' as const },
    { id: 'tx3', label: 'Private room session', detail: 'Club Zones · Demo', type: 'Spent' as const, amount: '- 80', time: 'Oct 12', icon: 'radio' as const },
  ];
  const visible = activityFilter === 'All' ? activity : activity.filter(item => item.type === activityFilter);
  return <Screen>
    <DetailHeader title="WAVES Wallet" goBack={p.goBack}/>
    <Eyebrow color={theme.colors.yellow}>YOUR CREDITS</Eyebrow>
    <Heading size={29}>Your wallet.</Heading>
    <Muted style={{ marginTop: 7, marginBottom: 19 }}>Credits may be used for supported creator interactions after the payment and ledger services are connected.</Muted>
    <Card style={{ backgroundColor: '#332B21', borderColor: '#69542D', padding: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ color: '#F4DCA7', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }}>AVAILABLE BALANCE</Text><View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 8 }}><Heading size={34} style={{ color: '#FFF8E7' }}>2,450</Heading><Text style={{ color: '#E5C785', fontWeight: '800', fontSize: 12 }}>credits</Text></View></View><View style={{ width: 53, height: 53, borderRadius: 18, backgroundColor: '#51432C', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="wallet" size={27} color="#F4CA79"/></View></View>
      <Button title="Add credits" icon="add-circle-outline" onPress={() => Alert.alert('Payments not connected', 'This is a demo wallet. We will integrate a supported payment provider and trusted server-side ledger before real purchases are enabled.')} style={{ marginTop: 19, backgroundColor: '#F4CA79' }}/>
      <Muted style={{ color: '#D2BE92', fontSize: 10, marginTop: 10 }}>Demo balance only. No money has been charged or credited.</Muted>
    </Card>
    <SectionTitle title="Credit packages"/>
    <View style={{ flexDirection: 'row', gap: 9 }}>{[{ amount: '500', price: '$4.99' }, { amount: '1,200', price: '$9.99' }, { amount: '2,800', price: '$19.99' }].map(pack => <Pressable key={pack.amount} onPress={() => Alert.alert('Package preview', `${pack.amount} credits · ${pack.price}\n\nPurchases are disabled until a payment provider and server-side transaction validation are configured.`)} style={{ flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 11, alignItems: 'center' }}><Ionicons name="sparkles" size={18} color={theme.colors.yellow}/><Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '900', marginTop: 7 }}>{pack.amount}</Text><Text style={{ color: theme.colors.muted, fontSize: 10, marginTop: 3 }}>credits</Text><Text style={{ color: theme.colors.yellow, fontSize: 12, fontWeight: '900', marginTop: 8 }}>{pack.price}</Text></Pressable>)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 23 }}><SectionTitle title="Recent activity"/><Pressable onPress={() => setActivityFilter('All')}><Text style={{ color: theme.colors.coral, fontSize: 11, fontWeight: '800' }}>Reset</Text></Pressable></View>
    <View style={{ flexDirection: 'row', gap: 7, marginBottom: 11 }}>{(['All', 'Received', 'Spent'] as const).map(x => <Pill key={x} active={activityFilter === x} onPress={() => setActivityFilter(x)}>{x}</Pill>)}</View>
    <Card style={{ paddingVertical: 3 }}>{visible.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: index === visible.length - 1 ? 0 : 1, borderColor: theme.colors.border }}><View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: item.type === 'Received' ? '#20372F' : theme.colors.coralTint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon} size={19} color={item.type === 'Received' ? theme.colors.mint : theme.colors.coral}/></View><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 12 }}>{item.label}</Text><Text style={{ color: theme.colors.muted, fontSize: 10, marginTop: 4 }}>{item.detail} · {item.time}</Text></View><Text style={{ color: item.type === 'Received' ? theme.colors.mint : theme.colors.text, fontWeight: '900', fontSize: 13 }}>{item.amount}</Text></View>)}</Card>
    <Muted style={{ marginTop: 14, fontSize: 10 }}>The production wallet will use an append-only credit ledger. The mobile client will never write balances directly; all payments, tips and refunds must be verified server-side and made idempotent.</Muted>
  </Screen>;
}

function SettingsScreen(p: FeatureProps) {
  const [settings, setSettings] = useState({ hidePreviews: true, appLock: true, location: false, nearby: false, phoneDiscovery: false, readReceipts: false, onlineStatus: p.ownStatusVisible ?? false, twoFactor: false });
  const [savingOnlineStatus, setSavingOnlineStatus] = useState(false);
  useEffect(() => { if (typeof p.ownStatusVisible === 'boolean') setSettings(prev => ({ ...prev, onlineStatus: p.ownStatusVisible as boolean })); }, [p.ownStatusVisible]);
  const toggle = (key: keyof typeof settings, value: boolean) => setSettings(prev => ({ ...prev, [key]: value }));
  const changeOnlineStatus = async (visible: boolean) => {
    if (savingOnlineStatus) return;
    if (!p.setOwnOnlineStatus) { Alert.alert('Status unavailable', 'Please reopen Settings while signed in and try again.'); return; }
    setSavingOnlineStatus(true);
    try {
      await p.setOwnOnlineStatus(visible);
      toggle('onlineStatus', visible);
      Alert.alert('Online status updated', visible ? 'Permitted WAVES members can now see when you are online or offline.' : 'Your online status is now hidden from other members.');
    } catch (error) {
      Alert.alert('Could not update online status', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSavingOnlineStatus(false); }
  };
  return <Screen><DetailHeader title="Account, privacy & safety" goBack={p.goBack}/><Eyebrow>PRIVACY FIRST</Eyebrow><Heading size={29}>Your WAVES, your rules.</Heading><Muted style={{ marginTop: 7, marginBottom: 20 }}>These controls demonstrate the intended settings. Persistent enforcement will be implemented in native code and Supabase policies.</Muted><SectionTitle title="Account security"/><Card style={{ marginBottom: 20 }}><ToggleRow title="App lock" description="Re-lock the app when you return after a short break." value={settings.appLock} onValueChange={v => toggle('appLock', v)}/><ToggleRow title="Hide app previews" description="Mask sensitive content when switching apps." value={settings.hidePreviews} onValueChange={v => toggle('hidePreviews', v)}/><View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#292938' }}><Ionicons name="shield-checkmark" size={22} color={theme.colors.success}/><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>Screen capture protection</Text><Muted style={{ fontSize: 11, marginTop: 3 }}>Enabled by default on supported native screens. This security control cannot be switched off here.</Muted></View><Pill active color={theme.colors.mint}>ON</Pill></View><ToggleRow title="Two-step verification" description="Add a second factor at sign-in when configured." value={settings.twoFactor} onValueChange={v => toggle('twoFactor', v)}/></Card><SectionTitle title="Discovery & location"/><Card style={{ marginBottom: 20 }}><ToggleRow title="Nearby discovery" description="Allow approximate nearby suggestions." value={settings.nearby} onValueChange={v => toggle('nearby', v)}/><ToggleRow title="Share live location" description="Exact location is only shared with approved, unexpired grants." value={settings.location} onValueChange={v => toggle('location', v)}/><ToggleRow title="Find me by phone" description="Opt-in friend lookup only; never location tracking." value={settings.phoneDiscovery} onValueChange={v => toggle('phoneDiscovery', v)}/><ToggleRow title="Show online status" description={savingOnlineStatus ? 'Saving privacy preference…' : 'When enabled, permitted members see Online or Offline. Turn it off to hide your presence.'} value={settings.onlineStatus} onValueChange={v => { void changeOnlineStatus(v); }}/></Card><SectionTitle title="Messaging privacy"/><Card style={{ marginBottom: 20 }}><ToggleRow title="Read receipts" description="Let people know when a message has been read." value={settings.readReceipts} onValueChange={v => toggle('readReceipts', v)}/><ToggleRow title="Hide message previews" description="Keep sensitive details out of notifications." value={settings.hidePreviews} onValueChange={v => toggle('hidePreviews', v)}/></Card><SectionTitle title="Safety"/><Card><Pressable onPress={() => Alert.alert('Blocked accounts', 'Blocked-user management will be backed by USER_BLOCKS in Supabase.')} style={{ paddingVertical: 12, ...line }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Blocked accounts</Text><Muted style={{ fontSize: 11, marginTop: 4 }}>Manage who can contact or discover you.</Muted></Pressable><Pressable onPress={() => Alert.alert('Privacy request', 'A secure export or deletion request will be created through the privacy-request workflow.')} style={{ paddingVertical: 12, ...line }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Download or delete my data</Text><Muted style={{ fontSize: 11, marginTop: 4 }}>Request a copy of your data or deletion of your account.</Muted></Pressable><Pressable onPress={() => Alert.alert('Security activity', 'Recent device and security events will be listed here when device registry is connected.')} style={{ paddingVertical: 12 }}><Text style={{ color: theme.colors.text, fontWeight: '800' }}>Devices and security activity</Text><Muted style={{ fontSize: 11, marginTop: 4 }}>Review active devices and revoke access.</Muted></Pressable></Card><Button title="Save privacy settings" onPress={() => Alert.alert('Saved locally', 'Settings will persist locally in this prototype. Next, we will connect them to Supabase and native enforcement.')} style={{ marginTop: 20 }}/><Button title="Sign out" variant="ghost" icon="log-out-outline" onPress={p.onSignOut} style={{ marginTop: 10 }}/></Screen>;
}

export function FeatureScreen(p: FeatureProps) {
  const presence = useWavesPresence();
  const screenProps: FeatureProps = { ...p, onlineUserIds: presence.onlineUserIds, presenceReady: presence.ready, ownStatusVisible: presence.ownStatusVisible, setOwnOnlineStatus: presence.setOwnStatusVisible };
  switch (screenProps.route) {
    case 'DatingProfile': return <DatingProfileScreen {...screenProps}/>;
    case 'Match': return <MatchScreen {...screenProps}/>;
    case 'Filters': return <FiltersScreen {...screenProps}/>;
    case 'Chat': case 'Chatting': return <ChatScreen {...screenProps}/>;
    case 'EditProfile': return <EditProfileScreen {...screenProps}/>;
    case 'Map': return <NearbyMapScreen {...screenProps}/>;
    case 'ClubDirectory': return <ClubDirectoryScreen {...screenProps}/>;
    case 'ClubActivity': return <ClubActivityScreen {...screenProps}/>;
    case 'LiveDiscovery': return <LiveDiscoveryScreen {...screenProps}/>;
    case 'LiveRoom': return <LiveRoomScreen {...screenProps}/>;
    case 'CreatorProfile': return <CreatorProfileScreen {...screenProps}/>;
    case 'CreatorDashboard': return <CreatorDashboardScreen {...screenProps}/>;
    case 'Wallet': return <WalletScreen {...screenProps}/>;
    case 'Settings': return <SettingsScreen {...screenProps}/>;
    default: return <Screen><EmptyState icon="construct-outline" title="Coming soon" body={`The ${screenProps.route} experience is included in the product plan and will be implemented in the next development pass.`} action="Go back" onAction={screenProps.goBack}/></Screen>;
  }
}
