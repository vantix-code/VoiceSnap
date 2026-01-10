// src/screens/ResultsScreen.tsx
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard,
  Share
} from 'react-native';

export default function ResultsScreen({ route, navigation }: any) {
  const { recording } = route.params;
  const { transcript, summary, duration } = recording;

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const shareContent = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✅</Text>
        <Text style={styles.headerTitle}>Processing Complete!</Text>
        <Text style={styles.headerSubtitle}>
          Duration: {formatDuration(duration)}
        </Text>
      </View>

      {/* Key Points */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>💡</Text>
          <Text style={styles.cardTitle}>Key Points</Text>
        </View>
        {summary.bullets.map((bullet: string, index: number) => (
          <View key={index} style={styles.bulletItem}>
            <Text style={styles.bulletNumber}>{index + 1}</Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyToClipboard(summary.bullets.join('\n• '), 'Key Points')}
        >
          <Text style={styles.copyButtonText}>📋 Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Action Item */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>✨</Text>
          <Text style={styles.cardTitle}>Action Item</Text>
        </View>
        <Text style={styles.actionText}>{summary.action}</Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyToClipboard(summary.action, 'Action Item')}
        >
          <Text style={styles.copyButtonText}>📋 Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Email Draft */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📧</Text>
          <Text style={styles.cardTitle}>Email Draft</Text>
        </View>
        <Text style={styles.emailText}>{summary.email}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.copyButton, styles.halfButton]}
            onPress={() => copyToClipboard(summary.email, 'Email')}
          >
            <Text style={styles.copyButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.copyButton, styles.halfButton]}
            onPress={() => shareContent(summary.email)}
          >
            <Text style={styles.copyButtonText}>📤 Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Transcript */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>Full Transcript</Text>
        </View>
        <Text style={styles.transcriptText}>{transcript}</Text>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => copyToClipboard(transcript, 'Transcript')}
        >
          <Text style={styles.copyButtonText}>📋 Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  transcriptText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  copyButton: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfButton: {
    flex: 1,
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});