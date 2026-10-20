import { registerGlobals } from '@livekit/react-native';
registerGlobals();
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, BackHandler, Linking, Platform, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Ionicons } from '@expo/vector-icons';
import { BasicProfile, BuildProfileScreen, ChooseZoneScreen, CreatePasswordScreen, LoginScreen, ResetPasswordScreen, SignUpScreen, UpdatePasswordScreen, VerifyEmailScreen, WelcomeScreen } from './src/screens/OnboardingScreens';
import { MainTabScreen } from './src/screens/MainScreens';
import { FeatureScreen } from './src/screens/FeatureScreens';
import { clubs, datingPeople, Person } from './src/data/mock';
import { AppTab, theme, Zone } from './src/theme';
import { supabase, supabaseConfigured } from './src/lib/supabase';



// Initialize LiveKit WebRTC before using LiveKit features.
registerGlobals();


const emptyProfile: BasicProfile = {
  firstName: '',
  email: '',
  dateOfBirth: '',
  displayName: '',
  bio: '',
  interests: [],
};

function isAdultDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0, 10) !== value) return false;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age >= 18 && birth <= now;
}

function CaptureGuard() {
  // Applies the strongest supported capture protection while the app is running.
  // Platform behavior differs; this cannot prevent an external camera or capture on a compromised device.
  usePreventScreenCapture('waves-global');
  return null;
}

