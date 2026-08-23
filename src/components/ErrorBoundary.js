import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';

/**
 * Global crash shield. Any unhandled render/runtime error inside the wrapped
 * tree shows a friendly recovery screen instead of a white screen of death.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.log('[ErrorBoundary]', error?.message, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor='#091813' />
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          Don't worry — your data is safe. Please try again.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091813',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emoji: { fontSize: 52, marginBottom: 14 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  message: {
    color: '#A7F3D0',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingHorizontal: 34,
    paddingVertical: 13,
    marginTop: 22,
  },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});