import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Linking, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { usePortfolio, useTrading, useApp } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

import { PremiumCard } from '@/components/ui/premium-card';

// Balance Card with Premium styling
function BalanceCard({ account, isLoading }: { account: any, isLoading: boolean }) {
  const { isDemoMode } = useTrading();
  const { data: stripeConfig } = trpc.payments.getPublishableKey.useQuery();

  const balance = parseFloat(account?.cash ?? '0');
  const portfolioValue = parseFloat(account?.equity ?? '0');

  return (
    <PremiumCard
      hasGlow={true}
      glowColor="#00F0FF"
      className="mb-8"
    >
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Available Liquidity</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#00F0FF" className="self-start my-2" />
          ) : (
            <Text className="text-foreground text-4xl font-black" style={{ fontVariant: ['tabular-nums'] }}>
              {formatCurrency(balance)}
            </Text>
          )}
        </View>
        <View className="flex-row gap-2">
          {isDemoMode ? (
            <View className="bg-warning/20 px-3 py-1 rounded-lg border border-warning/30">
              <Text className="text-warning text-[10px] font-black">DEMO</Text>
            </View>
          ) : (
            stripeConfig?.isLiveMode && (
              <View className="bg-success/20 px-3 py-1 rounded-lg border border-success/30">
                <Text className="text-success text-[10px] font-black">LIVE</Text>
              </View>
            )
          )}
        </View>
      </View>

      <View className="flex-row items-center pt-6 border-t border-white/5">
        <View className="flex-row items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <View className="w-1.5 h-1.5 rounded-full bg-primary mr-2" style={{ shadowColor: '#00F0FF', shadowOpacity: 0.8, shadowRadius: 4 }} />
          <Text className="text-muted/80 text-[11px] font-bold">
            Total Net Worth: <Text className="text-foreground">{isLoading ? '...' : formatCurrency(portfolioValue)}</Text>
          </Text>
        </View>
      </View>
    </PremiumCard>
  );
}

