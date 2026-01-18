// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from Expo
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('supabaseUrl:', supabaseUrl ? 'Found' : 'MISSING');
  console.log('supabaseAnonKey:', supabaseAnonKey ? 'Found' : 'MISSING');
  throw new Error('Missing Supabase environment variables! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Get current user
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

// Get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
};

// Check if user can record
export const canUserRecord = async (userId: string) => {
  const profile = await getUserProfile(userId);
  
  if (!profile) {
    return { canRecord: false, recordingsUsed: 0, isPremium: false };
  }

  const isPremium = profile.subscription_status === 'premium' &&
                    new Date(profile.subscription_end_date) > new Date();
  
  const canRecord = isPremium || profile.recordings_this_month < 5;

  return {
    canRecord,
    recordingsUsed: profile.recordings_this_month,
    isPremium
  };
};

// Save recording
export const saveRecording = async (
  userId: string,
  audioUrl: string,
  duration: number,
  transcript?: string,
  summary?: any
) => {
  const { data, error } = await supabase
    .from('recordings')
    .insert([
      {
        user_id: userId,
        audio_url: audioUrl,
        duration,
        transcript,
        summary
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving recording:', error);
    throw error;
  }

  return data;
};

// Get user's recordings
export const getUserRecordings = async (userId: string) => {
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recordings:', error);
    return [];
  }

  return data;
};

// Upload audio file
export const uploadAudioFile = async (
  userId: string,
  audioUri: string,
  filename: string
): Promise<string | null> => {
  try {
    console.log('📤 Starting audio upload...');
    console.log('User ID:', userId);
    console.log('Filename:', filename);
    console.log('Audio URI:', audioUri);

    // Read file
    const response = await fetch(audioUri);
    if (!response.ok) {
      throw new Error(`Failed to read audio file: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('✅ File read successfully. Size:', blob.size, 'bytes');

    const filePath = `${userId}/${filename}`;
    console.log('Upload path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, blob, {
        contentType: 'audio/m4a',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name
      });

      // Better error messages
      if (error.message.includes('new row violates row-level security')) {
        console.error('💡 RLS Error: Storage policies not configured correctly');
      } else if (error.message.includes('Bucket not found')) {
        console.error('💡 Bucket Error: "audio-recordings" bucket does not exist');
      } else if (error.message.includes('duplicate')) {
        console.error('💡 File already exists. Trying upsert...');
        // Retry with upsert
        const { data: retryData, error: retryError } = await supabase.storage
          .from('audio-recordings')
          .upload(filePath, blob, {
            contentType: 'audio/m4a',
            upsert: true
          });

        if (retryError) {
          console.error('❌ Retry failed:', retryError);
          return null;
        }

        console.log('✅ Upload successful (upsert)');
      } else {
        return null;
      }
    }

    console.log('✅ File uploaded successfully!');
    console.log('Upload data:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filePath);

    console.log('✅ Public URL generated:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error: any) {
    console.error('❌ Upload exception:', error);
    console.error('Exception details:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
};

// Delete recording
export const deleteRecording = async (recordingId: string) => {
  const { error } = await supabase
    .from('recordings')
    .delete()
    .eq('id', recordingId);

  if (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }

  return true;
};