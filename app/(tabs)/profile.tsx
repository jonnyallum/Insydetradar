import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp, useAuth, useTrading } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function SettingsItem({ 
  icon, 
  label, 
  value, 
  onPress, 
  showArrow = true,
  color = '#8B92A0',
  danger = false,
}: { 
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  color?: string;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-surface rounded-xl p-4 border border-border flex-row items-center"
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: danger ? '#FF336620' : `${color}20` }}
      >
        <IconSymbol name={icon} size={20} color={danger ? '#FF3366' : color} />
      </View>
      
      <View className="flex-1">
        <Text className={`font-semibold ${danger ? 'text-error' : 'text-foreground'}`}>
          {label}
        </Text>
        {value && <Text className="text-muted text-sm">{value}</Text>}
      </View>
      
      {showArrow && (
        <IconSymbol name="chevron.right" size={18} color="#6B7280" />
      )}
    </TouchableOpacity>
  );
}

function SettingsToggle({ 
  icon, 
  label, 
  description,
  value, 
  onToggle,
  color = '#00F0FF',
}: { 
  icon: any;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  color?: string;
}) {
  return (
    <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center">
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: `${color}20` }}
      >
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      
      <View className="flex-1">
        <Text className="text-foreground font-semibold">{label}</Text>
        {description && <Text className="text-muted text-sm">{description}</Text>}
      </View>
      
      <Switch
        value={value}
        onValueChange={(newValue) => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onToggle(newValue);
        }}
        trackColor={{ false: '#1E1E2E', true: `${color}60` }}
        thumbColor={value ? color : '#6B7280'}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDemoMode, setDemoMode } = useTrading();
  const { dispatch } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
      router.replace('/(auth)/login');
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            style: 'destructive',
            onPress: () => {
              logout();
              router.replace('/(auth)/login');
            }
          },
        ]
      );
    }
  };
  
  const handleDemoModeToggle = (enabled: boolean) => {
    if (Platform.OS === 'web') {
      setDemoMode(enabled);
    } else {
      if (!enabled) {
        Alert.alert(
          'Switch to Live Trading',
          'You are about to switch to live trading mode. Real money will be used for trades.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Switch to Live', 
              onPress: () => setDemoMode(false)
            },
          ]
        );
      } else {
        setDemoMode(true);
      }
    }
  };
  
  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-foreground text-2xl font-bold">Profile</Text>
          <Text className="text-muted">Manage your account</Text>
        </View>
        
        {/* User Card */}
        <View className="bg-surface rounded-2xl p-5 border border-border mb-6 flex-row items-center">
          <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mr-4">
            <Text className="text-primary text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-lg font-semibold">{user?.name || 'User'}</Text>
            <Text className="text-muted">{user?.email || 'user@example.com'}</Text>
            {isDemoMode && (
              <View className="mt-2 bg-warning/20 px-3 py-1 rounded-full self-start">
                <Text className="text-warning text-xs font-semibold">DEMO MODE</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Trading Settings */}
        <View className="mb-6">
          <Text className="text-muted text-sm font-semibold mb-3 px-1">TRADING</Text>
          <View className="gap-3">
            <SettingsToggle
              icon="power"
              label="Demo Mode"
              description={isDemoMode ? 'Trading with virtual money' : 'Trading with real money'}
              value={isDemoMode}
              onToggle={handleDemoModeToggle}
              color={isDemoMode ? '#FFB800' : '#39FF14'}
            />
          </View>
        </View>
        
        {/* Notifications */}
        <View className="mb-6">
          <Text className="text-muted text-sm font-semibold mb-3 px-1">NOTIFICATIONS</Text>
          <View className="gap-3">
            <SettingsToggle
              icon="bell.fill"
              label="Push Notifications"
              description="Trade alerts and updates"
              value={notificationsEnabled}
              onToggle={setNotificationsEnabled}
              color="#FF00E5"
            />
          </View>
        </View>
        
        {/* Account Settings */}
        <View className="mb-6">
          <Text className="text-muted text-sm font-semibold mb-3 px-1">ACCOUNT</Text>
          <View className="gap-3">
            <SettingsItem
              icon="person.fill"
              label="Edit Profile"
              color="#00F0FF"
            />
            <SettingsItem
              icon="lock.fill"
              label="Security"
              value="Password, 2FA"
              color="#39FF14"
            />
            <SettingsItem
              icon="creditcard.fill"
              label="Payment Methods"
              value="Manage cards"
              color="#FFB800"
            />
          </View>
        </View>
        
        {/* Support */}
        <View className="mb-6">
          <Text className="text-muted text-sm font-semibold mb-3 px-1">SUPPORT</Text>
          <View className="gap-3">
            <SettingsItem
              icon="info.circle.fill"
              label="Help Center"
              color="#00F0FF"
            />
            <SettingsItem
              icon="envelope.fill"
              label="Contact Support"
              color="#FF00E5"
            />
          </View>
        </View>
        
        {/* Legal */}
        <View className="mb-8">
          <Text className="text-muted text-sm font-semibold mb-3 px-1">LEGAL</Text>
          <View className="gap-3">
            <SettingsItem
              icon="chevron.left.forwardslash.chevron.right"
              label="Terms of Service"
              color="#6B7280"
            />
            <SettingsItem
              icon="lock.fill"
              label="Privacy Policy"
              color="#6B7280"
            />
          </View>
        </View>
        
        {/* Logout */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-error/20 border border-error rounded-xl p-4 flex-row items-center justify-center"
          >
            <IconSymbol name="power" size={20} color="#FF3366" />
            <Text className="text-error font-semibold ml-2">Logout</Text>
          </TouchableOpacity>
        </View>
        
        {/* Version */}
        <View className="items-center">
          <Image 
            source={require('@/assets/images/icon.png')} 
            style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 8, opacity: 0.5 }}
          />
          <Text className="text-muted text-sm">Insydetradar v1.0.0</Text>
          <Text className="text-muted text-xs mt-1">AI-Powered Autonomous Trading</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
