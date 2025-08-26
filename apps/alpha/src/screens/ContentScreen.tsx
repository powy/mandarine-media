import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { AppLayout } from '../components/AppLayout';
import { ContentList } from '../components/ContentList';

import contentListRomance from '../mock-data/content-list-romance.json';
import contentListMusique from '../mock-data/content-list-musique.json';
import contentListAnimation from '../mock-data/content-list-animation.json';
import contentListRecomend from '../mock-data/content-list-recomend.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Content'>;

interface ContentListData {
  id: string;
  title: string;
  description?: string;
  thumbnail_format: string;
  is_active: boolean;
  display_order: number;
  last_updated: string;
  items: any[];
}

export const ContentScreen: React.FC<Props> = ({ route }) => {
  const { screenContentId } = route.params || { screenContentId: 'homepage' };
  const [isLoading, setIsLoading] = useState(true);
  const [contentLists, setContentLists] = useState<ContentListData[]>([]);
  const [screenTitle, setScreenTitle] = useState('Content Screen');

  useEffect(() => {
    const loadContentLists = async () => {
      try {
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Load hardcoded content lists
        const lists = [
          contentListRecomend as ContentListData,
          contentListRomance as ContentListData,
          contentListMusique as ContentListData,
          contentListAnimation as ContentListData,
        ];
        
        // Sort by display_order
        const sortedLists = lists.sort((a, b) => a.display_order - b.display_order);
        
        setContentLists(sortedLists);
        
        // Set screen title based on screenContentId or provide a default
        const titleMap: { [key: string]: string } = {
          'homepage': 'À la une',
          'dramas': 'Dramas',
          'kpop': 'K-pop',
          'culture': 'Culture',
        };
        setScreenTitle(titleMap[screenContentId] || 'Contenu');
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading content lists:', error);
        setIsLoading(false);
      }
    };

    loadContentLists();
  }, [screenContentId]);

  if (isLoading) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4DA6FF" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        <Text style={styles.title}>{screenTitle}</Text>
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {contentLists.length > 0 ? (
              contentLists.map((contentList) => (
                <ContentList 
                  key={contentList.id} 
                  contentList={contentList} 
                />
              ))
            ) : (
              <Text style={styles.noContentText}>No content lists found</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4DA6FF',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#4DA6FF',
    fontSize: 16,
    marginTop: 10,
  },
  noContentText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
});