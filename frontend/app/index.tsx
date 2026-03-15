import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiService, LoanRecord } from '../src/services/api';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, returned: 0, cancelled: 0 });
  const [filter, setFilter] = useState<string | null>(null);

  const fetchLoans = async () => {
    try {
      const [loansData, statsData] = await Promise.all([
        apiService.getLoans(filter || undefined),
        apiService.getStats(),
      ]);
      setLoans(loansData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching loans:', error);
      Alert.alert('Error', 'No se pudieron cargar los préstamos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoans();
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

  const renderLoanItem = ({ item }: { item: LoanRecord }) => (
    <TouchableOpacity
      style={styles.loanCard}
      onPress={() => router.push(`/view/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{item.class_name}</Text>
          <Text style={styles.section}>Sección: {item.section}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#9ca3af" />
          <Text style={styles.infoText}>{item.teacher_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
          <Text style={styles.infoText}>
            {item.departure_date} - {item.departure_time}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="hardware-chip-outline" size={16} color="#9ca3af" />
          <Text style={styles.infoText}>
            {item.equipment_list?.length || 0} equipo(s)
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color="#9ca3af" />
          <Text style={styles.infoText}>
            {item.participants?.length || 0} integrante(s)
          </Text>
        </View>
      </View>

      {/* Mini QR indicator */}
      <View style={styles.qrIndicator}>
        <Ionicons name="qr-code-outline" size={16} color="#6366f1" />
        <Text style={styles.qrText}>{item.id.substring(0, 8)}...</Text>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value, count }: { label: string; value: string | null; count: number }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando préstamos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#4ade80' }]}>
          <Text style={[styles.statNumber, { color: '#4ade80' }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Activos</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#60a5fa' }]}>
          <Text style={[styles.statNumber, { color: '#60a5fa' }]}>{stats.returned}</Text>
          <Text style={styles.statLabel}>Devueltos</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FilterButton label="Todos" value={null} count={stats.total} />
        <FilterButton label="Activos" value="active" count={stats.active} />
        <FilterButton label="Devueltos" value="returned" count={stats.returned} />
      </View>

      {/* Loans List */}
      <FlatList
        data={loans}
        renderItem={renderLoanItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>No hay préstamos registrados</Text>
            <Text style={styles.emptySubtext}>Presiona el botón + para crear uno nuevo</Text>
          </View>
        }
      />

      {/* QR Scanner FAB */}
      <TouchableOpacity
        style={[styles.scanFab, { bottom: insets.bottom + 90 }]}
        onPress={() => router.push('/scanner')}
        activeOpacity={0.8}
      >
        <Ionicons name="qr-code" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
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
  loadingText: {
    marginTop: 16,
    color: '#9ca3af',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterButtonText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 160,
  },
  loanCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  qrIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  qrText: {
    color: '#6366f1',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
  },
  scanFab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
