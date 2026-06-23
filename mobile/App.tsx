// import "./global.css";
import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, StatusBar, SafeAreaView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Lucha SCW</Text>
      <Text style={{ color: '#aaa', marginTop: 10 }}>Bienvenido a la App</Text>
    </SafeAreaView>
  );
}

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
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
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
