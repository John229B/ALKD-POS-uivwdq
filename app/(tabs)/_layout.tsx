
import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import Icon from '../../components/Icon';

export default function TabLayout() {
  const { hasPermission } = useAuthState();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => (
            <Icon name="grid" size={size} color={color} />
          ),
          href: hasPermission('dashboard', 'view') ? '/(tabs)/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Point de vente',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calculator" size={size} color={color} />
          ),
          href: hasPermission('pos', 'view') ? '/(tabs)/pos' : null,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produits',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cube" size={size} color={color} />
          ),
          href: hasPermission('products', 'view') ? '/(tabs)/products' : null,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" size={size} color={color} />
          ),
          href: hasPermission('customers', 'view') ? '/(tabs)/customers' : null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Rapports',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bar-chart" size={size} color={color} />
          ),
          href: hasPermission('reports', 'view') ? '/(tabs)/reports' : null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, size }) => (
            <Icon name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
