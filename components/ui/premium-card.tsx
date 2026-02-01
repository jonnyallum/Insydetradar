import React, { ReactNode, useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';

interface PremiumCardProps extends ViewProps {
    children: ReactNode;
    glowColor?: string;
    hasGlow?: boolean;
}

export function PremiumCard({
    children,
    glowColor = '#00F0FF',
    hasGlow = false,
    className,
    style,
    ...props
}: PremiumCardProps) {
    const glowOpacity = useSharedValue(0.1);
    const scanPos = useSharedValue(-100);

    useEffect(() => {
        if (hasGlow) {
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.2, { duration: 2000 }),
                    withTiming(0.1, { duration: 2000 })
                ),
                -1,
                true
            );
        }
        scanPos.value = withRepeat(
            withTiming(400, { duration: 3000 }),
            -1,
            false
        );
    }, [hasGlow]);

    const glowStyle = useAnimatedStyle(() => ({
        shadowOpacity: glowOpacity.value,
    }));

    const scanStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: scanPos.value }],
    }));

    return (
        <Animated.View
            className={`bg-surface/90 rounded-3xl border border-white/10 overflow-hidden ${className}`}
            style={[
                hasGlow && {
                    shadowColor: glowColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowRadius: 24,
                },
                hasGlow && glowStyle,
                style,
            ]}
            {...props}
        >
            {/* Glassmorphism Background Gradient Placeholder */}
            <View className="absolute inset-0 bg-black/5" />

            {/* Sweeping scanline */}
            <Animated.View
                style={[
                    scanStyle,
                    {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 60,
                        backgroundColor: glowColor,
                        opacity: 0.03,
                    }
                ]}
            />

            {/* Subtle corner highlights */}
            <View
                className="absolute top-0 left-0 w-16 h-[1.5px]"
                style={{ backgroundColor: glowColor, opacity: 0.4 }}
            />
            <View
                className="absolute top-0 left-0 w-[1.5px] h-16"
                style={{ backgroundColor: glowColor, opacity: 0.4 }}
            />

            {/* Bottom-right corner highlight */}
            <View
                className="absolute bottom-0 right-0 w-12 h-[1.5px]"
                style={{ backgroundColor: glowColor, opacity: 0.2 }}
            />
            <View
                className="absolute bottom-0 right-0 w-[1.5px] h-12"
                style={{ backgroundColor: glowColor, opacity: 0.2 }}
            />

            <View className="p-6">
                {children}
            </View>
        </Animated.View>
    );
}
