import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, Participant, Equipment, Vehicle, LoanRecordCreate } from '../src/services/api';
import SignatureCapture from '../src/components/SignatureCapture';

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

// Simple date/time picker for web compatibility
const WebDateTimePicker = ({ 
  visible, 
  mode, 
  onConfirm, 
  onCancel,
  value 
}: { 
  visible: boolean; 
  mode: 'date' | 'time';
  onConfirm: (value: string) => void;
  onCancel: () => void;
  value: string;
}) => {
  const [tempValue, setTempValue] = useState(value);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={webPickerStyles.overlay}>
        <View style={webPickerStyles.container}>
          <Text style={webPickerStyles.title}>
            {mode === 'date' ? 'Seleccionar Fecha' : 'Seleccionar Hora'}
          </Text>
          
          {Platform.OS === 'web' ? (
            <input
              type={mode}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              style={{
                fontSize: 18,
                padding: 12,
                borderRadius: 8,
                border: '2px solid #1a4b8c',
                backgroundColor: '#fff',
                width: '100%',
                marginVertical: 16,
              }}
            />
          ) : (
            <TextInput
              style={webPickerStyles.input}
              value={tempValue}
              onChangeText={setTempValue}
              placeholder={mode === 'date' ? 'DD/MM/YYYY' : 'HH:MM'}
              placeholderTextColor="#999"
            />
          )}
          
          <View style={webPickerStyles.buttons}>
            <TouchableOpacity style={webPickerStyles.cancelButton} onPress={onCancel}>
              <Text style={webPickerStyles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={webPickerStyles.confirmButton} 
              onPress={() => {
                if (tempValue) {
                  // Format the value appropriately
                  if (mode === 'date' && Platform.OS === 'web') {
                    // Convert from YYYY-MM-DD to DD/MM/YYYY
                    const [year, month, day] = tempValue.split('-');
                    onConfirm(`${day}/${month}/${year}`);
                  } else if (mode === 'time') {
                    onConfirm(tempValue);
                  } else {
                    onConfirm(tempValue);
                  }
                }
              }}
            >
              <Text style={webPickerStyles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const webPickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a4b8c',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    fontSize: 18,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1a4b8c',
    backgroundColor: '#fff',
    marginVertical: 16,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#1a4b8c',
  },
  confirmButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
  },
});

type PickerMode = 'departureDate' | 'departureTime' | 'returnDate' | 'returnTime' | null;

