import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface HeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ showBackButton = false, onBackPress }) => {
  const categories = [
    'WEBTOON',
    'SHORT-DRAMA',
    'FILMS',
    'TVSHOW',
    'DRAMA',
    'LIVE CONCERT',
    'DOCUMENTAIRE',
    'BOUTIQUE',
    'FORUM',
    'PARTENAIRES',
    'VOYAGES',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {showBackButton ? (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        ) : (
          <Image
            source={require('../assets/KYOOL_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <View style={styles.iconsContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.categoriesContainer}>
        {categories.map((category, index) => (
          <TouchableOpacity key={index} style={styles.categoryItem}>
            <Text style={styles.categoryText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 80,
    height: 40,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 20,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  categoryItem: {
    marginRight: 15,
    marginBottom: 5,
  },
  categoryText: {
    color: '#00BFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
});

export default Header;