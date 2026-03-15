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
import QRCode from 'react-native-qrcode-svg';
import { apiService, LoanRecord } from '../../src/services/api';

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

export default function ViewLoanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const qrRef = useRef<any>(null);

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
        return COLORS.success;
      case 'returned':
        return COLORS.accent;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
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
        <title>Pase de Préstamo - CAM UNITEC</title>
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
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 3px solid #1a4b8c;
            padding-bottom: 15px;
          }
          .header-left {
            flex: 1;
          }
          .logo-text {
            font-size: 24px;
            font-weight: bold;
            color: #1a4b8c;
          }
          .logo-subtitle {
            font-size: 12px;
            color: #1a4b8c;
            margin-top: 4px;
          }
          .header h1 {
            font-size: 16px;
            margin-top: 10px;
            color: #0d1b3e;
          }
          .qr-container {
            text-align: center;
            padding: 10px;
            border: 2px solid #1a4b8c;
            border-radius: 8px;
            background: #f8fafc;
          }
          .qr-container svg, .qr-container img {
            width: 100px;
            height: 100px;
          }
          .qr-label {
            font-size: 10px;
            color: #666;
            margin-top: 5px;
          }
          .qr-id {
            font-family: monospace;
            font-size: 8px;
            color: #1a4b8c;
            word-break: break-all;
            max-width: 120px;
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
            background: #1a4b8c;
            color: white;
            padding: 8px 12px;
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
            border: 1px solid #1a4b8c;
            text-align: left;
          }
          .data-table th {
            background: #e8f0fe;
            font-weight: bold;
            color: #1a4b8c;
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
          .responsible-signature h3 {
            background: none;
            color: #1a4b8c;
            border-bottom: 2px solid #1a4b8c;
            display: inline-block;
            padding: 8px 20px;
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
          <div class="header-left">
            <div class="logo-text">UNITEC | Centro Avanzado de Medios</div>
            <div class="logo-subtitle">ESCUELA DE ARTE & DISEÑO | TEGUCIGALPA</div>
            <h1>PASE DE SALIDA DE EQUIPO</h1>
          </div>
          <div class="qr-container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
              <rect width="100" height="100" fill="white" stroke="#1a4b8c" stroke-width="2"/>
              <rect x="10" y="10" width="25" height="25" fill="#1a4b8c"/>
              <rect x="15" y="15" width="15" height="15" fill="white"/>
              <rect x="18" y="18" width="9" height="9" fill="#1a4b8c"/>
              <rect x="65" y="10" width="25" height="25" fill="#1a4b8c"/>
              <rect x="70" y="15" width="15" height="15" fill="white"/>
              <rect x="73" y="18" width="9" height="9" fill="#1a4b8c"/>
              <rect x="10" y="65" width="25" height="25" fill="#1a4b8c"/>
              <rect x="15" y="70" width="15" height="15" fill="white"/>
              <rect x="18" y="73" width="9" height="9" fill="#1a4b8c"/>
              <rect x="40" y="40" width="20" height="20" fill="#1a4b8c"/>
              <rect x="45" y="45" width="10" height="10" fill="white"/>
            </svg>
            <div class="qr-label">Escanear para ver detalles</div>
            <div class="qr-id">${loan.id}</div>
          </div>
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
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: 'Compartir Pase de Préstamo',
          });
        } else {
          Alert.alert('Info', 'PDF generado correctamente');
        }
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
        <ActivityIndicator size="large" color={COLORS.accent} />
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
        {/* QR Code Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrCodeContainer}>
            <QRCode
              value={loan.id}
              size={120}
              backgroundColor="white"
              color="#1a4b8c"
            />
          </View>
          <View style={styles.qrInfo}>
            <Text style={styles.qrTitle}>Código QR del Préstamo</Text>
            <Text style={styles.qrSubtitle}>Escanea para identificar rápidamente</Text>
            <Text style={styles.qrId}>{loan.id}</Text>
          </View>
        </View>

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
            style={[styles.actionButton, { backgroundColor: COLORS.success + '20' }]}
            onPress={() => handleStatusChange('returned')}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={[styles.actionButtonText, { color: COLORS.success }]}>Devuelto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.error + '20' }]}
            onPress={() => handleStatusChange('cancelled')}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, { color: COLORS.error }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.accent + '20' }]}
            onPress={() => router.push(`/edit/${id}`)}
          >
            <Ionicons name="pencil" size={20} color={COLORS.accent} />
            <Text style={[styles.actionButtonText, { color: COLORS.accent }]}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* General Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.accent} />
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
              <Ionicons name="car" size={20} color={COLORS.accent} />
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
            <Ionicons name="people" size={20} color={COLORS.accent} />
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
            <Ionicons name="hardware-chip" size={20} color={COLORS.accent} />
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
              <Ionicons name="create" size={20} color={COLORS.accent} />
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
          <Ionicons name="trash" size={20} color={COLORS.error} />
          <Text style={styles.deleteButtonText}>Eliminar Préstamo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Print/Share Button */}
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
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.printButtonText}>Compartir / Imprimir PDF</Text>
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  qrCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
  },
  qrInfo: {
    flex: 1,
    marginLeft: 16,
  },
  qrTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  qrId: {
    color: COLORS.accent,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  className: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  participantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
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
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  participantAccount: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.primary,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 10,
  },
  equipmentName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  equipmentDetail: {
    color: COLORS.textSecondary,
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
    borderColor: COLORS.error,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  printContainer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
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
