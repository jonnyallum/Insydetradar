import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useTrading, usePortfolio, useApp } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';
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
function AIToggle() {
  const { isAITrading, setAITrading, isDemoMode } = useTrading();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (isAITrading) {
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
  }, [isAITrading]);
  
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));
  
  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setAITrading(!isAITrading);
  };
  
  return (
    <View className="items-center mb-8">
      <Animated.View style={containerStyle}>
        <TouchableOpacity
          onPress={handleToggle}
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
                backgroundColor: '#39FF14',
                top: -10,
                left: -10,
              }
            ]}
          />
          
          {/* Main button */}
          <View 
            className={`w-36 h-36 rounded-full items-center justify-center border-4 ${
              isAITrading 
                ? 'bg-accent/20 border-accent' 
                : 'bg-surface border-border'
            }`}
          >
            <IconSymbol 
              name={isAITrading ? "stop.fill" : "play.fill"} 
              size={48} 
              color={isAITrading ? '#39FF14' : '#6B7280'} 
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      <Text className="text-foreground text-2xl font-bold mt-4">
        {isAITrading ? 'AI Trading Active' : 'AI Trading Paused'}
      </Text>
      <Text className="text-muted text-sm mt-1">
        {isAITrading ? 'Tap to stop' : 'Tap to start'}
      </Text>
      
      {isDemoMode && (
        <View className="mt-3 bg-warning/20 px-4 py-2 rounded-full">
          <Text className="text-warning text-sm font-semibold">Demo Mode - No Real Money</Text>
        </View>
      )}
    </View>
  );
}

// Risk Level Selector
function RiskLevelSelector() {
  const { riskLevel, setRiskLevel } = useTrading();
  
  const levels = [
    { 
      key: 'conservative' as const, 
      label: 'Conservative', 
      description: 'Lower risk, steady returns',
      color: '#00F0FF',
      maxDrawdown: '5%',
      targetReturn: '10-15%',
    },
    { 
      key: 'moderate' as const, 
      label: 'Moderate', 
      description: 'Balanced risk/reward',
      color: '#FFB800',
      maxDrawdown: '15%',
      targetReturn: '20-30%',
    },
    { 
      key: 'aggressive' as const, 
      label: 'Aggressive', 
      description: 'Higher risk, higher potential',
      color: '#FF3366',
      maxDrawdown: '30%',
      targetReturn: '40-60%',
    },
  ];
  
  return (
    <View className="mb-8">
      <Text className="text-foreground text-lg font-semibold mb-4">Risk Level</Text>
      <View className="gap-3">
        {levels.map((level) => (
          <TouchableOpacity
            key={level.key}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setRiskLevel(level.key);
            }}
            className={`bg-surface rounded-xl p-4 border-2 ${
              riskLevel === level.key ? 'border-primary' : 'border-border'
            }`}
            style={riskLevel === level.key ? {
              shadowColor: level.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            } : {}}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View 
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: level.color }}
                />
                <View className="flex-1">
                  <Text className="text-foreground font-semibold">{level.label}</Text>
                  <Text className="text-muted text-sm">{level.description}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-muted text-xs">Max DD: {level.maxDrawdown}</Text>
                <Text className="text-muted text-xs">Target: {level.targetReturn}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Active Positions
function ActivePositions() {
  const { positions } = usePortfolio();
  
  // Mock positions for demo
  const displayPositions = positions.length > 0 ? positions : [
    { id: '1', symbol: 'BTC/USD', type: 'crypto', side: 'long', quantity: 0.5, entryPrice: 42000, currentPrice: 43050, pnl: 525, pnlPercent: 2.5 },
    { id: '2', symbol: 'AAPL', type: 'stock', side: 'long', quantity: 10, entryPrice: 175, currentPrice: 178.50, pnl: 35, pnlPercent: 2.0 },
  ];
  
  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-foreground text-lg font-semibold">Active Positions</Text>
        <Text className="text-muted text-sm">{displayPositions.length} open</Text>
      </View>
      
      {displayPositions.length === 0 ? (
        <View className="bg-surface rounded-xl p-6 border border-border items-center">
          <IconSymbol name="chart.bar.fill" size={32} color="#6B7280" />
          <Text className="text-muted mt-2">No active positions</Text>
        </View>
      ) : (
        <View className="gap-3">
          {displayPositions.map((position: any) => (
            <View 
              key={position.id}
              className="bg-surface rounded-xl p-4 border border-border"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-foreground font-semibold text-lg">{position.symbol}</Text>
                  <Text className="text-muted text-sm capitalize">{position.side} • {position.type}</Text>
                </View>
                <View className="items-end">
                  <Text 
                    className={`font-bold text-lg ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                  </Text>
                  <Text 
                    className={`text-sm ${position.pnl >= 0 ? 'text-success' : 'text-error'}`}
                  >
                    {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
              
              <View className="flex-row justify-between mt-2 pt-2 border-t border-border">
                <View>
                  <Text className="text-muted text-xs">Entry</Text>
                  <Text className="text-foreground text-sm" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(position.entryPrice)}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs">Current</Text>
                  <Text className="text-foreground text-sm" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(position.currentPrice)}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs">Quantity</Text>
                  <Text className="text-foreground text-sm" style={{ fontVariant: ['tabular-nums'] }}>
                    {position.quantity}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Performance Metrics
function PerformanceMetrics() {
  const metrics = [
    { label: 'Sharpe Ratio', value: '1.85', good: true },
    { label: 'Max Drawdown', value: '-8.2%', good: true },
    { label: 'Win Rate', value: '68%', good: true },
    { label: 'Avg Trade', value: '+$127', good: true },
  ];
  
  return (
    <View>
      <Text className="text-foreground text-lg font-semibold mb-4">Performance Metrics</Text>
      <View className="flex-row flex-wrap gap-3">
        {metrics.map((metric, index) => (
          <View 
            key={index}
            className="bg-surface rounded-xl p-4 border border-border"
            style={{ width: '47%' }}
          >
            <Text className="text-muted text-sm mb-1">{metric.label}</Text>
            <Text 
              className={`text-xl font-bold ${metric.good ? 'text-success' : 'text-error'}`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function TradeScreen() {
  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-foreground text-2xl font-bold">AI Trading</Text>
          <Text className="text-muted">Control your autonomous trading</Text>
        </View>
        
        {/* AI Toggle */}
        <AIToggle />
        
        {/* Risk Level */}
        <RiskLevelSelector />
        
        {/* Active Positions */}
        <ActivePositions />
        
        {/* Performance */}
        <PerformanceMetrics />
      </ScrollView>
    </ScreenContainer>
  );
}
