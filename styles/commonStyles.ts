
import { StyleSheet, ViewStyle, TextStyle, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const colors = {
  primary: '#FFD700',      // Yellow primary
  primaryDark: '#FFC107',  // Darker yellow
  secondary: '#000000',    // Black
  background: '#FFFFFF',   // White background
  backgroundAlt: '#F8F9FA', // Light grey background
  backgroundLight: '#FAFBFC', // Even lighter background
  text: '#000000',         // Black text
  textLight: '#666666',    // Grey text
  textWhite: '#FFFFFF',    // White text
  success: '#28A745',      // Green for success
  danger: '#DC3545',       // Red for danger
  warning: '#FFC107',      // Yellow for warning
  info: '#17A2B8',         // Blue for info
  card: '#FFFFFF',         // White card background
  border: '#E9ECEF',       // Light border
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Responsive breakpoints
export const breakpoints = {
  small: 480,
  medium: 768,
  large: 1024,
  xlarge: 1200,
};

// Helper functions for responsive design
export const isSmallScreen = screenWidth < breakpoints.small;
export const isMediumScreen = screenWidth >= breakpoints.small && screenWidth < breakpoints.medium;
export const isLargeScreen = screenWidth >= breakpoints.medium && screenWidth < breakpoints.large;
export const isXLargeScreen = screenWidth >= breakpoints.large;

// Responsive spacing
export const spacing = {
  xs: isSmallScreen ? 4 : 6,
  sm: isSmallScreen ? 8 : 12,
  md: isSmallScreen ? 12 : 16,
  lg: isSmallScreen ? 16 : 20,
  xl: isSmallScreen ? 20 : 24,
  xxl: isSmallScreen ? 24 : 32,
};

// Responsive font sizes
export const fontSizes = {
  xs: isSmallScreen ? 10 : 12,
  sm: isSmallScreen ? 12 : 14,
  md: isSmallScreen ? 14 : 16,
  lg: isSmallScreen ? 16 : 18,
  xl: isSmallScreen ? 18 : 20,
  xxl: isSmallScreen ? 20 : 24,
  title: isSmallScreen ? 24 : 28,
  subtitle: isSmallScreen ? 18 : 20,
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 2px 4px ${colors.shadow}`,
    elevation: 2,
    minHeight: 44, // Minimum touch target size
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 2px 4px ${colors.shadow}`,
    elevation: 2,
    minHeight: 44,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    maxWidth: isSmallScreen ? '100%' : isLargeScreen ? 1200 : 800,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.subtitle,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  text: {
    fontSize: fontSizes.md,
    fontWeight: '400',
    color: colors.text,
    lineHeight: fontSizes.md * 1.5,
  },
  textLight: {
    fontSize: fontSizes.sm,
    fontWeight: '400',
    color: colors.textLight,
    lineHeight: fontSizes.sm * 1.4,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionSmall: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.xs,
    boxShadow: `0px 2px 8px ${colors.shadow}`,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSmall: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    backgroundColor: colors.background,
    color: colors.text,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  // Responsive grid layouts
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  gridItem: {
    flex: isSmallScreen ? 1 : isMediumScreen ? 0.48 : 0.32,
    minWidth: isSmallScreen ? '100%' : isMediumScreen ? '45%' : '30%',
  },
  // POS specific layouts
  posContainer: {
    flex: 1,
    flexDirection: isSmallScreen ? 'column' : 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  posProductsSection: {
    flex: isSmallScreen ? 1 : 2,
    minHeight: isSmallScreen ? 300 : 'auto',
  },
  posCartSection: {
    flex: 1,
    minWidth: isSmallScreen ? '100%' : 300,
    maxWidth: isSmallScreen ? '100%' : 400,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: isSmallScreen ? '95%' : 500,
    maxHeight: '90%',
  },
  // Button containers
  buttonContainer: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  // Header styles
  header: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    alignItems: isSmallScreen ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
