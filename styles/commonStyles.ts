
import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Check if screen is small (phones vs tablets)
export const isSmallScreen = screenWidth < 768;

export const colors = {
  primary: '#F1C40F',      // Yellow
  primaryLight: '#F7DC6F',  // Light yellow
  primaryDark: '#D4AC0D',   // Dark yellow
  secondary: '#000000',     // Black
  background: '#FFFFFF',    // White
  backgroundAlt: '#F8F9FA', // Light gray
  text: '#2C3E50',         // Dark gray
  textLight: '#7F8C8D',    // Medium gray
  textDark: '#1A252F',     // Very dark gray
  border: '#E5E7EB',       // Light border
  success: '#27AE60',      // Green
  error: '#E74C3C',        // Red
  warning: '#F39C12',      // Orange
  info: '#3498DB',         // Blue
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Typography
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 24,
  },
  textLight: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    lineHeight: 24,
  },
  textSmall: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  
  // Layout components
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  cardSmall: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  
  // Form elements
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  
  // Lists
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  
  // Utility classes
  flex1: {
    flex: 1,
  },
  flexGrow: {
    flexGrow: 1,
  },
  flexShrink: {
    flexShrink: 1,
  },
  
  // Margins and padding
  mt: {
    marginTop: spacing.md,
  },
  mb: {
    marginBottom: spacing.md,
  },
  ml: {
    marginLeft: spacing.md,
  },
  mr: {
    marginRight: spacing.md,
  },
  mx: {
    marginHorizontal: spacing.md,
  },
  my: {
    marginVertical: spacing.md,
  },
  
  pt: {
    paddingTop: spacing.md,
  },
  pb: {
    paddingBottom: spacing.md,
  },
  pl: {
    paddingLeft: spacing.md,
  },
  pr: {
    paddingRight: spacing.md,
  },
  px: {
    paddingHorizontal: spacing.md,
  },
  py: {
    paddingVertical: spacing.md,
  },
});

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  secondary: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: colors.transparent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  success: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  warning: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  
  // Icon buttons
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  iconButtonPrimary: {
    backgroundColor: colors.primary,
  },
  iconButtonSecondary: {
    backgroundColor: colors.secondary,
  },
});

// Responsive styles for different screen sizes
export const responsiveStyles = StyleSheet.create({
  container: {
    maxWidth: isSmallScreen ? '100%' : 1200,
    alignSelf: 'center',
    width: '100%',
  },
  padding: {
    paddingHorizontal: isSmallScreen ? spacing.md : spacing.xl,
  },
  grid: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: isSmallScreen ? '100%' : '50%',
    paddingHorizontal: isSmallScreen ? 0 : spacing.sm,
  },
});
