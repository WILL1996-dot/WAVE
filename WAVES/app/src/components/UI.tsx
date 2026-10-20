import React, { PropsWithChildren } from 'react';
import {
  ActivityIndicator, Image, ImageSourcePropType, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, Zone, AppTab } from '../theme';

export function Screen({ children, scroll = true, padded = true, style }: PropsWithChildren<{ scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle> }>) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: theme.colors.background }, style]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: padded ? 18 : 0, paddingTop: 10, paddingBottom: 30, flexGrow: 1 }}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: padded ? 18 : 0, paddingTop: 10 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Logo({ small = false, dark = false }: { small?: boolean; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: small ? 22 : 26, height: small ? 22 : 26, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="water" size={small ? 22 : 26} color={theme.colors.coral} />
      </View>
      <Text style={{ color: dark ? theme.colors.background : theme.colors.text, fontSize: small ? 17 : 21, fontWeight: '900', letterSpacing: 1.5 }}>WAVES</Text>
    </View>
  );
}

export function TextLabel({ children, style }: PropsWithChildren<{ style?: any }>) {
  return <Text style={[{ color: theme.colors.text, fontSize: 14 }, style]}>{children}</Text>;
}

export function Eyebrow({ children, color = theme.colors.coral }: PropsWithChildren<{ color?: string }>) {
  return <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 }}>{children}</Text>;
}

export function Heading({ children, size = 26, style }: PropsWithChildren<{ size?: number; style?: any }>) {
  return <Text style={[{ color: theme.colors.text, fontSize: size, fontWeight: '800', letterSpacing: -0.6, lineHeight: size * 1.12 }, style]}>{children}</Text>;
}

export function Muted({ children, style }: PropsWithChildren<{ style?: any }>) {
  return <Text style={[{ color: theme.colors.muted, fontSize: 13, lineHeight: 19 }, style]}>{children}</Text>;
}

export function Button({ title, onPress, variant = 'primary', icon, disabled = false, loading = false, compact = false, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'violet' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; loading?: boolean; compact?: boolean; style?: any;
}) {
  const bg = variant === 'primary' ? theme.colors.coral : variant === 'violet' ? theme.colors.violetDark : variant === 'danger' ? '#4A242E' : variant === 'secondary' ? theme.colors.surface2 : 'transparent';
  const color = variant === 'primary' ? '#201114' : variant === 'violet' ? '#FFFFFF' : variant === 'danger' ? '#FFB0B8' : theme.colors.text;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ minHeight: compact ? 40 : 52, paddingHorizontal: compact ? 14 : 18, borderRadius: theme.radius.md, backgroundColor: bg, borderWidth: variant === 'ghost' || variant === 'secondary' ? 1 : 0, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : pressed ? 0.84 : 1, transform: [{ scale: pressed ? 0.99 : 1 }], }, style]}>
      {loading ? <ActivityIndicator size="small" color={color} /> : icon ? <Ionicons name={icon} size={17} color={color} /> : null}
      <Text style={{ color, fontWeight: '800', fontSize: compact ? 12 : 14, letterSpacing: 0.1 }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, size = 42, color = theme.colors.text, background = theme.colors.surface2, bordered = false }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; size?: number; color?: string; background?: string; bordered?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: background, alignItems: 'center', justifyContent: 'center', borderWidth: bordered ? 1 : 0, borderColor: theme.colors.border, opacity: pressed ? 0.78 : 1 })}><Ionicons name={icon} size={19} color={color} /></Pressable>;
}

export function Card({ children, style, onPress }: PropsWithChildren<{ style?: any; onPress?: () => void }>) {
  const content = <View style={[{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.lg, padding: 15 }, style]}>{children}</View>;
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>{content}</Pressable>;
  return content;
}

export function Pill({ children, active = false, color, onPress, style }: PropsWithChildren<{ active?: boolean; color?: string; onPress?: () => void; style?: any }>) {
  const tint = color || theme.colors.coral;
  const node = <View style={[{ borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: active ? (tint === theme.colors.violet ? theme.colors.violetTint : theme.colors.coralTint) : theme.colors.surface2, borderWidth: 1, borderColor: active ? tint : theme.colors.border }, style]}><Text style={{ color: active ? tint : theme.colors.muted, fontSize: 11, fontWeight: '700' }}>{children}</Text></View>;
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>{node}</Pressable>;
  return node;
}

