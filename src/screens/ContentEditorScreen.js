import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const ContentEditorScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Editor de Contenido</Text>
        <Text style={styles.subtitle}>Crear y editar posts, proyectos y más</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>✍️</Text>
          <Text style={styles.cardTitle}>Nuevo Blog Post</Text>
          <Text style={styles.cardDescription}>Crear una nueva entrada del blog</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>💼</Text>
          <Text style={styles.cardTitle}>Nuevo Proyecto</Text>
          <Text style={styles.cardDescription}>Agregar proyecto al portfolio</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>💭</Text>
          <Text style={styles.cardTitle}>Nueva Quote</Text>
          <Text style={styles.cardDescription}>Compartir una reflexión</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>🎙️</Text>
          <Text style={styles.cardTitle}>Episodio Podcast</Text>
          <Text style={styles.cardDescription}>Nuevo episodio del podcast</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>📚</Text>
          <Text style={styles.cardTitle}>Reseña de Libro</Text>
          <Text style={styles.cardDescription}>Agregar libro al catálogo</Text>
        </View>

        <TouchableOpacity style={styles.aiButton}>
          <Text style={styles.aiIcon}>🤖</Text>
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>Generar con IA</Text>
            <Text style={styles.aiDescription}>Usar Gemini para crear contenido</Text>
          </View>
        </TouchableOpacity>
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
  aiButton: {
    backgroundColor: 'rgba(0, 202, 119, 0.15)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 202, 119, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aiIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ca77',
    marginBottom: 4,
  },
  aiDescription: {
    fontSize: 14,
    color: 'rgba(0, 202, 119, 0.8)',
  },
});

export default ContentEditorScreen;
