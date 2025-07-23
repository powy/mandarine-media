import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CarouselItem {
  id: string;
  image: any;
  title?: string;
}

interface CarouselProps {
  data: CarouselItem[];
  onItemPress?: (item: CarouselItem) => void;
}

const Carousel: React.FC<CarouselProps> = ({ data, onItemPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const imageWidth = screenWidth * 0.8;
  const imageHeight = Math.min(screenHeight * 0.4, imageWidth * 1.33); // 4:3 aspect ratio max

  useEffect(() => {
    if (data.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % data.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * screenWidth,
            animated: true,
          });
          return nextIndex;
        });
      }, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data.length]);

  const onScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    if (pageNum >= 0 && pageNum < data.length) {
      setActiveIndex(pageNum);
    }
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
    
    // Reset auto-scroll timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (data.length > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % data.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * screenWidth,
            animated: true,
          });
          return nextIndex;
        });
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {data.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.slide}
            onPress={() => onItemPress?.(item)}
            activeOpacity={0.8}
          >
            <Image
              source={item.image}
              style={[styles.image, { width: imageWidth, height: imageHeight }]}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {data.length > 1 && (
        <View style={styles.pagination}>
          {data.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  scrollView: {
    width: screenWidth,
  },
  slide: {
    width: screenWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderRadius: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666666',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#00BFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default Carousel;