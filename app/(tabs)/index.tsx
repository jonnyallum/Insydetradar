import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp, useTrading } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import { PortfolioChart } from '@/components/ui/chart';
import { PremiumCard } from '@/components/ui/premium-card';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { SlidingTabs } from '@/components/ui/sliding-tabs';

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

const TIME_RANGES = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'all' },
] as const;

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
        className={`w-12 h-12 rounded-full items-center justify-center ${isActive ? 'bg-accent' : 'bg-muted'
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

// Portfolio Card with Premium treatment
function PortfolioCard({ account }: { account: any }) {
  const { isDemoMode } = useTrading();

  const portfolioValue = parseFloat(account?.portfolioValue ?? '0');
  const equity = parseFloat(account?.equity ?? '0');
  const lastEquity = parseFloat(account?.lastEquity ?? '0');

  const todayPnL = equity - lastEquity;
  const todayPnLPercent = lastEquity > 0 ? (todayPnL / lastEquity) * 100 : 0;
  const isPositive = todayPnL >= 0;

  return (
    <PremiumCard
      hasGlow={true}
      glowColor={isPositive ? '#39FF14' : '#FF3366'}
      className="mb-2"
    >
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest mb-1">Live Balance</Text>
          <Text className="text-foreground text-4xl font-black mb-2" style={{ fontVariant: ['tabular-nums'] }}>
            {formatCurrency(portfolioValue)}
          </Text>
        </View>
        <View className="items-end">
          {isDemoMode && (
            <View className="bg-warning/20 px-3 py-1 rounded-lg border border-warning/30 mb-2">
              <Text className="text-warning text-[10px] font-black tracking-tighter">DEMO MODE</Text>
            </View>
          )}
        </View>
      </View>

      <View className="flex-row items-center mt-2">
        <View
          className={`flex-row items-center px-4 py-2 rounded-xl border ${isPositive ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'
            }`}
        >
          <View
            className={`w-2 h-2 rounded-full mr-2 ${isPositive ? 'bg-success' : 'bg-error'}`}
            style={{ shadowColor: isPositive ? '#39FF14' : '#FF3366', shadowOpacity: 0.5, shadowRadius: 5 }}
          />
          <Text
            className={`font-black ${isPositive ? 'text-success' : 'text-error'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {isPositive ? '+' : ''}{formatCurrency(todayPnL)} ({formatPercent(todayPnLPercent)})
          </Text>
        </View>
        <Text className="text-muted/60 text-xs font-bold ml-3 uppercase tracking-tighter">Today's P&L</Text>
      </View>
    </PremiumCard>
  );
}

// AI Status Card
function AIStatusCard() {
  const router = useRouter();
  const { data: status } = trpc.trading.engineStatus.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const isAITrading = status?.engine.isRunning ?? false;
  const riskLevel = status?.risk.riskLevel ?? 'moderate';

  const riskColors: Record<string, string> = {
    conservative: '#00F0FF',
    moderate: '#FFB800',
    aggressive: '#FF3366',
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push('/(tabs)/trade')}
      className="bg-surface/50 rounded-2xl p-5 border border-border flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1">
        <AIStatusIndicator isActive={isAITrading} />
        <View className="ml-5 flex-1">
          <Text className="text-foreground font-black text-base uppercase tracking-tight">
            AI Engine {isAITrading ? 'Active' : 'Standby'}
          </Text>
          <View className="flex-row items-center mt-1">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: riskColors[riskLevel] ?? '#FFB800' }}
            />
            <Text className="text-muted/60 text-[10px] font-bold uppercase tracking-widest">{riskLevel} Risk Protocol</Text>
          </View>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={16} color="#4B5563" />
    </TouchableOpacity>
  );
}