// Deposit Modal with Stripe Integration
function DepositModal({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { isDemoMode } = useTrading();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickAmounts = [100, 500, 1000, 5000];
  const createCheckoutSession = trpc.payments.createCheckoutSession.useMutation();

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (isDemoMode) {
        // Just a mock for demo mode
        setTimeout(() => {
          Alert.alert("Success", `Demo deposit of ${formatCurrency(depositAmount)} added.`);
          setIsProcessing(false);
          setAmount('');
          onClose();
        }, 1500);
        return;
      }

      const amountInCents = Math.round(depositAmount * 100);
      const baseUrl = Platform.OS === 'web'
        ? window.location.origin
        : 'https://insydetradar.app'; // Scheme should match app.json

      const result = await createCheckoutSession.mutateAsync({
        amount: amountInCents,
        successUrl: `${baseUrl}/wallet?deposit=success&amount=${depositAmount}`,
        cancelUrl: `${baseUrl}/wallet?deposit=cancelled`,
      });

      if (Platform.OS === 'web') {
        window.location.href = result.url;
      } else {
        await WebBrowser.openBrowserAsync(result.url);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate deposit');
    } finally {
      if (!isDemoMode) setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row justify-between items-center p-5 border-b border-border">
          <TouchableOpacity onPress={onClose}><Text className="text-primary text-base">Cancel</Text></TouchableOpacity>
          <Text className="text-foreground text-lg font-semibold">Deposit Funds</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView className="flex-1 p-5">
          {error && <View className="bg-error/20 rounded-xl p-4 mb-6"><Text className="text-error text-center">{error}</Text></View>}
          <View className="mb-6">
            <Text className="text-muted text-sm mb-2">Amount (USD)</Text>
            <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
              <Text className="text-foreground text-2xl mr-2">$</Text>
              <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" className="flex-1 py-4 text-foreground text-2xl font-semibold" style={{ fontVariant: ['tabular-nums'] }} />
            </View>
          </View>
          <View className="mb-8">
            <Text className="text-muted text-sm mb-3">Quick Select</Text>
            <View className="flex-row flex-wrap gap-3">
              {quickAmounts.map((q) => (
                <TouchableOpacity key={q} onPress={() => setAmount(q.toString())} className={`px-6 py-3 rounded-xl border ${amount === q.toString() ? 'bg-primary/20 border-primary' : 'bg-surface border-border'}`}>
                  <Text className={`font-semibold ${amount === q.toString() ? 'text-primary' : 'text-foreground'}`}>${q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <View className="p-5 border-t border-border">
          <TouchableOpacity onPress={handleDeposit} disabled={!amount || isProcessing} className="bg-primary py-4 rounded-2xl items-center" style={{ opacity: (!amount || isProcessing) ? 0.5 : 1 }}>
            <Text className="text-background font-bold text-lg">{isProcessing ? 'Processing...' : `Deposit ${amount ? formatCurrency(parseFloat(amount)) : ''}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Withdrawal Modal
function WithdrawModal({
  visible,
  onClose,
  currentBalance
}: {
  visible: boolean;
  onClose: () => void;
  currentBalance: number;
}) {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) return;

    if (withdrawAmount > currentBalance) {
      setError('Insufficient liquidity in treasury');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Simulate withdrawal processing
    setTimeout(() => {
      Alert.alert(
        "WITHDRAWAL INITIATED",
        `The sum of ${formatCurrency(withdrawAmount)} has been submitted for extraction. Anticipate 1-3 operational days for clearance.`
      );
      setIsProcessing(false);
      setAmount('');
      onClose();
    }, 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row justify-between items-center p-6 border-b border-border">
          <TouchableOpacity onPress={onClose}><Text className="text-muted font-bold uppercase tracking-widest text-xs">Abort</Text></TouchableOpacity>
          <Text className="text-foreground text-lg font-black uppercase tracking-tight">Withdraw Capital</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView className="flex-1 p-6">
          <View className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-8">
            <Text className="text-muted/60 text-[9px] font-black uppercase tracking-widest mb-1">Available for Extraction</Text>
            <Text className="text-primary text-2xl font-black">{formatCurrency(currentBalance)}</Text>
          </View>

          {error && <View className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6"><Text className="text-error text-center font-bold text-xs">{error.toUpperCase()}</Text></View>}

          <View className="mb-10">
            <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Amount to Extract</Text>
            <View className="flex-row items-center bg-surface/50 border border-border rounded-2xl px-5">
              <Text className="text-foreground text-3xl font-black mr-3">$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#4B5563"
                keyboardType="decimal-pad"
                className="flex-1 py-5 text-foreground text-3xl font-black"
                style={{ fontVariant: ['tabular-nums'] }}
              />
            </View>
          </View>

          <View className="mb-10">
            <Text className="text-muted/40 text-[9px] font-bold uppercase leading-4 text-center">
              Extraction protocols require identity verification and multi-factor authentication for large sums. Funds will be returned to the primary source of funding.
            </Text>
          </View>
        </ScrollView>
        <View className="p-6 border-t border-border bg-background pb-10">
          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={!amount || isProcessing}
            className="bg-primary py-5 rounded-3xl items-center"
            style={[{ shadowColor: '#00F0FF', shadowOpacity: 0.4, shadowRadius: 20 }, { opacity: (!amount || isProcessing) ? 0.3 : 1 }]}
          >
            <Text className="text-background font-black text-lg uppercase tracking-tight">
              {isProcessing ? 'Processing...' : 'Engage Extraction'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Transaction Item with High-Contrast Status
function TransactionItem({ item }: { item: any }) {
  const isTrade = !!item.symbol;
  const config = isTrade
    ? { icon: 'arrow.triangle.2.circlepath', color: '#00F0FF', label: item.symbol }
    : { icon: 'arrow.down.circle.fill', color: '#39FF14', label: 'Deposit' };

  const amount = isTrade ? parseFloat(item.notional || (parseFloat(item.qty) * parseFloat(item.filled_avg_price || '0'))) : parseFloat(item.amount);
  const statusColors: Record<string, string> = {
    filled: '#39FF14',
    canceled: '#FF3366',
    pending: '#FFB800',
    success: '#39FF14'
  };

  const statusColor = statusColors[item.status] || '#6B7280';

  return (
    <View className="bg-surface/50 rounded-2xl p-4 border border-border flex-row items-center mb-3">
      <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${config.color}10`, borderWidth: 1, borderColor: `${config.color}20` }}>
        <IconSymbol name={config.icon as any} size={20} color={config.color} />
      </View>
      <View className="flex-1">
        <Text className="text-foreground font-black tracking-tight text-sm uppercase">{config.label}</Text>
        <Text className="text-muted/60 text-[9px] uppercase font-bold tracking-widest leading-3">{formatDate(item.created_at || item.createdAt)}</Text>
      </View>
      <View className="items-end">
        <Text className={`font-black text-sm ${isTrade ? 'text-foreground' : 'text-success'}`} style={{ fontVariant: ['tabular-nums'] }}>
          {isTrade ? '' : '+'}{formatCurrency(amount)}
        </Text>
        <View
          className="px-2 py-0.5 rounded-md border mt-1"
          style={{ backgroundColor: `${statusColor}10`, borderColor: `${statusColor}30` }}
        >
          <Text className="text-[8px] font-black uppercase tracking-tighter" style={{ color: statusColor }}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const { state } = useApp();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const accountQuery = trpc.trading.getAccount.useQuery(undefined, {
    enabled: state.isAuthenticated,
    refetchInterval: 10000,
  });

  const ordersQuery = trpc.trading.getOrders.useQuery({ status: 'all', limit: 10 }, {
    enabled: state.isAuthenticated,
  });

  // Handle Stripe Redirection
  useEffect(() => {
    if (params.deposit === 'success') {
      Alert.alert("DEPOSIT SUCCESSFUL", `Your treasury will be credited with ${formatCurrency(parseFloat(params.amount as string))} immediately.`);
      // Clear params
      router.setParams({ deposit: undefined, amount: undefined });
    } else if (params.deposit === 'cancelled') {
      Alert.alert("DEPOSIT ABORTED", "The payment process was terminated.");
      router.setParams({ deposit: undefined });
    }
  }, [params.deposit]);

  const onRefresh = useCallback(() => {
    accountQuery.refetch();
    ordersQuery.refetch();
  }, []);

  const balance = accountQuery.data?.cash ?? 0;

  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={accountQuery.isRefetching} onRefresh={onRefresh} tintColor="#00F0FF" />}
      >
        <View className="mb-8 pt-4">
          <Text className="text-muted/60 text-xs font-bold uppercase tracking-widest mb-1">Financial Hub</Text>
          <Text className="text-foreground text-3xl font-black">Wallet</Text>
        </View>
        <BalanceCard account={accountQuery.data} isLoading={accountQuery.isLoading} />

        <View className="flex-row gap-4 mb-12">
          <TouchableOpacity
            onPress={() => setShowDeposit(true)}
            className="flex-1 bg-primary h-14 rounded-2xl items-center flex-row justify-center"
            style={{ shadowColor: '#00F0FF', shadowOpacity: 0.3, shadowRadius: 15 }}
          >
            <IconSymbol name="plus.circle.fill" size={18} color="#0A0A0F" />
            <Text className="text-background font-black text-xs ml-2 uppercase tracking-tight">Deposit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowWithdraw(true)}
            className="flex-1 bg-surface/50 border border-border h-14 rounded-2xl items-center flex-row justify-center"
          >
            <IconSymbol name="arrow.up.right.circle.fill" size={18} color="#FFFFFF" />
            <Text className="text-foreground font-black text-xs ml-2 uppercase tracking-tight">Withdraw</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-muted/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-1">Transaction History</Text>
          {ordersQuery.data && ordersQuery.data.length > 0 ? (
            <View>{ordersQuery.data.map((order) => <TransactionItem key={order.id} item={order} />)}</View>
          ) : (
            <View className="bg-surface/30 rounded-3xl p-10 border border-border items-center">
              <IconSymbol name="clock.fill" size={32} color="#4B5563" />
              <Text className="text-muted text-sm font-bold mt-4 uppercase tracking-widest">No activity yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <DepositModal visible={showDeposit} onClose={() => setShowDeposit(false)} />
      <WithdrawModal
        visible={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        currentBalance={balance}
      />
    </ScreenContainer>
  );
}
