// src/screens/RecordingScreen.tsx - Voice Recording Interface
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator
} from 'react-native';
import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { getCurrentUser, saveRecording, uploadAudioFile } from '../lib/supabase';

const MAX_RECORDING_TIME = 600; // 10 minutes in seconds

interface RecordingScreenProps {
  navigation: any;
}

export default function RecordingScreen({ navigation }: RecordingScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Animation
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Request permissions
    requestPermissions();

    // Timer
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  useEffect(() => {
    // Pulse animation
    if (isRecording && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  const requestPermissions = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      Alert.alert('Permission Error', 'Please enable microphone access in settings');
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Microphone access is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;
    
    try {
      if (isPaused) {
        await recording.startAsync();
        setIsPaused(false);
      } else {
        await recording.pauseAsync();
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Failed to pause/resume:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);

      if (!uri) {
        Alert.alert('Error', 'No audio file created');
        return;
      }

      // Process the recording
      await processRecording(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const processRecording = async (audioUri: string) => {
    setIsProcessing(true);
    setProcessingStep('Uploading audio...');

    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // 1. Upload to Supabase Storage
      const filename = `recording-${Date.now()}.m4a`;
      const audioUrl = await uploadAudioFile(user.id, audioUri, filename);

      if (!audioUrl) {
        throw new Error('Failed to upload audio');
      }

      // 2. Save recording to database (without transcript yet)
      setProcessingStep('Saving recording...');
      const savedRecording = await saveRecording(
        user.id,
        audioUrl,
        recordingTime
      );

      // 3. Send to backend for processing
      setProcessingStep('Transcribing audio...');
      
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: filename,
      } as any);
      formData.append('userId', user.id);
      formData.append('recordingId', savedRecording.id);

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      
      const response = await axios.post(
        `${API_URL}/api/process`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutes timeout
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            if (percentCompleted < 100) {
              setProcessingStep(`Uploading... ${percentCompleted}%`);
            } else {
              setProcessingStep('Processing with AI...');
            }
          }
        }
      );

      if (response.data.success) {
        // Navigate to results
        navigation.replace('Results', {
          recording: {
            id: savedRecording.id,
            transcript: response.data.transcript,
            summary: response.data.summary,
            duration: recordingTime,
            audioUrl: audioUrl
          }
        });
      } else {
        throw new Error('Processing failed');
      }

    } catch (error: any) {
      console.error('Processing error:', error);
      let errorMessage = 'Failed to process recording';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Processing Error', errorMessage);
      navigation.goBack();
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.processingText}>{processingStep}</Text>
        <Text style={styles.processingSubtext}>
          This may take 30-60 seconds...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        <Text style={styles.timerLimit}>/ {formatTime(MAX_RECORDING_TIME)}</Text>
      </View>

      {/* Recording Status */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          isRecording && !isPaused && styles.statusDotActive
        ]} />
        <Text style={styles.statusText}>
          {!isRecording ? 'Ready to Record' : isPaused ? 'Paused' : 'Recording...'}
        </Text>
      </View>

      {/* Main Record Button */}
      <View style={styles.recordButtonContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startRecording}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Text style={styles.recordIcon}>🎙️</Text>
            </Animated.View>
            <Text style={styles.startButtonText}>Tap to Start</Text>
          </TouchableOpacity>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.recordingButton, isPaused && styles.recordingButtonPaused]}
              onPress={pauseRecording}
              activeOpacity={0.8}
            >
              <Text style={styles.recordingIcon}>
                {isPaused ? '▶️' : '⏸️'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {isRecording && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopRecording}
          >
            <Text style={styles.stopButtonIcon}>⏹️</Text>
            <Text style={styles.stopButtonText}>Stop & Process</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
        <Text style={styles.tipText}>• Speak clearly in a quiet environment</Text>
        <Text style={styles.tipText}>• Keep recordings under 10 minutes</Text>
        <Text style={styles.tipText}>• State action items explicitly</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  timerText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#667eea',
  },
  timerLimit: {
    fontSize: 18,
    color: '#999',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#ff4444',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  recordButtonContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  startButton: {
    backgroundColor: '#667eea',
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recordIcon: {
    fontSize: 80,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  recordingButton: {
    backgroundColor: '#ff4444',
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recordingButtonPaused: {
    backgroundColor: '#ffa500',
  },
  recordingIcon: {
    fontSize: 80,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#333',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  tipsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
});