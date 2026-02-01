import React from 'react';
import { View, Dimensions, ActivityIndicator, Text } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';
import * as Haptics from 'expo-haptics';

interface ChartData {
    timestamp: number;
    equity: number;
}

interface PortfolioChartProps {
    data: ChartData[];
    isLoading?: boolean;
    color?: string;
}

export function PortfolioChart({
    data,
    isLoading,
    color = '#00F0FF'
}: PortfolioChartProps) {
    const { width } = Dimensions.get('window');

    if (isLoading) {
        return (
            <View className="h-[200px] items-center justify-center bg-surface rounded-2xl border border-border">
                <ActivityIndicator color={color} />
            </View>
        );
    }

    if (!data || data.length === 0) {
        return (
            <View className="h-[200px] items-center justify-center bg-surface rounded-2xl border border-border">
                <Text className="text-muted">No chart data available</Text>
            </View>
        );
    }

    // Wagmi charts expects an array of { timestamp: number, value: number }
    const chartData = data.map(d => ({
        timestamp: d.timestamp * 1000, // Handle unix timestamp
        value: d.equity,
    }));

    const handleCurrentIndexChange = () => {
        Haptics.selectionAsync();
    };

    return (
        <View className="bg-surface rounded-3xl overflow-hidden border border-border">
            <LineChart.Provider data={chartData}>
                <LineChart width={width - 40} height={200}>
                    <LineChart.Path color={color}>
                        <LineChart.Gradient color={color} />
                    </LineChart.Path>
                    <LineChart.CursorCrosshair
                        color={color}
                    >
                        <LineChart.Tooltip
                            textStyle={{
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                fontSize: 16
                            }}
                            cursorGutter={80}
                        />
                    </LineChart.CursorCrosshair>
                </LineChart>
            </LineChart.Provider>
        </View>
    );
}
