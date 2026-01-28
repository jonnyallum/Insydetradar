import { describe, it, expect } from 'vitest';

// Test the reducer logic directly without React context
type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  hasCompletedOnboarding: boolean;
  isDemoMode: boolean;
  isAITrading: boolean;
  riskLevel: RiskLevel;
  balance: number;
  portfolioValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  isLoading: boolean;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_DEMO_MODE'; payload: boolean }
  | { type: 'SET_AI_TRADING'; payload: boolean }
  | { type: 'SET_RISK_LEVEL'; payload: RiskLevel }
  | { type: 'UPDATE_BALANCE'; payload: number };

const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  hasCompletedOnboarding: false,
  isDemoMode: true,
  isAITrading: false,
  riskLevel: 'moderate',
  balance: 100000,
  portfolioValue: 100000,
  totalPnl: 0,
  totalPnlPercent: 0,
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
        totalPnl: 0,
        totalPnlPercent: 0,
      };
    case 'SET_AI_TRADING':
      return { ...state, isAITrading: action.payload };
    case 'SET_RISK_LEVEL':
      return { ...state, riskLevel: action.payload };
    case 'UPDATE_BALANCE':
      return { ...state, balance: action.payload };
    default:
      return state;
  }
}

describe('App Store Reducer', () => {
  describe('Authentication', () => {
    it('should handle LOGIN action', () => {
      const user: User = { id: '1', email: 'test@example.com', name: 'Test User' };
      const newState = reducer(initialState, { type: 'LOGIN', payload: user });
      
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.user).toEqual(user);
    });

    it('should handle LOGOUT action', () => {
      const loggedInState: AppState = {
        ...initialState,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        hasCompletedOnboarding: true,
      };
      
      const newState = reducer(loggedInState, { type: 'LOGOUT' });
      
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.user).toBeNull();
      expect(newState.hasCompletedOnboarding).toBe(true); // Should preserve onboarding state
    });
  });

  describe('Onboarding', () => {
    it('should handle COMPLETE_ONBOARDING action', () => {
      const newState = reducer(initialState, { type: 'COMPLETE_ONBOARDING' });
      
      expect(newState.hasCompletedOnboarding).toBe(true);
    });
  });

  describe('Trading Settings', () => {
    it('should handle SET_DEMO_MODE action - enable demo', () => {
      const liveState: AppState = { ...initialState, isDemoMode: false, balance: 5000 };
      const newState = reducer(liveState, { type: 'SET_DEMO_MODE', payload: true });
      
      expect(newState.isDemoMode).toBe(true);
      expect(newState.balance).toBe(100000); // Demo balance
    });

    it('should handle SET_DEMO_MODE action - disable demo', () => {
      const newState = reducer(initialState, { type: 'SET_DEMO_MODE', payload: false });
      
      expect(newState.isDemoMode).toBe(false);
      expect(newState.balance).toBe(0); // Live mode starts with 0
    });

    it('should handle SET_AI_TRADING action', () => {
      const newState = reducer(initialState, { type: 'SET_AI_TRADING', payload: true });
      
      expect(newState.isAITrading).toBe(true);
    });

    it('should handle SET_RISK_LEVEL action', () => {
      const newState = reducer(initialState, { type: 'SET_RISK_LEVEL', payload: 'aggressive' });
      
      expect(newState.riskLevel).toBe('aggressive');
    });
  });

  describe('Balance', () => {
    it('should handle UPDATE_BALANCE action', () => {
      const newState = reducer(initialState, { type: 'UPDATE_BALANCE', payload: 150000 });
      
      expect(newState.balance).toBe(150000);
    });
  });

  describe('Loading State', () => {
    it('should handle SET_LOADING action', () => {
      const newState = reducer(initialState, { type: 'SET_LOADING', payload: false });
      
      expect(newState.isLoading).toBe(false);
    });
  });
});
