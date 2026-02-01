import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      dispatch({
        type: 'LOGIN',
        payload: {
          id: data.user.id.toString(),
          email: data.user.email || '',
          name: data.user.email?.split('@')[0] || 'User'
        }
      });

      if (!data.user.isEmailVerified) {
        router.push('/(auth)/verify' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    },
    onError: (err) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError(err.message);
    }
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Operational credentials required for access.');
      return;
    }
    setError('');
    loginMutation.mutate({ email, password });
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Linking.createURL('/oauth/callback'),
          skipBrowserRedirect: !Platform.OS || Platform.OS === 'web' ? false : true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        Linking.openURL(data.url);
      }
    } catch (err) {
      console.error('[Auth] Google login failed:', err);
      Alert.alert('IDENTITY ERROR', 'Failed to synchronize with Google identity protocol.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 bg-background px-6 justify-center">
            {/* Logo */}
            <View className="items-center mb-12">
              <Image
                source={require('@/assets/images/icon.png')}
                style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 16 }}
              />
              <Text className="text-3xl font-bold text-foreground">Welcome Back</Text>
              <Text className="text-muted text-base mt-2">Sign in to continue trading</Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-error/20 border border-error rounded-xl p-4 mb-6">
                <Text className="text-error text-center">{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View className="gap-4 mb-8">
              {/* Email */}
              <View>
                <Text className="text-muted text-sm mb-2">Email</Text>
                <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
                  <IconSymbol name="envelope.fill" size={20} color="#8B92A0" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    className="flex-1 py-4 px-3 text-foreground text-base"
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text className="text-muted text-sm mb-2">Password</Text>
                <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
                  <IconSymbol name="lock.fill" size={20} color="#8B92A0" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="flex-1 py-4 px-3 text-foreground text-base"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <IconSymbol
                      name={showPassword ? "eye.slash.fill" : "eye.fill"}
                      size={20}
                      color="#8B92A0"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity className="self-end">
                <Text className="text-primary text-sm">Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              className="bg-primary py-4 rounded-2xl items-center mb-6"
              style={{
                shadowColor: '#00F0FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                opacity: loginMutation.isPending ? 0.7 : 1,
              }}
            >
              <Text className="text-background font-bold text-lg">
                {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-muted mx-4">or</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              className="bg-white py-4 rounded-2xl items-center mb-6 flex-row justify-center"
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                style={{ width: 24, height: 24, marginRight: 12 }}
              />
              <Text className="text-black font-bold text-base">Sign in with Google</Text>
            </TouchableOpacity>

            {/* Demo Mode Button */}
            <TouchableOpacity
              onPress={() => {
                dispatch({ type: 'SET_DEMO_MODE', payload: true });
                dispatch({
                  type: 'LOGIN',
                  payload: { id: 'demo', email: 'demo@insydetradar.com', name: 'Demo User' }
                });
                router.replace('/(tabs)');
              }}
              className="border-2 border-accent py-4 rounded-2xl items-center mb-8"
            >
              <Text className="text-accent font-bold text-lg">Try Demo Mode</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="flex-row justify-center">
              <Text className="text-muted">Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text className="text-primary font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
