import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiService, LoanRecord } from '../../src/services/api';

export default function ViewLoanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchLoan();
  }, [id]);

  const fetchLoan = async () => {
    try {
      const data = await apiService.getLoan(id);
      setLoan(data);
    } catch (error) {
      console.error('Error fetching loan:', error);
      Alert.alert('Error', 'No se pudo cargar el préstamo');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4ade80';
      case 'returned':
        return '#60a5fa';
      case 'cancelled':
        return '#f87171';
      default:
        return '#9ca3af';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'returned':
        return 'Devuelto';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiService.updateLoanStatus(id, newStatus);
      setLoan((prev) => (prev ? { ...prev, status: newStatus } : null));
      Alert.alert('Éxito', `Estado actualizado a: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Préstamo',
      '¿Está seguro que desea eliminar este préstamo? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteLoan(id);
              Alert.alert('Éxito', 'Préstamo eliminado');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el préstamo');
            }
          },
        },
      ]
    );
  };

  const generatePrintHTML = () => {
    if (!loan) return '';

    const participantsHTML = loan.participants
      .map(
        (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          <td>${p.account_number || '-'}</td>
          <td class="signature-cell">
            ${p.signature ? `<img src="${p.signature}" class="signature-img" />` : '<div class="signature-line"></div>'}
          </td>
        </tr>
      `
      )
      .join('');

    const equipmentHTML = loan.equipment_list
      .map(
        (e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${e.name}</td>
          <td>${e.serial_number || '-'}</td>
          <td>${e.description || '-'}</td>
        </tr>
      `
      )
      .join('');

    const vehicleSection = loan.vehicle && Object.values(loan.vehicle).some((v) => v)
      ? `
        <div class="section">
          <h3>VEHÍCULO</h3>
          <table class="info-table">
            <tr>
              <td><strong>Placa:</strong> ${loan.vehicle.plate || '-'}</td>
              <td><strong>Marca:</strong> ${loan.vehicle.brand || '-'}</td>
              <td><strong>Modelo:</strong> ${loan.vehicle.model || '-'}</td>
              <td><strong>Color:</strong> ${loan.vehicle.color || '-'}</td>
            </tr>
            <tr>
              <td colspan="4"><strong>Conductor:</strong> ${loan.vehicle.driver_name || '-'}</td>
            </tr>
          </table>
          <p class="note">*El vehículo solo deberá ser conducido por la persona que está anotada.</p>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pase de Préstamo - CAM-TGU</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .header h1 {
            font-size: 18px;
            margin-bottom: 5px;
          }
          .header h2 {
            font-size: 14px;
            font-weight: normal;
            color: #666;
          }
          .request-date {
            text-align: right;
            margin-bottom: 15px;
            font-size: 11px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section h3 {
            background: #f0f0f0;
            padding: 8px;
            margin-bottom: 10px;
            font-size: 13px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
          }
          .data-table th, .data-table td {
            padding: 8px;
            border: 1px solid #333;
            text-align: left;
          }
          .data-table th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .signature-cell {
            min-width: 150px;
            height: 50px;
          }
          .signature-img {
            max-width: 140px;
            max-height: 45px;
          }
          .signature-line {
            border-bottom: 1px solid #333;
            margin-top: 40px;
          }
          .responsible-signature {
            margin-top: 30px;
            text-align: center;
          }
          .responsible-signature-img {
            max-width: 200px;
            max-height: 80px;
            margin: 10px auto;
          }
          .responsible-signature-line {
            border-top: 1px solid #333;
            width: 250px;
            margin: 0 auto;
            padding-top: 5px;
          }
          .note {
            font-size: 10px;
            font-style: italic;
            color: #666;
            margin-top: 5px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: bold;
            font-size: 11px;
          }
          .status-active { background: #dcfce7; color: #166534; }
          .status-returned { background: #dbeafe; color: #1e40af; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CAM-TGU</h1>
          <h2>PASE DE SALIDA DE EQUIPO DEL CENTRO AVANZADO DE MEDIOS</h2>
        </div>
        
        <div class="request-date">
          <strong>Fecha de solicitud:</strong> ${new Date(loan.request_date).toLocaleDateString('es-HN')}
          <span class="status-badge status-${loan.status}">${getStatusLabel(loan.status)}</span>
        </div>

        <div class="section">
          <h3>DESCRIPCIÓN DE LA PRÁCTICA</h3>
          <table class="info-table">
            <tr>
              <td><strong>Clase:</strong> ${loan.class_name}</td>
              <td><strong>Sección:</strong> ${loan.section || '-'}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Docente:</strong> ${loan.teacher_name}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Descripción:</strong> ${loan.practice_description || '-'}</td>
            </tr>
            <tr>
              <td><strong>Fecha de Salida:</strong> ${loan.departure_date}</td>
              <td><strong>Hora de Salida:</strong> ${loan.departure_time}</td>
            </tr>
            <tr>
              <td><strong>Fecha de Regreso:</strong> ${loan.return_date}</td>
              <td><strong>Hora de Regreso:</strong> ${loan.return_time}</td>
            </tr>
            <tr>
              <td><strong>Equipo Entregado Por:</strong> ${loan.delivered_by}</td>
              <td><strong>Personal CAM que Revisó:</strong> ${loan.reviewed_by || '-'}</td>
            </tr>
          </table>
        </div>

        ${vehicleSection}

        <div class="section">
          <h3>INTEGRANTES</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>NOMBRE</th>
                <th>N° DE CUENTA</th>
                <th>FIRMA</th>
              </tr>
            </thead>
            <tbody>
              ${participantsHTML}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>EQUIPO PARA UTILIZAR</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>NOMBRE</th>
                <th>N° DE SERIE</th>
                <th>DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              ${equipmentHTML}
            </tbody>
          </table>
        </div>

        <div class="responsible-signature">
          <h3>FIRMA DEL RESPONSABLE</h3>
          ${loan.responsible_signature 
            ? `<img src="${loan.responsible_signature}" class="responsible-signature-img" />`
            : '<div style="height: 60px;"></div>'
          }
          <div class="responsible-signature-line">Responsable del Préstamo</div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const html = generatePrintHTML();
      
      if (Platform.OS === 'web') {
        // For web, open in new window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        // For mobile
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Error', 'No se pudo generar el documento');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Préstamo no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.className}>{loan.class_name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(loan.status) + '20' },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: getStatusColor(loan.status) }]}
              />
              <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
                {getStatusLabel(loan.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.sectionInfo}>Sección: {loan.section || '-'}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4ade8020' }]}
            onPress={() => handleStatusChange('returned')}
          >
            <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            <Text style={[styles.actionButtonText, { color: '#4ade80' }]}>Devuelto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#f8717120' }]}
            onPress={() => handleStatusChange('cancelled')}
          >
            <Ionicons name="close-circle" size={20} color="#f87171" />
            <Text style={[styles.actionButtonText, { color: '#f87171' }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#60a5fa20' }]}
            onPress={() => router.push(`/edit/${id}`)}
          >
            <Ionicons name="pencil" size={20} color="#60a5fa" />
            <Text style={[styles.actionButtonText, { color: '#60a5fa' }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* General Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Información General</Text>
          </View>
          <View style={styles.infoCard}>
            <InfoRow label="Docente" value={loan.teacher_name} />
            <InfoRow label="Descripción" value={loan.practice_description || '-'} />
            <InfoRow label="Fecha Salida" value={`${loan.departure_date} - ${loan.departure_time}`} />
            <InfoRow label="Fecha Regreso" value={`${loan.return_date} - ${loan.return_time}`} />
            <InfoRow label="Entregado Por" value={loan.delivered_by} />
            <InfoRow label="Revisado Por" value={loan.reviewed_by || '-'} />
          </View>
        </View>

        {/* Vehicle */}
        {loan.vehicle && Object.values(loan.vehicle).some((v) => v) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Vehículo</Text>
            </View>
            <View style={styles.infoCard}>
              <InfoRow label="Placa" value={loan.vehicle.plate || '-'} />
              <InfoRow label="Marca" value={loan.vehicle.brand || '-'} />
              <InfoRow label="Modelo" value={loan.vehicle.model || '-'} />
              <InfoRow label="Color" value={loan.vehicle.color || '-'} />
              <InfoRow label="Conductor" value={loan.vehicle.driver_name || '-'} />
            </View>
          </View>
        )}

        {/* Participants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>
              Integrantes ({loan.participants?.length || 0})
            </Text>
          </View>
          {loan.participants?.map((p, i) => (
            <View key={i} style={styles.participantCard}>
              <View style={styles.participantInfo}>
                <Text style={styles.participantNumber}>{i + 1}</Text>
                <View style={styles.participantDetails}>
                  <Text style={styles.participantName}>{p.name}</Text>
                  <Text style={styles.participantAccount}>
                    N° Cuenta: {p.account_number || '-'}
                  </Text>
                </View>
              </View>
              {p.signature && (
                <Image
                  source={{ uri: p.signature }}
                  style={styles.signaturePreview}
                  resizeMode="contain"
                />
              )}
            </View>
          ))}
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hardware-chip" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>
              Equipo ({loan.equipment_list?.length || 0})
            </Text>
          </View>
          {loan.equipment_list?.map((e, i) => (
            <View key={i} style={styles.equipmentCard}>
              <View style={styles.equipmentHeader}>
                <Text style={styles.equipmentNumber}>{i + 1}</Text>
                <Text style={styles.equipmentName}>{e.name}</Text>
              </View>
              <Text style={styles.equipmentDetail}>Serie: {e.serial_number || '-'}</Text>
              <Text style={styles.equipmentDetail}>Descripción: {e.description || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Responsible Signature */}
        {loan.responsible_signature && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Firma del Responsable</Text>
            </View>
            <View style={styles.responsibleSignatureContainer}>
              <Image
                source={{ uri: loan.responsible_signature }}
                style={styles.responsibleSignature}
                resizeMode="contain"
              />
            </View>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={20} color="#f87171" />
          <Text style={styles.deleteButtonText}>Eliminar Préstamo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Print Button */}
      <View style={[styles.printContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.printButton, printing && styles.printButtonDisabled]}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="print" size={20} color="#fff" />
              <Text style={styles.printButtonText}>Imprimir / Exportar PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

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
  statusCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  className: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionInfo: {
    color: '#9ca3af',
    marginTop: 8,
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  participantCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6366f1',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: 'bold',
    marginRight: 12,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participantAccount: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  signaturePreview: {
    width: 120,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginTop: 12,
  },
  equipmentCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  equipmentNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 10,
  },
  equipmentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  equipmentDetail: {
    color: '#9ca3af',
    fontSize: 13,
    marginLeft: 34,
    marginTop: 2,
  },
  responsibleSignatureContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  responsibleSignature: {
    width: 250,
    height: 100,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: '600',
  },
  printContainer: {
    padding: 16,
    backgroundColor: '#0f0f1a',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
  },
  printButtonDisabled: {
    opacity: 0.6,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
