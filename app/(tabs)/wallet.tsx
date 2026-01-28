import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { usePortfolio, useTrading, useApp } from '@/lib/store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

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

// Balance Card
function BalanceCard() {
  const { balance, portfolioValue } = usePortfolio();
  const { isDemoMode } = useTrading();
  
  // Get Stripe status
  const { data: stripeConfig } = trpc.payments.getPublishableKey.useQuery();
  
  return (
    <View 
      className="bg-surface rounded-3xl p-6 border border-border mb-6"
      style={{
        shadowColor: '#00F0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      }}
    >
      <View className="absolute top-4 right-4 flex-row gap-2">
        {isDemoMode && (
          <View className="bg-warning/20 px-3 py-1 rounded-full">
            <Text className="text-warning text-xs font-semibold">DEMO</Text>
          </View>
        )}
        {stripeConfig?.isLiveMode && !isDemoMode && (
          <View className="bg-success/20 px-3 py-1 rounded-full">
            <Text className="text-success text-xs font-semibold">LIVE</Text>
          </View>
        )}
      </View>
      
      <Text className="text-muted text-sm mb-1">Available Balance</Text>
      <Text className="text-foreground text-4xl font-bold mb-4" style={{ fontVariant: ['tabular-nums'] }}>
        {formatCurrency(balance)}
      </Text>
      
      <View className="flex-row items-center">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-primary mr-2" />
          <Text className="text-muted text-sm">Portfolio: {formatCurrency(portfolioValue)}</Text>
        </View>
      </View>
    </View>
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
  const { dispatch } = useApp();
  const { isDemoMode } = useTrading();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const quickAmounts = [100, 500, 1000, 5000];
  
  // Stripe mutations
  const createCheckoutSession = trpc.payments.createCheckoutSession.useMutation();
  
  const handleDemoDeposit = () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) return;
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    dispatch({ 
      type: 'UPDATE_BALANCE', 
      payload: depositAmount 
    });
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: Date.now().toString(),
        type: 'deposit',
        amount: depositAmount,
        status: 'completed',
        description: 'Demo deposit',
        createdAt: new Date().toISOString(),
      }
    });
    setAmount('');
    onClose();
  };
  
  const handleStripeDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Convert to cents for Stripe
      const amountInCents = Math.round(depositAmount * 100);
      
      // Get the base URL for redirects
      const baseUrl = Platform.OS === 'web' 
        ? window.location.origin 
        : 'https://insydetradar.app'; // Deep link scheme
      
      const result = await createCheckoutSession.mutateAsync({
        amount: amountInCents,
        successUrl: `${baseUrl}/wallet?deposit=success&amount=${depositAmount}`,
        cancelUrl: `${baseUrl}/wallet?deposit=cancelled`,
      });
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Open Stripe Checkout
      if (Platform.OS === 'web') {
        window.location.href = result.url;
      } else {
        await WebBrowser.openBrowserAsync(result.url);
      }
      
      onClose();
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      setError(err.message || 'Failed to create checkout session');
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDeposit = () => {
    if (isDemoMode) {
      handleDemoDeposit();
    } else {
      handleStripeDeposit();
    }
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
        <View className="flex-row justify-between items-center p-5 border-b border-border">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-primary text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-foreground text-lg font-semibold">Deposit Funds</Text>
          <View style={{ width: 50 }} />
        </View>
        
        <ScrollView className="flex-1 p-5">
          {/* Error Message */}
          {error && (
            <View className="bg-error/20 rounded-xl p-4 mb-6">
              <Text className="text-error text-center">{error}</Text>
            </View>
          )}
          
          {/* Amount Input */}
          <View className="mb-6">
            <Text className="text-muted text-sm mb-2">Amount (USD)</Text>
            <View className="flex-row items-center bg-surface border border-border rounded-xl px-4">
              <Text className="text-foreground text-2xl mr-2">$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#6B7280"
                keyboardType="decimal-pad"
                className="flex-1 py-4 text-foreground text-2xl font-semibold"
                style={{ fontVariant: ['tabular-nums'] }}
              />
            </View>
          </View>
          
          {/* Quick Amounts */}
          <View className="mb-8">
            <Text className="text-muted text-sm mb-3">Quick Select</Text>
            <View className="flex-row flex-wrap gap-3">
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  onPress={() => setAmount(quickAmount.toString())}
                  className={`px-6 py-3 rounded-xl border ${
                    amount === quickAmount.toString() 
                      ? 'bg-primary/20 border-primary' 
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text 
                    className={`font-semibold ${
                      amount === quickAmount.toString() ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    ${quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Payment Method */}
          <View className="mb-8">
            <Text className="text-muted text-sm mb-3">Payment Method</Text>
            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center">
              <IconSymbol name="creditcard.fill" size={24} color="#00F0FF" />
              <View className="ml-4 flex-1">
                <Text className="text-foreground font-semibold">Credit/Debit Card</Text>
                <Text className="text-muted text-sm">
                  {isDemoMode ? 'Demo Mode - No charge' : 'Powered by Stripe (Live)'}
                </Text>
              </View>
              <IconSymbol name="checkmark.circle.fill" size={24} color="#39FF14" />
            </View>
          </View>
          
          {/* Mode Indicator */}
          {isDemoMode ? (
            <View className="bg-warning/20 rounded-xl p-4 mb-6">
              <Text className="text-warning text-center font-semibold mb-1">Demo Mode</Text>
              <Text className="text-warning/80 text-center text-sm">
                No real payment will be processed. Funds are virtual.
              </Text>
            </View>
          ) : (
            <View className="bg-success/20 rounded-xl p-4 mb-6">
              <Text className="text-success text-center font-semibold mb-1">Live Mode</Text>
              <Text className="text-success/80 text-center text-sm">
                Real payment via Stripe. Your card will be charged.
              </Text>
            </View>
          )}
        </ScrollView>
        
        {/* Deposit Button */}
        <View className="p-5 border-t border-border">
          <TouchableOpacity
            onPress={handleDeposit}
            disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            className="bg-primary py-4 rounded-2xl items-center"
            style={{
              shadowColor: '#00F0FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              opacity: (!amount || parseFloat(amount) <= 0 || isProcessing) ? 0.5 : 1,
            }}
          >
            <Text className="text-background font-bold text-lg">
              {isProcessing 
                ? 'Opening Stripe...' 
                : isDemoMode 
                  ? `Add ${amount ? formatCurrency(parseFloat(amount)) : '$0.00'} (Demo)`
                  : `Pay ${amount ? formatCurrency(parseFloat(amount)) : '$0.00'}`
              }
            </Text>
          </TouchableOpacity>
          
          {!isDemoMode && (
            <Text className="text-muted text-xs text-center mt-3">
              Secure payment processed by Stripe. We never store your card details.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Transaction Item
function TransactionItem({ transaction }: { transaction: any }) {
  const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
    deposit: { icon: 'arrow.down.circle.fill', color: '#39FF14', label: 'Deposit' },
    withdraw: { icon: 'arrow.up.circle.fill', color: '#FF3366', label: 'Withdrawal' },
    trade: { icon: 'arrow.triangle.2.circlepath', color: '#00F0FF', label: 'Trade' },
  };
  
  const config = typeConfig[transaction.type] || typeConfig.trade;
  
  return (
    <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center">
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <IconSymbol name={config.icon} size={20} color={config.color} />
      </View>
      
      <View className="flex-1">
        <Text className="text-foreground font-semibold">{config.label}</Text>
        <Text className="text-muted text-sm">{formatDate(transaction.createdAt)}</Text>
      </View>
      
      <View className="items-end">
        <Text 
          className={`font-semibold ${
            transaction.type === 'deposit' ? 'text-success' : 
            transaction.type === 'withdraw' ? 'text-error' : 'text-foreground'
          }`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {transaction.type === 'deposit' ? '+' : transaction.type === 'withdraw' ? '-' : ''}
          {formatCurrency(transaction.amount)}
        </Text>
        <View 
          className={`px-2 py-0.5 rounded-full ${
            transaction.status === 'completed' ? 'bg-success/20' : 
            transaction.status === 'pending' ? 'bg-warning/20' : 'bg-error/20'
          }`}
        >
          <Text 
            className={`text-xs capitalize ${
              transaction.status === 'completed' ? 'text-success' : 
              transaction.status === 'pending' ? 'text-warning' : 'text-error'
            }`}
          >
            {transaction.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function WalletScreen() {
  const { transactions } = usePortfolio();
  const { isDemoMode } = useTrading();
  const [showDeposit, setShowDeposit] = useState(false);
  
  // Mock transactions for demo
  const displayTransactions = transactions.length > 0 ? transactions : [
    { id: '1', type: 'deposit', amount: 10000, status: 'completed', description: 'Initial deposit', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '2', type: 'trade', amount: 525.50, status: 'completed', description: 'BTC/USD profit', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', type: 'trade', amount: 89.20, status: 'completed', description: 'EUR/USD profit', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  ];
  
  return (
    <ScreenContainer>
      <ScrollView 
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-foreground text-2xl font-bold">Wallet</Text>
          <Text className="text-muted">Manage your funds</Text>
        </View>
        
        {/* Balance Card */}
        <BalanceCard />
        
        {/* Action Buttons */}
        <View className="flex-row gap-4 mb-8">
          <TouchableOpacity
            onPress={() => setShowDeposit(true)}
            className="flex-1 bg-primary py-4 rounded-2xl items-center flex-row justify-center"
            style={{
              shadowColor: '#00F0FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 15,
            }}
          >
            <IconSymbol name="arrow.down.circle.fill" size={20} color="#0A0A0F" />
            <Text className="text-background font-bold text-base ml-2">Deposit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 border-2 border-border py-4 rounded-2xl items-center flex-row justify-center"
          >
            <IconSymbol name="arrow.up.circle.fill" size={20} color="#8B92A0" />
            <Text className="text-muted font-bold text-base ml-2">Withdraw</Text>
          </TouchableOpacity>
        </View>
        
        {/* Stripe Status */}
        {!isDemoMode && (
          <View className="bg-surface rounded-xl p-4 border border-border mb-6 flex-row items-center">
            <IconSymbol name="creditcard.fill" size={20} color="#39FF14" />
            <Text className="text-foreground ml-3 flex-1">Stripe Connected</Text>
            <View className="bg-success/20 px-2 py-1 rounded-full">
              <Text className="text-success text-xs font-semibold">LIVE</Text>
            </View>
          </View>
        )}
        
        {/* Transaction History */}
        <View>
          <Text className="text-foreground text-lg font-semibold mb-4">Transaction History</Text>
          
          {displayTransactions.length === 0 ? (
            <View className="bg-surface rounded-xl p-6 border border-border items-center">
              <IconSymbol name="clock.fill" size={32} color="#6B7280" />
              <Text className="text-muted mt-2">No transactions yet</Text>
            </View>
          ) : (
            <View className="gap-3">
              {displayTransactions.map((tx: any) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Deposit Modal */}
      <DepositModal 
        visible={showDeposit} 
        onClose={() => setShowDeposit(false)} 
      />
    </ScreenContainer>
  );
}
