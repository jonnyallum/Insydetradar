import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: string;
  type: 'crypto' | 'stock' | 'forex';
}

// Mock market data
const MARKET_DATA: Asset[] = [
  // Crypto
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change24h: 2.45, volume: '28.5B', type: 'crypto' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 2285.50, change24h: 3.12, volume: '15.2B', type: 'crypto' },
  { id: 'sol', symbol: 'SOL', name: 'Solana', price: 98.75, change24h: -1.23, volume: '2.8B', type: 'crypto' },
  { id: 'bnb', symbol: 'BNB', name: 'BNB', price: 312.40, change24h: 0.85, volume: '1.2B', type: 'crypto' },
  { id: 'xrp', symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: -0.45, volume: '1.5B', type: 'crypto' },
  { id: 'ada', symbol: 'ADA', name: 'Cardano', price: 0.58, change24h: 1.78, volume: '890M', type: 'crypto' },
  // Stocks
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change24h: 1.25, volume: '52M', type: 'stock' },
  { id: 'msft', symbol: 'MSFT', name: 'Microsoft', price: 378.90, change24h: 0.95, volume: '28M', type: 'stock' },
  { id: 'googl', symbol: 'GOOGL', name: 'Alphabet', price: 141.25, change24h: -0.35, volume: '22M', type: 'stock' },
  { id: 'amzn', symbol: 'AMZN', name: 'Amazon', price: 155.80, change24h: 2.10, volume: '45M', type: 'stock' },
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', price: 495.20, change24h: 3.85, volume: '38M', type: 'stock' },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla', price: 248.30, change24h: -1.50, volume: '95M', type: 'stock' },
  // Forex
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro/Dollar', price: 1.0875, change24h: 0.15, volume: '1.2T', type: 'forex' },
  { id: 'gbpusd', symbol: 'GBP/USD', name: 'Pound/Dollar', price: 1.2695, change24h: -0.22, volume: '850B', type: 'forex' },
  { id: 'usdjpy', symbol: 'USD/JPY', name: 'Dollar/Yen', price: 148.25, change24h: 0.35, volume: '920B', type: 'forex' },
  { id: 'audusd', symbol: 'AUD/USD', name: 'Aussie/Dollar', price: 0.6585, change24h: -0.18, volume: '380B', type: 'forex' },
];

type MarketTab = 'all' | 'crypto' | 'stock' | 'forex';

function formatPrice(price: number, type: string): string {
  if (type === 'forex') {
    return price.toFixed(4);
  }
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AssetRow({ asset }: { asset: Asset }) {
  const typeIcons: Record<string, string> = {
    crypto: '₿',
    stock: '📈',
    forex: '💱',
  };
  
  const typeColors: Record<string, string> = {
    crypto: '#FFB800',
    stock: '#00F0FF',
    forex: '#FF00E5',
  };
  
  return (
    <TouchableOpacity 
      className="bg-surface rounded-xl p-4 border border-border flex-row items-center"
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View 
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: `${typeColors[asset.type]}20` }}
      >
        <Text className="text-xl">{typeIcons[asset.type]}</Text>
      </View>
      
      {/* Info */}
      <View className="flex-1">
        <Text className="text-foreground font-semibold text-base">{asset.symbol}</Text>
        <Text className="text-muted text-sm">{asset.name}</Text>
      </View>
      
      {/* Price & Change */}
      <View className="items-end">
        <Text className="text-foreground font-semibold text-base" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPrice(asset.price, asset.type)}
        </Text>
        <View 
          className={`flex-row items-center px-2 py-0.5 rounded-full ${
            asset.change24h >= 0 ? 'bg-success/20' : 'bg-error/20'
          }`}
        >
          <IconSymbol 
            name={asset.change24h >= 0 ? "arrow.up.right" : "arrow.down.right"} 
            size={12} 
            color={asset.change24h >= 0 ? '#39FF14' : '#FF3366'} 
          />
          <Text 
            className={`text-sm ml-1 ${asset.change24h >= 0 ? 'text-success' : 'text-error'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TabButton({ 
  label, 
  isActive, 
  onPress, 
  color 
}: { 
  label: string; 
  isActive: boolean; 
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 ${
        isActive ? 'border-2' : 'bg-surface'
      }`}
      style={isActive ? { 
        borderColor: color,
        backgroundColor: `${color}20`,
      } : {}}
    >
      <Text 
        className={`font-semibold ${isActive ? '' : 'text-muted'}`}
        style={isActive ? { color } : {}}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function MarketsScreen() {
  const [activeTab, setActiveTab] = useState<MarketTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const tabs: { key: MarketTab; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: '#00F0FF' },
    { key: 'crypto', label: 'Crypto', color: '#FFB800' },
    { key: 'stock', label: 'Stocks', color: '#00F0FF' },
    { key: 'forex', label: 'Forex', color: '#FF00E5' },
  ];
  
  const filteredAssets = useMemo(() => {
    let assets = MARKET_DATA;
    
    // Filter by tab
    if (activeTab !== 'all') {
      assets = assets.filter(a => a.type === activeTab);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(a => 
        a.symbol.toLowerCase().includes(query) || 
        a.name.toLowerCase().includes(query)
      );
    }
    
    return assets;
  }, [activeTab, searchQuery]);
  
  return (
    <ScreenContainer>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-5 pb-4">
          <Text className="text-foreground text-2xl font-bold mb-1">Markets</Text>
          <Text className="text-muted">Real-time prices across all markets</Text>
        </View>
        
        {/* Search */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
            <IconSymbol name="globe" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search assets..."
              placeholderTextColor="#6B7280"
              className="flex-1 py-3 px-3 text-foreground text-base"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
        {/* Tabs */}
        <View className="px-5 mb-4">
          <View className="flex-row">
            {tabs.map(tab => (
              <TabButton
                key={tab.key}
                label={tab.label}
                isActive={activeTab === tab.key}
                onPress={() => setActiveTab(tab.key)}
                color={tab.color}
              />
            ))}
          </View>
        </View>
        
        {/* Asset List */}
        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssetRow asset={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-12">
              <IconSymbol name="chart.bar.fill" size={48} color="#6B7280" />
              <Text className="text-muted mt-4">No assets found</Text>
            </View>
          }
        />
      </View>
    </ScreenContainer>
  );
}
