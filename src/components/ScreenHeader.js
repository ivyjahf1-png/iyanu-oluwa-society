import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

/**
 * Shared top header with a back button for stack screens.
 * Uses the project palette: Deep Chocolate / Accent Dark Green / Soft Cream.
 */
export default function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <ChevronLeft size={22} color='#091813' />
      </TouchableOpacity>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    backgroundColor: '#091813',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 2,
  },
});