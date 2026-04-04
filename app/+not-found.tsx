import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/constants/Colors';

export default function NotFoundScreen() {
  const C = useColors();
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <Text style={[styles.title, { color: C.text }]}>Page not found</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          This screen doesn't exist.
        </Text>
        <Link href="/(tabs)/(today)" style={styles.link}>
          <Text style={[styles.linkText, { color: C.primary }]}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
