import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp, usePortfolio, useTrading } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
} from 'react-native-reanimated';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Pulsing AI indicator
function AIStatusIndicator({ isActive }: { isActive: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);
  
  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.5, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(0.3);
    }
  }, [isActive]);
  
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <View className="items-center justify-center">
      <Animated.View 
        style={[
          pulseStyle,
          {
            position: 'absolute',
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: isActive ? '#39FF14' : '#6B7280',
          }
        ]}
      />
      <View 
        className={`w-12 h-12 rounded-full items-center justify-center ${
          isActive ? 'bg-accent' : 'bg-muted'
        }`}
      >
        <IconSymbol 
          name={isActive ? "play.fill" : "pause.fill"} 
          size={20} 
          color="#0A0A0F" 
        />
      </View>
    </View>
  );
}

// Portfolio Card
function PortfolioCard() {
  const { portfolioValue, totalPnl, totalPnlPercent } = usePortfolio();
  const { isDemoMode } = useTrading();
  
  return (
    <View 
      className="bg-surface rounded-3xl p-6 border border-border"
      style={{
        shadowColor: '#00F0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      }}
    >
      {isDemoMode && (
        <View className="absolute top-4 right-4 bg-warning/20 px-3 py-1 rounded-full">
          <Text className="text-warning text-xs font-semibold">DEMO</Text>
        </View>
      )}
      
      <Text className="text-muted text-sm mb-1">Portfolio Value</Text>
      <Text className="text-foreground text-4xl font-bold mb-4" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCurrency(portfolioValue)}
      </Text>
      
      <View className="flex-row items-center">
        <View 
          className={`flex-row items-center px-3 py-1 rounded-full ${
            totalPnl >= 0 ? 'bg-success/20' : 'bg-error/20'
          }`}
        >
          <IconSymbol 
            name={totalPnl >= 0 ? "arrow.up.right" : "arrow.down.right"} 
            size={14} 
            color={totalPnl >= 0 ? '#39FF14' : '#FF3366'} 
          />
          <Text 
            className={`ml-1 font-semibold ${
              totalPnl >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {formatCurrency(Math.abs(totalPnl))} ({formatPercent(totalPnlPercent)})
          </Text>
        </View>
        <Text className="text-muted text-sm ml-2">Today</Text>
      </View>
    </View>
  );
}

// AI Status Card
function AIStatusCard() {
  const router = useRouter();
  const { isAITrading, riskLevel } = useTrading();
  
  const riskColors = {
    conservative: '#00F0FF',
    moderate: '#FFB800',
    aggressive: '#FF3366',
  };
  
  return (
    <TouchableOpacity 
      onPress={() => router.push('/(tabs)/trade')}
      className="bg-surface rounded-2xl p-5 border border-border flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1">
        <AIStatusIndicator isActive={isAITrading} />
        <View className="ml-4 flex-1">
          <Text className="text-foreground font-semibold text-lg">
            AI Trading {isAITrading ? 'Active' : 'Paused'}
          </Text>
          <View className="flex-row items-center mt-1">
            <View 
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: riskColors[riskLevel] }}
            />
            <Text className="text-muted text-sm capitalize">{riskLevel} Risk</Text>
          </View>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={20} color="#6B7280" />
    </TouchableOpacity>
  );
}

// Quick Stats
function QuickStats() {
  const { positions } = usePortfolio();
  const { isAITrading } = useTrading();
  
  // Calculate stats
  const activePositions = positions.length;
  const winningPositions = positions.filter(p => p.pnl > 0).length;
  const winRate = activePositions > 0 ? (winningPositions / activePositions) * 100 : 0;
  
  const stats = [
    { label: 'Active Trades', value: activePositions.toString(), color: '#00F0FF' },
    { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: '#39FF14' },
    { label: 'AI Status', value: isAITrading ? 'ON' : 'OFF', color: isAITrading ? '#39FF14' : '#6B7280' },
  ];
  
  return (
    <View className="flex-row gap-3">
      {stats.map((stat, index) => (
        <View 
          key={index}
          className="flex-1 bg-surface rounded-xl p-4 border border-border items-center"
        >
          <Text 
            className="text-2xl font-bold mb-1"
            style={{ color: stat.color, fontVariant: ['tabular-nums'] }}
          >
            {stat.value}
          </Text>
          <Text className="text-muted text-xs">{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

// Recent Activity
function RecentActivity() {
  const { positions } = usePortfolio();
  
  // Mock recent activity for demo
  const recentTrades = positions.length > 0 ? positions.slice(0, 5) : [
    { id: '1', symbol: 'BTC/USD', side: 'long', pnl: 245.50, pnlPercent: 2.45, type: 'crypto' },
    { id: '2', symbol: 'AAPL', side: 'long', pnl: -32.10, pnlPercent: -0.85, type: 'stock' },
    { id: '3', symbol: 'EUR/USD', side: 'short', pnl: 89.20, pnlPercent: 1.12, type: 'forex' },
  ];
  
  const typeIcons: Record<string, string> = {
    crypto: '₿',
    stock: '📈',
    forex: '💱',
  };
  
  return (
    <View>
      <Text className="text-foreground text-lg font-semibold mb-4">Recent Activity</Text>
      
      {recentTrades.length === 0 ? (
        <View className="bg-surface rounded-xl p-6 border border-border items-center">
          <Text className="text-muted">No recent trades</Text>
          <Text className="text-muted text-sm mt-1">Start AI trading to see activity</Text>
        </View>
      ) : (
        <View className="gap-2">
          {recentTrades.map((trade: any) => (
            <View 
              key={trade.id}
              className="bg-surface rounded-xl p-4 border border-border flex-row items-center"
            >
              <View className="w-10 h-10 rounded-full bg-background items-center justify-center mr-3">
                <Text className="text-lg">{typeIcons[trade.type] || '📊'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-semibold">{trade.symbol}</Text>
                <Text className="text-muted text-sm capitalize">{trade.side}</Text>
              </View>
              <View className="items-end">
                <Text 
                  className={`font-semibold ${trade.pnl >= 0 ? 'text-success' : 'text-error'}`}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                </Text>
                <Text 
                  className={`text-sm ${trade.pnl >= 0 ? 'text-success' : 'text-error'}`}
                >
                  {formatPercent(trade.pnlPercent)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Quick Actions
function QuickActions() {
  const router = useRouter();
  
  const actions = [
    { label: 'Deposit', icon: 'arrow.up.circle.fill' as const, color: '#39FF14', route: '/(tabs)/wallet' },
    { label: 'Markets', icon: 'chart.bar.fill' as const, color: '#00F0FF', route: '/(tabs)/markets' },
    { label: 'Settings', icon: 'gearshape.fill' as const, color: '#FF00E5', route: '/(tabs)/profile' },
  ];
  
  return (
    <View className="flex-row gap-3">
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => router.push(action.route as any)}
          className="flex-1 bg-surface rounded-xl p-4 border border-border items-center"
        >
          <IconSymbol name={action.icon} size={28} color={action.color} />
          <Text className="text-foreground text-sm mt-2">{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  // Redirect to onboarding/login if needed
  useEffect(() => {
    if (!state.isLoading) {
      if (!state.hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else if (!state.isAuthenticated) {
        router.replace('/(auth)/login');
      }
    }
  }, [state.isLoading, state.hasCompletedOnboarding, state.isAuthenticated]);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);
  
  if (state.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-primary text-lg">Loading...</Text>
      </ScreenContainer>
    );
  }
  
  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#00F0FF"
          />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-muted text-sm">Welcome back,</Text>
            <Text className="text-foreground text-xl font-bold">
              {state.user?.name || 'Trader'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
          >
            <IconSymbol name="bell.fill" size={20} color="#8B92A0" />
          </TouchableOpacity>
        </View>
        
        {/* Portfolio Card */}
        <View className="mb-6">
          <PortfolioCard />
        </View>
        
        {/* AI Status */}
        <View className="mb-6">
          <AIStatusCard />
        </View>
        
        {/* Quick Stats */}
        <View className="mb-6">
          <QuickStats />
        </View>
        
        {/* Quick Actions */}
        <View className="mb-6">
          <QuickActions />
        </View>
        
        {/* Recent Activity */}
        <RecentActivity />
      </ScrollView>
    </ScreenContainer>
  );
}
