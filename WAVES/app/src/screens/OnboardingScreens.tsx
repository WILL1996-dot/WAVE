import React, { useState } from 'react';
import { Alert, ImageBackground, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Eyebrow, Field, Heading, Logo, Muted, Pill, Screen, SectionTitle, TopBar } from '../components/UI';
import { photos } from '../data/mock';
import { theme, Zone } from '../theme';

export type BasicProfile = { firstName: string; email: string; dateOfBirth: string; displayName: string; bio: string; interests: string[] };
export type AuthProps = { navigate: (route: string) => void; goBack: () => void; profile: BasicProfile; updateProfile: (data: Partial<BasicProfile>) => void; zone: Zone; setZone: (zone: Zone) => void; onSignUp: (password: string) => Promise<void>; onLogin: (email: string, password: string) => Promise<void>; onReset: (email: string) => Promise<void>; onSignOut: () => Promise<void>; busy: boolean; demoMode: boolean };

export function WelcomeScreen({ navigate }: Pick<AuthProps, 'navigate'>) {
  return <Screen padded={false}>
    <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 }}>
      <View style={{ alignItems: 'center', marginTop: 12 }}><Logo /></View>
      <ImageBackground source={photos.maya} resizeMode="cover" imageStyle={{ borderRadius: 28, opacity: 0.96 }} style={{ height: 300, borderRadius: 28, marginTop: 26, overflow: 'hidden', justifyContent: 'flex-end' }}>
        <View style={{ ...({} as any), position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,18,0.1)' }} />
        <View style={{ backgroundColor: 'rgba(16,16,24,0.7)', padding: 17 }}><Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>CASUAL ZONE</Text><Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '900' }}>Meet your next story.</Text><Muted>Real connections. Live moments. Your people.</Muted></View>
      </ImageBackground>
      <View style={{ marginTop: 24, marginBottom: 24 }}><Eyebrow>YOUR WORLD, YOUR WAVES</Eyebrow><Heading size={34}>Find your people.{ '\n' }Feel the energy.</Heading><Muted style={{ marginTop: 10, fontSize: 14 }}>Two ways to connect. One place to feel at home.</Muted></View>
      <View style={{ gap: 11, marginTop: 'auto' }}><Button title="Create an account" onPress={() => navigate('SignUp')} icon="arrow-forward" /><Button title="Log in" onPress={() => navigate('Login')} variant="secondary" /><Text style={{ textAlign: 'center', color: theme.colors.subtle, fontSize: 10, lineHeight: 15, marginTop: 4 }}>18+ only · Fully clothed, non-explicit live content. Be yourself. Be respectful.</Text></View>
    </View>
  </Screen>;
}

export function SignUpScreen({ navigate, onContinue, busy }: { navigate: (route: string) => void; onContinue: (firstName: string, email: string, dob: string) => void; busy: boolean }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [dob, setDob] = useState(''); const [accepted, setAccepted] = useState(false);
  return <Screen><TopBar title="Sign up" action="Log in" onAction={() => navigate('Login')} onBack={() => navigate('Welcome')} />
    <Eyebrow>YOUR ACCOUNT · 1 OF 3</Eyebrow><Heading size={32}>A good night{ '\n' }starts here.</Heading><Muted style={{ marginTop: 10, marginBottom: 26 }}>One account for connections and live moments.</Muted>
    <Field label="Your first name" value={name} onChangeText={setName} placeholder="First name" autoCapitalize="words" />
    <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" rightIcon="mail-outline" />
    <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" helper="You must be 18 or older. Your birthday stays private; your age is shown on your dating profile." rightIcon="calendar-outline" />
    <Pressable onPress={() => setAccepted(!accepted)} style={{ flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: theme.colors.surface, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: accepted ? theme.colors.coral : theme.colors.border, marginTop: 4, marginBottom: 18 }}><Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? theme.colors.coral : theme.colors.muted} /><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 18 }}>I'm 18+ and agree to the Terms of Service and Privacy Policy.</Text><Muted style={{ fontSize: 10, marginTop: 4 }}>Your email is never visible on your profile.</Muted></View></Pressable>
    <Button title="Continue" onPress={() => { if (!name.trim() || !email.includes('@') || !dob.trim()) { Alert.alert('Complete your details', 'Enter your name, valid email and date of birth.'); return; } if (!accepted) { Alert.alert('Confirm your age', 'You must confirm you are at least 18 years old to continue.'); return; } if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) { const birth=new Date(dob); const age=new Date().getFullYear()-birth.getFullYear()-((new Date().getMonth()<birth.getMonth() || (new Date().getMonth()===birth.getMonth() && new Date().getDate()<birth.getDate()))?1:0); if (age < 18) { Alert.alert('WAVES is 18+', 'You must be at least 18 years old to use WAVES.'); return; } } onContinue(name.trim(), email.trim(), dob); }} loading={busy} />
    <Muted style={{ textAlign: 'center', fontSize: 10, marginTop: 14 }}>Terms of Service  ·  Privacy Policy</Muted>
  </Screen>;
}

