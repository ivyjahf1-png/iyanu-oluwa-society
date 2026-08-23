import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

/**
 * Reusable brightness/contrast control.
 * Renders a tappable 10-segment bar plus −/+ steppers and a live % readout.
 * Works in steps of 10 so it is easy to hit on any screen size.
 */
export default function BrightnessControl({ label, hint, value, onChange }) {
  const segments = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
  const pct = typeof value === 'number' ? value : 100;

  const step = delta => {
    const next = Math.min(100, Math.max(0, pct + delta));
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>

      <View style={styles.barRow}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => step(-10)}>
          <Minus size={14} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Segmented bar */}
        <View style={styles.segmentTrack}>
          {segments.map(level => {
            const active = level <= pct;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.segment,
                  active ? styles.segmentOn : styles.segmentOff,
                ]}
                onPress={() => onChange(level)}
              />
            );
          })}
        </View>

        <TouchableOpacity style={styles.stepBtn} onPress={() => step(10)}>
          <Plus size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0F2A19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C4A2E',
    padding: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#0B2211',
    fontSize: 13,
    fontWeight: '600',
  },
  pct: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: 'bold',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 12,
    borderRadius: 3,
  },
  segmentOn: {
    backgroundColor: '#4CAF50',
  },
  segmentOff: {
    backgroundColor: '#1C4A2E',
  },
  hint: {
    color: '#93A69B',
    fontSize: 11,
    marginTop: 8,
  },
});