import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useTrading, usePortfolio, useApp } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

// Master AI Toggle
function AIToggle({ isRunning, onToggle, isLoading }: { isRunning: boolean, onToggle: (val: boolean) => void, isLoading: boolean }) {
  const { isDemoMode } = useTrading();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      glowOpacity.value = withTiming(0);
    }
  }, [isRunning]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleToggle = () => {
    if (isLoading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onToggle(!isRunning);
  };

  return (
    <View className="items-center mb-8">
      <Animated.View style={containerStyle}>
        <TouchableOpacity
          onPress={handleToggle}
          disabled={isLoading}
          className="relative"
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              glowStyle,
              {
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: isRunning ? '#39FF14' : '#6B7280',
                top: -10,
                left: -10,
              }
            ]}
          />

          {/* Main button */}
          <View
            className={`w-36 h-36 rounded-full items-center justify-center border-4 ${isRunning
              ? 'bg-accent/20 border-accent'
              : 'bg-surface border-border'
              }`}
          >
            {isLoading ? (
              <ActivityIndicator color={isRunning ? '#39FF14' : '#6B7280'} />
            ) : (
              <IconSymbol
                name={isRunning ? "stop.fill" : "play.fill"}
                size={48}
                color={isRunning ? '#39FF14' : '#6B7280'}
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Text className="text-foreground text-2xl font-bold mt-4">
        {isRunning ? 'AI Trading Active' : 'AI Trading Paused'}
      </Text>
      <Text className="text-muted text-sm mt-1">
        {isRunning ? 'Tap to stop engine' : 'Tap to start engine'}
      </Text>

      {isDemoMode && (
        <View className="mt-3 bg-warning/20 px-4 py-2 rounded-full">
          <Text className="text-warning text-sm font-semibold">Demo Mode - Paper Trading</Text>
        </View>
      )}
    </View>
  );
}

