
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from './Icon';

interface FilterOptions {
  filterBy: 'all' | 'gave' | 'took' | 'balanced';
  sortBy: 'recent' | 'old' | 'amount_asc' | 'amount_desc' | 'alphabetical';
}

interface CustomerFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export default function CustomerFilterModal({ 
  visible, 
  onClose, 
  onApply, 
  currentFilters 
}: CustomerFilterModalProps) {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(currentFilters);

  const handleApply = () => {
    console.log('Applying filters:', tempFilters);
    onApply(tempFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      filterBy: 'all',
      sortBy: 'recent'
    };
    setTempFilters(defaultFilters);
  };

  const filterOptions = [
    { key: 'all', label: 'Tout', icon: 'people' },
    { key: 'gave', label: "J'ai donné", icon: 'arrow-up' },
    { key: 'took', label: "J'ai pris", icon: 'arrow-down' },
    { key: 'balanced', label: 'Réglé', icon: 'checkmark-circle' },
  ];

  const sortOptions = [
    { key: 'recent', label: 'Transactions récentes', icon: 'time' },
    { key: 'old', label: 'Transactions anciennes', icon: 'time-outline' },
    { key: 'amount_asc', label: 'Montant croissant', icon: 'trending-up' },
    { key: 'amount_desc', label: 'Montant décroissant', icon: 'trending-down' },
    { key: 'alphabetical', label: 'Ordre alphabétique', icon: 'text' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={commonStyles.modalOverlay}>
        <View style={[commonStyles.modalContent, { maxHeight: '80%' }]}>
          {/* Header */}
          <View style={[commonStyles.row, { marginBottom: spacing.lg, alignItems: 'center' }]}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: spacing.md }}>
              <Icon name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[commonStyles.title, { 
              flex: 1, 
              textAlign: 'center', 
              color: colors.primary,
              fontSize: fontSizes.lg
            }]}>
              FILTRE
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Filter By Section */}
            <View style={{ marginBottom: spacing.xl }}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                color: colors.primary,
                marginBottom: spacing.md 
              }]}>
                Filtrer par
              </Text>
              
              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                gap: spacing.sm 
              }}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      {
                        flex: 1,
                        minWidth: '45%',
                        backgroundColor: tempFilters.filterBy === option.key 
                          ? colors.primary 
                          : colors.background,
                        borderRadius: 12,
                        padding: spacing.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: tempFilters.filterBy === option.key 
                          ? colors.primary 
                          : colors.border,
                        minHeight: 60,
                      }
                    ]}
                    onPress={() => setTempFilters({ 
                      ...tempFilters, 
                      filterBy: option.key as FilterOptions['filterBy'] 
                    })}
                  >
                    <Text style={[commonStyles.text, { 
                      color: tempFilters.filterBy === option.key 
                        ? colors.secondary 
                        : colors.text,
                      fontSize: fontSizes.md,
                      fontWeight: '600',
                      textAlign: 'center'
                    }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By Section */}
            <View style={{ marginBottom: spacing.xl }}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                color: colors.primary,
                marginBottom: spacing.md 
              }]}>
                Trier par
              </Text>
              
              <View style={{ gap: spacing.sm }}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      {
                        backgroundColor: tempFilters.sortBy === option.key 
                          ? colors.primary + '20' 
                          : colors.background,
                        borderRadius: 12,
                        padding: spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: tempFilters.sortBy === option.key 
                          ? colors.primary 
                          : colors.border,
                      }
                    ]}
                    onPress={() => setTempFilters({ 
                      ...tempFilters, 
                      sortBy: option.key as FilterOptions['sortBy'] 
                    })}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: colors.primary,
                      backgroundColor: tempFilters.sortBy === option.key 
                        ? colors.primary 
                        : 'transparent',
                      marginRight: spacing.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {tempFilters.sortBy === option.key && (
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.secondary,
                        }} />
                      )}
                    </View>
                    <Text style={[commonStyles.text, { 
                      color: tempFilters.sortBy === option.key 
                        ? colors.primary 
                        : colors.textLight,
                      fontSize: fontSizes.md,
                      flex: 1
                    }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: spacing.md }}>
              <TouchableOpacity
                style={[buttonStyles.primary, { 
                  backgroundColor: colors.primary,
                  borderRadius: 15,
                  paddingVertical: spacing.lg
                }]}
                onPress={handleApply}
              >
                <Text style={[commonStyles.text, { 
                  color: colors.secondary, 
                  fontSize: fontSizes.md, 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }]}>
                  VALIDER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[buttonStyles.outline, { 
                  borderColor: colors.textLight,
                  borderRadius: 15,
                  paddingVertical: spacing.lg
                }]}
                onPress={handleReset}
              >
                <Text style={[commonStyles.text, { 
                  color: colors.textLight, 
                  fontSize: fontSizes.md, 
                  fontWeight: '600',
                  textAlign: 'center'
                }]}>
                  Réinitialiser
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
