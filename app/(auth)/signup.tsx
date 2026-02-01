import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';

export default function SignupScreen() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      dispatch({
        type: 'LOGIN',
        payload: { id: 'temp', email, name }
      });
      dispatch({ type: 'SET_DEMO_MODE', payload: true });

      router.push('/(auth)/verify' as any);
    },
    onError: (err) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setError(err.message);
    }
  });

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('All tactical data fields are mandatory.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Credential mismatch. Passwords must be identical.');
      return;
    }

    if (password.length < 8) {
      setError('Security breach: Password must be at least 8 characters.');
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the Operational Protocol (Terms).');
      return;
    }

    setError('');
    signupMutation.mutate({ name, email, password });
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
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 bg-background px-6 justify-center">
            {/* Header */}
            <View className="items-center mb-8">
              <Image
                source={require('@/assets/images/icon.png')}
                style={{ width: 60, height: 60, borderRadius: 12, marginBottom: 12 }}
              />
              <Text className="text-2xl font-bold text-foreground">Create Account</Text>
              <Text className="text-muted text-base mt-1">Join the future of trading</Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-error/20 border border-error rounded-xl p-4 mb-4">
                <Text className="text-error text-center">{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View className="gap-3 mb-6">
              {/* Name */}
              <View>
                <Text className="text-muted text-sm mb-2">Full Name</Text>
                <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
                  <IconSymbol name="person.fill" size={20} color="#8B92A0" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="words"
                    className="flex-1 py-4 px-3 text-foreground text-base"
                  />
                </View>
              </View>

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
                    placeholder="Create a password"
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

              {/* Confirm Password */}
              <View>
                <Text className="text-muted text-sm mb-2">Confirm Password</Text>
                <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
                  <IconSymbol name="lock.fill" size={20} color="#8B92A0" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#6B7280"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="flex-1 py-4 px-3 text-foreground text-base"
                  />
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                className="flex-row items-center mt-2"
              >
                <View
                  className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 ${acceptedTerms ? 'bg-primary border-primary' : 'border-border'
                    }`}
                >
                  {acceptedTerms && (
                    <IconSymbol name="checkmark.circle.fill" size={16} color="#0A0A0F" />
                  )}
                </View>
                <Text className="text-muted text-sm flex-1">
                  I agree to the <Text className="text-primary">Terms of Service</Text> and{' '}
                  <Text className="text-primary">Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={signupMutation.isPending}
              className="bg-primary py-4 rounded-2xl items-center mb-6"
              style={{
                shadowColor: '#00F0FF',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
                opacity: signupMutation.isPending ? 0.7 : 1,
              }}
            >
              <Text className="text-background font-bold text-lg">
                {signupMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-muted mx-4">or</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Google Signup Button */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              className="bg-white py-4 rounded-2xl items-center mb-6 flex-row justify-center"
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }}
                style={{ width: 24, height: 24, marginRight: 12 }}
              />
              <Text className="text-black font-bold text-base">Continue with Google</Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center">
              <Text className="text-muted">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary font-semibold">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
