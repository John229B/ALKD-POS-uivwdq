
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, spacing, fontSizes } from '../styles/commonStyles';
import { ActivityLog, Employee } from '../types';
import { getActivityLogs, getEmployees } from '../utils/storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ActivityLogsScreen() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, employeesData] = await Promise.all([
        getActivityLogs(),
        getEmployees(),
      ]);
      
      setLogs(logsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFilteredLogs = () => {
    let filtered = logs;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by module
    if (moduleFilter !== 'all') {
      filtered = filtered.filter(log => log.module === moduleFilter);
    }

    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case 'today':
        filtered = filtered.filter(log => new Date(log.timestamp) >= today);
        break;
      case 'week':
        filtered = filtered.filter(log => new Date(log.timestamp) >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter(log => new Date(log.timestamp) >= monthAgo);
        break;
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getEmployeeName = (employeeId: string): string => {
    if (employeeId === 'system') return 'Système';
    if (employeeId === 'admin') return 'Administrateur';
    
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || employeeId;
  };

  const getModuleIcon = (module: string): string => {
    const icons = {
      dashboard: 'speedometer-outline',
      pos: 'card-outline',
      products: 'cube-outline',
      customers: 'people-outline',
      reports: 'bar-chart-outline',
      settings: 'settings-outline',
      employees: 'person-outline',
      printers: 'print-outline',
      tickets: 'receipt-outline',
      sync: 'sync-outline',
      system: 'hardware-chip-outline',
    };
    return icons[module as keyof typeof icons] || 'information-circle-outline';
  };

  const getModuleColor = (module: string): string => {
    const colors_map = {
      dashboard: colors.primary,
      pos: colors.success,
      products: colors.warning,
      customers: colors.info,
      reports: colors.success,
      settings: colors.textLight,
      employees: colors.primary,
      printers: colors.info,
      tickets: colors.success,
      sync: colors.info,
      system: colors.textLight,
    };
    return colors_map[module as keyof typeof colors_map] || colors.textLight;
  };

  const getFilterLabel = (filter: string) => {
    const labels = {
      all: 'Tous',
      today: 'Aujourd\'hui',
      week: 'Cette semaine',
      month: 'Ce mois',
    };
    return labels[filter as keyof typeof labels] || filter;
  };

  const getUniqueModules = () => {
    const modules = new Set(logs.map(log => log.module));
    return Array.from(modules).sort();
  };

  const filteredLogs = getFilteredLogs();

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.centerContainer}>
          <Text style={[commonStyles.text, { color: colors.textLight }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Journal d'activité</Text>
          <Text style={styles.headerSubtitle}>{filteredLogs.length} entrée(s)</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher dans les logs..."
            placeholderTextColor={colors.textLight}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {(['all', 'today', 'week', 'month'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setFilterBy(filter)}
              style={[
                styles.filterButton,
                filterBy === filter && styles.filterButtonActive
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                filterBy === filter && styles.filterButtonTextActive
              ]}>
                {getFilterLabel(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moduleFilterBar}>
          <TouchableOpacity
            onPress={() => setModuleFilter('all')}
            style={[
              styles.moduleFilterButton,
              moduleFilter === 'all' && styles.moduleFilterButtonActive
            ]}
          >
            <Text style={[
              styles.moduleFilterButtonText,
              moduleFilter === 'all' && styles.moduleFilterButtonTextActive
            ]}>
              Tous les modules
            </Text>
          </TouchableOpacity>
          
          {getUniqueModules().map((module) => (
            <TouchableOpacity
              key={module}
              onPress={() => setModuleFilter(module)}
              style={[
                styles.moduleFilterButton,
                moduleFilter === module && styles.moduleFilterButtonActive
              ]}
            >
              <Icon 
                name={getModuleIcon(module)} 
                size={16} 
                color={moduleFilter === module ? colors.background : getModuleColor(module)} 
              />
              <Text style={[
                styles.moduleFilterButtonText,
                moduleFilter === module && styles.moduleFilterButtonTextActive,
                { marginLeft: spacing.xs }
              ]}>
                {module}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Logs List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>
              {searchQuery.trim() ? 'Aucun log trouvé' : 'Aucune activité'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim() 
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Les activités des employés apparaîtront ici'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {filteredLogs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logIcon}>
                    <Icon 
                      name={getModuleIcon(log.module)} 
                      size={20} 
                      color={getModuleColor(log.module)} 
                    />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logModule}>{log.module}</Text>
                  </View>
                  <Text style={styles.logTime}>
                    {format(new Date(log.timestamp), 'HH:mm', { locale: fr })}
                  </Text>
                </View>

                <Text style={styles.logDetails}>{log.details}</Text>

                <View style={styles.logFooter}>
                  <Text style={styles.logEmployee}>
                    Par {getEmployeeName(log.employeeId)}
                  </Text>
                  <Text style={styles.logDate}>
                    {format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: fr })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  filtersSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  filterBar: {
    flexDirection: 'row' as const,
    marginBottom: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  filterButtonTextActive: {
    color: colors.background,
    fontWeight: '600' as const,
  },
  moduleFilterBar: {
    flexDirection: 'row' as const,
  },
  moduleFilterButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleFilterButtonActive: {
    backgroundColor: colors.info,
    borderColor: colors.info,
  },
  moduleFilterButtonText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  moduleFilterButtonTextActive: {
    color: colors.background,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  logsList: {
    padding: spacing.lg,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.sm,
  },
  logInfo: {
    flex: 1,
  },
  logAction: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
  },
  logModule: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textTransform: 'capitalize' as const,
  },
  logTime: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontWeight: '500' as const,
  },
  logDetails: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  logFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logEmployee: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  logDate: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
};
