import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { AppLayout } from '../components/AppLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const handleGoToDebug = () => {
    navigation.navigate('DebugGet');
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome</Text>
        
        <TouchableOpacity 
          style={styles.debugLink}
          onPress={handleGoToDebug}
        >
          <Text style={styles.debugLinkText}>Go to Debug Page</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.debugLink}
          onPress={() => navigation.navigate('Content', { screenContentId: 'test-id' })}
        >
          <Text style={styles.debugLinkText}>Test Content Screen (Invalid ID)</Text>
        </TouchableOpacity>
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  debugLink: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4DA6FF',
    borderRadius: 8,
    marginBottom: 12,
  },
  debugLinkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});