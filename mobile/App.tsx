import "./global.css";
import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, StatusBar, SafeAreaView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const video = useRef(null);

  if (!isVideoFinished) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar hidden />
        <Video
          ref={video}
          style={styles.video}
          source={require('./assets/scw screen.mp4')}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping={false}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsVideoFinished(true);
            }
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
