import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService, LoanRecord, Participant, Equipment, Vehicle } from '../../src/services/api';
import SignatureCapture from '../../src/components/SignatureCapture';

export default function EditLoanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureFor, setCurrentSignatureFor] = useState<'responsible' | number>('responsible');
  const [formData, setFormData] = useState<LoanRecord | null>(null);

  useEffect(() => {
    fetchLoan();
  }, [id]);

  const fetchLoan = async () => {
    try {
      const data = await apiService.getLoan(id);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching loan:', error);
      Alert.alert('Error', 'No se pudo cargar el préstamo');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof LoanRecord, value: any) => {
    if (!formData) return;
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateVehicle = (field: keyof Vehicle, value: string) => {
    if (!formData) return;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            vehicle: { ...prev.vehicle, [field]: value },
          }
        : null
    );
  };

  const addParticipant = () => {
    if (!formData) return;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            participants: [...prev.participants, { name: '', account_number: '', signature: '' }],
          }
        : null
    );
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    if (!formData) return;
    const newParticipants = [...formData.participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setFormData((prev) => (prev ? { ...prev, participants: newParticipants } : null));
  };

  const removeParticipant = (index: number) => {
    if (!formData || formData.participants.length <= 1) return;
    const newParticipants = formData.participants.filter((_, i) => i !== index);
    setFormData((prev) => (prev ? { ...prev, participants: newParticipants } : null));
  };

  const addEquipment = () => {
    if (!formData) return;
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            equipment_list: [
              ...prev.equipment_list,
              { name: '', serial_number: '', description: '' },
            ],
          }
        : null
    );
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: string) => {
    if (!formData) return;
    const newEquipment = [...formData.equipment_list];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setFormData((prev) => (prev ? { ...prev, equipment_list: newEquipment } : null));
  };

  const removeEquipment = (index: number) => {
    if (!formData || formData.equipment_list.length <= 1) return;
    const newEquipment = formData.equipment_list.filter((_, i) => i !== index);
    setFormData((prev) => (prev ? { ...prev, equipment_list: newEquipment } : null));
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

  const handleSubmit = async () => {
    if (!formData) return;

    setSaving(true);
    try {
      const vehicleData = formData.vehicle;
      const hasVehicleData =
        vehicleData && Object.values(vehicleData).some((v) => v && typeof v === 'string' && v.trim());

      const updateData = {
        class_name: formData.class_name,
        section: formData.section,
        teacher_name: formData.teacher_name,
        practice_description: formData.practice_description,
        departure_date: formData.departure_date,
        departure_time: formData.departure_time,
        return_date: formData.return_date,
        return_time: formData.return_time,
        delivered_by: formData.delivered_by,
        reviewed_by: formData.reviewed_by,
        vehicle: hasVehicleData ? vehicleData : undefined,
        participants: formData.participants,
        equipment_list: formData.equipment_list,
        responsible_signature: formData.responsible_signature,
        status: formData.status,
      };

      await apiService.updateLoan(id, updateData);
      Alert.alert('Éxito', 'Préstamo actualizado exitosamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating loan:', error);
      Alert.alert('Error', 'No se pudo actualizar el préstamo');
    } finally {
      setSaving(false);
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
        placeholderTextColor="#6b7280"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!formData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudo cargar el préstamo</Text>
      </View>
    );
  }

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
          <Ionicons name="document-text" size={24} color="#6366f1" />
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
          <Ionicons name="calendar" size={24} color="#6366f1" />
          <Text style={styles.sectionTitle}>Fechas y Horarios</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderInput('Fecha Salida *', formData.departure_date, (v) => updateField('departure_date', v), 'DD/MM/YYYY')}
          </View>
          <View style={styles.halfInput}>
            {renderInput('Hora Salida *', formData.departure_time, (v) => updateField('departure_time', v), 'HH:MM')}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            {renderInput('Fecha Regreso *', formData.return_date, (v) => updateField('return_date', v), 'DD/MM/YYYY')}
          </View>
          <View style={styles.halfInput}>
            {renderInput('Hora Regreso *', formData.return_time, (v) => updateField('return_time', v), 'HH:MM')}
          </View>
        </View>

        {/* CAM Staff */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={24} color="#6366f1" />
          <Text style={styles.sectionTitle}>Personal del CAM</Text>
        </View>

        {renderInput('Equipo Entregado Por *', formData.delivered_by, (v) => updateField('delivered_by', v))}
        {renderInput('Personal que Revisó', formData.reviewed_by, (v) => updateField('reviewed_by', v))}

        {/* Vehicle */}
        <View style={styles.sectionHeader}>
          <Ionicons name="car" size={24} color="#6366f1" />
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
          <Ionicons name="people" size={24} color="#6366f1" />
          <Text style={styles.sectionTitle}>Integrantes</Text>
        </View>

        {formData.participants.map((participant, index) => (
          <View key={index} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <Text style={styles.participantNumber}>Integrante {index + 1}</Text>
              {formData.participants.length > 1 && (
                <TouchableOpacity onPress={() => removeParticipant(index)}>
                  <Ionicons name="trash-outline" size={20} color="#f87171" />
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
                  <Ionicons name="pencil" size={20} color="#6366f1" />
                  <Text style={styles.signatureButtonText}>Capturar Firma</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addParticipant}>
          <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
          <Text style={styles.addButtonText}>Agregar Integrante</Text>
        </TouchableOpacity>

        {/* Equipment */}
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip" size={24} color="#6366f1" />
          <Text style={styles.sectionTitle}>Equipo a Utilizar</Text>
        </View>

        {formData.equipment_list.map((equipment, index) => (
          <View key={index} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <Text style={styles.participantNumber}>Equipo {index + 1}</Text>
              {formData.equipment_list.length > 1 && (
                <TouchableOpacity onPress={() => removeEquipment(index)}>
                  <Ionicons name="trash-outline" size={20} color="#f87171" />
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
          <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
          <Text style={styles.addButtonText}>Agregar Equipo</Text>
        </TouchableOpacity>

        {/* Responsible Signature */}
        <View style={styles.sectionHeader}>
          <Ionicons name="create" size={24} color="#6366f1" />
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
              <Ionicons name="pencil" size={32} color="#6366f1" />
              <Text style={styles.responsibleSignatureText}>Toque para firmar</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Guardar Cambios</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#0f0f1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
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
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  participantCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantNumber: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  signatureButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  signatureButtonTextDone: {
    color: '#4ade80',
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
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  responsibleSignatureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    minHeight: 150,
  },
  responsibleSignatureText: {
    color: '#6366f1',
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
    backgroundColor: '#0f0f1a',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
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
