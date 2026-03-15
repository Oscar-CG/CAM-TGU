import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Image, Text, StyleSheet } from 'react-native';

// Custom header component with logo
const CustomHeader = () => (
  <View style={headerStyles.container}>
    <Image
      source={require('../assets/images/unitec-cam-logo.png')}
      style={headerStyles.logo}
      resizeMode="contain"
    />
  </View>
);

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  logo: {
    width: 180,
    height: 40,
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0d1b3e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0a1628',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerTitle: () => <CustomHeader />,
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
        <Stack.Screen 
          name="scanner" 
          options={{ 
            title: 'Escanear QR',
            presentation: 'modal'
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
