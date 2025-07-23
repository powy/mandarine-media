import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

interface FooterProps {
  activeTab?: string;
}

const Footer: React.FC<FooterProps> = ({ activeTab = 'acceuil' }) => {
  const footerItems = [
    { key: 'acceuil', image: require('../assets/footer/1_acceuil.png'), label: 'ACCEUIL' },
    { key: 'lecture', image: require('../assets/footer/2_lecture.png'), label: 'MODE LECTURE' },
    { key: 'decouvre', image: require('../assets/footer/3_decouvre.png'), label: 'DÉCOUVRE' },
    { key: 'recompenses', image: require('../assets/footer/5_recompenses.png'), label: 'RÉCOMPENSES' },
    { key: 'langue', image: require('../assets/footer/4_coins.png'), label: 'LANGUE' },
    { key: 'jeux', image: require('../assets/footer/6_jeux.png'), label: 'AIRE DE JEUX' },
    { key: 'compte', image: require('../assets/footer/7_compte.png'), label: 'MON COMPTE' },
  ];

  return (
    <View style={styles.container}>
      {footerItems.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.footerItem}
          onPress={() => {
            // Handle navigation
            console.log(`Navigate to ${item.key}`);
          }}
        >
          <Image
            source={item.image}
            style={[
              styles.footerIcon,
              activeTab === item.key && styles.activeIcon
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.footerLabel,
              activeTab === item.key && styles.activeLabel
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 5,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  footerItem: {
    alignItems: 'center',
    flex: 1,
  },
  footerIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
    tintColor: '#FFFFFF',
  },
  activeIcon: {
    tintColor: '#00BFFF',
  },
  footerLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '400',
    textAlign: 'center',
  },
  activeLabel: {
    color: '#00BFFF',
    fontWeight: '600',
  },
});

export default Footer;