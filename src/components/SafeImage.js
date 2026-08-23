import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';

/**
 * Drop-in replacement for <Image /> with built-in failure resilience:
 *  - shows a soft green placeholder while loading,
 *  - keeps the placeholder if the source fails to load (broken URL, missing
 *    file, network error) instead of rendering a broken/blank frame.
 * All props are passed straight through to the underlying Image.
 */
export default function SafeImage({ style, ...rest }) {
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

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#132620',
    justifyContent: 'center',
    alignItems: 'center',
  },
});