// src/screens/RecordingScreen.tsx - Enhanced with Better Animations
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import { getCurrentUser, saveRecording, uploadAudioFile } from '../lib/supabase';

const MAX_RECORDING_TIME = 600; // 10 minutes
const { width } = Dimensions.get('window');

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
  const [processingProgress, setProcessingProgress] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    // Pulse animation for record button
    if (isRecording && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animations
      const wave1 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const wave2 = Animated.loop(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(waveAnim2, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const wave3 = Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(waveAnim3, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim3, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      wave1.start();
      wave2.start();
      wave3.start();
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
      waveAnim3.setValue(0);
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

      await processRecording(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const processRecording = async (audioUri: string) => {
    setIsProcessing(true);
    setProcessingStep('Preparing upload...');
    setProcessingProgress(0);

    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Animate progress
      Animated.timing(progressAnim, {
        toValue: 0.2,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // 1. Upload to Supabase Storage
      setProcessingStep('Uploading audio...');
      const filename = `recording-${Date.now()}.m4a`;
      const audioUrl = await uploadAudioFile(user.id, audioUri, filename);

      if (!audioUrl) {
        throw new Error('Failed to upload audio');
      }

      Animated.timing(progressAnim, {
        toValue: 0.4,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // 2. Save recording to database
      setProcessingStep('Saving recording...');
      const savedRecording = await saveRecording(
        user.id,
        audioUrl,
        recordingTime
      );

      Animated.timing(progressAnim, {
        toValue: 0.5,
        duration: 500,
        useNativeDriver: false,
      }).start();

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
          timeout: 120000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            if (percentCompleted < 100) {
              setProcessingStep(`Uploading... ${percentCompleted}%`);
              const progress = 0.5 + (percentCompleted / 100) * 0.2;
              progressAnim.setValue(progress);
            } else {
              setProcessingStep('Processing with AI...');
              Animated.timing(progressAnim, {
                toValue: 0.8,
                duration: 1000,
                useNativeDriver: false,
              }).start();
            }
          }
        }
      );

      if (response.data.success) {
        // Complete progress
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }).start();

        setProcessingStep('Complete! ✨');

        // Wait a moment before navigating
        setTimeout(() => {
          navigation.replace('Results', {
            recording: {
              id: savedRecording.id,
              transcript: response.data.transcript,
              summary: response.data.summary,
              duration: recordingTime,
              audioUrl: audioUrl
            }
          });
        }, 1000);
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
      progressAnim.setValue(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.processingContainer}>
        <Animated.View style={[styles.processingCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.processingIcon}>🎙️</Text>
        </Animated.View>

        <Text style={styles.processingText}>{processingStep}</Text>
        <Text style={styles.processingSubtext}>
          This may take 30-60 seconds...
        </Text>

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        <Text style={styles.progressPercentage}>
          {Math.round(progressAnim._value * 100)}%
        </Text>
      </View>
    );
  }

  const waveScale1 = waveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const waveScale2 = waveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const waveScale3 = waveAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.1],
  });

  const waveOpacity = waveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <View style={styles.container}>
      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        <Text style={styles.timerLimit}>/ {formatTime(MAX_RECORDING_TIME)}</Text>

        {/* Progress Bar */}
        <View style={styles.timeProgressBar}>
          <View
            style={[
              styles.timeProgressFill,
              { width: `${(recordingTime / MAX_RECORDING_TIME) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          isRecording && !isPaused && styles.statusDotActive
        ]} />
        <Text style={styles.statusText}>
          {!isRecording ? 'Ready to Record' : isPaused ? 'Paused' : 'Recording...'}
        </Text>
      </View>

      {/* Main Record Button with Waves */}
      <View style={styles.recordButtonContainer}>
        {isRecording && !isPaused && (
          <>
            <Animated.View style={[
              styles.wave,
              { transform: [{ scale: waveScale1 }], opacity: waveOpacity }
            ]} />
            <Animated.View style={[
              styles.wave,
              { transform: [{ scale: waveScale2 }], opacity: waveOpacity }
            ]} />
            <Animated.View style={[
              styles.wave,
              { transform: [{ scale: waveScale3 }], opacity: waveOpacity }
            ]} />
          </>
        )}

        {!isRecording ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startRecording}
            activeOpacity={0.8}
          >
            <Text style={styles.recordIcon}>🎙️</Text>
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
  processingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  processingIcon: {
    fontSize: 60,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: width - 80,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 32,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginTop: 12,
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
  timeProgressBar: {
    width: width - 80,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  timeProgressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
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
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#667eea',
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