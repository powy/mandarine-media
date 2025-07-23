import React, { useState } from 'react';
import {
  StatusBar,
  StyleSheet,
} from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import VideoPage from './screens/VideoPage';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'video'>('welcome');

  const navigateToVideo = (item?: any) => {
    console.log('Navigating to video with item:', item?.id || 'default');
    setCurrentScreen('video');
  };

  const navigateToWelcome = () => {
    setCurrentScreen('welcome');
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {currentScreen === 'welcome' ? (
        <WelcomeScreen onItemPress={navigateToVideo} />
      ) : (
        <VideoPage onBack={navigateToWelcome} />
      )}
    </>
  );
};

export default App;