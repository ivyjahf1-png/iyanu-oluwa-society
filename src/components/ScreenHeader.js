import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Shared top header with a back button for stack screens.
 * Theme-aware: uses the active theme's surface/text colors so it renders
 * correctly on both light and dark themes.
 */
export default function ScreenHeader({ title, subtitle, onBack }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={onBack}>
        <ChevronLeft size={22} color={colors.background} />
      </TouchableOpacity>
      <View style={styles.titleGroup}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});