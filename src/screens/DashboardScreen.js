import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { 
  blogPostsService, 
  projectsService, 
  quotesService, 
  booksService,
  podcastService,
  infographicsService,
  conferencesService,
  videosService,
  talksService
} from '../services/firestore';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [metrics, setMetrics] = useState({
    blogPosts: 0,
    projects: 0,
    quotes: 0,
    books: 0,
    podcasts: 0,
    infographics: 0,
    conferences: 0,
    videos: 0,
    talks: 0,
    totalContent: 0
  });
  const [recentContent, setRecentContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Cargar métricas de contenido
      const [
        blogPosts,
        projects,
        quotes,
        books,
        podcasts,
        infographics,
        conferences,
        videos,
        talks
      ] = await Promise.all([
        blogPostsService.getAll('createdAt', 'desc', 50),
        projectsService.getAll('createdAt', 'desc', 50),
        quotesService.getAll('id', 'desc', 50),
        booksService.getAll('id', 'desc', 50),
        podcastService.getAll('createdAt', 'desc', 50),
        infographicsService.getAll('createdAt', 'desc', 50),
        conferencesService.getAll('createdAt', 'desc', 50),
        videosService.getAll('createdAt', 'desc', 50),
        talksService.getAll('id', 'desc', 50)
      ]);

      const newMetrics = {
        blogPosts: blogPosts.length,
        projects: projects.length,
        quotes: quotes.length,
        books: books.length,
        podcasts: podcasts.length,
        infographics: infographics.length,
        conferences: conferences.length,
        videos: videos.length,
        talks: talks.length,
        totalContent: blogPosts.length + projects.length + quotes.length + 
                     books.length + podcasts.length + infographics.length +
                     conferences.length + videos.length + talks.length
      };

      setMetrics(newMetrics);

      // Obtener contenido reciente (últimos 10 elementos)
      const allContent = [
        ...blogPosts.slice(0, 3).map(item => ({ ...item, type: 'Blog', icon: '📝' })),
        ...projects.slice(0, 2).map(item => ({ ...item, type: 'Project', icon: '💼' })),
        ...podcasts.slice(0, 2).map(item => ({ ...item, type: 'Podcast', icon: '🎙️' })),
        ...infographics.slice(0, 2).map(item => ({ ...item, type: 'Infographic', icon: '📊' })),
        ...quotes.slice(0, 1).map(item => ({ ...item, type: 'Quote', icon: '💭' }))
      ].sort((a, b) => {
        const dateA = new Date(a.createdAt?.seconds * 1000 || a.date || '2000-01-01');
        const dateB = new Date(b.createdAt?.seconds * 1000 || b.date || '2000-01-01');
        return dateB - dateA;
      }).slice(0, 8);

      setRecentContent(allContent);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const MetricCard = ({ title, value, color, icon }) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: `${color}20` }]}>
        <Text style={styles.metricIcon}>{icon}</Text>
      </View>
      <Text style={[styles.metricValue]}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <View style={[styles.metricAccent, { backgroundColor: color }]} />
    </View>
  );

  const ActionCard = ({ title, subtitle, color, icon, onPress }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  const RecentContentItem = ({ item }) => (
    <View style={styles.contentItem}>
      <Text style={styles.contentIcon}>{item.icon}</Text>
      <View style={styles.contentInfo}>
        <Text style={styles.contentTitle} numberOfLines={2}>
          {item.title || 'Sin título'}
        </Text>
        <Text style={styles.contentType}>{item.type}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboardData(true)} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Dashboard</Text>
        <Text style={styles.subtitle}>Panel de control principal</Text>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Resumen de Contenido</Text>
        <View style={styles.metricsGrid}>
          <MetricCard title="Total" value={metrics.totalContent} color="#30D158" icon="📈" />
          <MetricCard title="Blog Posts" value={metrics.blogPosts} color="#007AFF" icon="📝" />
          <MetricCard title="Projects" value={metrics.projects} color="#FF9F0A" icon="💼" />
          <MetricCard title="Quotes" value={metrics.quotes} color="#FF2D92" icon="💭" />
          <MetricCard title="Books" value={metrics.books} color="#5856D6" icon="📚" />
          <MetricCard title="Podcasts" value={metrics.podcasts} color="#FF3B30" icon="🎙️" />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <ActionCard 
          title="Crear Contenido"
          subtitle="Nuevo post, proyecto o idea"
          color="#30D158"
          icon="➕"
          onPress={() => navigation.navigate('ContentEditor')}
        />
        <ActionCard 
          title="Ver Analytics"
          subtitle="Métricas y estadísticas"
          color="#007AFF"
          icon="📊"
          onPress={() => navigation.navigate('Analytics')}
        />
        <ActionCard 
          title="CRM Contactos"
          subtitle="Gestionar leads y contactos"
          color="#FF9F0A"
          icon="👥"
          onPress={() => navigation.navigate('CRM')}
        />
        <ActionCard 
          title="Calendario"
          subtitle="Planificar publicaciones"
          color="#FF2D92"
          icon="📅"
          onPress={() => navigation.navigate('Calendar')}
        />
      </View>

      {/* Recent Content */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Contenido Reciente</Text>
        {recentContent.map((item, index) => (
          <RecentContentItem key={`${item.type}-${index}`} item={item} />
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>asiergonzalez.es - Centro de Mando v2.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333b4d', // Fondo de la web
  },
  scrollContent: {
    // Sin flexGrow para permitir scroll natural
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333b4d',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '400',
  },
  header: {
    padding: 24,
    paddingTop: 32,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  metricsContainer: {
    padding: 24,
    paddingTop: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 20,
    width: (width - 80) / 2,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 202, 119, 0.2)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIcon: {
    fontSize: 24,
  },
  metricAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  metricTitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 24,
    paddingTop: 0,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIconText: {
    fontSize: 24,
    color: '#ffffff',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  recentContainer: {
    padding: 24,
    paddingTop: 0,
  },
  contentItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  contentType: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default DashboardScreen;
