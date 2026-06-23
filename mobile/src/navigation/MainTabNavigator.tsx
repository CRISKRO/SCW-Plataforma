import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, LayoutGrid, Target, Image as ImageIcon, Star } from 'lucide-react-native';

import HomeStackNavigator from './HomeStackNavigator';
import MerchScreen from '../screens/public/MerchScreen';
import FanProfileScreen from '../screens/public/FanProfileScreen';

// Dummy screens for now to avoid errors
const DummyDojo = () => null;
const DummyRoster = () => null;
const DummyPremium = () => null;

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b', // zinc-950
          borderTopWidth: 1,
          borderTopColor: '#27272a', // zinc-800
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#ef4444', // red-600
        tabBarInactiveTintColor: '#71717a', // zinc-500
      }}
    >
      <Tab.Screen 
        name="EventsTab" 
        component={HomeStackNavigator} 
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Merch" 
        component={MerchScreen} 
        options={{
          tabBarLabel: 'Tienda',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Dojo" 
        component={DummyDojo} 
        options={{
          tabBarLabel: 'Dojo',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Roster" 
        component={DummyRoster} 
        options={{
          tabBarLabel: 'Roster',
          tabBarIcon: ({ color, size }) => <ImageIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Premium" 
        component={DummyPremium} 
        options={{
          tabBarLabel: 'Premium',
          tabBarIcon: ({ color, size }) => <Star color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
