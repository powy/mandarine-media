import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  authApi,
  mediaApi,
  usersApi,
  personsApi,
  programsApi,
  seasonsApi,
  countriesApi,
  territoriesApi,
  languagesApi,
  picturesApi,
  categoryListsApi,
  videoFileReportsApi,
  getContentLists,
  getScreenDescriptions,
  initApiClient,
  useAuth,
} from 'share';
import { FoldableMenu } from '../components/FoldableMenu';
import { DataRenderer } from '../components/DataRenderer';
import { currentConfig } from '../../config';

interface ApiData {
  [key: string]: {
    data: any;
    loading: boolean;
    error: string | null;
    count?: number;
  };
}

interface ModelRecord {
  id: number | string;
  [key: string]: any;
}

export const DebugGetScreen: React.FC = () => {
  const [apiData, setApiData] = useState<ApiData>({});
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    initializeApi();
    fetchAllData();
  }, []);

  const initializeApi = () => {
    // API client is now initialized in App.tsx
    console.log('API client already initialized with baseURL:', currentConfig.apiBaseUrl);
  };

  const updateDataState = (key: string, update: Partial<ApiData[string]>) => {
    setApiData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        data: null,
        loading: false,
        error: null,
        count: undefined,
        ...update,
      }
    }));
  };

  const fetchData = async (key: string, fetchFunction: () => Promise<any>) => {
    updateDataState(key, { loading: true, error: null });
    try {
      const data = await fetchFunction();
      const count = Array.isArray(data) ? data.length : 
                   data?.data?.length || 
                   (typeof data === 'object' && data !== null ? Object.keys(data).length : undefined);
      updateDataState(key, { data, loading: false, count });
    } catch (error: any) {
      updateDataState(key, { 
        loading: false, 
        error: error.message || 'Unknown error occurred' 
      });
    }
  };

  const fetchAllData = async () => {
    const apiCalls = [
      // Auth & Users
      { key: 'currentUser', fn: () => authApi.getCurrentUser() },
      { key: 'users', fn: () => usersApi.getUsers({ limit: 10 }) },

      // Media
      { key: 'mediaDescriptions', fn: () => mediaApi.getMediaDescriptions({ limit: 10 }) },
      { key: 'featuredMedia', fn: () => mediaApi.getFeaturedMedia(0, 10) },
      { key: 'trendingMedia', fn: () => mediaApi.getTrendingMedia(0, 10) },
      { key: 'videoFiles', fn: () => mediaApi.getVideoFiles({ limit: 10 }) },
      { key: 'unlinkedVideoFiles', fn: () => mediaApi.getUnlinkedVideoFiles(0, 10) },

      // Content Structure
      { key: 'programs', fn: () => programsApi.getAll({ limit: 10 }) },
      { key: 'seasons', fn: () => seasonsApi.getAll({ limit: 10 }) },

      // People
      { key: 'publicPersons', fn: () => personsApi.getPublicPersons({ limit: 10 }) },

      // Geography & Languages
      { key: 'countries', fn: () => countriesApi.getAll({ limit: 10 }) },
      { key: 'territories', fn: () => territoriesApi.getAll({ limit: 10 }) },
      { key: 'languages', fn: () => languagesApi.getAll({ limit: 10 }) },

      // Visual Content
      { key: 'pictures', fn: () => picturesApi.getAll({ limit: 10 }) },

      // Lists & Organization
      { key: 'categoryLists', fn: () => categoryListsApi.getCategoryLists({ limit: 10 }) },
      { key: 'contentLists', fn: () => getContentLists({ limit: 10 }) },
      { key: 'screenDescriptions', fn: () => getScreenDescriptions({ limit: 10 }) },

      // Reports
      { key: 'videoFileReports', fn: () => videoFileReportsApi.getReports({ limit: 10 }) },
      { key: 'descriptionReports', fn: () => mediaApi.getDescriptionReports(0, 10) },
    ];

    for (const { key, fn } of apiCalls) {
      await fetchData(key, fn);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[DebugGetScreen] User confirmed logout, calling logout function...');
              await logout();
              console.log('[DebugGetScreen] Logout function completed');
            } catch (error) {
              console.error('[DebugGetScreen] Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const renderModelSection = (modelKey: string, modelDisplayName: string) => {
    const item = apiData[modelKey];
    if (!item) return null;

    if (item.loading) {
      return (
        <FoldableMenu
          key={modelKey}
          title={`${modelDisplayName} (Loading...)`}
          defaultExpanded={false}
        >
          <Text style={styles.loading}>Loading...</Text>
        </FoldableMenu>
      );
    }

    if (item.error) {
      return (
        <FoldableMenu
          key={modelKey}
          title={`${modelDisplayName} (Error)`}
          defaultExpanded={false}
        >
          <Text style={styles.error}>Error: {item.error}</Text>
        </FoldableMenu>
      );
    }

    // Extract records from the data structure
    let records: ModelRecord[] = [];
    if (Array.isArray(item.data)) {
      records = item.data;
    } else if (item.data?.data && Array.isArray(item.data.data)) {
      records = item.data.data;
    } else if (item.data && typeof item.data === 'object') {
      // Handle single record case
      records = [item.data];
    }

    return (
      <FoldableMenu
        key={modelKey}
        title={modelDisplayName}
        count={records.length}
        defaultExpanded={false}
      >
        {records.length === 0 ? (
          <Text style={styles.noData}>No records found</Text>
        ) : (
          records.map((record, index) => {
            const recordId = record.id || record.uuid || index;
            const displayId = record.id || record.uuid || `#${index + 1}`;
            
            return (
              <FoldableMenu
                key={`${modelKey}-${recordId}`}
                title={`ID ${displayId}`}
                defaultExpanded={true}
              >
                <DataRenderer data={record} />
              </FoldableMenu>
            );
          })
        )}
      </FoldableMenu>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Debug API Get Functions</Text>
            <Text style={styles.headerSubtitle}>
              Environment: {currentConfig.environment} | Server: {currentConfig.apiBaseUrl}
            </Text>
            {user && (
              <Text style={styles.userInfo}>
                Logged in as: {user.full_name} ({user.email})
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderModelSection('users', 'Users')}
        {renderModelSection('publicPersons', 'PublicPersons')}
        {renderModelSection('programs', 'Programs')}
        {renderModelSection('seasons', 'Seasons')}
        {renderModelSection('mediaDescriptions', 'MediaDescriptions')}
        {renderModelSection('videoFiles', 'VideoFiles')}
        {renderModelSection('countries', 'Countries')}
        {renderModelSection('territories', 'Territories')}
        {renderModelSection('languages', 'Languages')}
        {renderModelSection('pictures', 'Pictures')}
        {renderModelSection('categoryLists', 'CategoryLists')}
        {renderModelSection('contentLists', 'ContentLists')}
        {renderModelSection('screenDescriptions', 'ScreenDescriptions')}
        {renderModelSection('videoFileReports', 'VideoFileReports')}
        {renderModelSection('featuredMedia', 'FeaturedMedia')}
        {renderModelSection('trendingMedia', 'TrendingMedia')}
        {renderModelSection('unlinkedVideoFiles', 'UnlinkedVideoFiles')}
        {renderModelSection('descriptionReports', 'DescriptionReports')}
        {renderModelSection('currentUser', 'CurrentUser')}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pull to refresh • Tap sections to expand/collapse
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 11,
    color: '#007bff',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loading: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    padding: 8,
  },
  error: {
    fontSize: 14,
    color: '#dc2626',
    padding: 8,
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    padding: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});