// src/screens/HistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { getCurrentUser, getUserRecordings } from '../lib/supabase';
import { format } from 'date-fns';

export default function HistoryScreen({ navigation }: any) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const data = await getUserRecordings(user.id);
      setRecordings(data);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (recordings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎙️</Text>
        <Text style={styles.emptyTitle}>No Recordings Yet</Text>
        <Text style={styles.emptyText}>
          Start recording to see your history here
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.recordingCard}
            onPress={() => navigation.navigate('Results', { recording: item })}
          >
            <View style={styles.recordingHeader}>
              <Text style={styles.recordingDate}>
                {format(new Date(item.created_at), 'MMM dd, yyyy')}
              </Text>
              <Text style={styles.recordingDuration}>
                {formatDuration(item.duration)}
              </Text>
            </View>
            {item.summary && (
              <Text style={styles.recordingPreview} numberOfLines={2}>
                {item.summary.bullets[0]}
              </Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  recordingCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordingDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recordingDuration: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  recordingPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingsCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  settingLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  settingsButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 32,
    backgroundColor: '#fff',
  },
  signOutText: {
    color: '#ff4444',
  },
  paywallHeader: {
    alignItems: 'center',
    padding: 40,
  },
  paywallIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  paywallTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  paywallSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  featuresList: {
    padding: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureCheck: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  pricingCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
  },
  priceUnit: {
    fontSize: 16,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#667eea',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#667eea',
    fontSize: 16,
  },
});