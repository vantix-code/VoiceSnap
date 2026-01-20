import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

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

export const uploadAudioFile = async (
  userId: string,
  audioUri: string,
  filename: string
): Promise<string | null> => {
  console.log('🟡 uploadAudioFile START');
  console.log('userId:', userId);
  console.log('audioUri:', audioUri);
  console.log('filename:', filename);
  console.log('supabaseUrl:', supabaseUrl);

  try {
    console.log('🟡 Getting session...');
    const sessionRes = await supabase.auth.getSession();
    console.log('Session response:', sessionRes);

    const session = sessionRes.data.session;
    if (!session) {
      console.error('🔴 NO SESSION');
      return null;
    }

    console.log('🟢 Session OK');
    console.log('Access token length:', session.access_token.length);

    const filePath = `${userId}/${filename}`;
    console.log('File path:', filePath);

    // STEP 1: check local file
    console.log('🟡 Fetching local audio file...');
    const localResponse = await fetch(audioUri);

    console.log('Local fetch status:', localResponse.status);
    console.log('Local fetch headers:', localResponse.headers);

    if (!localResponse.ok) {
      console.error('🔴 Failed to read local file');
      return null;
    }

    console.log('🟡 Converting to blob...');
    const blob = await localResponse.blob();

    console.log('🟢 Blob created');
    console.log('Blob size:', blob.size);
    console.log('Blob type:', blob.type);

    // STEP 2: upload to Supabase
    const uploadUrl = `${supabaseUrl}/storage/v1/object/audio-recordings/${filePath}`;
    console.log('Upload URL:', uploadUrl);

    console.log('🟡 Uploading...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': blob.type || 'audio/m4a',
      },
      body: blob,
    });

    console.log('Upload status:', uploadResponse.status);
    console.log('Upload headers:', uploadResponse.headers);

    const uploadText = await uploadResponse.text();
    console.log('Upload response text:', uploadText);

    if (!uploadResponse.ok) {
      console.error('🔴 Upload failed');
      return null;
    }

    console.log('🟢 Upload SUCCESS');

    const publicUrlRes = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filePath);

    console.log('Public URL result:', publicUrlRes);

    return publicUrlRes.data.publicUrl;

  } catch (err) {
    console.error('🔥 CATCH ERROR:', err);
    console.error('🔥 ERROR TYPE:', typeof err);
    console.error('🔥 ERROR STRING:', String(err));
    console.error('🔥 ERROR JSON:', JSON.stringify(err, null, 2));
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