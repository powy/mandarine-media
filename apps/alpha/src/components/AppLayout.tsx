import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from './Header';
import { Footer } from './Footer';

interface Props {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export const AppLayout: React.FC<Props> = ({ 
  children, 
  showHeader = true, 
  showFooter = true 
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {showHeader && <Header />}
      <View style={styles.content}>
        {children}
      </View>
      {showFooter && <Footer />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
});