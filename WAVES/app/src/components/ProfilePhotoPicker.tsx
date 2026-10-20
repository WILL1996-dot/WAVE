import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import {
  getPrivateImageSource,
  removeOwnPrivateImage,
  uploadPrivateImage,
} from '../lib/media';
import { photos } from '../data/mock';
import { theme } from '../theme';

export type ProfilePhotoPickerProps = {
  /** Storage path saved in profiles.avatar_path, not a public URL. */
  currentPath?: string | null;
  fallbackSource?: ImageSourcePropType;
  onAvatarSaved?: (path: string, source: ImageSourcePropType) => void;
};

/**
 * Uploads a selected image to private WAVES Storage and saves its path in
 * profiles.avatar_path. If currentPath is omitted, it loads the signed-in
 * user's saved avatar path from Supabase automatically.
 */
export function ProfilePhotoPicker({
  currentPath,
  fallbackSource = photos.alex,
  onAvatarSaved,
}: ProfilePhotoPickerProps) {
  const [photoSource, setPhotoSource] = useState<ImageSourcePropType>(fallbackSource);
  const [savedPath, setSavedPath] = useState<string | null>(currentPath ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentPhoto = async () => {
      let path = currentPath;

      // When the parent does not pass a path, retrieve the user's saved path.
      if (path === undefined) {
        if (!supabase) {
          if (!cancelled) {
            setSavedPath(null);
            setPhotoSource(fallbackSource);
          }
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          if (!cancelled) {
            setSavedPath(null);
            setPhotoSource(fallbackSource);
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('avatar_path')
          .eq('id', authData.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        path = profile?.avatar_path ?? null;
      }

      if (cancelled) return;
      setSavedPath(path ?? null);

      if (!path) {
        setPhotoSource(fallbackSource);
        return;
      }

      const source = await getPrivateImageSource(path);
      if (!cancelled) setPhotoSource(source ?? fallbackSource);
    };

    void loadCurrentPhoto().catch(() => {
      if (!cancelled) {
        setSavedPath(currentPath ?? null);
        setPhotoSource(fallbackSource);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentPath, fallbackSource]);

  const choosePhoto = async () => {
    if (busy) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      if (!supabase) {
        Alert.alert(
          'Supabase unavailable',
          'Sign-in and private media storage must be configured before saving a profile photo.',
        );
        return;
      }

      setBusy(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error('Please sign in again before changing your profile photo.');

      const previousPath = savedPath ?? currentPath ?? null;
      const newPath = await uploadPrivateImage(result.assets[0], user.id, 'profiles');
      const newSource = await getPrivateImageSource(newPath);

      if (!newSource) {
        await removeOwnPrivateImage(newPath, user.id).catch(() => undefined);
        throw new Error(
          'The image uploaded, but WAVES could not create a secure preview link. Check the Storage SQL policies and try again.',
        );
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_path: newPath })
        .eq('id', user.id)
        .select('avatar_path')
        .single();

      if (updateError || !updatedProfile) {
        await removeOwnPrivateImage(newPath, user.id).catch(() => undefined);
        throw updateError ?? new Error('WAVES could not save your profile photo path.');
      }

      setSavedPath(newPath);
      setPhotoSource(newSource);
      onAvatarSaved?.(newPath, newSource);

      // Remove the old file only after the replacement is successfully saved.
      if (previousPath && previousPath !== newPath) {
        await removeOwnPrivateImage(previousPath, user.id).catch(() => undefined);
      }

      Alert.alert('Profile photo updated', 'Your profile photo is saved in private WAVES storage.');
    } catch (error) {
      Alert.alert(
        'Could not update profile photo',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 108,
          height: 108,
          borderRadius: 54,
          borderWidth: 2,
          borderColor: theme.colors.coral,
          padding: 3,
          backgroundColor: theme.colors.surface2,
        }}
      >
        <Image
          source={photoSource}
          resizeMode="cover"
          style={{ width: '100%', height: '100%', borderRadius: 50 }}
        />
        {busy ? (
          <View
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              bottom: 3,
              left: 3,
              borderRadius: 50,
              backgroundColor: 'rgba(0,0,0,0.55)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator color={theme.colors.white} />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => void choosePhoto()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface2,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity: busy ? 0.65 : pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '800' }}>
          {busy ? 'Saving photo…' : 'Change profile photo'}
        </Text>
      </Pressable>
      <Text style={{ color: theme.colors.subtle, fontSize: 10, textAlign: 'center' }}>
        Private upload · JPEG, PNG, WebP, HEIC or HEIF · Up to 8 MB
      </Text>
    </View>
  );
}
