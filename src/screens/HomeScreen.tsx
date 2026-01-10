
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { supabase, canUserRecord, getCurrentUser } from '../lib/supabase';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [recordingsUsed, setRecordingsUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [canRecord, setCanRecord] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || 'User');
        setRecordingsUsed(profile.recordings_this_month);
        
        const premium = profile.subscription_status === 'premium' &&
                       new Date(profile.subscription_end_date) > new Date();
        setIsPremium(premium);
        setCanRecord(premium || profile.recordings_this_month < 5);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    if (!canRecord && !isPremium) {
      // Show paywall
      navigation.navigate('Paywall');
      return;
    }

    navigation.navigate('Recording');
  };

  const handleViewHistory = () => {
    navigation.navigate('History');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
        <Text style={styles.subtitle}>Ready to capture your thoughts?</Text>
      </View>

      {/* Usage Stats */}
      <View style={styles.statsCard}>
        {isPremium ? (
          <>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>✨ PREMIUM</Text>
            </View>
            <Text style={styles.statsText}>Unlimited recordings this month</Text>
          </>
        ) : (
          <>
            <Text style={styles.statsNumber}>{recordingsUsed} / 5</Text>
            <Text style={styles.statsText}>Recordings used this month</Text>
            {recordingsUsed >= 5 && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Paywall')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Main Action Button */}
      <TouchableOpacity
        style={[
          styles.recordButton,
          !canRecord && !isPremium && styles.recordButtonDisabled
        ]}
        onPress={handleStartRecording}
        activeOpacity={0.8}
      >
        <View style={styles.recordButtonInner}>
          <Text style={styles.recordButtonIcon}>🎙️</Text>
          <Text style={styles.recordButtonText}>
            {canRecord || isPremium ? 'Start Recording' : 'Upgrade to Record'}
          </Text>
          <Text style={styles.recordButtonSubtext}>
            {canRecord || isPremium ? 'Tap to begin' : 'Free limit reached'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Feature Cards */}
      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>Features</Text>
        
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📝</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Instant Transcription</Text>
            <Text style={styles.featureDescription}>
              Convert your voice to text in seconds with AI-powered accuracy
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>✨</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Smart Summaries</Text>
            <Text style={styles.featureDescription}>
              Get 3 key points, 1 action item, and an email draft automatically
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📊</Text>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Organized History</Text>
            <Text style={styles.featureDescription}>
              Access all your recordings and summaries anytime
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewHistory}
        >
          <Text style={styles.actionButtonIcon}>📚</Text>
          <Text style={styles.actionButtonText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSettings}
        >
          <Text style={styles.actionButtonIcon}>⚙️</Text>
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSignOut}
        >
          <Text style={styles.actionButtonIcon}>🚪</Text>
          <Text style={styles.actionButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Voice Memo Cleaner • Made with ❤️
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 16,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#667eea',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  recordButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#999',
  },
  recordButtonInner: {
    alignItems: 'center',
  },
  recordButtonIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  recordButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  recordButtonSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});