export function ZoneToggle({ value, onChange }: { value: Zone; onChange: (zone: Zone) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: theme.colors.surface2, padding: 4, borderRadius: 30, borderWidth: 1, borderColor: theme.colors.border }}>
      <Pressable onPress={() => onChange('casual')} style={{ flex: 1, borderRadius: 24, backgroundColor: value === 'casual' ? theme.colors.coral : 'transparent', paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
        <Ionicons name="heart" size={13} color={value === 'casual' ? '#291315' : theme.colors.muted} /><Text style={{ color: value === 'casual' ? '#291315' : theme.colors.muted, fontSize: 12, fontWeight: '800' }}>Casual Zone</Text>
      </Pressable>
      <Pressable onPress={() => onChange('hot')} style={{ flex: 1, borderRadius: 24, backgroundColor: value === 'hot' ? theme.colors.violetDark : 'transparent', paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
        <Ionicons name="flash" size={13} color={value === 'hot' ? '#FFFFFF' : theme.colors.muted} /><Text style={{ color: value === 'hot' ? '#FFFFFF' : theme.colors.muted, fontSize: 12, fontWeight: '800' }}>Hot Zones</Text>
      </Pressable>
    </View>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, rightIcon, helper, autoCapitalize = 'sentences', editable = true }: {
  label?: string; value: string; onChangeText: (text: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: TextInputProps['keyboardType']; multiline?: boolean; rightIcon?: keyof typeof Ionicons.glyphMap; helper?: string; autoCapitalize?: TextInputProps['autoCapitalize']; editable?: boolean;
}) {
  return (
    <View style={{ marginBottom: 15 }}>
      {label ? <Text style={{ color: '#D6D5E1', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>{label}</Text> : null}
      <View style={{ minHeight: multiline ? 104 : 50, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', paddingHorizontal: 14 }}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.subtle} secureTextEntry={secureTextEntry} keyboardType={keyboardType} multiline={multiline} editable={editable} autoCapitalize={autoCapitalize} contextMenuHidden selectTextOnFocus={false} selectionColor={theme.colors.coral} style={{ color: theme.colors.text, flex: 1, fontSize: 14, paddingVertical: multiline ? 12 : 0, minHeight: multiline ? 82 : 48, textAlignVertical: multiline ? 'top' : 'center' }} />
        {rightIcon ? <Ionicons name={rightIcon} size={17} color={theme.colors.muted} /> : null}
      </View>
      {helper ? <Muted style={{ fontSize: 11, marginTop: 6 }}>{helper}</Muted> : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 6 }}><Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>{title}</Text>{action && onAction ? <Pressable onPress={onAction}><Text style={{ color: theme.colors.coral, fontSize: 12, fontWeight: '800' }}>{action}</Text></Pressable> : null}</View>;
}

export function Avatar({ source, size = 48, online = false, border = false }: { source: ImageSourcePropType; size?: number; online?: boolean; border?: boolean }) {
  return <View style={{ width: size, height: size }}><Image source={source} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: border ? 2 : 0, borderColor: theme.colors.coral }} /><View pointerEvents="none" style={{ display: online ? 'flex' : 'none', position: 'absolute', right: 0, bottom: 1, width: size * 0.22, height: size * 0.22, borderRadius: size, backgroundColor: theme.colors.success, borderWidth: 2, borderColor: theme.colors.background }} /></View>;
}

export function BottomNav({ active, onSelect }: { active: AppTab; onSelect: (tab: AppTab) => void }) {
  const items: { key: AppTab; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'Feed', icon: 'home-outline', activeIcon: 'home', label: 'Feed' },
    { key: 'Casual', icon: 'heart-outline', activeIcon: 'heart', label: 'Casual' },
    { key: 'Hot', icon: 'flame-outline', activeIcon: 'flame', label: 'Hot' },
    { key: 'Chat', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses', label: 'Chat' },
    { key: 'Profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
  ];
  const highlighted: AppTab = active === 'Following' || active === 'Alerts' || active === 'Discover' ? 'Feed' : active === 'Inbox' ? 'Chat' : active;
  return <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#12121B', borderTopWidth: 1, borderTopColor: '#292938' }}><View style={{ height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>{items.map(item => {
    const on = highlighted === item.key;
    return <Pressable key={item.key} onPress={() => onSelect(item.key)} style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Ionicons name={on ? item.activeIcon : item.icon} size={20} color={on ? theme.colors.coral : theme.colors.subtle} /><Text style={{ fontSize: 9, fontWeight: on ? '800' : '600', color: on ? theme.colors.coral : theme.colors.subtle }}>{item.label}</Text></Pressable>;
  })}</View></SafeAreaView>;
}

export function TopBar({ title, onBack, action, onAction, rightIcon }: { title?: string; onBack?: () => void; action?: string; onAction?: () => void; rightIcon?: keyof typeof Ionicons.glyphMap }) {
  return <View style={{ height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <View style={{ width: 58 }}>{onBack ? <IconButton icon="chevron-back" onPress={onBack} size={38} background="transparent" /> : <Logo small />}</View>
    {title ? <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'center' }}>{title}</Text> : <View style={{ flex: 1 }} />}
    <View style={{ minWidth: 58, alignItems: 'flex-end' }}>{action && onAction ? <Pressable onPress={onAction}><Text style={{ color: theme.colors.coral, fontWeight: '800', fontSize: 12 }}>{action}</Text></Pressable> : rightIcon && onAction ? <IconButton icon={rightIcon} onPress={onAction} size={38} background="transparent" /> : <View style={{ width: 38 }} />}</View>
  </View>;
}

export function ToggleRow({ title, description, value, onValueChange }: { title: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <Pressable onPress={() => onValueChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#292938' }}><View style={{ flex: 1, paddingRight: 16 }}><Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>{title}</Text>{description ? <Muted style={{ fontSize: 11, marginTop: 3 }}>{description}</Muted> : null}</View><View style={{ width: 44, height: 26, borderRadius: 20, backgroundColor: value ? theme.colors.coral : '#424252', padding: 3, justifyContent: 'center' }}><View style={{ width: 20, height: 20, borderRadius: 12, backgroundColor: '#FFFFFF', alignSelf: value ? 'flex-end' : 'flex-start' }} /></View></Pressable>;
}

export function EmptyState({ icon, title, body, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: string; onAction?: () => void }) {
  return <View style={{ alignItems: 'center', paddingVertical: 44, paddingHorizontal: 22 }}><View style={{ width: 70, height: 70, borderRadius: 26, backgroundColor: theme.colors.coralTint, justifyContent: 'center', alignItems: 'center', marginBottom: 18 }}><Ionicons name={icon} size={30} color={theme.colors.coral} /></View><Heading size={20} style={{ textAlign: 'center' }}>{title}</Heading><Muted style={{ textAlign: 'center', marginTop: 8, marginBottom: 18 }}>{body}</Muted>{action && onAction ? <Button title={action} onPress={onAction} compact /> : null}</View>;
}
