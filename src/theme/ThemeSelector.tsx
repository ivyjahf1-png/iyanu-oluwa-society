import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeName } from './colors';

const themeOptions: {
  id: ThemeName;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'darkEmerald',
    label: 'Dark Emerald',
    description: 'Deep green dark mode styling.',
    icon: '🌲',
  },
  {
    id: 'pitchBlack',
    label: 'Pitch Black',
    description: 'True black for AMOLED screens.',
    icon: '🖤',
  },
  {
    id: 'designerLight',
    label: 'Designer Light',
    description: 'Clean, bright interface styling.',
    icon: '☀️',
  },
  {
    id: 'automatic',
    label: 'Automatic',
    description: 'Follows your system light/dark setting.',
    icon: '✨',
  },
];

export default function ThemeSelector() {
  const { themeName, setTheme, colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance & Theme</Text>

      {themeOptions.map(option => {
        const isActive = themeName === option.id;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            onPress={() => setTheme(option.id)}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: isActive ? colors.primary : colors.border,
                borderWidth: isActive ? 2 : 1,
              },
            ]}
          >
            <View style={styles.row}>
              <Text style={styles.icon}>{option.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>

              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.activeText}>ACTIVE</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});