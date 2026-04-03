import { StyleSheet } from 'react-native';

// Legacy color constants kept for backward compatibility
export const colors = {
  primary: '#00D4FF',
  secondary: '#1A1D26',
  accent: '#00FF94',
  background: '#0D0F14',
  backgroundAlt: '#141720',
  text: '#E8EBF4',
  grey: '#7A8099',
  card: '#141720',
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
    borderRadius: 16,
    // @ts-expect-error — RN Web / Expo SDK 54 supports borderCurve
    borderCurve: 'continuous',
    padding: 16,
    backgroundColor: '#141720',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 16px rgba(0,0,0,0.4)',
  },
  screenPadding: {
    paddingHorizontal: 20,
  },
  sectionGap: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.0,
    textTransform: 'uppercase',
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: 'white',
  },
});
