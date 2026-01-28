import { useState, useRef } from 'react';
import { View, Text, Dimensions, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/store';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat,
  withTiming,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'AI-Powered Trading',
    subtitle: 'Let our advanced ML algorithms analyze markets and execute trades automatically, 24/7.',
    icon: '🤖',
    color: '#00F0FF',
  },
  {
    id: '2',
    title: 'Multi-Market Access',
    subtitle: 'Trade crypto, stocks, and forex all from one powerful platform.',
    icon: '🌐',
    color: '#FF00E5',
  },
  {
    id: '3',
    title: 'Risk Management',
    subtitle: 'Advanced position sizing and stop-loss protection to safeguard your capital.',
    icon: '🛡️',
    color: '#39FF14',
  },
];

function PulsingGlow({ color }: { color: string }) {
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 1500 }),
      -1,
      true
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View 
      style={[
        animatedStyle,
        {
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 60,
        }
      ]} 
    />
  );
}

function SlideItem({ item, index, scrollX }: { item: OnboardingSlide; index: number; scrollX: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8]);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });
  
  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
      <Animated.View style={[animatedStyle, { alignItems: 'center' }]}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
          <PulsingGlow color={item.color} />
          <Text style={{ fontSize: 80 }}>{item.icon}</Text>
        </View>
        
        <Text 
          className="text-3xl font-bold text-foreground text-center mb-4"
          style={{ color: item.color }}
        >
          {item.title}
        </Text>
        
        <Text className="text-lg text-muted text-center leading-7">
          {item.subtitle}
        </Text>
      </Animated.View>
    </View>
  );
}

function Pagination({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <View className="flex-row justify-center items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`h-2 rounded-full ${
            index === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-border'
          }`}
          style={index === currentIndex ? { shadowColor: '#00F0FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 } : {}}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { dispatch } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  
  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };
  
  const handleGetStarted = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    router.replace('/(auth)/login');
  };
  
  const handleSkip = () => {
    handleGetStarted();
  };
  
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <Image 
            source={require('@/assets/images/icon.png')} 
            style={{ width: 40, height: 40, borderRadius: 8 }}
          />
          <TouchableOpacity onPress={handleSkip}>
            <Text className="text-muted text-base">Skip</Text>
          </TouchableOpacity>
        </View>
        
        {/* Slides */}
        <View className="flex-1 justify-center">
          <FlatList
            ref={flatListRef}
            data={slides}
            renderItem={({ item, index }) => (
              <SlideItem item={item} index={index} scrollX={scrollX} />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              scrollX.value = e.nativeEvent.contentOffset.x;
            }}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentIndex(index);
            }}
            scrollEventThrottle={16}
          />
        </View>
        
        {/* Bottom */}
        <View className="px-6 pb-8">
          <Pagination currentIndex={currentIndex} total={slides.length} />
          
          <TouchableOpacity
            onPress={handleNext}
            className="bg-primary py-4 rounded-2xl items-center"
            style={{
              shadowColor: '#00F0FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          >
            <Text className="text-background font-bold text-lg">
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