function AppContent() {
  const [routeStack, setRouteStack] = useState<string[]>(['Welcome']);
  const [zone, setZone] = useState<Zone>('casual');
  const [tab, setTab] = useState<AppTab>('Feed');
  const [profile, setProfile] = useState<BasicProfile>(emptyProfile);
  const [selectedPerson, setSelectedPerson] = useState<Person>(datingPeople[0]);
  const [selectedClub, setSelectedClub] = useState<(typeof clubs)[number]>(clubs[0]);
  const [busy, setBusy] = useState(false);
  const [coverOnBackground, setCoverOnBackground] = useState(false);

  const route = routeStack[routeStack.length - 1] || 'Welcome';
  const demoMode = !supabaseConfigured;

  const goBack = useCallback(() => {
    setRouteStack(current => current.length > 1 ? current.slice(0, -1) : ['Main']);
  }, []);

  const updateProfile = useCallback((patch: Partial<BasicProfile>) => {
    setProfile(current => ({ ...current, ...patch }));
  }, []);

const saveProfileAndContinue = useCallback(async () => {
  if (busy) return;

  setBusy(true);

  try {
    if (supabase) {
      const { data: userResult, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userResult.user) {
        throw new Error(
          'Your session could not be verified. Please log in again.'
        );
      }

      const userId = userResult.user.id;

      const displayName = (
        profile.displayName ||
        profile.firstName ||
        'WAVES Member'
      ).trim().slice(0, 60);

      // Save public profile information.
      const { data: savedProfile, error: profileError } =
        await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            bio: profile.bio.trim().slice(0, 300),
            interests: profile.interests.slice(0, 30),
          })
          .eq('id', userId)
          .select('id')
          .maybeSingle();

      if (profileError) throw profileError;

      if (!savedProfile) {
        throw new Error(
          'Your profile record was not found. Please sign out, ' +
          'sign in again, and retry.'
        );
      }

      // Save the date of birth in the private account table.
      const { data: savedPrivateData, error: privateError } =
        await supabase
          .from('private_account_data')
          .update({
            date_of_birth: profile.dateOfBirth || null,
          })
          .eq('user_id', userId)
          .select('user_id')
          .maybeSingle();

      if (privateError) throw privateError;

      if (!savedPrivateData) {
        throw new Error(
          'Your private profile record was not found.'
        );
      }
    }

    // Continue locally in demo mode, or after a successful save.
    setRouteStack(current => [...current, 'ChooseZone']);
  } catch (error) {
    Alert.alert(
      'Could not save your profile',
      error instanceof Error
        ? error.message
        : 'Please try again.'
    );
  } finally {
    setBusy(false);
  }
}, [
  busy,
  profile.bio,
  profile.dateOfBirth,
  profile.displayName,
  profile.firstName,
 profile.interests,
]);

  const requestZoneChange = useCallback(async (nextZone: Zone) => {
    if (nextZone === 'hot') {
      if (!isAdultDate(profile.dateOfBirth)) {
        Alert.alert('Hot Zone is 18+', 'A valid adult date of birth is required.');
        return false;
      }
      if (supabase) {
        const { data: userResult, error: userError } = await supabase.auth.getUser();
        if (userError || !userResult.user) {
          Alert.alert('Sign in required', 'Sign in again to verify your Hot Zone access.');
          return false;
        }
        const { data: verification, error: verificationError } = await supabase
          .from('age_verifications')
          .select('status, expires_at, verified_at')
          .eq('user_id', userResult.user.id)
          .eq('status', 'verified')
          .order('verified_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const expired = verification?.expires_at ? new Date(verification.expires_at).getTime() <= Date.now() : false;
        if (verificationError || !verification || expired) {
          Alert.alert('Adult verification required', 'Hot Zone requires a successful adult eligibility check. Complete verification in your account before entering.');
          return false;
        }
      }
    }
    setZone(nextZone);
    return true;
  }, [profile.dateOfBirth]);

  const navigate = useCallback((next: string) => {
    const hotOnlyRoutes = new Set(['LiveDiscovery', 'LiveRoom', 'CreatorProfile', 'CreatorDashboard']);
    if (hotOnlyRoutes.has(next)) {
      void requestZoneChange('hot').then(allowed => {
        if (!allowed) return;
        setRouteStack(current => [...current, next]);
      });
      return;
    }
    if (next === 'Main' || next === 'Welcome') {
      setRouteStack([next]);
      return;
    }
    setRouteStack(current => [...current, next]);
  }, [requestZoneChange]);

  const selectMainTab = useCallback(async (nextTab: AppTab) => {
    if (nextTab === 'Casual') {
      const allowed = await requestZoneChange('casual');
      if (allowed) setTab('Casual');
      return;
    }
    if (nextTab === 'Hot') {
      const allowed = await requestZoneChange('hot');
      if (allowed) setTab('Hot');
      return;
    }
    setTab(nextTab);
  }, [requestZoneChange]);

  useEffect(() => {
    let alive = true;
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (!alive || !data.session) return;
        const user = data.session.user;
        const metadata = user.user_metadata || {};
        setProfile(current => ({
          ...current,
          email: current.email || user.email || '',
          firstName: current.firstName || String(metadata.first_name || ''),
          displayName: current.displayName || String(metadata.display_name || metadata.first_name || ''),
          dateOfBirth: current.dateOfBirth || String(metadata.date_of_birth || ''),
        }));
        setRouteStack(['Main']);
      }).catch(() => undefined);
    }
    return () => { alive = false; };
  }, []);


  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setCoverOnBackground(state !== 'active');
    });
    return () => subscription.remove();
  }, []);


  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const processAuthUrl = async (url: string) => {
      if (!supabase) return;
      if (!url.startsWith('waves://')) return;
      const queryText = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
      const hashText = url.includes('#') ? url.split('#').slice(1).join('#') : '';
      const params = new URLSearchParams([queryText, hashText].filter(Boolean).join('&'));
      const isRecovery = params.get('type') === 'recovery' || /ResetPassword/i.test(url);
      let authError: Error | null = null;
      let userMetadata: Record<string, unknown> | null = null;
      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        authError = error;
        userMetadata = data.user?.user_metadata as Record<string, unknown> | undefined || null;
      } else if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        authError = error;
        userMetadata = data.user?.user_metadata as Record<string, unknown> | undefined || null;
      }
      if (!active) return;
      if (authError) {
        Alert.alert('Could not verify this link', authError.message);
        return;
      }
      if (userMetadata) {
        setProfile(current => ({
          ...current,
          firstName: current.firstName || String(userMetadata?.first_name || ''),
          displayName: current.displayName || String(userMetadata?.display_name || userMetadata?.first_name || ''),
          dateOfBirth: current.dateOfBirth || String(userMetadata?.date_of_birth || ''),
        }));
      }
      if (isRecovery) setRouteStack(['UpdatePassword']);
      else if (/VerifyEmail/i.test(url)) setRouteStack(['BuildProfile']);
    };
    const subscription = Linking.addEventListener('url', event => { void processAuthUrl(event.url); });
    Linking.getInitialURL().then(url => { if (url) void processAuthUrl(url); }).catch(() => undefined);
    return () => { active = false; subscription.remove(); };
  }, []);



  const onSignUp = useCallback(async (password: string) => {
    setBusy(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.signUp({
          email: profile.email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: 'waves://VerifyEmail', data: { first_name: profile.firstName.trim(), date_of_birth: profile.dateOfBirth } },
        });
        if (error) throw error;
      }
      navigate('VerifyEmail');
    } catch (error) {
      Alert.alert('Could not create your account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [navigate, profile.dateOfBirth, profile.email, profile.firstName]);

  const continueAfterVerification = useCallback(async () => {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user?.email_confirmed_at) {
        Alert.alert('Verify your email first', 'Open the WAVES verification link from your email, then return to continue. If the link does not open the app, configure waves://VerifyEmail in your Supabase Auth redirect URL allowlist.');
        return;
      }
    }
    navigate('BuildProfile');
  }, [navigate]);

  const onLogin = useCallback(async (email: string, password: string) => {
    setBusy(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
  email: email.trim().toLowerCase(),
  password,
});

if (error) throw error;

if (!data.user) {
  throw new Error('No authenticated user was returned.');
}

const user = data.user;
const metadata = user.user_metadata || {};

// Load the latest public profile and private account data.
const [
  { data: savedProfile, error: profileError },
  { data: privateData, error: privateError },
] = await Promise.all([
  supabase
    .from('profiles')
    .select('display_name, bio, interests')
    .eq('id', user.id)
    .maybeSingle(),

  supabase
    .from('private_account_data')
    .select('date_of_birth')
    .eq('user_id', user.id)
    .maybeSingle(),
]);

if (profileError) {
  throw new Error(
    `Could not load your profile: ${profileError.message}`
  );
}

if (privateError) {
  throw new Error(
    `Could not load your private account data: ${privateError.message}`
  );
}

// Replace the local profile with the current database values.
// Do not retain old values from a previous session.
setProfile({
  firstName: String(metadata.first_name || ''),
  email: user.email || email.trim(),
  displayName:
    savedProfile?.display_name ||
    String(metadata.display_name || metadata.first_name || ''),
  bio: savedProfile?.bio || '',
  interests: Array.isArray(savedProfile?.interests)
    ? savedProfile.interests
    : [],
  dateOfBirth:
    privateData?.date_of_birth ||
    String(metadata.date_of_birth || ''),
});
      }
      setRouteStack(['Main']);
    } catch (error) {
      Alert.alert('Log in failed', error instanceof Error ? error.message : 'Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onUpdatePassword = useCallback(async (password: string) => {
    setBusy(true);
    try {
      if (!supabase) {
        Alert.alert('Demo mode', 'Password updates require Supabase Auth to be configured.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'Your WAVES password has been changed. Please sign in again.');
      await supabase.auth.signOut();
      setRouteStack(['Login']);
    } catch (error) {
      Alert.alert('Could not update password', error instanceof Error ? error.message : 'Please open a fresh password reset link and try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const onReset = useCallback(async (email: string) => {
    if (!email.includes('@')) {
      Alert.alert('Check your email', 'Enter a valid email address first.');
      return;
    }
    setBusy(true);
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: 'waves://ResetPassword' });
        if (error) throw error;
      }
      Alert.alert('Check your inbox', demoMode ? 'Demo mode is enabled. No email was sent because Supabase is not configured.' : 'If this account exists, a password reset link has been sent.');
    } catch (error) {
      Alert.alert('Reset request failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [demoMode]);

  const onSignOut = useCallback(async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setProfile(emptyProfile);
      setZone('casual');
      setTab('Feed');
      setRouteStack(['Welcome']);
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routeStack.length > 1) {
        setRouteStack(current => current.length > 1 ? current.slice(0, -1) : current);
        return true;
      }
      if (route === 'Main') {
        Alert.alert('Leave WAVES?', 'Would you like to sign out before leaving?', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: () => { void onSignOut(); } },
        ]);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [routeStack, route, onSignOut]);

  const featureProps = useMemo(() => ({
    route, goBack, navigate, zone, setZone: requestZoneChange, profile, updateProfile,
    selectedPerson, setSelectedPerson, selectedClub, setSelectedClub, onSignOut, setTab,
  }), [route, goBack, navigate, zone, profile, updateProfile, selectedPerson, selectedClub, onSignOut, requestZoneChange]);

  let screen: React.ReactNode;
  switch (route) {
    case 'Welcome':
      screen = <WelcomeScreen navigate={navigate}/>;
      break;
    case 'SignUp':
      screen = <SignUpScreen navigate={navigate} busy={busy} onContinue={(firstName, email, dateOfBirth) => { updateProfile({ firstName, email, dateOfBirth, displayName: firstName }); navigate('CreatePassword'); }}/>;
      break;
    case 'CreatePassword':
      screen = <CreatePasswordScreen navigate={navigate} busy={busy} onContinue={onSignUp}/>;
      break;
    case 'VerifyEmail':
      screen = <VerifyEmailScreen navigate={navigate} profile={profile} demoMode={demoMode} onContinue={continueAfterVerification}/>;
      break;
  case 'BuildProfile':
  screen = (
    <BuildProfileScreen
      navigate={navigate}
      profile={profile}
      updateProfile={updateProfile}
      onContinue={() => {
        void saveProfileAndContinue();
      }}
      busy={busy}
    />
  );
  break;
    case 'ChooseZone':
      screen = <ChooseZoneScreen profile={profile} zone={zone} setZone={requestZoneChange} onStart={() => setRouteStack(['Main'])}/>;
      break;
    case 'Login':
      screen = <LoginScreen navigate={navigate} onLogin={onLogin} busy={busy} demoMode={demoMode}/>;
      break;
    case 'ResetPassword':
      screen = <ResetPasswordScreen navigate={navigate} onReset={onReset} busy={busy} demoMode={demoMode}/>;
      break;
    case 'UpdatePassword':
      screen = <UpdatePasswordScreen navigate={navigate} onUpdatePassword={onUpdatePassword} busy={busy}/>;
      break;
    case 'Main':
      screen = <MainTabScreen zone={zone} setZone={requestZoneChange} tab={tab} setTab={selectMainTab} navigate={navigate} profile={profile} setSelectedPerson={setSelectedPerson} setSelectedClub={setSelectedClub} onSignOut={onSignOut}/>;
      break;
    default:
      screen = <FeatureScreen {...featureProps}/>;
      break;
  }

  
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.background}
      />

      {Platform.OS !== 'web' ? <CaptureGuard /> : null}

      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        {/* TEMPORARY TEST BANNER — remove after testing */}
        <View
          style={{
            backgroundColor: '#00C853',
            padding: 12,
            marginHorizontal: 12,
            marginTop: 8,
            marginBottom: 4,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            WAVES LIVE UPDATE TEST
          </Text>
        </View>

        {screen}

        {coverOnBackground ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.background,
            }}
          >
            <Ionicons
              name="water"
              size={48}
              color={theme.colors.coral}
            />
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: '900',
                fontSize: 23,
                letterSpacing: 3,
                marginTop: 12,
              }}
            >
              WAVES
            </Text>
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              Your private space
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );

}

export default function App() {
  return <AppContent/>;
}
