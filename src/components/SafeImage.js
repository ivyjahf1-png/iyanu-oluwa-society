import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/colors';

/**
 * Drop-in replacement for <Image /> with built-in failure resilience:
 *  - shows a soft green placeholder while loading,
 *  - keeps the placeholder if the source fails to load (broken URL, missing
 *    file, network error) instead of rendering a broken/blank frame.
 * All props are passed straight through to the underlying Image.
 */
export default function SafeImage({ style, ...rest }) {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'

  // Re-validate whenever the source changes.
  useEffect(() => {
    setStatus('loading');
  }, [rest?.source?.uri]);

  return (
    <View style={[styles.placeholder, style]}>
      {status !== 'error' ? (
        <Image
          {...rest}
          style={[StyleSheet.absoluteFill, style]}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => StyleSheet.create({
  placeholder: {
    backgroundColor: '#132620',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const styles = makeStyles(themes.darkEmerald, true);
