// App-debug.tsx - Simple version without useAuth to test basic functionality
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const App: React.FC = () => {
  useEffect(() => {
    console.log('App is mounting - this should appear in Metro logs');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Debug App - Testing without useAuth</Text>
      <Text style={styles.subtext}>If you see this, React Native is working</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default App;