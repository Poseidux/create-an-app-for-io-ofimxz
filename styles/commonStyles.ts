import { StyleSheet } from 'react-native';

// Legacy color constants kept for backward compatibility
export const colors = {
  primary: '#162456',
  secondary: '#193cb8',
  accent: '#64B5F6',
  background: '#101824',
  backgroundAlt: '#162133',
  text: '#e3e3e3',
  grey: '#90CAF9',
  card: '#193cb8',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 23,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  // ── Reusable design tokens ────────────────────────────────────────────────
  card: {
    borderRadius: 14,
    // @ts-expect-error — RN Web / Expo SDK 54 supports borderCurve
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  },
  screenPadding: {
    paddingHorizontal: 20,
  },
  sectionGap: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: 'white',
  },
});