// Kill Switch Button with Danger Glow
function KillSwitch({ onPress, isLoading, hasActivePositions }: { onPress: () => void, isLoading: boolean, hasActivePositions: boolean }) {
  const glowOpacity = useSharedValue(0.1);

  useEffect(() => {
    if (hasActivePositions) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000 }),
          withTiming(0.1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0.1);
    }
  }, [hasActivePositions]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const handlePress = () => {
    Alert.alert(
      "EMERGENCY OVERRIDE",
      "This will immediately LIQUIDATE all open positions and shutdown the AI engine. This action cannot be undone.",
      [
        { text: "ABORT", style: "cancel" },
        {
          text: "CONFIRM LIQUIDATION",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            onPress();
          }
        }
      ]
    );
  };

  return (
    <Animated.View
      style={[
        glowStyle,
        {
          shadowColor: '#FF3366',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 20,
        }
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoading}
        className={`bg-error/5 border-2 border-error/30 rounded-3xl p-6 mb-10 items-center flex-row justify-center ${isLoading ? 'opacity-50' : ''}`}
      >
        <IconSymbol name="exclamationmark.octagon.fill" size={24} color="#FF3366" />
        <Text className="text-error font-black text-xl ml-3 tracking-tighter uppercase">Kill Switch</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Risk Level Selector
function RiskLevelSelector({ selected, onSelect, isLoading }: { selected: string, onSelect: (level: any) => void, isLoading: boolean }) {
  const levels = [
    {
      key: 'conservative' as const,
      label: 'Conservative',
      description: 'Minimum volatility protocol',
      color: '#00F0FF',
      maxDrawdown: '5%',
      targetReturn: '12%',
    },
    {
      key: 'moderate' as const,
      label: 'Moderate',
      description: 'Balanced growth engine',
      color: '#FFB800',
      maxDrawdown: '12%',
      targetReturn: '28%',
    },
    {
      key: 'aggressive' as const,
      label: 'Aggressive',
      description: 'Maximum capture alpha',
      color: '#FF3366',
      maxDrawdown: '25%',
      targetReturn: '55%',
    },
  ];

  return (
    <View className="gap-3">
      {levels.map((level) => (
        <TouchableOpacity
          key={level.key}
          onPress={() => {
            if (isLoading) return;
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onSelect(level.key);
          }}
          disabled={isLoading}
          className={`bg-surface/50 rounded-2xl p-4 border-2 flex-row items-center ${selected === level.key ? '' : 'border-border'}`}
          style={selected === level.key ? {
            borderColor: level.color,
            shadowColor: level.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 15,
          } : {}}
        >
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-4"
            style={{ backgroundColor: `${level.color}10`, borderWidth: 1, borderColor: `${level.color}30` }}
          >
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: level.color }} />
          </View>

          <View className="flex-1">
            <Text className="text-foreground font-black tracking-tight text-base uppercase">{level.label}</Text>
            <Text className="text-muted/60 text-[10px] font-bold uppercase tracking-widest">{level.description}</Text>
          </View>

          <View className="items-end">
            <Text className="text-foreground font-black text-xs" style={{ fontVariant: ['tabular-nums'] }}>{level.targetReturn}</Text>
            <Text className="text-muted/40 text-[9px] font-black uppercase">TARGET</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Neural Stream Logs
function NeuralStream({ isRunning }: { isRunning: boolean }) {
  const logsQuery = trpc.trading.getNeuralLogs.useQuery({}, {
    enabled: isRunning,
    refetchInterval: 3000,
  });

  const logs = logsQuery.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#39FF14';
      case 'warning': return '#FFB800';
      case 'error': return '#FF3366';
      case 'active': return '#00F0FF';
      default: return '#8B92A0';
    }
  };

  return (
    <View className="mb-10">
      <View className="flex-row justify-between items-end mb-4 px-1">
        <View>
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Neural Processing Stream</Text>
          <Text className="text-foreground/40 text-[9px] font-bold uppercase">Real-time heuristics analysis</Text>
        </View>
        <View className={`px-2 py-0.5 rounded border ${isRunning ? 'bg-success/10 border-success/20' : 'bg-white/5 border-white/10'}`}>
          <Text className={`text-[8px] font-black uppercase ${isRunning ? 'text-success' : 'text-muted'}`}>
            {isRunning ? 'LIVE FEED' : 'STANDBY'}
          </Text>
        </View>
      </View>

      <View className="bg-surface/30 rounded-3xl p-5 border border-border h-48 overflow-hidden">
        {logs.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted/20 text-[10px] font-black uppercase tracking-widest">Feed empty</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {logs.map((log) => (
              <View key={log.id} className="flex-row items-start">
                <Text
                  className="font-black text-[9px] mr-2 mt-0.5"
                  style={{ color: getStatusColor(log.status) }}
                >
                  [{log.type.toUpperCase()}]
                </Text>
                <Text className="text-muted/80 text-[11px] font-medium flex-1 lowercase leading-4">
                  {log.message}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
        <View className="absolute inset-0 pointer-events-none bg-black/5 opacity-20" />
      </View>
    </View>
  );
}

// AI Insight Item
function InsightItem({ symbol }: { symbol: string }) {
  const signalQuery = trpc.trading.getSignal.useQuery({ symbol });
  if (!signalQuery.data) return null;

  const signal = signalQuery.data.signal;
  const isBuy = signal.signalType === 'buy' || signal.signalType === 'strong_buy';
  const isSell = signal.signalType === 'sell' || signal.signalType === 'strong_sell';
  const signalColor = isBuy ? '#39FF14' : (isSell ? '#FF3366' : '#FFB800');
  const signalLabel = signal.signalType.replace('_', ' ').toUpperCase();

  return (
    <View className="bg-surface/30 rounded-2xl p-4 border border-border mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: `${signalColor}10`, borderWidth: 1, borderColor: `${signalColor}30` }}>
            <IconSymbol name={isBuy ? "arrow.up.circle.fill" : (isSell ? "arrow.down.circle.fill" : "minus.circle.fill")} size={16} color={signalColor} />
          </View>
          <View>
            <Text className="text-foreground font-black tracking-tighter text-sm uppercase">{symbol}</Text>
            <Text className="text-muted/60 text-[9px] font-bold uppercase tracking-widest">Neural Analysis</Text>
          </View>
        </View>
        <View className="px-2 py-1 rounded-md border" style={{ backgroundColor: `${signalColor}10`, borderColor: `${signalColor}30` }}>
          <Text className="text-[9px] font-black" style={{ color: signalColor }}>{signalLabel}</Text>
        </View>
      </View>
      <View className="flex-row gap-4">
        {Object.entries(signalQuery.data.scores).slice(0, 3).map(([key, value]: [string, any]) => (
          <View key={key} className="flex-1">
            <Text className="text-muted/40 text-[8px] font-black uppercase mb-1">{key}</Text>
            <View className="h-1 bg-white/5 rounded-full overflow-hidden">
              <View className="h-full rounded-full" style={{ backgroundColor: value > 0.6 ? '#39FF14' : (value > 0.4 ? '#FFB800' : '#FF3366'), width: `${value * 100}%` }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// AI Insights Section
function AIInsights({ positions }: { positions: any[] }) {
  const symbolsToAnalyze = positions.slice(0, 3).map(p => p.symbol);
  return (
    <View className="mb-10">
      <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">AI Neural Insights</Text>
      {symbolsToAnalyze.length === 0 ? (
        <View className="bg-surface/50 rounded-3xl p-8 border border-border items-center">
          <IconSymbol name="brain.head.profile" size={32} color="#4B5563" />
          <Text className="text-muted/40 text-[10px] font-black uppercase mt-4 tracking-widest">Analyzing Market Trends...</Text>
        </View>
      ) : (
        symbolsToAnalyze.map(symbol => <InsightItem key={symbol} symbol={symbol} />)
      )}
    </View>
  );
}

// Active Positions
function ActivePositions({ positions }: { positions: any[] }) {
  return (
    <View className="mb-10">
      <View className="flex-row justify-between items-center mb-4 px-1">
        <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em]">Active Exposure</Text>
        <View className="bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
          <Text className="text-accent text-[8px] font-black uppercase">{positions?.length ?? 0} UNITS</Text>
        </View>
      </View>
      {!positions || positions.length === 0 ? (
        <View className="bg-surface/50 rounded-3xl p-8 border border-border items-center">
          <IconSymbol name="chart.bar.fill" size={32} color="#4B5563" />
          <Text className="text-muted/40 text-[10px] font-black uppercase mt-4 tracking-widest">No active deployments</Text>
        </View>
      ) : (
        <View className="gap-3">
          {positions.map((position: any) => (
            <View key={position.symbol} className="bg-surface/50 rounded-2xl p-4 border border-border">
              <View className="flex-row justify-between items-start mb-3">
                <View>
                  <Text className="text-foreground font-black text-base tracking-tight uppercase">{position.symbol}</Text>
                  <Text className="text-muted/60 text-[9px] font-bold uppercase tracking-widest leading-3">{position.side} • {position.assetClass}</Text>
                </View>
                <View className="items-end">
                  <Text className={`font-black text-base ${position.unrealizedPL >= 0 ? 'text-success' : 'text-error'}`} style={{ fontVariant: ['tabular-nums'] }}>
                    {position.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPL)}
                  </Text>
                  <View className={`mt-1 px-1.5 py-0.5 rounded border ${position.unrealizedPL >= 0 ? 'bg-success/10 border-success/20' : 'bg-error/10 border-error/20'}`}>
                    <Text className={`text-[9px] font-black ${position.unrealizedPL >= 0 ? 'text-success' : 'text-error'}`}>
                      {position.unrealizedPL >= 0 ? '+' : ''}{position.unrealizedPLPercent.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>
              <View className="flex-row justify-between mt-1 pt-3 border-t border-white/5">
                <View><Text className="text-muted/30 text-[8px] font-black uppercase mb-0.5">Entry Protocol</Text><Text className="text-foreground/80 font-bold text-[11px]" style={{ fontVariant: ['tabular-nums'] }}>{formatCurrency(position.avgEntryPrice)}</Text></View>
                <View><Text className="text-muted/30 text-[8px] font-black uppercase mb-0.5">Current Spot</Text><Text className="text-foreground/80 font-bold text-[11px]" style={{ fontVariant: ['tabular-nums'] }}>{formatCurrency(position.currentPrice)}</Text></View>
                <View className="items-end"><Text className="text-muted/30 text-[8px] font-black uppercase mb-0.5">Allocated</Text><Text className="text-foreground/80 font-bold text-[11px]" style={{ fontVariant: ['tabular-nums'] }}>{position.quantity}</Text></View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Performance Metrics
function PerformanceMetrics({ riskMetrics }: { riskMetrics: any }) {
  const metrics = useMemo(() => {
    if (!riskMetrics) return [];
    const m = riskMetrics.metrics;
    return [
      { label: 'Drawdown', value: `${m.drawdownPercent.toFixed(2)}%`, good: m.drawdownPercent < 5, accent: '#FF3366' },
      { label: 'Exposure', value: `${m.portfolioWeight.toFixed(2)}%`, good: m.portfolioWeight < 50, accent: '#00F0FF' },
      { label: 'Risk Level', value: riskMetrics.status.riskLevel, good: true, capitalize: true, accent: '#FFB800' },
      { label: 'Circuit', value: riskMetrics.status.circuitBreaker.tripped ? 'TRIPPED' : 'NOMINAL', good: !riskMetrics.status.circuitBreaker.tripped, accent: '#39FF14' },
    ];
  }, [riskMetrics]);

  return (
    <View className="mb-10">
      <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Risk Engine Telemetry</Text>
      <View className="flex-row flex-wrap gap-3">
        {metrics.map((metric, index) => (
          <View key={index} className="bg-surface/50 rounded-2xl p-4 border border-border" style={{ width: '46.5%' }}>
            <Text className="text-muted/40 text-[9px] font-black uppercase mb-1 tracking-widest">{metric.label}</Text>
            <Text className={`text-lg font-black ${metric.good ? 'text-foreground' : 'text-error'} ${metric.capitalize ? 'capitalize' : ''}`} style={[{ fontVariant: ['tabular-nums'] }, { color: metric.good ? '#FFFFFF' : '#FFB800' }]}>
              {(metric.value || '').toUpperCase()}
            </Text>
            <View className="h-[2px] w-8 mt-2" style={{ backgroundColor: metric.accent, opacity: 0.5 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TradeScreen() {
  const { state } = useApp();
  const engineStatusQuery = trpc.trading.engineStatus.useQuery(undefined, { enabled: state.isAuthenticated, refetchInterval: 5000 });
  const positionsQuery = trpc.trading.getPositions.useQuery(undefined, { enabled: state.isAuthenticated, refetchInterval: 5000 });
  const riskMetricsQuery = trpc.trading.getRiskMetrics.useQuery(undefined, { enabled: state.isAuthenticated, refetchInterval: 10000 });

  const startEngine = trpc.trading.startEngine.useMutation({ onSuccess: () => engineStatusQuery.refetch() });
  const stopEngine = trpc.trading.stopEngine.useMutation({ onSuccess: () => engineStatusQuery.refetch() });
  const setRiskLevel = trpc.trading.setRiskLevel.useMutation({ onSuccess: () => { engineStatusQuery.refetch(); riskMetricsQuery.refetch(); } });
  const emergencyStop = trpc.trading.emergencyStop.useMutation({
    onSuccess: () => {
      engineStatusQuery.refetch();
      positionsQuery.refetch();
      riskMetricsQuery.refetch();
      Alert.alert("OPERATIONAL SHUTDOWN", "Circuit breaker manually tripped. All positions liquidated.");
    },
  });

  const handleToggleEngine = (shouldStart: boolean) => {
    if (shouldStart) {
      startEngine.mutate({ riskLevel: engineStatusQuery.data?.risk.riskLevel || 'moderate' });
    } else {
      stopEngine.mutate();
    }
  };

  const isAITrading = engineStatusQuery.data?.engine.isRunning ?? false;
  const currentRiskLevel = engineStatusQuery.data?.risk.riskLevel ?? 'moderate';
  const isPending = startEngine.isPending || stopEngine.isPending || emergencyStop.isPending;

  return (
    <ScreenContainer>
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View className="mb-8 pt-4">
          <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest mb-1">Operational Override</Text>
          <Text className="text-foreground text-3xl font-black">Trade Control</Text>
        </View>

        <AIToggle isRunning={isAITrading} onToggle={handleToggleEngine} isLoading={isPending} />

        <KillSwitch onPress={() => emergencyStop.mutate()} isLoading={emergencyStop.isPending} hasActivePositions={(positionsQuery.data?.length ?? 0) > 0} />

        <View className="mb-10">
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Strategy Parameters</Text>
          <RiskLevelSelector selected={currentRiskLevel} onSelect={(level) => setRiskLevel.mutate({ level })} isLoading={setRiskLevel.isPending} />
        </View>

        <NeuralStream isRunning={isAITrading} />

        <AIInsights positions={positionsQuery.data || []} />

        <ActivePositions positions={positionsQuery.data || []} />

        <PerformanceMetrics riskMetrics={riskMetricsQuery.data} />
      </ScrollView>
    </ScreenContainer>
  );
}
