import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp, useAuth, useTrading } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { Platform, Modal, TextInput, ActivityIndicator, Linking } from 'react-native';
import { trpc } from '@/lib/trpc';

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
  const [showBrokerModal, setShowBrokerModal] = useState(false);

  // Broker Status
  const brokerStatusQuery = trpc.trading.engineStatus.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 10000,
  });

  const isAlpacaConnected = brokerStatusQuery.data?.broker.status === 'authenticated';

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

        {/* Trading Environment */}
        <View className="mb-8">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Trading Environment</Text>
          <View className="gap-3">
            <SettingsItem
              icon="link"
              label="Broker Protocol"
              value={isAlpacaConnected ? 'CONNECTED' : 'NOT CONNECTED'}
              onPress={() => setShowBrokerModal(true)}
              color={isAlpacaConnected ? '#39FF14' : '#FFB800'}
            />
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

      <BrokerConnectionModal
        visible={showBrokerModal}
        onClose={() => setShowBrokerModal(false)}
        isDemoMode={isDemoMode}
      />
    </ScreenContainer>
  );
}

// ============================================
// BROKER CONNECTION MODAL
// ============================================

function BrokerConnectionModal({
  visible,
  onClose,
  isDemoMode,
}: {
  visible: boolean;
  onClose: () => void;
  isDemoMode: boolean;
}) {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const connectBroker = trpc.trading.connectBroker.useMutation({
    onSuccess: () => {
      Alert.alert('PROTOCOL SECURED', 'Alpaca broker connection established successfully.');
      onClose();
    },
    onError: (err) => {
      Alert.alert('CONNECTION REJECTED', err.message);
    }
  });

  const handleConnect = () => {
    if (!apiKey || !secretKey) {
      Alert.alert('MISSING CREDENTIALS', 'Both API Key and Secret Key are required for tactical sync.');
      return;
    }

    connectBroker.mutate({
      apiKey,
      secretKey,
      paper: isDemoMode,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row justify-between items-center p-6 border-b border-border">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-muted font-bold uppercase tracking-widest text-xs">Abort</Text>
          </TouchableOpacity>
          <Text className="text-foreground text-lg font-black uppercase tracking-tight">Broker Sync</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1 p-6">
          <View className="bg-surface/50 rounded-3xl p-6 border border-border mb-8">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-xl bg-accent/20 items-center justify-center mr-4 border border-accent/30">
                <IconSymbol name="link" size={20} color="#00F0FF" />
              </View>
              <View>
                <Text className="text-foreground font-black uppercase tracking-tight">Alpaca Markets</Text>
                <Text className="text-muted/60 text-[10px] font-bold uppercase tracking-widest">Broker Integration</Text>
              </View>
            </View>
            <Text className="text-muted/40 text-[10px] leading-4 font-bold uppercase">
              Enter your Alpaca API credentials to enable autonomous trading and real-time market data synchronization.
            </Text>
          </View>

          {/* Mode Indicator */}
          <View className={`mb-8 p-4 rounded-2xl border ${isDemoMode ? 'bg-warning/10 border-warning/20' : 'bg-success/10 border-success/20'}`}>
            <Text className={`text-center font-black text-xs uppercase ${isDemoMode ? 'text-warning' : 'text-success'}`}>
              Syncing to {isDemoMode ? 'Paper (Simulation)' : 'Live (Production)'} Protocol
            </Text>
          </View>

          {/* API Key */}
          <View className="mb-6">
            <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1">API Key ID</Text>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="APCA-API-KEY-ID"
              placeholderTextColor="#4B5563"
              className="bg-surface/50 border border-border rounded-2xl px-5 py-4 text-foreground font-bold"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Secret Key */}
          <View className="mb-10">
            <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1">API Secret Key</Text>
            <TextInput
              value={secretKey}
              onChangeText={setSecretKey}
              placeholder="APCA-API-SECRET-KEY"
              placeholderTextColor="#4B5563"
              secureTextEntry
              className="bg-surface/50 border border-border rounded-2xl px-5 py-4 text-foreground font-bold"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://alpaca.markets/')}
            className="flex-row items-center justify-center mb-10"
          >
            <Text className="text-muted/40 text-[10px] font-black uppercase mr-2">Don't have keys?</Text>
            <Text className="text-accent text-[10px] font-black uppercase underline">Get them at Alpaca</Text>
          </TouchableOpacity>
        </ScrollView>

        <View className="p-6 border-t border-border bg-background pb-10">
          <TouchableOpacity
            onPress={handleConnect}
            disabled={connectBroker.isPending}
            className="bg-primary py-5 rounded-3xl items-center"
            style={[
              { shadowColor: '#00F0FF', shadowOpacity: 0.4, shadowRadius: 20 },
              { opacity: connectBroker.isPending ? 0.3 : 1 }
            ]}
          >
            {connectBroker.isPending ? (
              <ActivityIndicator color="#0A0A0F" />
            ) : (
              <Text className="text-background font-black text-lg uppercase tracking-tight">
                Establish Protocol
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
