import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { KyoolLogo } from './KyoolLogo';

interface ContentListItem {
  content_id: string;
  content_type: string;
  title: string;
  thumbnail_url?: string;
  display_order: number;
}

interface ContentListProps {
  contentList: {
    id: string;
    title: string;
    description?: string;
    thumbnail_format: string;
    items?: ContentListItem[];
    [key: string]: any;
  };
}

export const ContentList: React.FC<ContentListProps> = ({ contentList }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!contentList) {
    return null;
  }

  const handleItemPress = (item: ContentListItem) => {
    console.log('ContentList: Item pressed:', item);
    console.log('ContentList: Navigating with mediaId:', item.content_id);
    
    if (item.content_type === 'video' || item.content_type === 'media_description') {
      navigation.navigate('Video', { mediaId: item.content_id });
    } else {
      console.log(`Content type "${item.content_type}" not supported yet`);
    }
  };

  const renderContentItem = (item: ContentListItem, index: number) => {
    return (
      <TouchableOpacity 
        key={item.content_id} 
        style={styles.contentItem}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.thumbnailContainer}>
          {item.thumbnail_url ? (
            <Image 
              source={{ uri: item.thumbnail_url }} 
              style={styles.thumbnail}
            />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <KyoolLogo width={60} height={20} />
            </View>
          )}
        </View>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{contentList.title || 'Untitled Content List'}</Text>
      {contentList.description && (
        <Text style={styles.description}>{contentList.description}</Text>
      )}
      
      {contentList.items && contentList.items.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.itemsScrollView}
          contentContainerStyle={styles.itemsContainer}
        >
          {contentList.items.map((item: ContentListItem, index: number) => 
            renderContentItem(item, index)
          )}
        </ScrollView>
      ) : (
        <Text style={styles.noContent}>No content items</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    paddingVertical: 16,
    marginBottom: 20,
  },
  title: {
    color: '#4DA6FF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  description: {
    color: '#999',
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  itemsScrollView: {
    paddingLeft: 16,
  },
  itemsContainer: {
    paddingRight: 16,
  },
  contentItem: {
    marginRight: 12,
    width: 120,
  },
  thumbnailContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 32,
    fontWeight: 'bold',
  },
  itemTitle: {
    color: '#4DA6FF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  noContent: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});