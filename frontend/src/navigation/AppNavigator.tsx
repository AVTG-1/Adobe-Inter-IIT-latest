import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Splash1Screen from '../screens/Splash1Screen';
import Splash2Screen from '../screens/Splash2Screen';
import HomeScreen from '../screens/HomeScreen';
import EditorScreen from '../screens/EditorScreen';

export type RootStackParamList = {
  Splash1: undefined;
  Splash2: undefined;
  Home: undefined;
  Editor: {
    imageUrl?: string;
    isBlankCanvas?: boolean;
    canvasWidth?: number;
    canvasHeight?: number;
  };
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
        <Stack.Screen name="Splash2" component={Splash2Screen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Editor" component={EditorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
