import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ContentEditorScreen = ({ navigation }) => {
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

  const actionsPerRow = windowWidth < 420 ? 1 : windowWidth >= 1100 ? 3 : 2;
  const horizontalPadding = 48; // 24 + 24
  const interItemGap = 12;
  const actionCardWidth = (windowWidth - horizontalPadding - (actionsPerRow - 1) * interItemGap) / actionsPerRow;
  

  const ActionCard = ({ title, description, color, icon, onPress }) => (
    <TouchableOpacity style={[styles.actionCard, { width: actionCardWidth }]} onPress={onPress}>
      <View style={[styles.iconSquare, { backgroundColor: '#00ca77', borderColor: '#00ca77' }] }>
        <Ionicons name={icon} size={18} color={'#ffffff'} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <View style={[styles.cardAccent, { backgroundColor: '#00ca77' }]} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: '#00ca77' }]}>Editor de Contenido</Text>
        <Text style={styles.subtitle}>Crear y editar posts, proyectos y más</Text>
      </View>

      {/* Sección de Creación */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: '#00ca77' }]}>Crear Contenido</Text>
        <Text style={styles.sectionSubtitle}>Crear nuevos elementos de contenido</Text>
      </View>

      <View style={styles.actionsGrid}>
        <ActionCard
          title="Nuevo Blog Post"
          description="Crear una nueva entrada del blog"
          color="#007AFF"
          icon="create-outline"
          onPress={() => navigation.navigate('CreatePost')}
        />
        <ActionCard
          title="Nuevo Proyecto"
          description="Agregar proyecto al portfolio"
          color="#FF9F0A"
          icon="briefcase-outline"
          onPress={() => navigation.navigate('CreateProject')}
        />
        <ActionCard
          title="Nueva Quote"
          description="Compartir una reflexión"
          color="#FF2D92"
          icon="chatbox-ellipses-outline"
          onPress={() => navigation.navigate('CreateQuote')}
        />
    
        <ActionCard
          title="Reseña de Libro"
          description="Agregar libro al catálogo"
          color="#5856D6"
          icon="book-outline"
          onPress={() => navigation.navigate('CreateBook')}
        />
        <ActionCard
          title="Nueva Conferencia"
          description="Agregar conferencia al portfolio"
          color="#34C759"
          icon="calendar-outline"
          onPress={() => navigation.navigate('CreateConference')}
        />
       
        <ActionCard
          title="Nuevo Media & Press"
          description="Agregar media al portfolio"
          color="#64D2FF"
          icon="newspaper-outline"
          onPress={() => navigation.navigate('CreateMedia')}
        />
        <ActionCard
          title="Nueva Infografía"
          description="Agregar nueva infografía"
          color="#30D158"
          icon="stats-chart-outline"
          onPress={() => navigation.navigate('CreateInfographic')}
        />
        <ActionCard
          title="Nuevo Proyecto"
          description="Agregar nuevo proyecto"
          color="#FF9500"
          icon="folder-outline"
          onPress={() => navigation.navigate('CreateProject')}
        />
        <ActionCard
          title="Nuevo Talk"
          description="Agregar nuevo talk"
          color="#FF375F"
          icon="podium-outline"
          onPress={() => navigation.navigate('CreateTalk')}
        />
            <ActionCard
              title="Nuevo Podcast"
              description="Crear episodio de podcast"
              color="#FF3B30"
              icon="mic-outline"
              onPress={() => navigation.navigate('CreatePodcast')}
            />
            
      </View>

      {/* Sección de Gestión */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: '#00ca77' }]}>Gestionar Contenido</Text>
        <Text style={styles.sectionSubtitle}>Editar y administrar contenido existente</Text>
      </View>

      <View style={styles.actionsGrid}>
        <ActionCard
          title="Gestión de Blog Posts"
          description="Ver, editar y eliminar posts del blog"
          color="#007AFF"
          icon="list-outline"
          onPress={() => navigation.navigate('BlogCRUD')}
        />
        <ActionCard
          title="Gestión de Proyectos"
          description="Administrar proyectos del portfolio"
          color="#FF9F0A"
          icon="briefcase-outline"
          onPress={() => navigation.navigate('ProjectsCRUD')}
        />
        <ActionCard
          title="Gestión de Quotes"
          description="Administrar quotes y reflexiones"
          color="#FF2D92"
          icon="chatbox-ellipses-outline"
          onPress={() => navigation.navigate('QuotesCRUD')}
        />
        <ActionCard
          title="Gestión de Podcasts"
          description="Administrar episodios del podcast"
          color="#FF3B30"
          icon="mic-outline"
          onPress={() => navigation.navigate('PodcastCRUD')}
        />
        <ActionCard
          title="Gestión de Libros"
          description="Administrar reseñas de libros"
          color="#5856D6"
          icon="book-outline"
          onPress={() => navigation.navigate('BooksCRUD')}
        />
        <ActionCard
          title="Gestión de Conferencias"
          description="Administrar conferencias"
          color="#34C759"
          icon="calendar-outline"
          onPress={() => navigation.navigate('ConferencesCRUD')}
        />
        <ActionCard
          title="Gestión de Media & Press"
          description="Administrar media y prensa"
          color="#64D2FF"
          icon="newspaper-outline"
          onPress={() => navigation.navigate('MediaCRUD')}
        />
        <ActionCard
          title="Gestión de Infografías"
          description="Administrar infografías"
          color="#30D158"
          icon="stats-chart-outline"
          onPress={() => navigation.navigate('InfographicsCRUD')}
        />
        <ActionCard
          title="Gestión de Talks"
          description="Administrar talks y presentaciones"
          color="#FF375F"
          icon="podium-outline"
          onPress={() => navigation.navigate('TalksCRUD')}
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
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#333b4d',
    paddingTop: 12,
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
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginLeft: -6,
    marginRight: -6,
  },
  actionCard: {
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

export default ContentEditorScreen;
