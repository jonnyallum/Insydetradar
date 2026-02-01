import { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import { useApp } from '@/lib/store';
import { SlidingTabs } from '@/components/ui/sliding-tabs';
import { PremiumCard } from '@/components/ui/premium-card';

const TRENDING_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
  'SPY', 'QQQ', 'DIA', 'IWM',
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD'
];

interface Asset {
  symbol: string;
  price: number;
  change24h: number;
  type: 'crypto' | 'stock' | 'index';
}

function formatPrice(price: number, type: string): string {
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  if (price > 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MARKET_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Stocks', value: 'stocks' },
  { label: 'Crypto', value: 'crypto' },
  { label: 'Favorites', value: 'watchlist' },
] as const;

function AssetRow({
  asset,
  isFavorite,
  onToggleFavorite
}: {
  asset: Asset;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const isCrypto = asset.symbol.includes('/');
  const isIndex = ['SPY', 'QQQ', 'DIA', 'IWM'].includes(asset.symbol);

  const typeIcons: Record<string, string> = {
    crypto: '₿',
    stock: '📈',
    index: '📊',
  };

  const typeColors: Record<string, string> = {
    crypto: '#FFB800',
    stock: '#00F0FF',
    index: '#FF00E5',
  };

  const type = isCrypto ? 'crypto' : (isIndex ? 'index' : 'stock');
  const isPositive = asset.change24h >= 0;

  return (
    <View
      className="bg-surface/50 rounded-2xl p-4 border border-border flex-row items-center overflow-hidden"
    >
      {/* Glow backdrop for icon */}
      <View
        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: `${typeColors[type]}10`, borderWidth: 1, borderColor: `${typeColors[type]}30` }}
      >
        <Text className="text-xl" style={{ color: typeColors[type] }}>{typeIcons[type]}</Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-foreground font-black text-base tracking-tight">{asset.symbol}</Text>
          <TouchableOpacity onPress={onToggleFavorite} className="ml-2">
            <IconSymbol
              name={isFavorite ? "star.fill" : "star"}
              size={14}
              color={isFavorite ? "#FFB800" : "#4B5563"}
            />
          </TouchableOpacity>
        </View>
        <Text className="text-muted/60 text-[10px] font-bold uppercase tracking-widest">{type}</Text>
      </View>

      {/* Price & Change */}
      <View className="items-end">
        <Text className="text-foreground font-black text-base" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPrice(asset.price, type)}
        </Text>
        <View
          className={`flex-row items-center px-2 py-1 rounded-lg border ${isPositive ? 'bg-success/10 border-success/20' : 'bg-error/10 border-error/20'
            }`}
        >
          <IconSymbol
            name={isPositive ? "arrow.up.right" : "arrow.down.right"}
            size={10}
            color={isPositive ? '#39FF14' : '#FF3366'}
          />
          <Text
            className={`text-[10px] font-black ml-1 ${isPositive ? 'text-success' : 'text-error'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function MarketsScreen() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'stocks' | 'crypto' | 'watchlist'>('all');

  const utils = trpc.useUtils();
  const watchlistQuery = trpc.trading.getWatchlist.useQuery(undefined, {
    enabled: state.isAuthenticated
  });
  const toggleWatchlist = trpc.trading.toggleWatchlist.useMutation({
    onSuccess: () => {
      utils.trading.getWatchlist.invalidate();
    }
  });

  const snapshotsQuery = trpc.trading.getSnapshots.useQuery({
    symbols: TRENDING_SYMBOLS
  }, {
    enabled: state.isAuthenticated,
    refetchInterval: 10000,
  });

  const assets = useMemo((): Asset[] => {
    if (!snapshotsQuery.data) return [];

    return Object.entries(snapshotsQuery.data).map(([symbol, data]: [string, any]) => {
      const currentPrice = data.latestTrade?.p || data.minuteBar?.c || 0;
      const prevClose = data.prevDailyBar?.c || currentPrice;
      const change = currentPrice - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      return {
        symbol,
        price: currentPrice,
        change24h: changePercent,
        type: symbol.includes('/') ? 'crypto' : (['SPY', 'QQQ', 'DIA', 'IWM'].includes(symbol) ? 'index' : 'stock')
      };
    });
  }, [snapshotsQuery.data]);

  const filteredAssets = useMemo(() => {
    let result = assets;

    if (activeTab === 'stocks') {
      result = result.filter(a => a.type === 'stock' || a.type === 'index');
    } else if (activeTab === 'crypto') {
      result = result.filter(a => a.type === 'crypto');
    } else if (activeTab === 'watchlist') {
      const watchlistSymbols = watchlistQuery.data?.symbols || [];
      result = result.filter(a => watchlistSymbols.includes(a.symbol));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => a.symbol.toLowerCase().includes(query));
    }

    return result;
  }, [assets, activeTab, searchQuery, watchlistQuery.data]);

  const isFavorite = (symbol: string) => {
    return watchlistQuery.data?.symbols.includes(symbol) || false;
  };

  return (
    <ScreenContainer>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-8 pb-4">
          <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest mb-1">Global Assets</Text>
          <Text className="text-foreground text-3xl font-black">Markets</Text>
        </View>

        {/* Search */}
        <View className="px-5 mb-6">
          <View className="flex-row items-center bg-surface/50 border border-border rounded-2xl px-4 py-1">
            <IconSymbol name="magnifyingglass" size={18} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search assets..."
              placeholderTextColor="#6B7280"
              className="flex-1 py-3 px-3 text-foreground text-sm font-semibold"
            />
            {snapshotsQuery.isFetching && <ActivityIndicator size="small" color="#00F0FF" />}
          </View>
        </View>

        {/* Tabs */}
        <View className="px-5 mb-6">
          <SlidingTabs
            options={[...MARKET_TABS]}
            selected={activeTab}
            onSelect={(val) => setActiveTab(val as any)}
          />
        </View>

        {/* Asset List */}
        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => item.symbol}
          renderItem={({ item }) => (
            <AssetRow
              asset={item}
              isFavorite={isFavorite(item.symbol)}
              onToggleFavorite={() => toggleWatchlist.mutate({ symbol: item.symbol })}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={snapshotsQuery.isRefetching}
              onRefresh={() => snapshotsQuery.refetch()}
              tintColor="#00F0FF"
            />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              {snapshotsQuery.isLoading ? (
                <ActivityIndicator size="large" color="#00F0FF" />
              ) : (
                <>
                  <IconSymbol name="chart.bar.fill" size={48} color="#6B7280" />
                  <Text className="text-muted mt-4 font-bold uppercase tracking-widest text-xs">No assets found</Text>
                </>
              )}
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}
