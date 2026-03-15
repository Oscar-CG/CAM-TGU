import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0f0f1a',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'CAM-TGU',
            headerShown: true 
          }} 
        />
        <Stack.Screen 
          name="create" 
          options={{ 
            title: 'Nuevo Préstamo',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="view/[id]" 
          options={{ 
            title: 'Detalle del Préstamo'
          }} 
        />
        <Stack.Screen 
          name="edit/[id]" 
          options={{ 
            title: 'Editar Préstamo',
            presentation: 'modal'
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
