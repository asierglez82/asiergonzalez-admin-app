import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CalendarScreen = () => {
  const [windowWidth, setWindowWidth] = useState(width);

  useEffect(() => {
    const onChange = ({ window }) => setWindowWidth(window.width);
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const cardsPerRow = windowWidth < 420 ? 1 : windowWidth >= 1100 ? 3 : 2;
  const horizontalPadding = 48;
  const interItemGap = 12;
  const cardWidth = (windowWidth - horizontalPadding - (cardsPerRow - 1) * interItemGap) / cardsPerRow;

  const Card = ({ title, description, color, icon, onPress }) => (
    <TouchableOpacity style={[styles.card, { width: cardWidth }]} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.iconSquare, { backgroundColor: `${color}20`, borderColor: color }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario Editorial</Text>
        <Text style={styles.subtitle}>Planifica y programa tu contenido</Text>
      </View>

      <View style={styles.grid}>
        <Card
          title="Esta Semana"
          description="3 posts programados"
          color="#007AFF"
          icon="calendar-outline"
          onPress={() => {}}
        />
        <Card
          title="Próximo Mes"
          description="12 contenidos planificados"
          color="#30D158"
          icon="trending-up-outline"
          onPress={() => {}}
        />
        <Card
          title="Objetivos"
          description="2 posts por semana"
          color="#FF2D92"
          icon="flag-outline"
          onPress={() => {}}
        />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginLeft: -6,
    marginRight: -6,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  cardAccent: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default CalendarScreen;