// Quick Stats
function QuickStats({ positions, engineStatus }: { positions: any[], engineStatus: any }) {
  const activePositions = positions?.length ?? 0;
  const winningPositions = positions?.filter(p => p.unrealizedPL > 0).length ?? 0;
  const winRate = activePositions > 0 ? (winningPositions / activePositions) * 100 : 0;
  const isAITrading = engineStatus?.engine.isRunning ?? false;

  const stats = [
    { label: 'Active', value: activePositions.toString(), color: '#00F0FF' },
    { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: '#39FF14' },
    { label: 'Neural', value: isAITrading ? 'ON' : 'OFF', color: isAITrading ? '#39FF14' : '#4B5563' },
  ];

  return (
    <View className="flex-row gap-3">
      {stats.map((stat, index) => (
        <View
          key={index}
          className="flex-1 bg-surface/50 rounded-2xl p-4 border border-border items-center"
        >
          <Text
            className="text-xl font-black mb-1"
            style={{ color: stat.color, fontVariant: ['tabular-nums'] }}
          >
            {stat.value}
          </Text>
          <Text className="text-muted/40 text-[9px] font-black uppercase tracking-widest">{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

// Watchlist Preview
function WatchlistPreview() {
  const router = useRouter();
  const watchlistQuery = trpc.trading.getWatchlist.useQuery();
  const symbols = watchlistQuery.data?.symbols.slice(0, 3) || [];

  const snapshotsQuery = trpc.trading.getSnapshots.useQuery({ symbols }, {
    enabled: symbols.length > 0
  });

  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-center mb-4 px-1">
        <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em]">Priority Watchlist</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/markets')}>
          <Text className="text-accent text-[9px] font-black uppercase">View All</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-2">
        {symbols.length === 0 ? (
          <View className="bg-surface/30 rounded-2xl p-6 border border-border items-center">
            <Text className="text-muted/40 text-[9px] font-black uppercase tracking-widest">No assets tracked</Text>
          </View>
        ) : (
          symbols.map(symbol => {
            const data = snapshotsQuery.data?.[symbol];
            if (!data) return null;
            const price = data.latestTrade?.p || data.minuteBar?.c || 0;
            const prevClose = data.prevDailyBar?.c || price;
            const change = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
            const isPositive = change >= 0;

            return (
              <TouchableOpacity
                key={symbol}
                onPress={() => router.push('/(tabs)/markets')}
                className="bg-surface/30 rounded-2xl p-4 border border-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="bg-white/5 w-8 h-8 rounded-lg items-center justify-center mr-3 border border-white/5">
                    <Text className="text-foreground font-black text-[10px]">{symbol.substring(0, 2)}</Text>
                  </View>
                  <Text className="text-foreground font-black text-sm uppercase tracking-tight">{symbol}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-foreground font-black text-sm" style={{ fontVariant: ['tabular-nums'] }}>${price.toLocaleString()}</Text>
                  <Text className={`text-[9px] font-black ${isPositive ? 'text-success' : 'text-error'}`} style={{ fontVariant: ['tabular-nums'] }}>
                    {isPositive ? '+' : ''}{change.toFixed(2)}%
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>
    </View>
  );
}

// Recent Activity
function RecentActivity({ positions, orders }: { positions: any[], orders: any[] }) {
  const activity = useMemo(() => {
    if (orders && orders.length > 0) {
      return orders.slice(0, 5).map(order => ({
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        pnl: 0,
        pnlPercent: 0,
        type: order.assetClass === 'crypto' ? 'crypto' : 'stock',
        status: order.status,
      }));
    }

    return positions?.slice(0, 5).map(pos => ({
      id: pos.symbol,
      symbol: pos.symbol,
      side: pos.side,
      pnl: pos.unrealizedPL,
      pnlPercent: pos.unrealizedPLPercent,
      type: pos.assetClass === 'crypto' ? 'crypto' : 'stock',
      status: 'active',
    })) ?? [];
  }, [positions, orders]);

  return (
    <View>
      <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Neural activity stream</Text>

      {activity.length === 0 ? (
        <View className="bg-surface/30 rounded-3xl p-10 border border-border items-center">
          <IconSymbol name="waveform.path.ecg" size={32} color="#4B5563" />
          <Text className="text-muted/40 text-[10px] font-black uppercase mt-4 tracking-widest">Awaiting market events...</Text>
        </View>
      ) : (
        <View className="gap-2">
          {activity.map((item: any) => (
            <View
              key={item.id}
              className="bg-surface/40 rounded-2xl p-4 border border-border flex-row items-center"
            >
              <View className="w-10 h-10 rounded-xl bg-white/5 items-center justify-center mr-3 border border-white/10">
                <Text className="text-xs font-black text-muted">{item.symbol.substring(0, 1)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-black text-sm uppercase tracking-tight">{item.symbol}</Text>
                <Text className="text-muted/60 text-[9px] font-bold uppercase tracking-widest">{item.side} • {item.status}</Text>
              </View>
              <View className="items-end">
                {item.status === 'active' || item.status === 'filled' ? (
                  <>
                    <Text
                      className={`font-black text-sm ${item.pnl >= 0 ? 'text-success' : 'text-error'}`}
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl)}
                    </Text>
                    <Text
                      className={`text-[9px] font-black ${item.pnl >= 0 ? 'text-success' : 'text-error'}`}
                    >
                      {formatPercent(item.pnlPercent)}
                    </Text>
                  </>
                ) : (
                  <View className="bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    <Text className="text-muted/60 text-[9px] font-black uppercase">Pending</Text>
                  </View>
                )}
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
    { label: 'Treasury', icon: 'creditcard.fill' as const, color: '#39FF14', route: '/(tabs)/wallet' },
    { label: 'Intelligence', icon: 'brain.head.profile' as const, color: '#00F0FF', route: '/(tabs)/trade' },
    { label: 'Protocols', icon: 'shield.fill' as const, color: '#FFB800', route: '/(tabs)/profile' },
  ];

  return (
    <View className="flex-row gap-3">
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => router.push(action.route as any)}
          className="flex-1 bg-surface/40 rounded-2xl p-4 border border-border items-center"
        >
          <IconSymbol name={action.icon} size={24} color={action.color} />
          <Text className="text-muted/80 text-[10px] font-black mt-3 uppercase tracking-tight">{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'all'>('1D');

  // Real data hooks
  const accountQuery = trpc.trading.getAccount.useQuery(undefined, {
    enabled: state.isAuthenticated,
    refetchInterval: 5000,
  });

  const historyQuery = trpc.trading.getPortfolioHistory.useQuery({
    period: range
  }, {
    enabled: state.isAuthenticated,
    refetchInterval: 60000,
  });

  const positionsQuery = trpc.trading.getPositions.useQuery(undefined, {
    enabled: state.isAuthenticated,
    refetchInterval: 5000,
  });

  const ordersQuery = trpc.trading.getOrders.useQuery({ status: 'all', limit: 5 }, {
    enabled: state.isAuthenticated,
    refetchInterval: 10000,
  });

  const engineStatusQuery = trpc.trading.engineStatus.useQuery(undefined, {
    enabled: state.isAuthenticated,
    refetchInterval: 10000,
  });

  // Redirect to onboarding/login if needed
  useEffect(() => {
    if (!state.isLoading) {
      if (!state.hasCompletedOnboarding) {
        router.replace('/onboarding' as any);
      } else if (!state.isAuthenticated) {
        router.replace('/(auth)/login' as any);
      } else if (state.user && !state.user.isEmailVerified) {
        router.replace('/(auth)/verify' as any);
      }
    }
  }, [state.isLoading, state.hasCompletedOnboarding, state.isAuthenticated, state.user?.isEmailVerified]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      accountQuery.refetch(),
      positionsQuery.refetch(),
      ordersQuery.refetch(),
      engineStatusQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [accountQuery, positionsQuery, ordersQuery, engineStatusQuery]);

  if (state.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color="#00F0FF" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
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
        <View className="flex-row justify-between items-center mb-8 pt-4">
          <View>
            <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest mb-1">Commander Terminal</Text>
            <Text className="text-foreground text-3xl font-black">
              {state.user?.name || 'Trader'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/profile')}
            className="w-12 h-12 rounded-2xl bg-surface/50 border border-border items-center justify-center"
          >
            <IconSymbol name="bell.fill" size={20} color="#00F0FF" />
          </TouchableOpacity>
        </View>

        {/* Portfolio Card */}
        <View className="mb-8">
          <PortfolioCard account={accountQuery.data} />
          <SlidingTabs
            options={[...TIME_RANGES]}
            selected={range}
            onSelect={(val) => setRange(val as any)}
            className="mt-6"
          />
        </View>

        {/* Portfolio Chart */}
        <View className="mb-8">
          <PortfolioChart
            data={historyQuery.data ?? []}
            isLoading={historyQuery.isLoading}
            color={(accountQuery.data?.equity ?? 0) >= (accountQuery.data?.lastEquity ?? 0) ? '#39FF14' : '#FF3366'}
          />
        </View>

        {/* AI Status */}
        <View className="mb-8">
          <AIStatusCard />
        </View>

        {/* Quick Stats */}
        <View className="mb-8">
          <QuickStats
            positions={positionsQuery.data ?? []}
            engineStatus={engineStatusQuery.data}
          />
        </View>

        {/* Watchlist Preview */}
        <WatchlistPreview />

        {/* Quick Actions */}
        <View className="mb-10">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Navigation Protocols</Text>
          <QuickActions />
        </View>

        {/* Recent Activity */}
        <RecentActivity
          positions={positionsQuery.data ?? []}
          orders={ordersQuery.data ?? []}
        />
      </ScrollView>
    </ScreenContainer>
  );
}
