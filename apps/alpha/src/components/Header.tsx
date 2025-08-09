import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { KyoolLogo } from './KyoolLogo';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  title: string;
}

export const Header: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Hardcoded menu items as requested
  const menuItems: MenuItem[] = [
    { id: 'homepage', title: 'À la une' },
    { id: 'dramas', title: 'Dramas' },
    { id: 'kpop', title: 'K-pop' },
    { id: 'culture', title: 'Culture' },
  ];

  const handleLogoPress = () => {
    navigation.navigate('Welcome');
  };

  const handleLogout = () => {
    setShowAccountMenu(false);
    navigation.navigate('Login');
  };

  const handleMenuItemPress = (menuItem: MenuItem) => {
    navigation.navigate('Content', { screenContentId: menuItem.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={handleLogoPress} style={styles.logoContainer}>
          <KyoolLogo width={120} height={40} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.accountButton}
          onPress={() => setShowAccountMenu(true)}
        >
          <Text style={styles.accountButtonText}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        style={styles.menuRow}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        {menuItems.map((menuItem) => (
          <TouchableOpacity
            key={menuItem.id}
            style={styles.menuItem}
            onPress={() => handleMenuItemPress(menuItem)}
          >
            <Text style={styles.menuItemText}>{menuItem.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={showAccountMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountMenu(false)}
        >
          <View style={styles.accountMenu}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleLogout}
            >
              <Text style={styles.menuOptionText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoContainer: {
    height: 40,
    width: 120,
  },
  logo: {
    height: '100%',
    width: '100%',
  },
  accountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4DA6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  menuRow: {
    backgroundColor: '#000',
    paddingVertical: 8,
  },
  menuContent: {
    paddingHorizontal: 16,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#333',
    borderRadius: 16,
  },
  menuItemText: {
    color: '#4DA6FF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  accountMenu: {
    backgroundColor: '#333',
    borderRadius: 8,
    minWidth: 120,
  },
  menuOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionText: {
    color: '#4DA6FF',
    fontSize: 16,
    fontWeight: '600',
  },
});