export function CreatePasswordScreen({ navigate, onContinue, busy }: { navigate: (route: string) => void; onContinue: (password: string) => Promise<void>; busy: boolean }) {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const checks = [{ ok: password.length >= 12, label: 'At least 12 characters' }, { ok: /[A-Z]/.test(password) && /[a-z]/.test(password), label: 'An uppercase and a lowercase letter' }, { ok: /\d/.test(password) && /[^A-Za-z0-9]/.test(password), label: 'A number and a symbol' }, { ok: !!password && password === confirm, label: 'Both passwords match' }];
  return <Screen><TopBar title="Create account" onBack={() => navigate('SignUp')} /><Eyebrow>YOUR ACCOUNT · 2 OF 3</Eyebrow><Heading size={32}>Just for you.</Heading><Muted style={{ marginTop: 10, marginBottom: 28 }}>Give your account a strong, unique password.</Muted>
    <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 12 characters" secureTextEntry rightIcon="eye-off-outline" autoCapitalize="none" />
    <Field label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Enter it again" secureTextEntry rightIcon="eye-off-outline" autoCapitalize="none" />
    <Card style={{ marginBottom: 20, gap: 10 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>Password strength</Text>{checks.map(c => <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Ionicons name={c.ok ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={c.ok ? theme.colors.success : theme.colors.subtle} /><Muted style={{ color: c.ok ? theme.colors.success : theme.colors.muted, fontSize: 12 }}>{c.label}</Muted></View>)}</Card>
    <Button title="Continue to verification" onPress={() => { if (checks.every(c => c.ok)) onContinue(password); else Alert.alert('Password requirements', 'Complete all four password checks before continuing.'); }} loading={busy} /><Muted style={{ textAlign: 'center', fontSize: 11, marginTop: 14 }}>Never share your password. WAVES will never ask for it in a message.</Muted>
  </Screen>;
}

export function VerifyEmailScreen({ navigate, profile, onContinue, demoMode }: { navigate: (route: string) => void; profile: BasicProfile; onContinue: () => void; demoMode: boolean }) {
  return <Screen><TopBar title="Verify your email" onBack={() => navigate('CreatePassword')} /><View style={{ alignItems: 'center', paddingTop: 36, paddingBottom: 26 }}><View style={{ width: 92, height: 92, borderRadius: 32, backgroundColor: theme.colors.coralTint, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><Ionicons name="mail-open-outline" size={44} color={theme.colors.coral} /></View><Eyebrow>YOUR ACCOUNT · 3 OF 3</Eyebrow><Heading size={30} style={{ textAlign: 'center' }}>Check your{ '\n' }inbox.</Heading><Muted style={{ textAlign: 'center', marginTop: 12 }}>We sent a verification link to{ '\n'}<Text style={{ color: theme.colors.text, fontWeight: '800' }}>{profile.email || 'your email address'}</Text></Muted></View>
    <Card style={{ marginBottom: 20 }}><Text style={{ color: theme.colors.text, fontWeight: '800', marginBottom: 8 }}>Next step</Text><Muted>{demoMode ? 'Demo mode is enabled, so you can continue without sending a real email.' : 'Open the email from WAVES, tap the verification link, then return here.'}</Muted></Card><Button title={demoMode ? 'Continue in demo mode' : "I've verified my email"} onPress={onContinue} /><Button title="Back to log in" variant="ghost" onPress={() => navigate('Login')} style={{ marginTop: 10 }} />
  </Screen>;
}

export function BuildProfileScreen({ navigate, profile, updateProfile, onContinue , busy = false, }: { navigate: (route: string) => void; profile: BasicProfile; updateProfile: (data: Partial<BasicProfile>) => void; onContinue: () => void;  busy?: boolean; }) {
  const options = ['Live music', 'Coffee', 'Design', 'Weekend hikes', 'Travel', 'Cooking', 'Art', 'Fitness', 'Books', 'Photography'];
  const toggle = (i: string) => updateProfile({ interests: profile.interests.includes(i) ? profile.interests.filter(x => x !== i) : [...profile.interests, i] });
  return <Screen><TopBar title="Your profile" action="Save & exit" onAction={onContinue} onBack={() => navigate('VerifyEmail')} /><Eyebrow>MAKE IT YOURS</Eyebrow><Heading size={31}>More you.{ '\n'}Better connections.</Heading><Muted style={{ marginTop: 9, marginBottom: 19 }}>Start with a photo and a few things you love.</Muted>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 22 }}><ImageBackground source={photos.alex} style={{ width: 98, height: 120, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end' }}><View style={{ backgroundColor: 'rgba(10,10,16,0.65)', padding: 7 }}><Text style={{ fontSize: 10, color: 'white', fontWeight: '800' }}>Main photo</Text></View></ImageBackground><View style={{ flex: 1, justifyContent: 'center' }}><Button title="Add more photos" variant="secondary" icon="add-circle-outline" onPress={() => Alert.alert('Photo upload', 'Photo picking will be connected with the native image picker in the next implementation pass.')} compact /><Muted style={{ marginTop: 10, fontSize: 11 }}>1 of 6 added</Muted><Muted style={{ fontSize: 11 }}>Photo verification will be added before launch.</Muted></View></View>
    <Field label="Display name" value={profile.displayName || profile.firstName} onChangeText={v => updateProfile({ displayName: v })} placeholder="How people see you" />
    <Field label="About me" value={profile.bio} onChangeText={v => updateProfile({ bio: v })} placeholder="A little about you..." multiline helper={`${profile.bio.length} / 300 characters`} />
    <SectionTitle title="Your interests" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>{options.map(i => <Pill key={i} active={profile.interests.includes(i)} onPress={() => toggle(i)}>{i}</Pill>)}</View>
    <Card style={{ marginBottom: 20 }}><Text style={{ color: theme.colors.text, fontWeight: '800', marginBottom: 5 }}>Privacy by default</Text><Muted style={{ fontSize: 11 }}>Your precise location is never shown. Dating preferences stay in Casual Zone.</Muted></Card><Button
  title="Save & choose a zone"
  onPress={onContinue}
  loading={busy}
/>
  </Screen>;
}

function hasAdultBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age >= 18 && birth <= now;
}

export function ChooseZoneScreen({ profile, zone, setZone, onStart }: { profile: BasicProfile; zone: Zone; setZone: (z: Zone) => void; onStart: () => void }) {
  const chooseHot = () => {
    if (!hasAdultBirthDate(profile.dateOfBirth)) {
      Alert.alert('Hot Zone is 18+', 'A valid adult date of birth is required. Production access will also require a verified adult eligibility check.');
      return;
    }
    setZone('hot');
  };
  return <Screen><View style={{ marginTop: 8, marginBottom: 24 }}><Logo /><View style={{ marginTop: 25 }}><Eyebrow>HEY, {(profile.displayName || profile.firstName || 'THERE').toUpperCase()}</Eyebrow><Heading size={32}>What's your vibe?</Heading><Muted style={{ marginTop: 8 }}>Pick a zone to start. You can switch anytime.</Muted></View></View>
    <Pressable onPress={() => setZone('casual')} style={{ borderRadius: 24, overflow: 'hidden', borderWidth: zone === 'casual' ? 2 : 1, borderColor: zone === 'casual' ? theme.colors.coral : theme.colors.border, marginBottom: 16 }}><ImageBackground source={photos.maya} style={{ height: 225, justifyContent: 'flex-end' }}><View style={{ padding: 18, backgroundColor: 'rgba(14,14,22,0.8)' }}><Text style={{ color: theme.colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>♡ CASUAL ZONE</Text><Heading size={23}>Make meaningful connections.</Heading><Muted style={{ marginTop: 5 }}>Meet people nearby. Like, match and see where the conversation takes you.</Muted></View></ImageBackground></Pressable>
    <Pressable onPress={chooseHot} style={{ borderRadius: 24, overflow: 'hidden', borderWidth: zone === 'hot' ? 2 : 1, borderColor: zone === 'hot' ? theme.colors.violet : theme.colors.border, marginBottom: 18 }}><ImageBackground source={photos.nova} style={{ height: 225, justifyContent: 'flex-end' }}><View style={{ padding: 18, backgroundColor: 'rgba(14,14,22,0.82)' }}><Text style={{ color: theme.colors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>♫ HOT ZONES</Text><Heading size={23}>Step into live moments.</Heading><Muted style={{ marginTop: 5 }}>Live music, conversations, creative moments and community rooms.</Muted></View></ImageBackground></Pressable>
    <Muted style={{ textAlign: 'center', fontSize: 10, marginBottom: 13 }}>One profile. Shared inbox. Separate discovery. Hot Zone requires adult eligibility; creator/club access is separately gated.</Muted><Button title={`Start in ${zone === 'casual' ? 'Casual Zone' : 'Hot Zones'}`} onPress={onStart} icon="arrow-forward" />
  </Screen>;
}

export function LoginScreen({ navigate, onLogin, busy, demoMode }: { navigate: (route: string) => void; onLogin: (email: string, password: string) => Promise<void>; busy: boolean; demoMode: boolean }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  return <Screen><TopBar title="Log in" onBack={() => navigate('Welcome')} /><View style={{ alignItems: 'center', marginTop: 10, marginBottom: 30 }}><Logo /><Text style={{ marginTop: 28, alignSelf: 'stretch' }}><Eyebrow>GOOD TO SEE YOU</Eyebrow></Text><Heading size={31} style={{ alignSelf: 'stretch' }}>Back for the{ '\n'}good part.</Heading><Muted style={{ marginTop: 10 }}>Your people. Your favorite creators. All right here.</Muted></View>
    <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" rightIcon="mail-outline" /><Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry rightIcon="eye-off-outline" autoCapitalize="none" />
    <Pressable onPress={() => navigate('ResetPassword')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}><Text style={{ color: theme.colors.coral, fontWeight: '800', fontSize: 12 }}>Forgot password?</Text></Pressable><Button title="Log in" onPress={() => onLogin(email, password)} loading={busy} /><Muted style={{ textAlign: 'center', marginTop: 15, fontSize: 11 }}>{demoMode ? 'Demo mode: use any email and password to explore the prototype.' : 'Your session is protected. Never share your password.'}</Muted>
    <View style={{ marginTop: 30, padding: 15, borderRadius: 17, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', gap: 10 }}><Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.coral} /><View style={{ flex: 1 }}><Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 12 }}>One shared account</Text><Muted style={{ fontSize: 11, marginTop: 3 }}>Two distinct modes. Choose where your night begins after logging in.</Muted></View></View>
    </Screen>;
}

export function ResetPasswordScreen({ navigate, onReset, busy, demoMode }: { navigate: (route: string) => void; onReset: (email: string) => Promise<void>; busy: boolean; demoMode: boolean }) {
  const [email, setEmail] = useState('');
  return <Screen><TopBar title="Reset password" onBack={() => navigate('Login')} /><View style={{ alignItems: 'center', marginTop: 35, marginBottom: 28 }}><View style={{ width: 86, height: 86, borderRadius: 28, backgroundColor: theme.colors.violetTint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="key-outline" size={38} color={theme.colors.violet} /></View><Heading size={29} style={{ marginTop: 22, textAlign: 'center' }}>Let's get you{ '\n'}back in.</Heading><Muted style={{ textAlign: 'center', marginTop: 9 }}>Enter the email address linked to your WAVES account.</Muted></View><Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" /><Button title="Send reset link" onPress={() => onReset(email)} loading={busy} /><Muted style={{ textAlign: 'center', marginTop: 14, fontSize: 11 }}>{demoMode ? 'Demo mode: no email is sent until Supabase is configured.' : 'If an account exists for this address, we will send a reset link.'}</Muted></Screen>;
}

export function UpdatePasswordScreen({ navigate, onUpdatePassword, busy }: { navigate: (route: string) => void; onUpdatePassword: (password: string) => Promise<void>; busy: boolean }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const valid = password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password) && password === confirm;
  return <Screen><TopBar title="Choose a new password" onBack={() => navigate('Login')}/><View style={{ alignItems: 'center', marginTop: 25, marginBottom: 26 }}><View style={{ width: 80, height: 80, borderRadius: 26, backgroundColor: theme.colors.violetTint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="shield-checkmark-outline" size={36} color={theme.colors.violet}/></View><Heading size={29} style={{ textAlign: 'center', marginTop: 18 }}>Secure your account.</Heading><Muted style={{ textAlign: 'center', marginTop: 8 }}>Choose a new, unique password to get back into WAVES.</Muted></View><Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 12 characters" secureTextEntry autoCapitalize="none" rightIcon="lock-closed-outline"/><Field label="Confirm new password" value={confirm} onChangeText={setConfirm} placeholder="Enter it again" secureTextEntry autoCapitalize="none" rightIcon="lock-closed-outline"/><Card style={{ marginBottom: 18 }}><Muted style={{ fontSize: 11 }}>Use at least 12 characters, with uppercase and lowercase letters, a number, and a symbol. Both entries must match.</Muted></Card><Button title="Update password" onPress={() => { if (valid) void onUpdatePassword(password); else Alert.alert('Password requirements', 'Use 12+ characters with uppercase, lowercase, a number and a symbol. Make sure both passwords match.'); }} loading={busy}/></Screen>;
}
