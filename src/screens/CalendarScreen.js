import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const CalendarScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario Editorial</Text>
        <Text style={styles.subtitle}>Planifica y programa tu contenido</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📅</Text>
          <Text style={styles.cardTitle}>Esta Semana</Text>
          <Text style={styles.cardDescription}>3 posts programados</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📈</Text>
          <Text style={styles.cardTitle}>Próximo Mes</Text>
          <Text style={styles.cardDescription}>12 contenidos planificados</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>🎯</Text>
          <Text style={styles.cardTitle}>Objetivos</Text>
          <Text style={styles.cardDescription}>2 posts por semana</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  content: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 202, 119, 0.2)',
    alignItems: 'center',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default CalendarScreen;
