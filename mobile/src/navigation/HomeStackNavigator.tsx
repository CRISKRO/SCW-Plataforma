import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventsScreen from '../screens/public/EventsScreen';
import EventDetailScreen from '../screens/public/EventDetailScreen';

export type HomeStackParamList = {
  EventsHome: undefined;
  EventDetail: { eventId: number; event: any };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="EventsHome" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    </Stack.Navigator>
  );
}
