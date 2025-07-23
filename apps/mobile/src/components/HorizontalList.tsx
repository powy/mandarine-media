import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface ListItem {
  id: string;
  image: any;
  title?: string;
}

interface HorizontalListProps {
  title: string;
  data: ListItem[];
  onItemPress?: (item: ListItem) => void;
  itemWidth?: number;
  itemHeight?: number;
}

const HorizontalList: React.FC<HorizontalListProps> = ({
  title,
  data,
  onItemPress,
  itemWidth = 120,
  itemHeight = 160,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {data.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.item,
              {
                width: itemWidth,
                marginLeft: index === 0 ? 20 : 0,
                marginRight: index === data.length - 1 ? 20 : 10,
              },
            ]}
            onPress={() => onItemPress?.(item)}
            activeOpacity={0.8}
          >
            <Image
              source={item.image}
              style={[styles.itemImage, { width: itemWidth, height: itemHeight }]}
              resizeMode="cover"
            />
            {item.title && (
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 20,
    marginBottom: 15,
  },
  scrollView: {
    paddingLeft: 0,
  },
  scrollContainer: {
    alignItems: 'flex-start',
  },
  item: {
    alignItems: 'center',
  },
  itemImage: {
    borderRadius: 8,
    backgroundColor: '#333333',
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 120,
  },
});

export default HorizontalList;