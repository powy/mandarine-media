import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MuxVideoPlayer from '../components/MuxVideoPlayer';

interface VideoData {
  title: string;
  description: string;
  playbackId: string;
}

interface VideoPageProps {
  videoData?: VideoData;
  onBack?: () => void;
}

const VideoPage: React.FC<VideoPageProps> = ({ 
  videoData = {
    title: "kum-drums-1-basic",
    description: "boom bomm bam bam bim",
    playbackId: "WkN2QAqFAHhGpA5zMJM01voG73tBdh9ggrFf1aQC2YGI"
  },
  onBack
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <Header showBackButton={true} onBackPress={onBack} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Player */}
        <MuxVideoPlayer
          playbackId={videoData.playbackId}
          title={videoData.title}
          videoId={videoData.playbackId}
          autoPlay={false}
          muted={true}
          controls={true}
          aspectRatio={16 / 9}
        />
        
        {/* Video Information */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{videoData.title}</Text>
          <Text style={styles.videoDescription}>{videoData.description}</Text>
        </View>

        {/* Additional Content Space */}
        <View style={styles.additionalContent}>
          <Text style={styles.sectionTitle}>Related Videos</Text>
          <Text style={styles.placeholderText}>
            More content can be added here...
          </Text>
        </View>

        {/* Bottom spacing for footer */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      <Footer activeTab="lecture" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoInfo: {
    padding: 20,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 28,
  },
  videoDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'left',
  },
  additionalContent: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  placeholderText: {
    color: '#888888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default VideoPage;