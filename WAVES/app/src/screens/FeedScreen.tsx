import React, { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { uploadPrivateImage, getPrivateImageSource } from '../lib/media';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Card,
  Eyebrow,
  Heading,
  IconButton,
  Logo,
  Muted,
  Pill,
  Screen,
  SectionTitle,
} from '../components/UI';
import { clubs, photos } from '../data/mock';
import { AppTab, theme, Zone } from '../theme';

const POST_MEDIA_BUCKET = 'waves-post-media';
const MAX_POST_IMAGE_BYTES = 8 * 1024 * 1024;

type FeedComment = { id: string; name: string; body: string };

type FeedPost = {
  id: string;
  name: string;
  handle: string;
  time: string;
  avatar: any;
  caption: string;
  photo?: any;
  likes: number;
  comments: FeedComment[];
  liked: boolean;
  zone: Zone;
};

type Story = {
  id: string;
  name: string;
  avatar: any;
  photo: any;
  seen?: boolean;
  own?: boolean;
  caption: string;
  zone: Zone;
};

const initialStories: Story[] = [
  {
    id: 'own',
    name: 'Your Story',
    avatar: photos.alex,
    photo: photos.alex,
    own: true,
    zone: 'casual',
    caption: 'Share a moment with your people.',
  },
  {
    id: 'nova',
    name: 'Nova',
    avatar: photos.nova,
    photo: photos.nova,
    zone: 'hot',
    caption: 'Soundcheck is done. See you tonight.',
  },
  {
    id: 'maya',
    name: 'Maya',
    avatar: photos.maya,
    photo: photos.couple,
    zone: 'casual',
    caption: 'A little sunshine and a good playlist.',
  },
  {
    id: 'amara',
    name: 'Amara',
    avatar: photos.creator2,
    photo: photos.creator2,
    zone: 'casual',
    caption: 'Collecting colors from the city.',
  },
  {
    id: 'eli',
    name: 'Eli',
    avatar: photos.creator3,
    photo: photos.room,
    seen: true,
    zone: 'hot',
    caption: 'The weekend listening room is ready.',
  },
];

const seedPosts: FeedPost[] = [
  {
    id: 'post-coffee',
    name: 'Sarah Jenkins',
    handle: '@sarah.j',
    time: '2h ago',
    avatar: photos.creator2,
    caption:
      'Found a little coffee spot with the kind of music that makes you forget to check your phone. ☕️✨',
    photo: photos.room,
    likes: 124,
    liked: false,
    zone: 'casual',
    comments: [
      { id: 'c1', name: 'Maya', body: 'Adding this to my weekend list.' },
      { id: 'c2', name: 'Eli', body: 'Good coffee and good records. Perfect.' },
    ],
  },
  {
    id: 'post-music',
    name: 'Nova Reed',
    handle: '@novareed',
    time: '4h ago',
    avatar: photos.nova,
    caption:
      'Tonight is for warm grooves, new friends and a little room to breathe. I will see you in the listening room. 🎧',
    photo: photos.nova,
    likes: 89,
    liked: false,
    zone: 'hot',
    comments: [{ id: 'c3', name: 'Amara', body: 'Already saved my seat.' }],
  },
  {
    id: 'post-weekend',
    name: 'Alex Morgan',
    handle: '@alexm',
    time: 'Yesterday',
    avatar: photos.alex,
    caption:
      'A reminder to make plans with people who make ordinary days feel like something special.',
    photo: photos.couple,
    likes: 56,
    liked: false,
    zone: 'casual',
    comments: [
      { id: 'c4', name: 'Sarah', body: 'This is your sign to make the plan.' },
    ],
  },
];

export type FeedScreenProps = {
  zone: Zone;
  setTab: (tab: AppTab) => void;
  navigate: (route: string) => void;
  setSelectedClub: (club: (typeof clubs)[number]) => void;
};

