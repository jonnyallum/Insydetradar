# Insydetradar Mobile App - Design Document

## Brand Identity

**Tagline**: "AI-Powered Autonomous Trading"

**Design Philosophy**: Cyberpunk meets Wall Street - bold, in-your-face, yet supremely professional. Dark theme with electric neon accents that command attention.

## Color Palette

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | #00F0FF | #00F0FF | Electric cyan - main accent, CTAs |
| `secondary` | #FF00E5 | #FF00E5 | Hot magenta - secondary highlights |
| `accent` | #39FF14 | #39FF14 | Neon green - profit/success states |
| `background` | #0A0A0F | #0A0A0F | Deep space black |
| `surface` | #12121A | #12121A | Card backgrounds |
| `foreground` | #FFFFFF | #FFFFFF | Primary text |
| `muted` | #6B7280 | #8B92A0 | Secondary text |
| `border` | #1E1E2E | #2A2A3E | Subtle borders |
| `success` | #39FF14 | #39FF14 | Profits, positive |
| `warning` | #FFB800 | #FFB800 | Caution states |
| `error` | #FF3366 | #FF3366 | Losses, errors |

## Screen List

### 1. Onboarding Flow
- **Splash Screen**: Animated logo reveal with particle effects
- **Welcome Screen**: Hero image, tagline, Get Started button
- **Feature Carousel**: 3 slides showcasing AI trading, multi-market, security

### 2. Authentication
- **Sign Up Screen**: Email, password, confirm password, terms checkbox
- **Login Screen**: Email, password, forgot password link, biometric option
- **Verify Email Screen**: OTP input or magic link confirmation

### 3. Main App (Tab Navigation)
- **Dashboard (Home)**: Portfolio value, P&L chart, AI status, quick actions
- **Markets**: Crypto, Stocks, Forex tabs with live prices
- **Trade**: AI control center - start/stop, risk settings, active trades
- **Wallet**: Balance, deposit/withdraw, transaction history
- **Profile**: Settings, account, notifications, demo mode toggle

### 4. Modal/Sheet Screens
- **Deposit Sheet**: Amount input, Stripe payment
- **Withdraw Sheet**: Amount, bank details
- **Trade Detail**: Individual trade info, close position
- **AI Settings**: Risk level, max position, stop-loss preferences

## Primary Content & Functionality

### Dashboard Screen
- **Hero Card**: Total portfolio value with animated counter
- **P&L Chart**: 24h/7d/30d/All time toggle, gradient area chart
- **AI Status Widget**: Running/Paused indicator with pulse animation
- **Quick Stats Row**: Today's P&L, Win Rate, Active Trades
- **Recent Activity**: Last 5 trades with profit/loss indicators

### Markets Screen
- **Tab Bar**: Crypto | Stocks | Forex
- **Search Bar**: Filter assets
- **Asset List**: Symbol, name, price, 24h change (color coded)
- **Watchlist Toggle**: Star icon to add favorites

### Trade Screen (AI Control Center)
- **Master Switch**: Large toggle to start/stop AI trading
- **Risk Level Slider**: Conservative → Moderate → Aggressive
- **Active Positions**: List of current trades with live P&L
- **AI Insights**: Recent decisions with reasoning
- **Performance Metrics**: Sharpe ratio, max drawdown, win rate

### Wallet Screen
- **Balance Card**: Available balance, pending deposits
- **Action Buttons**: Deposit | Withdraw
- **Transaction History**: Filterable list (deposits, withdrawals, trades)

### Profile Screen
- **User Info**: Avatar, name, email
- **Demo Mode Toggle**: Switch between live/demo trading
- **Settings List**: Notifications, Security, Help, About
- **Logout Button**: Confirmation dialog

## Key User Flows

### Flow 1: New User Onboarding
1. User opens app → Splash screen with logo animation
2. Welcome screen → Tap "Get Started"
3. Feature carousel → Swipe through 3 slides
4. Sign Up screen → Enter details → Submit
5. Email verification → Enter code
6. Dashboard → Demo mode enabled by default

### Flow 2: Deposit & Start Trading
1. Dashboard → Tap "Deposit" or navigate to Wallet
2. Deposit sheet → Enter amount
3. Stripe payment → Complete payment
4. Balance updates → Return to Dashboard
5. Trade screen → Toggle AI ON
6. Confirmation dialog → Confirm risk settings
7. AI starts trading → Dashboard shows live updates

### Flow 3: Monitor & Manage
1. Dashboard → View portfolio performance
2. Trade screen → Check active positions
3. Tap position → View trade detail
4. Optional: Close position manually
5. Markets → Browse assets, add to watchlist

### Flow 4: Withdraw Profits
1. Wallet → Tap "Withdraw"
2. Enter amount → Select bank account
3. Confirm withdrawal → Processing
4. Transaction appears in history

## UI Components

### Custom Components Needed
- `GlowButton`: Primary CTA with neon glow effect
- `AnimatedCounter`: Smooth number transitions for values
- `PulseIndicator`: AI status with breathing animation
- `GradientCard`: Cards with subtle gradient borders
- `SparklineChart`: Mini inline charts for price trends
- `RiskSlider`: Custom slider with gradient track
- `StatusBadge`: Running/Paused/Error states

### Animation Guidelines
- Use `react-native-reanimated` for all animations
- Subtle glow effects on interactive elements
- Smooth transitions between screens (300ms)
- Number counters animate on value change
- Pull-to-refresh with custom loading animation

## Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| H1 | System | 32px | Bold |
| H2 | System | 24px | Bold |
| H3 | System | 20px | Semibold |
| Body | System | 16px | Regular |
| Caption | System | 14px | Regular |
| Small | System | 12px | Regular |
| Mono (numbers) | System Mono | 16-32px | Medium |

## Logo Concept

**Style**: Minimalist geometric with tech edge
**Elements**: 
- Abstract radar/scanner motif
- Stylized "I" that suggests both radar sweep and trading chart
- Electric cyan (#00F0FF) as primary color
- Clean lines, no gradients in logo mark
- Works on dark backgrounds

## Technical Integration

### Backend APIs (from Insydetradar trading system)
- ML Prediction Engine for trade signals
- Risk Manager for position sizing
- Backtester for strategy validation

### External Services
- **Stripe**: Payment processing for deposits
- **Market Data**: Real-time prices (crypto, stocks, forex APIs)
- **Push Notifications**: Trade alerts, P&L updates

### Demo Mode
- Simulated balance starting at $100,000
- Paper trading with real market data
- Full AI functionality without real money
- Clear visual indicator when in demo mode
