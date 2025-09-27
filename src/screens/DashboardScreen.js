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
import { Feather, Ionicons } from '@expo/vector-icons';
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
  const [windowWidth, setWindowWidth] = useState(width);

  // Layout responsive: número de tarjetas por fila y anchos
  const metricsPerRow = windowWidth < 420 ? 1 : windowWidth >= 1100 ? 4 : windowWidth >= 700 ? 3 : 2;
  const actionsPerRow = windowWidth < 420 ? 1 : windowWidth >= 1100 ? 3 : 2;
  const horizontalPadding = 48; // padding horizontal de contenedores (24 + 24)
  const interItemGap = 12; // separación aproximada entre items
  const metricCardWidth = (windowWidth - horizontalPadding - (metricsPerRow - 1) * interItemGap) / metricsPerRow;
  const actionCardWidth = (windowWidth - horizontalPadding - (actionsPerRow - 1) * interItemGap) / actionsPerRow;

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const onChange = ({ window }) => setWindowWidth(window.width);
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
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
        ...blogPosts.slice(0, 3).map(item => ({ ...item, type: 'Blog' })),
        ...projects.slice(0, 2).map(item => ({ ...item, type: 'Project' })),
        ...podcasts.slice(0, 2).map(item => ({ ...item, type: 'Podcast' })),
        ...infographics.slice(0, 2).map(item => ({ ...item, type: 'Infographic' })),
        ...quotes.slice(0, 1).map(item => ({ ...item, type: 'Quote' }))
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

  const getTypeColor = (type) => {
    switch (type) {
      case 'Blog': return '#007AFF';
      case 'Project': return '#FF9F0A';
      case 'Podcast': return '#FF3B30';
      case 'Infographic': return '#30D158';
      case 'Quote': return '#5856D6';
      default: return 'rgba(255, 255, 255, 0.4)';
    }
  };

  const MetricCard = ({ title, value, color, icon }) => (
    <View style={[styles.metricCard, { width: metricCardWidth }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={18} color="#ffffff" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <View style={[styles.metricAccent, { backgroundColor: color }]} />
    </View>
  );

  const ActionCard = ({ title, subtitle, color, icon, onPress }) => (
    <TouchableOpacity style={[styles.actionCard, { width: actionCardWidth }]} onPress={onPress}>
      <View style={[styles.iconSquare, { backgroundColor: `${color}20`, borderColor: color }] }>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
    </TouchableOpacity>
  );

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Blog': return 'file-text';
      case 'Project': return 'briefcase';
      case 'Podcast': return 'mic';
      case 'Infographic': return 'bar-chart-2';
      case 'Quote': return 'message-square';
      default: return 'file';
    }
  };

  const RecentContentItem = ({ item }) => (
    <View style={styles.contentItem}>
      <View style={[styles.iconCircleSm, { backgroundColor: `${getTypeColor(item.type)}20` }] }>
        <Feather name={getTypeIcon(item.type)} size={16} color={getTypeColor(item.type)} />
      </View>
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
        <View style={styles.metricsGrid}>
          <MetricCard title="Total" value={metrics.totalContent} color="#30D158" icon="bar-chart-2" />
          <MetricCard title="Blog Posts" value={metrics.blogPosts} color="#007AFF" icon="file-text" />
          <MetricCard title="Projects" value={metrics.projects} color="#FF9F0A" icon="briefcase" />
          <MetricCard title="Quotes" value={metrics.quotes} color="#FF2D92" icon="message-circle" />
          <MetricCard title="Books" value={metrics.books} color="#5856D6" icon="book" />
          <MetricCard title="Podcasts" value={metrics.podcasts} color="#FF3B30" icon="mic" />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          <ActionCard 
            title="Crear Contenido"
            subtitle="Nuevo post, proyecto o idea"
            color="#30D158"
            icon="add-circle"
            onPress={() => navigation.navigate('ContentEditor')}
          />
          <ActionCard 
            title="Ver Analytics"
            subtitle="Métricas y estadísticas"
            color="#007AFF"
            icon="stats-chart"
            onPress={() => navigation.navigate('Analytics')}
          />
        </View>
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
    justifyContent: 'flex-start',
    marginLeft: -6,
    marginRight: -6,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 202, 119, 0.2)',
    shadowColor: '#00ca77',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircleSm: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  metricTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 24,
    paddingTop: 0,
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
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: 13,
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
  contentBadge: {
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
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
