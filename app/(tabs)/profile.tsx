import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp, useAuth, useTrading } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { PremiumCard } from '@/components/ui/premium-card';

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
      className="bg-surface/50 rounded-2xl p-4 border border-border flex-row items-center"
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: danger ? '#FF336610' : `${color}10`, borderWidth: 1, borderColor: danger ? '#FF336630' : `${color}30` }}
      >
        <IconSymbol name={icon} size={20} color={danger ? '#FF3366' : color} />
      </View>

      <View className="flex-1">
        <Text className={`font-black tracking-tight ${danger ? 'text-error' : 'text-foreground'}`}>
          {label}
        </Text>
        {value && <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest leading-3 mt-1">{value}</Text>}
      </View>

      {showArrow && (
        <IconSymbol name="chevron.right" size={18} color="#4B5563" />
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
    <View className="bg-surface/50 rounded-2xl p-4 border border-border flex-row items-center">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: `${color}10`, borderWidth: 1, borderColor: `${color}30` }}
      >
        <IconSymbol name={icon} size={20} color={color} />
      </View>

      <View className="flex-1">
        <Text className="text-foreground font-black tracking-tight">{label}</Text>
        {description && <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest leading-3 mt-1">{description}</Text>}
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
        'OPERATIONAL SHUTDOWN',
        'Are you sure you want to terminate the current session?',
        [
          { text: 'ABORT', style: 'cancel' },
          {
            text: 'TERMINATE',
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
          'LIVE TRADING PROTOCOL',
          'You are initiating Live Trading. REAL CAPITAL will be deployed. Ensure your risk management is configured.',
          [
            { text: 'ABORT', style: 'cancel' },
            {
              text: 'ENGAGE LIVE',
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
        <View className="mb-8 pt-4">
          <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest mb-1">System User</Text>
          <Text className="text-foreground text-3xl font-black">Profile</Text>
        </View>

        {/* User Card */}
        <PremiumCard hasGlow={true} glowColor="#00F0FF" className="mb-10">
          <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-2xl bg-primary/10 items-center justify-center mr-5 border border-primary/30">
              <Text className="text-primary text-3xl font-black">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-xl font-black tracking-tight">{user?.name || 'Authorized Trader'}</Text>
              <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest">{user?.email || 'trader@insydetradar.app'}</Text>
              {isDemoMode && (
                <View className="mt-3 bg-warning/20 px-3 py-1 rounded-lg border border-warning/30 self-start">
                  <Text className="text-warning text-[9px] font-black uppercase tracking-tighter">SIMULATION MODE ACTIVE</Text>
                </View>
              )}
            </View>
          </View>
        </PremiumCard>

        {/* Trading Settings */}
        <View className="mb-8">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Trading Environment</Text>
          <View className="gap-3">
            <SettingsToggle
              icon="power"
              label="Live Markets Access"
              description={isDemoMode ? 'SIMULATED DATA' : 'REAL CAPITAL ACCESS'}
              value={!isDemoMode}
              onToggle={(v) => handleDemoModeToggle(!v)}
              color={isDemoMode ? '#FFB800' : '#39FF14'}
            />
          </View>
        </View>

        {/* Notifications */}
        <View className="mb-8">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Comms Protocol</Text>
          <View className="gap-3">
            <SettingsToggle
              icon="bell.fill"
              label="Push Manifest"
              description="Trade execution alerts"
              value={notificationsEnabled}
              onToggle={setNotificationsEnabled}
              color="#FF00E5"
            />
          </View>
        </View>

        {/* Account Settings */}
        <View className="mb-8">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Security & Access</Text>
          <View className="gap-3">
            <SettingsItem
              icon="person.fill"
              label="Identity Profile"
              color="#00F0FF"
            />
            <SettingsItem
              icon="lock.fill"
              label="Biometric Security"
              value="Verified"
              color="#39FF14"
            />
            <SettingsItem
              icon="creditcard.fill"
              label="Payment Channels"
              value="Primary Method Set"
              color="#FFB800"
            />
          </View>
        </View>

        {/* Support */}
        <View className="mb-8">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Support Module</Text>
          <View className="gap-3">
            <SettingsItem
              icon="info.circle.fill"
              label="Documentation"
              color="#00F0FF"
            />
            <SettingsItem
              icon="envelope.fill"
              label="Direct Comms"
              color="#FF00E5"
            />
          </View>
        </View>

        {/* Legal */}
        <View className="mb-10">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Legal Protocols</Text>
          <View className="gap-3">
            <SettingsItem
              icon="chevron.left.forwardslash.chevron.right"
              label="Terms of Engagement"
              color="#4B5563"
            />
            <SettingsItem
              icon="lock.fill"
              label="Privacy Manifest"
              color="#4B5563"
            />
          </View>
        </View>

        {/* Logout */}
        <View className="mb-10">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-error/5 border border-error/30 rounded-3xl p-6 flex-row items-center justify-center"
            style={{ shadowColor: '#FF3366', shadowOpacity: 0.2, shadowRadius: 15 }}
          >
            <IconSymbol name="power" size={20} color="#FF3366" />
            <Text className="text-error font-black ml-2 uppercase tracking-tight">Terminate Session</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="items-center pb-10">
          <Text className="text-muted/40 text-[10px] font-black uppercase tracking-[0.3em]">Insydetradar v1.0.0-PRO</Text>
          <Text className="text-muted/30 text-[9px] mt-1 font-bold">AUTONOMOUS TRADING INTERFACE</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
