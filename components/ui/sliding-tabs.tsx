import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface TabOption<T> {
    label: string;
    value: T;
}

interface SlidingTabsProps<T> {
    options: TabOption<T>[];
    selected: T;
    onSelect: (value: T) => void;
    className?: string;
}

export function SlidingTabs<T extends string>({
    options,
    selected,
    onSelect,
    className
}: SlidingTabsProps<T>) {
    const selectedIndex = options.findIndex(opt => opt.value === selected);
    const indicatorPosition = useSharedValue(selectedIndex);

    useEffect(() => {
        indicatorPosition.value = withTiming(selectedIndex, { duration: 250 });
    }, [selectedIndex]);

    const animatedIndicatorStyle = useAnimatedStyle(() => ({
        left: `${(indicatorPosition.value * 100) / options.length}%`,
        width: `${100 / options.length}%`,
    }));

    return (
        <View className={`flex-row bg-surface/50 rounded-2xl p-1 border border-border relative overflow-hidden ${className}`}>
            {/* Sliding Background Indicator */}
            <Animated.View
                className="absolute top-1 bottom-1 bg-white/10 border border-white/10 rounded-xl"
                style={animatedIndicatorStyle}
            />

            {options.map((option) => (
                <TouchableOpacity
                    key={option.value}
                    onPress={() => onSelect(option.value)}
                    className="flex-1 items-center py-2 z-10"
                >
                    <Text
                        className={`text-xs font-bold ${selected === option.value ? 'text-primary' : 'text-muted'}`}
                        style={{ letterSpacing: 1 }}
                    >
                        {option.label.toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
