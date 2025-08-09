import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';

export const Footer: React.FC = () => {
  const handleContactPress = () => {
    Linking.openURL('mailto:thierry@kftv.fr');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleContactPress}>
        <Text style={styles.contactText}>thierry@kftv.fr</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  contactText: {
    color: '#4DA6FF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});