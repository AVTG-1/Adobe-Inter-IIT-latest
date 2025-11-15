import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Splash1Screen from '../screens/Splash1Screen';
import HomeScreen from '../screens/HomeScreen';
import EditorScreen from '../screens/EditorScreen';
import LayersScreen from '../screens/LayersScreen';
import EffectsScreen from '../screens/EffectsScreen';

export type RootStackParamList = {
  Splash1: undefined;
  Home: undefined;
  Editor: {
    imageUrl?: string;
    isBlankCanvas?: boolean;
    canvasWidth?: number;
    canvasHeight?: number;
  };
  Layers: undefined;
  Effects: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash1"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Splash1" component={Splash1Screen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Editor" component={EditorScreen} />
        <Stack.Screen name="Layers" component={LayersScreen} />
        <Stack.Screen name="Effects" component={EffectsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
