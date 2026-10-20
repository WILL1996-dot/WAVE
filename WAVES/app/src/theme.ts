export const theme = {
  colors: {
    background: '#101018',
    background2: '#14141E',
    surface: '#1A1A26',
    surface2: '#222230',
    surface3: '#292939',
    border: '#30303E',
    text: '#F8F7FB',
    muted: '#A3A2B2',
    subtle: '#77778A',
    coral: '#FF8275',
    coralDark: '#EF6B60',
    coralTint: '#3B252A',
    violet: '#AA94FF',
    violetDark: '#7761D7',
    violetTint: '#28243F',
    mint: '#88D8C7',
    yellow: '#F4CA79',
    danger: '#FF6B77',
    success: '#7AD6AD',
    white: '#FFFFFF',
  },
  radius: { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 },
};

export type Zone = 'casual' | 'hot';
export type AppTab = 'Feed' | 'Casual' | 'Hot' | 'Chat' | 'Profile' | 'Following' | 'Alerts' | 'Discover' | 'Inbox';
