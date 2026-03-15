import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../src/services/api';

// UNITEC CAM Colors
const COLORS = {
  primary: '#1a4b8c',
  primaryDark: '#0d1b3e',
  primaryLight: '#2563eb',
  background: '#0a1628',
  surface: '#0d2140',
  surfaceLight: '#153058',
  border: '#1e4976',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
};

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualId, setManualId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const loan = await apiService.getLoan(data);
      if (loan) {
        router.replace(`/view/${data}`);
      }
    } catch (error) {
      Alert.alert(
        'Préstamo no encontrado',
        'El código QR escaneado no corresponde a ningún préstamo registrado.',
        [
          { text: 'Intentar de nuevo', onPress: () => setScanned(false) },
          { text: 'Cancelar', onPress: () => router.back() },
        ]
      );
    }
  };

  const handleManualSearch = async () => {
    if (!manualId.trim()) {
      Alert.alert('Error', 'Por favor ingrese un ID de préstamo');
      return;
    }

    try {
      const loan = await apiService.getLoan(manualId.trim());
      if (loan) {
        router.replace(`/view/${manualId.trim()}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se encontró ningún préstamo con ese ID');
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Cargando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="camera-outline" size={64} color={COLORS.accent} />
        <Text style={styles.message}>Se necesita permiso para acceder a la cámara</Text>
        <Text style={styles.submessage}>
          Para escanear códigos QR, necesitamos acceso a tu cámara.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text style={styles.permissionButtonText}>Conceder Permiso</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.manualButton} 
          onPress={() => setShowManualInput(true)}
        >
          <Ionicons name="keypad-outline" size={20} color={COLORS.accent} />
          <Text style={styles.manualButtonText}>Ingresar ID Manualmente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showManualInput) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="search" size={64} color={COLORS.accent} />
        <Text style={styles.message}>Buscar por ID</Text>
        <Text style={styles.submessage}>
          Ingrese el ID del préstamo para buscarlo
        </Text>
        
        <TextInput
          style={styles.input}
          value={manualId}
          onChangeText={setManualId}
          placeholder="ID del préstamo"
          placeholderTextColor={COLORS.border}
          autoCapitalize="none"
        />
        
        <TouchableOpacity style={styles.searchButton} onPress={handleManualSearch}>
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setShowManualInput(false)}
        >
          <Ionicons name="camera" size={20} color={COLORS.accent} />
          <Text style={styles.backButtonText}>Usar Cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <Text style={styles.scanText}>Apunte al código QR del préstamo</Text>
          
          {scanned && (
            <TouchableOpacity 
              style={styles.rescanButton} 
              onPress={() => setScanned(false)}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.rescanText}>Escanear de nuevo</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>

      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={styles.manualSearchButton} 
          onPress={() => setShowManualInput(true)}
        >
          <Ionicons name="keypad-outline" size={20} color="#fff" />
          <Text style={styles.manualSearchText}>Ingresar ID</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,22,40,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 32,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  submessage: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 16,
  },
  manualButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  rescanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: 'center',
  },
  manualSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  manualSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    marginTop: 24,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 16,
  },
  backButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