export default function CreateLoanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureFor, setCurrentSignatureFor] = useState<'responsible' | number>('responsible');
  
  // Date/Time picker state
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  // Form state
  const [formData, setFormData] = useState<LoanRecordCreate>({
    class_name: '',
    section: '',
    teacher_name: '',
    practice_description: '',
    departure_date: '',
    departure_time: '',
    return_date: '',
    return_time: '',
    delivered_by: '',
    reviewed_by: '',
    vehicle: {
      plate: '',
      brand: '',
      model: '',
      color: '',
      driver_name: '',
    },
    participants: [{ name: '', account_number: '', signature: '' }],
    equipment_list: [{ name: '', serial_number: '', description: '' }],
    responsible_signature: '',
    status: 'active',
  });

  const updateField = (field: keyof LoanRecordCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateVehicle = (field: keyof Vehicle, value: string) => {
    setFormData((prev) => ({
      ...prev,
      vehicle: { ...prev.vehicle, [field]: value },
    }));
  };

  const addParticipant = () => {
    setFormData((prev) => ({
      ...prev,
      participants: [...prev.participants, { name: '', account_number: '', signature: '' }],
    }));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...formData.participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setFormData((prev) => ({ ...prev, participants: newParticipants }));
  };

  const removeParticipant = (index: number) => {
    if (formData.participants.length > 1) {
      const newParticipants = formData.participants.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, participants: newParticipants }));
    }
  };

  const addEquipment = () => {
    setFormData((prev) => ({
      ...prev,
      equipment_list: [...prev.equipment_list, { name: '', serial_number: '', description: '' }],
    }));
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: string) => {
    const newEquipment = [...formData.equipment_list];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setFormData((prev) => ({ ...prev, equipment_list: newEquipment }));
  };

  const removeEquipment = (index: number) => {
    if (formData.equipment_list.length > 1) {
      const newEquipment = formData.equipment_list.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, equipment_list: newEquipment }));
    }
  };

  const openSignatureCapture = (forWhom: 'responsible' | number) => {
    setCurrentSignatureFor(forWhom);
    setShowSignatureModal(true);
  };

  const handleSignatureSave = (signature: string) => {
    if (currentSignatureFor === 'responsible') {
      updateField('responsible_signature', signature);
    } else {
      updateParticipant(currentSignatureFor, 'signature', signature);
    }
  };

  // Date/Time picker handlers
  const handleDateTimeConfirm = (value: string) => {
    if (!pickerMode) return;

    switch (pickerMode) {
      case 'departureDate':
        updateField('departure_date', value);
        break;
      case 'departureTime':
        updateField('departure_time', value);
        break;
      case 'returnDate':
        updateField('return_date', value);
        break;
      case 'returnTime':
        updateField('return_time', value);
        break;
    }
    
    setPickerMode(null);
  };

  const getPickerType = (): 'date' | 'time' => {
    if (pickerMode === 'departureTime' || pickerMode === 'returnTime') {
      return 'time';
    }
    return 'date';
  };

  const getPickerValue = (): string => {
    if (!pickerMode) return '';
    
    const valueMap: Record<string, string> = {
      departureDate: formData.departure_date,
      departureTime: formData.departure_time,
      returnDate: formData.return_date,
      returnTime: formData.return_time,
    };
    
    return valueMap[pickerMode] || '';
  };

  const validateForm = (): boolean => {
    if (!formData.class_name.trim()) {
      Alert.alert('Error', 'El nombre de la clase es requerido');
      return false;
    }
    if (!formData.teacher_name.trim()) {
      Alert.alert('Error', 'El nombre del docente es requerido');
      return false;
    }
    if (!formData.departure_date.trim() || !formData.departure_time.trim()) {
      Alert.alert('Error', 'La fecha y hora de salida son requeridas');
      return false;
    }
    if (!formData.return_date.trim() || !formData.return_time.trim()) {
      Alert.alert('Error', 'La fecha y hora de regreso son requeridas');
      return false;
    }
    if (!formData.delivered_by.trim()) {
      Alert.alert('Error', 'El nombre de quien entrega es requerido');
      return false;
    }
    if (formData.participants.some((p) => !p.name.trim())) {
      Alert.alert('Error', 'Todos los integrantes deben tener nombre');
      return false;
    }
    if (formData.equipment_list.some((e) => !e.name.trim())) {
      Alert.alert('Error', 'Todos los equipos deben tener nombre');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const vehicleData = formData.vehicle;
      const hasVehicleData = vehicleData && Object.values(vehicleData).some((v) => v && v.trim());
      
      const submitData = {
        ...formData,
        vehicle: hasVehicleData ? vehicleData : undefined,
      };

      await apiService.createLoan(submitData);
      Alert.alert('Éxito', 'Préstamo creado exitosamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating loan:', error);
      Alert.alert('Error', 'No se pudo crear el préstamo. Verifica tu conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder?: string,
    multiline?: boolean
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={COLORS.border}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );

  const renderDateTimePicker = (
    label: string,
    value: string,
    mode: PickerMode,
    icon: string,
    placeholder: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dateTimeButton}
        onPress={() => setPickerMode(mode)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon as any} size={20} color={COLORS.accent} />
        <Text style={[styles.dateTimeButtonText, !value && styles.dateTimePlaceholder]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Datos Generales</Text>
        </View>

        {renderInput('Nombre de la Clase *', formData.class_name, (v) => updateField('class_name', v))}
        {renderInput('Sección', formData.section, (v) => updateField('section', v))}
        {renderInput('Docente *', formData.teacher_name, (v) => updateField('teacher_name', v))}
        {renderInput(
          'Descripción de la Práctica',
          formData.practice_description,
          (v) => updateField('practice_description', v),
          'Descripción detallada...',
          true
        )}

        {/* Dates */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Fechas y Horarios</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderDateTimePicker(
              'Fecha Salida *',
              formData.departure_date,
              'departureDate',
              'calendar-outline',
              'Seleccionar'
            )}
          </View>
          <View style={styles.halfInput}>
            {renderDateTimePicker(
              'Hora Salida *',
              formData.departure_time,
              'departureTime',
              'time-outline',
              'Seleccionar'
            )}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderDateTimePicker(
              'Fecha Regreso *',
              formData.return_date,
              'returnDate',
              'calendar-outline',
              'Seleccionar'
            )}
          </View>
          <View style={styles.halfInput}>
            {renderDateTimePicker(
              'Hora Regreso *',
              formData.return_time,
              'returnTime',
              'time-outline',
              'Seleccionar'
            )}
          </View>
        </View>

        {/* CAM Staff */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Personal del CAM</Text>
        </View>

        {renderInput('Equipo Entregado Por *', formData.delivered_by, (v) => updateField('delivered_by', v))}
        {renderInput('Personal que Revisó', formData.reviewed_by, (v) => updateField('reviewed_by', v))}

        {/* Vehicle */}
        <View style={styles.sectionHeader}>
          <Ionicons name="car" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Vehículo (Opcional)</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderInput('Placa', formData.vehicle?.plate || '', (v) => updateVehicle('plate', v))}
          </View>
          <View style={styles.halfInput}>
            {renderInput('Marca', formData.vehicle?.brand || '', (v) => updateVehicle('brand', v))}
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderInput('Modelo', formData.vehicle?.model || '', (v) => updateVehicle('model', v))}
          </View>
          <View style={styles.halfInput}>
            {renderInput('Color', formData.vehicle?.color || '', (v) => updateVehicle('color', v))}
          </View>
        </View>
        {renderInput('Nombre del Conductor', formData.vehicle?.driver_name || '', (v) => updateVehicle('driver_name', v))}

        {/* Participants */}
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Integrantes</Text>
        </View>

        {formData.participants.map((participant, index) => (
          <View key={index} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <Text style={styles.participantNumber}>Integrante {index + 1}</Text>
              {formData.participants.length > 1 && (
                <TouchableOpacity onPress={() => removeParticipant(index)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
            {renderInput('Nombre *', participant.name, (v) => updateParticipant(index, 'name', v))}
            {renderInput('Número de Cuenta', participant.account_number, (v) =>
              updateParticipant(index, 'account_number', v)
            )}
            <TouchableOpacity
              style={styles.signatureButton}
              onPress={() => openSignatureCapture(index)}
            >
              {participant.signature ? (
                <View style={styles.signaturePreview}>
                  <Image
                    source={{ uri: participant.signature }}
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.signatureButtonTextDone}>Firma capturada</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="pencil" size={20} color={COLORS.accent} />
                  <Text style={styles.signatureButtonText}>Capturar Firma</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addParticipant}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
          <Text style={styles.addButtonText}>Agregar Integrante</Text>
        </TouchableOpacity>

        {/* Equipment */}
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Equipo a Utilizar</Text>
        </View>

        {formData.equipment_list.map((equipment, index) => (
          <View key={index} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <Text style={styles.participantNumber}>Equipo {index + 1}</Text>
              {formData.equipment_list.length > 1 && (
                <TouchableOpacity onPress={() => removeEquipment(index)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
            {renderInput('Nombre del Equipo *', equipment.name, (v) => updateEquipment(index, 'name', v))}
            {renderInput('Número de Serie', equipment.serial_number, (v) =>
              updateEquipment(index, 'serial_number', v)
            )}
            {renderInput('Descripción', equipment.description, (v) =>
              updateEquipment(index, 'description', v)
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addEquipment}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
          <Text style={styles.addButtonText}>Agregar Equipo</Text>
        </TouchableOpacity>

        {/* Responsible Signature */}
        <View style={styles.sectionHeader}>
          <Ionicons name="create" size={24} color={COLORS.accent} />
          <Text style={styles.sectionTitle}>Firma del Responsable</Text>
        </View>

        <TouchableOpacity
          style={styles.responsibleSignatureButton}
          onPress={() => openSignatureCapture('responsible')}
        >
          {formData.responsible_signature ? (
            <View style={styles.signaturePreviewLarge}>
              <Image
                source={{ uri: formData.responsible_signature }}
                style={styles.signatureImageLarge}
                resizeMode="contain"
              />
              <Text style={styles.signatureButtonTextDone}>Firma capturada - Toque para cambiar</Text>
            </View>
          ) : (
            <>
              <Ionicons name="pencil" size={32} color={COLORS.accent} />
              <Text style={styles.responsibleSignatureText}>Toque para firmar</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Guardar Préstamo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date/Time Picker Modal */}
      <WebDateTimePicker
        visible={pickerMode !== null}
        mode={getPickerType()}
        value={getPickerValue()}
        onConfirm={handleDateTimeConfirm}
        onCancel={() => setPickerMode(null)}
      />

      <SignatureCapture
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSignatureSave}
        title={
          currentSignatureFor === 'responsible'
            ? 'Firma del Responsable'
            : `Firma - Integrante ${(currentSignatureFor as number) + 1}`
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateTimeButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    flex: 1,
  },
  dateTimePlaceholder: {
    color: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  participantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantNumber: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  signatureButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  signatureButtonTextDone: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: 4,
  },
  signaturePreview: {
    alignItems: 'center',
  },
  signatureImage: {
    width: 150,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 8,
  },
  addButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '500',
  },
  responsibleSignatureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    minHeight: 150,
  },
  responsibleSignatureText: {
    color: COLORS.accent,
    fontSize: 16,
    marginTop: 12,
  },
  signaturePreviewLarge: {
    alignItems: 'center',
  },
  signatureImageLarge: {
    width: 250,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  submitContainer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