export function FeedScreen({
  zone,
  setTab,
  navigate,
  setSelectedClub,
}: FeedScreenProps) {
  const [feedType, setFeedType] = useState<'for-you' | 'clubs'>('for-you');
  const [posts, setPosts] = useState<FeedPost[]>(supabase ? [] : seedPosts);
  const [stories, setStories] = useState<Story[]>(
    supabase ? [] : initialStories,
  );
  const [loadingPosts, setLoadingPosts] = useState(Boolean(supabase));
  const [myAvatar, setMyAvatar] = useState<any>(photos.alex);
  const [publishing, setPublishing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'post' | 'story'>('post');
  const [caption, setCaption] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePickerAsset | null>(null);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Poll the user's unread alert count every 15 seconds. The app uses private
  // Realtime channels for presence, so the home badge deliberately keeps this
  // database polling fallback instead of opening a public channel.
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setUnreadNotificationCount(0);
      return;
    }

    let cancelled = false;
    let userId: string | null = null;

    const refreshUnreadCount = async () => {
      try {
        if (!userId) {
          const { data, error } = await client.auth.getUser();
          if (error || !data.user) {
            if (!cancelled) setUnreadNotificationCount(0);
            return;
          }
          userId = data.user.id;
        }

        const { count, error } = await client
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('read_at', null);

        if (!error && !cancelled) setUnreadNotificationCount(count ?? 0);
      } catch {
        // Keep the latest known badge value after a temporary network failure.
      }
    };

    void refreshUnreadCount();
    const pollId = setInterval(() => void refreshUnreadCount(), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoadingPosts(false);
      setStories(initialStories);
      return;
    }

    let cancelled = false;

    const loadFeed = async () => {
      setLoadingPosts(true);

      try {
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError) throw authError;

        const currentUser = authData.user;
        if (!currentUser) {
          if (!cancelled) {
            setPosts([]);
            setStories([]);
            setMyAvatar(photos.alex);
          }
          return;
        }

        const [postResult, storyResult] = await Promise.all([
          client
            .from('posts')
            .select('id, author_id, zone, caption, media_path, created_at')
            .eq('zone', zone)
            .order('created_at', { ascending: false })
            .limit(50),
          client
            .from('stories')
            .select('id, author_id, zone, caption, media_path, created_at, expires_at')
            .eq('zone', zone)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        if (postResult.error) throw postResult.error;
        if (storyResult.error) throw storyResult.error;

        const rows = postResult.data ?? [];
        const storyRows = storyResult.data ?? [];
        const postIds = rows.map(post => post.id);

        let commentRows: any[] = [];
        let reactionRows: any[] = [];
        if (postIds.length) {
          const [commentsResult, reactionsResult] = await Promise.all([
            client
              .from('post_comments')
              .select('id, post_id, author_id, body, created_at')
              .in('post_id', postIds)
              .order('created_at', { ascending: true }),
            client
              .from('post_reactions')
              .select('post_id, user_id, reaction_type')
              .in('post_id', postIds)
              .eq('reaction_type', 'like'),
          ]);
          if (commentsResult.error) throw commentsResult.error;
          if (reactionsResult.error) throw reactionsResult.error;
          commentRows = commentsResult.data ?? [];
          reactionRows = reactionsResult.data ?? [];
        }

        const profileIds = Array.from(new Set<string>([
          currentUser.id,
          ...rows.map(post => post.author_id),
          ...storyRows.map(story => story.author_id),
          ...commentRows.map(comment => comment.author_id),
        ]));

        const { data: profileRows, error: profileError } = await client
          .from('profiles')
          .select('id, display_name, username, avatar_path')
          .in('id', profileIds);
        if (profileError) throw profileError;

        const profiles = new Map<string, {
          displayName: string;
          handle: string;
          avatarPath: string | null;
        }>();
        for (const profile of profileRows ?? []) {
          profiles.set(profile.id, {
            displayName: profile.display_name || 'WAVES Member',
            handle: profile.username ? `@${profile.username}` : '@waves',
            avatarPath: profile.avatar_path || null,
          });
        }

        // Generate short-lived URLs only for image paths attached to rows the
        // signed-in user can already read through the database's RLS policies.
        const mediaPaths = Array.from(new Set<string>([
          ...rows.map(post => post.media_path).filter(Boolean),
          ...storyRows.map(story => story.media_path).filter(Boolean),
          ...(profileRows ?? []).map(profile => profile.avatar_path).filter(Boolean),
        ]));
        const imageSources = new Map<string, { uri: string }>();
        const signedSources = await Promise.all(mediaPaths.map(async path => {
          const source = await getPrivateImageSource(path);
          return source ? [path, source] as const : null;
        }));
        for (const source of signedSources) {
          if (source) imageSources.set(source[0], source[1]);
        }

        const ownProfile = profiles.get(currentUser.id);
        const ownAvatar = ownProfile?.avatarPath
          ? imageSources.get(ownProfile.avatarPath)
          : undefined;

        const commentsByPost = new Map<string, FeedComment[]>();
        for (const comment of commentRows) {
          const author = profiles.get(comment.author_id);
          const list = commentsByPost.get(comment.post_id) ?? [];
          list.push({
            id: comment.id,
            name: author?.displayName ?? 'WAVES Member',
            body: comment.body,
          });
          commentsByPost.set(comment.post_id, list);
        }

        const likesByPost = new Map<string, number>();
        const likedPostIds = new Set<string>();
        for (const reaction of reactionRows) {
          likesByPost.set(
            reaction.post_id,
            (likesByPost.get(reaction.post_id) ?? 0) + 1,
          );
          if (reaction.user_id === currentUser.id) likedPostIds.add(reaction.post_id);
        }

        const mappedPosts: FeedPost[] = rows.map(post => {
          const author = profiles.get(post.author_id);
          return {
            id: post.id,
            name: author?.displayName ?? 'WAVES Member',
            handle: author?.handle ?? '@waves',
            time: new Date(post.created_at).toLocaleString(),
            avatar: (author?.avatarPath && imageSources.get(author.avatarPath)) || photos.alex,
            caption: post.caption,
            photo: post.media_path ? imageSources.get(post.media_path) : undefined,
            likes: likesByPost.get(post.id) ?? 0,
            comments: commentsByPost.get(post.id) ?? [],
            liked: likedPostIds.has(post.id),
            zone: post.zone as Zone,
          };
        });

        const mappedStories: Story[] = storyRows.map(story => {
          const author = profiles.get(story.author_id);
          return {
            id: story.id,
            name: story.author_id === currentUser.id ? 'You' : (author?.displayName ?? 'WAVES Member'),
            avatar: (author?.avatarPath && imageSources.get(author.avatarPath)) || photos.alex,
            photo: (story.media_path && imageSources.get(story.media_path)) || photos.alex,
            caption: story.caption || 'A moment from WAVES.',
            zone: story.zone as Zone,
            seen: false,
            own: false,
          };
        });

        const ownStory: Story = {
          ...initialStories[0],
          avatar: ownAvatar || photos.alex,
          photo: ownAvatar || photos.alex,
        };

        if (!cancelled) {
          setPosts(mappedPosts);
          setStories([ownStory, ...mappedStories]);
          setMyAvatar(ownAvatar || photos.alex);
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert(
            'Could not load your feed',
            error instanceof Error ? error.message : 'Please try again.',
          );
        }
      } finally {
        if (!cancelled) setLoadingPosts(false);
      }
    };

    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, [zone]);

  const visiblePosts = useMemo(
    () => posts.filter(post => post.zone === zone),
    [posts, zone],
  );
  const visibleStories = useMemo(
    () => stories.filter(story => story.own || story.zone === zone),
    [stories, zone],
  );
  const commentPost = useMemo(
    () => posts.find(post => post.id === commentPostId) || null,
    [posts, commentPostId],
  );

  const startComposer = (type: 'post' | 'story') => {
    setComposerType(type);
    setCaption('');
    setSelectedPhoto(null);
    setCreateVisible(false);
    setComposerOpen(true);
  };

  const pickPhoto = async () => {
    try {
      // Expo's system picker grants access to the selected image without
      // requiring WAVES to browse the user's entire photo library.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_POST_IMAGE_BYTES) {
        Alert.alert(
          'Image is too large',
          'Please choose an image smaller than 8 MB.',
        );
        return;
      }

      setSelectedPhoto(asset);
    } catch (error) {
      Alert.alert(
        'Could not open photos',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const publish = async () => {
    if (publishing) return;
    const cleanCaption = caption.trim();

    if (!cleanCaption && !selectedPhoto) {
      Alert.alert('Add something to share', 'Write a caption or choose a photo before publishing.');
      return;
    }

    if (!supabase) {
      if (composerType === 'story') {
        const localStory: Story = {
          id: `story-${Date.now()}`,
          name: 'You',
          avatar: myAvatar,
          photo: selectedPhoto ? { uri: selectedPhoto.uri } : myAvatar,
          own: false,
          zone,
          caption: cleanCaption || 'A new moment from WAVES.',
        };
        setStories(current => [current[0] ?? initialStories[0], localStory, ...current.slice(1)]);
      } else {
        const localPost: FeedPost = {
          id: `post-${Date.now()}`,
          name: 'You',
          handle: '@yourwaves',
          time: 'Just now',
          avatar: myAvatar,
          caption: cleanCaption,
          photo: selectedPhoto ? { uri: selectedPhoto.uri } : undefined,
          likes: 0,
          liked: false,
          comments: [],
          zone,
        };
        setPosts(current => [localPost, ...current]);
      }
      setFeedType('for-you');
      setComposerOpen(false);
      setCaption('');
      setSelectedPhoto(null);
      Alert.alert('Local preview', 'Supabase is not configured, so this item will not persist after an app reload.');
      return;
    }

    setPublishing(true);
    let uploadedPath: string | null = null;
    let savedRow = false;

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in again before publishing.');
        return;
      }

      const purpose = composerType === 'story' ? 'stories' : 'posts';
      const mediaPath = selectedPhoto
        ? await uploadPrivateImage(selectedPhoto, user.id, purpose)
        : null;
      uploadedPath = mediaPath;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_path')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const avatarSource = await getPrivateImageSource(profile?.avatar_path || null);
      const nextAvatar = avatarSource || myAvatar || photos.alex;

      if (composerType === 'story') {
        const { data: savedStory, error: storyError } = await supabase
          .from('stories')
          .insert({
            author_id: user.id,
            zone,
            caption: cleanCaption,
            audience: 'public',
            media_path: mediaPath,
          })
          .select('id, author_id, zone, caption, media_path, created_at, expires_at')
          .single();
        if (storyError) throw storyError;
        savedRow = true;

        const storyPhoto = savedStory.media_path
          ? await getPrivateImageSource(savedStory.media_path)
          : null;
        const newStory: Story = {
          id: savedStory.id,
          name: profile?.display_name || 'You',
          avatar: nextAvatar,
          photo: storyPhoto || nextAvatar,
          own: false,
          zone: savedStory.zone as Zone,
          caption: savedStory.caption || 'A moment from WAVES.',
        };
        setStories(current => [current[0] ?? initialStories[0], newStory, ...current.slice(1).filter(item => item.id !== newStory.id)]);
        Alert.alert('Story published', 'Your story is saved in Supabase and its image is stored privately. Stories stop appearing after 24 hours.');
      } else {
        const { data: savedPost, error: saveError } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            zone,
            caption: cleanCaption,
            audience: 'public',
            media_path: mediaPath,
          })
          .select('id, author_id, zone, caption, media_path, created_at')
          .single();
        if (saveError) throw saveError;
        savedRow = true;

        const postPhoto = savedPost.media_path
          ? await getPrivateImageSource(savedPost.media_path)
          : undefined;
        const newPost: FeedPost = {
          id: savedPost.id,
          name: profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'You',
          handle: profile?.username ? `@${profile.username}` : '@you',
          time: 'Just now',
          avatar: nextAvatar,
          caption: savedPost.caption,
          photo: postPhoto || undefined,
          likes: 0,
          liked: false,
          comments: [],
          zone: savedPost.zone as Zone,
        };
        setPosts(current => [newPost, ...current.filter(post => post.id !== newPost.id)]);
        setFeedType('for-you');
        Alert.alert(
          'Post published',
          selectedPhoto
            ? 'Your post and photo were saved to WAVES in private storage.'
            : 'Your post was saved to Supabase and should remain after you reload the app.',
        );
      }

      setMyAvatar(nextAvatar);
      setComposerOpen(false);
      setCaption('');
      setSelectedPhoto(null);
    } catch (error) {
      if (uploadedPath && !savedRow) {
        await supabase.storage.from(POST_MEDIA_BUCKET).remove([uploadedPath]).catch(() => undefined);
      }
      Alert.alert(
        composerType === 'story' ? 'Could not publish story' : 'Could not publish post',
        error instanceof Error ? error.message : 'Please check your connection and Supabase Storage policies, then try again.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const toggleLike = (postId: string) => {
    setPosts(current =>
      current.map(post =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post,
      ),
    );
  };

  const sendComment = () => {
    if (!commentPostId || !commentDraft.trim()) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      name: 'You',
      body: commentDraft.trim(),
    };

    setPosts(current =>
      current.map(post =>
        post.id === commentPostId
          ? { ...post, comments: [...post.comments, newComment] }
          : post,
      ),
    );
    setCommentDraft('');
  };

  const openLive = () => {
    setCreateVisible(false);

    if (zone !== 'hot') {
      Alert.alert(
        'Hot Zone required',
        'Switch to Hot Zone first. WAVES checks adult eligibility before allowing access to Hot Zone features.',
      );
      setTab('Hot');
      return;
    }

    navigate('CreatorDashboard');
  };

  return (
    <Screen padded={false}>
      <View
        style={{
          paddingHorizontal: 17,
          paddingTop: 4,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 15,
          }}
        >
          <Logo />
          <View style={{ flexDirection: 'row', gap: 7 }}>
            <IconButton
              icon="location-outline"
              onPress={() => navigate('Map')}
              size={38}
            />
            <View style={{ width: 38, height: 38, position: 'relative' }}>
              <IconButton
                icon="notifications-outline"
                onPress={() => setTab('Alerts')}
                size={38}
              />
              {unreadNotificationCount > 0 ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 4,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.coral,
                    borderWidth: 2,
                    borderColor: theme.colors.background,
                    zIndex: 2,
                  }}
                >
                  <Text
                    style={{
                      color: '#211216',
                      fontSize: 9,
                      lineHeight: 11,
                      fontWeight: '900',
                    }}
                  >
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 17,
            padding: 9,
          }}
        >
          <Avatar source={myAvatar} size={37} />
          <Pressable
            onPress={() => startComposer('post')}
            style={{ flex: 1, minHeight: 38, justifyContent: 'center' }}
          >
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Share a thought, moment or story...
            </Text>
          </Pressable>
          <IconButton
            icon="add-circle"
            color={theme.colors.coral}
            background="transparent"
            onPress={() => setCreateVisible(true)}
            size={36}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.surface2,
            padding: 4,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginTop: 14,
          }}
        >
          {(
            [
              { id: 'for-you', label: 'For You', icon: 'sparkles-outline' },
              { id: 'clubs', label: 'Clubs', icon: 'people-outline' },
            ] as const
          ).map(item => {
            const active = feedType === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => setFeedType(item.id)}
                style={{
                  flex: 1,
                  borderRadius: 24,
                  backgroundColor: active
                    ? theme.colors.surface3
                    : 'transparent',
                  paddingVertical: 10,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={active ? theme.colors.text : theme.colors.subtle}
                />
                <Text
                  style={{
                    color: active ? theme.colors.text : theme.colors.muted,
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {feedType === 'for-you' ? (
          <>
            <View
              style={{
                paddingTop: 16,
                paddingBottom: 15,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 17,
                  marginBottom: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <SectionTitle
                  title="Stories"
                  action="Share"
                  onAction={() => startComposer('story')}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
              >
                {visibleStories.map(story => (
                  <Pressable
                    key={story.id}
                    onPress={() =>
                      story.own
                        ? startComposer('story')
                        : setActiveStory(story)
                    }
                    style={{ width: 66, alignItems: 'center', gap: 6 }}
                  >
                    <View
                      style={{
                        padding: 2,
                        borderRadius: 40,
                        borderWidth: story.seen ? 1 : 2,
                        borderColor: story.seen
                          ? theme.colors.border
                          : story.own
                            ? theme.colors.coral
                            : theme.colors.violet,
                      }}
                    >
                      <Image
                        source={story.avatar}
                        style={{
                          width: 57,
                          height: 57,
                          borderRadius: 30,
                          borderWidth: 2,
                          borderColor: theme.colors.background,
                        }}
                      />
                      {story.own ? (
                        <View
                          style={{
                            position: 'absolute',
                            right: -1,
                            bottom: 0,
                            width: 20,
                            height: 20,
                            borderRadius: 11,
                            backgroundColor: theme.colors.coral,
                            borderWidth: 2,
                            borderColor: theme.colors.background,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="add" size={14} color="#211216" />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.muted,
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {story.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={{ paddingHorizontal: 12, paddingTop: 13 }}>
              {loadingPosts ? (
                <View
                  style={{ alignItems: 'center', paddingVertical: 28 }}
                >
                  <ActivityIndicator color={theme.colors.coral} />
                  <Muted style={{ marginTop: 10 }}>
                    Loading your feed...
                  </Muted>
                </View>
              ) : null}

              {visiblePosts.map(post => (
                <Card
                  key={post.id}
                  style={{ padding: 13, marginBottom: 12 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 11,
                    }}
                  >
                    <Avatar
                      source={post.avatar}
                      size={42}
                      online={post.name === 'Nova Reed'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontWeight: '800',
                          fontSize: 12,
                        }}
                      >
                        {post.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.subtle,
                          fontSize: 10,
                          marginTop: 3,
                        }}
                      >
                        {post.handle} · {post.time} ·{' '}
                        {post.zone === 'casual' ? 'Casual Zone' : 'Hot Zone'}
                      </Text>
                    </View>
                    <IconButton
                      icon="ellipsis-horizontal"
                      onPress={() =>
                        Alert.alert(
                          'Post options',
                          'Report, block and hide actions will be connected to the moderation service.',
                        )
                      }
                      size={32}
                      background="transparent"
                      color={theme.colors.muted}
                    />
                  </View>

                  {post.caption ? (
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 13,
                        lineHeight: 20,
                        marginBottom: post.photo ? 12 : 4,
                      }}
                    >
                      {post.caption}
                    </Text>
                  ) : null}

                  {post.photo ? (
                    <Image
                      source={post.photo}
                      resizeMode="cover"
                      style={{
                        width: '100%',
                        height: 225,
                        borderRadius: 16,
                        marginBottom: 12,
                      }}
                    />
                  ) : null}

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderTopWidth: 1,
                      borderColor: theme.colors.border,
                      paddingTop: 10,
                      gap: 15,
                    }}
                  >
                    <Pressable
                      onPress={() => toggleLike(post.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Ionicons
                        name={post.liked ? 'heart' : 'heart-outline'}
                        color={
                          post.liked
                            ? theme.colors.coral
                            : theme.colors.muted
                        }
                        size={20}
                      />
                      <Text
                        style={{
                          color: post.liked
                            ? theme.colors.coral
                            : theme.colors.muted,
                          fontSize: 11,
                        }}
                      >
                        {post.likes}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setCommentPostId(post.id);
                        setCommentDraft('');
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        color={theme.colors.muted}
                        size={19}
                      />
                      <Text
                        style={{ color: theme.colors.muted, fontSize: 11 }}
                      >
                        {post.comments.length}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          'Share post',
                          'Sharing will use a permission-aware in-app share flow when connected. Protected content is not exported to the clipboard.',
                        )
                      }
                      style={{ marginLeft: 'auto' }}
                    >
                      <Ionicons
                        name="share-social-outline"
                        color={theme.colors.muted}
                        size={19}
                      />
                    </Pressable>
                  </View>
                </Card>
              ))}

              {!loadingPosts && visiblePosts.length === 0 ? (
                <View
                  style={{ paddingVertical: 35, alignItems: 'center' }}
                >
                  <Ionicons
                    name="leaf-outline"
                    color={theme.colors.subtle}
                    size={28}
                  />
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: '800',
                      marginTop: 9,
                    }}
                  >
                    Your feed is clear
                  </Text>
                  <Muted style={{ fontSize: 11, marginTop: 4 }}>
                    Be the first to share a moment in this zone.
                  </Muted>
                  <Button
                    title="Create a post"
                    compact
                    onPress={() => startComposer('post')}
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 17 }}>
            <Eyebrow>COMMUNITIES</Eyebrow>
            <Heading size={26}>Your people, your places.</Heading>
            <Muted style={{ marginTop: 6, marginBottom: 16 }}>
              Join communities around music, creativity, culture and shared
              interests.
            </Muted>
            <SectionTitle
              title="Your Clubs"
              action="Explore all"
              onAction={() => navigate('ClubDirectory')}
            />

            {clubs.map(club => (
              <Pressable
                key={club.id}
                onPress={() => {
                  setSelectedClub(club);
                  navigate('ClubActivity');
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: 'row',
                  gap: 13,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 19,
                  padding: 12,
                  marginBottom: 12,
                })}
              >
                <Image
                  source={club.photo}
                  style={{ width: 80, height: 87, borderRadius: 13 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: 13,
                      fontWeight: '900',
                    }}
                  >
                    {club.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 10,
                      marginTop: 5,
                    }}
                  >
                    {club.category}
                  </Text>
                  <Text
                    style={{
                      color: club.live
                        ? theme.colors.success
                        : theme.colors.subtle,
                      fontSize: 10,
                      fontWeight: '800',
                      marginTop: 7,
                    }}
                  >
                    {club.live ? `● ${club.liveText}` : club.liveText}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.subtle,
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    {club.members}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={theme.colors.subtle}
                  style={{ alignSelf: 'center' }}
                />
              </Pressable>
            ))}

            <Button
              title="Browse all Club Zones"
              icon="people-outline"
              variant="secondary"
              onPress={() => navigate('ClubDirectory')}
              style={{ marginTop: 3 }}
            />
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => setCreateVisible(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 18,
          bottom: 22,
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.coral,
          shadowColor: theme.colors.coral,
          shadowOpacity: 0.22,
          shadowRadius: 10,
          elevation: 8,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Ionicons name="add" size={28} color="#211216" />
      </Pressable>

      <Modal
        visible={createVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.70)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={() => setCreateVisible(false)}
            style={{ flex: 1 }}
          />
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 21,
              paddingBottom: 28,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <Heading size={21}>Create on WAVES</Heading>
              <IconButton
                icon="close"
                onPress={() => setCreateVisible(false)}
                size={34}
              />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                {
                  title: 'Post',
                  subtitle: 'Share with your people',
                  icon: 'image-outline' as const,
                  tint: theme.colors.coral,
                  action: () => startComposer('post'),
                },
                {
                  title: 'Story',
                  subtitle: 'A moment for 24 hours',
                  icon: 'albums-outline' as const,
                  tint: theme.colors.violet,
                  action: () => startComposer('story'),
                },
                {
                  title: 'Go Live',
                  subtitle: 'Start a Hot Zone stream',
                  icon: 'radio-outline' as const,
                  tint: theme.colors.danger,
                  action: openLive,
                },
                {
                  title: 'Club Room',
                  subtitle: 'Meet your community',
                  icon: 'people-outline' as const,
                  tint: theme.colors.mint,
                  action: () => {
                    setCreateVisible(false);
                    navigate('ClubDirectory');
                  },
                },
                {
                  title: 'Casual Boost',
                  subtitle: 'Update discovery preferences',
                  icon: 'flame-outline' as const,
                  tint: theme.colors.yellow,
                  action: () => {
                    setCreateVisible(false);
                    setTab('Casual');
                    navigate('Filters');
                  },
                },
              ].map(item => (
                <Pressable
                  key={item.title}
                  onPress={item.action}
                  style={{
                    width: '48%',
                    flexGrow: 1,
                    minHeight: 126,
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: theme.colors.surface2,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: item.tint + '22',
                      marginBottom: 11,
                    }}
                  >
                    <Ionicons name={item.icon} size={22} color={item.tint} />
                  </View>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: '900',
                      fontSize: 13,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.muted,
                      fontSize: 10,
                      lineHeight: 15,
                      marginTop: 4,
                    }}
                  >
                    {item.subtitle}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Muted style={{ fontSize: 10, marginTop: 14 }}>
              Creation actions are local previews until storage, feed APIs and
              live providers are connected.
            </Muted>
          </View>
        </View>
      </Modal>

      <Modal
        visible={composerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposerOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            paddingTop: 54,
            paddingHorizontal: 18,
            paddingBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <IconButton
              icon="close"
              onPress={() => setComposerOpen(false)}
            />
            <Heading size={20}>
              {composerType === 'post' ? 'Create a post' : 'Create a story'}
            </Heading>
            <Pressable onPress={publish}>
              <Text style={{ color: theme.colors.coral, fontWeight: '900' }}>
                Share
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              marginBottom: 16,
            }}
          >
            <Avatar source={myAvatar} size={45} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '900' }}>
                You
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 11 }}>
                {zone === 'casual' ? 'Casual Zone' : 'Hot Zone'} ·{' '}
                {composerType === 'story'
                  ? 'Expires in 24 hours'
                  : 'Feed post'}
              </Text>
            </View>
            <Pill active>
              {composerType === 'story'
                ? 'Story'
                : zone === 'casual'
                  ? 'Friends'
                  : 'Hot Zone'}
            </Pill>
          </View>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={
              composerType === 'post'
                ? 'What would you like to share?'
                : 'Add a caption to your story...'
            }
            placeholderTextColor={theme.colors.subtle}
            multiline
            contextMenuHidden
            selectTextOnFocus={false}
            style={{
              minHeight: 135,
              borderRadius: 17,
              padding: 15,
              color: theme.colors.text,
              fontSize: 15,
              lineHeight: 22,
              textAlignVertical: 'top',
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          />

          {selectedPhoto ? (
            <Image
              source={{ uri: selectedPhoto.uri }}
              resizeMode="cover"
              style={{
                height: 180,
                width: '100%',
                borderRadius: 16,
                marginTop: 13,
              }}
            />
          ) : null}

          <Pressable
            onPress={() => void pickPhoto()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: theme.colors.coralTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={selectedPhoto ? 'checkmark-circle' : 'image-outline'}
                size={21}
                color={theme.colors.coral}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                {selectedPhoto ? 'Photo selected' : 'Choose a photo'}
              </Text>
              <Muted style={{ fontSize: 10 }}>
                {selectedPhoto
                  ? 'Tap to choose a different image.'
                  : 'Select an image from your device. Images up to 8 MB are supported.'}
              </Muted>
            </View>
            <Ionicons
              name="add-circle-outline"
              size={21}
              color={theme.colors.muted}
            />
          </Pressable>

          {selectedPhoto ? (
            <Pressable
              onPress={() => setSelectedPhoto(null)}
              style={{ alignSelf: 'flex-start', paddingTop: 10 }}
            >
              <Text style={{ color: theme.colors.coral, fontSize: 12, fontWeight: '800' }}>
                Remove photo
              </Text>
            </Pressable>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Button
              title={publishing ? 'Saving…' : composerType === 'post' ? 'Publish post' : 'Publish story'}
              onPress={() => void publish()}
              style={{ flex: 1 }}
              icon="paper-plane-outline"
            />
            <Button
              title="Cancel"
              onPress={() => setComposerOpen(false)}
              variant="secondary"
            />
          </View>
          <Muted style={{ fontSize: 10, marginTop: 12 }}>
            Do not share private information. Post and story photos upload to private storage when Supabase is configured.
          </Muted>
        </View>
      </Modal>

      <Modal
        visible={!!activeStory}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveStory(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {activeStory ? (
            <ImageBackground
              source={activeStory.photo}
              resizeMode="cover"
              style={{ flex: 1, justifyContent: 'space-between' }}
            >
              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  paddingTop: 52,
                  paddingHorizontal: 17,
                  paddingBottom: 15,
                }}
              >
                <View
                  style={{
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.60)',
                    marginBottom: 16,
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <Avatar source={activeStory.avatar} size={39} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontWeight: '900' }}>
                      {activeStory.name}
                    </Text>
                    <Text
                      style={{
                        color: '#E6E2EC',
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      WAVES Story · preview
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    onPress={() => setActiveStory(null)}
                    background="rgba(0,0,0,0.38)"
                  />
                </View>
              </View>

              <View
                style={{
                  backgroundColor: 'rgba(0,0,0,0.50)',
                  padding: 24,
                }}
              >
                <Heading size={24}>{activeStory.caption}</Heading>
                <Muted style={{ color: '#E8E5ED', marginTop: 8 }}>
                  This is a design preview. Story view receipts and expiry will
                  be backed by Supabase later.
                </Muted>
                <Button
                  title="Reply privately"
                  icon="chatbubble-outline"
                  onPress={() => {
                    setActiveStory(null);
                    setTab('Chat');
                  }}
                  style={{ marginTop: 18 }}
                />
              </View>
            </ImageBackground>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={!!commentPostId}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentPostId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.72)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              height: '72%',
              backgroundColor: theme.colors.background2,
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
              paddingHorizontal: 17,
              paddingTop: 17,
              paddingBottom: 18,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <Heading size={20}>Comments</Heading>
              <IconButton
                icon="close"
                onPress={() => setCommentPostId(null)}
                size={35}
              />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ gap: 15, paddingBottom: 14 }}
              keyboardShouldPersistTaps="handled"
            >
              {commentPost?.comments.map(comment => (
                <View
                  key={comment.id}
                  style={{ flexDirection: 'row', gap: 10 }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      backgroundColor: theme.colors.surface3,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.coral,
                        fontSize: 12,
                        fontWeight: '900',
                      }}
                    >
                      {comment.name.slice(0, 1)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, paddingTop: 2 }}>
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: '900',
                        fontSize: 12,
                      }}
                    >
                      {comment.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.muted,
                        fontSize: 12,
                        marginTop: 4,
                        lineHeight: 18,
                      }}
                    >
                      {comment.body}
                    </Text>
                  </View>
                </View>
              ))}
              {!commentPost?.comments.length ? (
                <Muted>Be the first to comment on this post.</Muted>
              ) : null}
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                gap: 9,
                alignItems: 'center',
                borderTopWidth: 1,
                borderColor: theme.colors.border,
                paddingTop: 12,
              }}
            >
              <TextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder="Write a comment..."
                placeholderTextColor={theme.colors.subtle}
                contextMenuHidden
                selectTextOnFocus={false}
                style={{
                  flex: 1,
                  minHeight: 44,
                  maxHeight: 90,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 15,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                }}
              />
              <IconButton
                icon="paper-plane"
                color="#201114"
                background={theme.colors.coral}
                onPress={sendComment}
                size={44}
              />
            </View>
            <Muted style={{ fontSize: 9, marginTop: 9 }}>
              Comments remain local to this demo until the posts/comments API
              is connected.
            </Muted>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
