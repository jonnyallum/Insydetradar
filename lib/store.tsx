import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Position {
  id: string;
  symbol: string;
  type: 'crypto' | 'stock' | 'forex';
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'trade';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

export interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  hasCompletedOnboarding: boolean;
  
  // Trading
  isDemoMode: boolean;
  isAITrading: boolean;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  
  // Portfolio
  balance: number;
  portfolioValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  positions: Position[];
  transactions: Transaction[];
  
  // UI
  isLoading: boolean;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_DEMO_MODE'; payload: boolean }
  | { type: 'SET_AI_TRADING'; payload: boolean }
  | { type: 'SET_RISK_LEVEL'; payload: 'conservative' | 'moderate' | 'aggressive' }
  | { type: 'UPDATE_BALANCE'; payload: number }
  | { type: 'UPDATE_PORTFOLIO'; payload: { portfolioValue: number; totalPnl: number; totalPnlPercent: number } }
  | { type: 'SET_POSITIONS'; payload: Position[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'RESTORE_STATE'; payload: Partial<AppState> };

const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  hasCompletedOnboarding: false,
  isDemoMode: true,
  isAITrading: false,
  riskLevel: 'moderate',
  balance: 100000, // Demo balance
  portfolioValue: 100000,
  totalPnl: 0,
  totalPnlPercent: 0,
  positions: [],
  transactions: [],
  isLoading: true,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.payload };
    case 'LOGOUT':
      return { ...initialState, hasCompletedOnboarding: state.hasCompletedOnboarding, isLoading: false };
    case 'COMPLETE_ONBOARDING':
      return { ...state, hasCompletedOnboarding: true };
    case 'SET_DEMO_MODE':
      return { 
        ...state, 
        isDemoMode: action.payload,
        balance: action.payload ? 100000 : 0,
        portfolioValue: action.payload ? 100000 : 0,
        positions: [],
        totalPnl: 0,
        totalPnlPercent: 0,
      };
    case 'SET_AI_TRADING':
      return { ...state, isAITrading: action.payload };
    case 'SET_RISK_LEVEL':
      return { ...state, riskLevel: action.payload };
    case 'UPDATE_BALANCE':
      return { ...state, balance: action.payload };
    case 'UPDATE_PORTFOLIO':
      return { 
        ...state, 
        portfolioValue: action.payload.portfolioValue,
        totalPnl: action.payload.totalPnl,
        totalPnlPercent: action.payload.totalPnlPercent,
      };
    case 'SET_POSITIONS':
      return { ...state, positions: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'RESTORE_STATE':
      return { ...state, ...action.payload, isLoading: false };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = '@insydetradar_state';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    async function loadState() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          dispatch({ type: 'RESTORE_STATE', payload: parsed });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Failed to load state:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    loadState();
  }, []);

  // Persist state changes
  useEffect(() => {
    if (!state.isLoading) {
      const toSave = {
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isDemoMode: state.isDemoMode,
        riskLevel: state.riskLevel,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch(console.error);
    }
  }, [state.hasCompletedOnboarding, state.isDemoMode, state.riskLevel, state.isAuthenticated, state.user, state.isLoading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Convenience hooks
export function useAuth() {
  const { state, dispatch } = useApp();
  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    login: (user: User) => dispatch({ type: 'LOGIN', payload: user }),
    logout: () => dispatch({ type: 'LOGOUT' }),
  };
}

export function useTrading() {
  const { state, dispatch } = useApp();
  return {
    isDemoMode: state.isDemoMode,
    isAITrading: state.isAITrading,
    riskLevel: state.riskLevel,
    positions: state.positions,
    setDemoMode: (demo: boolean) => dispatch({ type: 'SET_DEMO_MODE', payload: demo }),
    setAITrading: (trading: boolean) => dispatch({ type: 'SET_AI_TRADING', payload: trading }),
    setRiskLevel: (level: 'conservative' | 'moderate' | 'aggressive') => dispatch({ type: 'SET_RISK_LEVEL', payload: level }),
  };
}

export function usePortfolio() {
  const { state } = useApp();
  return {
    balance: state.balance,
    portfolioValue: state.portfolioValue,
    totalPnl: state.totalPnl,
    totalPnlPercent: state.totalPnlPercent,
    positions: state.positions,
    transactions: state.transactions,
  };
}
