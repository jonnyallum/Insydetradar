import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useApp } from '@/lib/store';
import * as Haptics from 'expo-haptics';

export default function VerifyScreen() {
    const router = useRouter();
    const { state, dispatch } = useApp();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const inputs = useRef<Array<TextInput | null>>([]);

    const verifyMutation = trpc.auth.verifyEmail.useMutation({
        onSuccess: () => {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            dispatch({ type: 'VERIFY_EMAIL' });
            Alert.alert("PROTOCOL VERIFIED", "Identity confirmed. Full systems access granted.");
            router.replace('/(tabs)' as any);
        },
        onError: (err) => {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            Alert.alert("PROTOCOL REJECTED", err.message);
        }
    });

    const resendMutation = trpc.auth.resendVerification.useMutation({
        onSuccess: () => {
            Alert.alert("SIGNAL RE-SENT", "New tactical verification code has been dispatched.");
        }
    });

    const logoutMutation = trpc.auth.logout.useMutation({
        onSuccess: () => {
            dispatch({ type: 'LOGOUT' });
            router.replace('/(auth)/login' as any);
        }
    });

    const handleInputChange = (text: string, index: number) => {
        const cleanText = text.replace(/[^0-9]/g, '');
        if (!cleanText && text) return;

        const newCode = [...code];
        newCode[index] = cleanText;
        setCode(newCode);

        if (cleanText.length === 1 && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            Alert.alert("DATA DEFICIT", "Full six-digit sequence required.");
            return;
        }
        verifyMutation.mutate({ code: fullCode });
    };

    return (
        <ScreenContainer>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 px-6 justify-center"
            >
                <View className="items-center mb-12">
                    <View className="w-24 h-24 bg-primary/5 rounded-3xl items-center justify-center mb-8 border border-primary/20 rotate-45">
                        <View className="-rotate-45">
                            <IconSymbol name="shield.lefthalf.filled" size={44} color="#00F0FF" />
                        </View>
                    </View>
                    <Text className="text-4xl font-black text-foreground text-center tracking-tighter uppercase">Verify identity</Text>
                    <Text className="text-muted/60 text-center mt-4 text-[10px] font-black uppercase tracking-widest leading-4 px-10">
                        Secure tactical transmission sent to:{"\n"}<Text className="text-foreground">{state.user?.email}</Text>
                    </Text>
                </View>

                <View className="flex-row justify-between mb-12">
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            className="w-12 h-18 bg-surface/50 border-2 border-border rounded-2xl text-center text-2xl font-black text-foreground"
                            style={digit ? { borderColor: '#00F0FF', backgroundColor: '#00F0FF05' } : {}}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={digit}
                            onChangeText={(text) => handleInputChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            autoFocus={index === 0}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleVerify}
                    disabled={verifyMutation.isPending}
                    className="bg-primary py-5 rounded-2xl items-center mb-8 shadow-2xl shadow-primary/20"
                >
                    {verifyMutation.isPending ? (
                        <ActivityIndicator color="#0A0A0F" />
                    ) : (
                        <Text className="text-background font-black text-lg uppercase tracking-[0.2em]">Authorize Systems</Text>
                    )}
                </TouchableOpacity>

                <View className="flex-row justify-between items-center px-2">
                    <TouchableOpacity
                        onPress={() => resendMutation.mutate()}
                        disabled={resendMutation.isPending}
                        className="flex-1"
                    >
                        <Text className="text-muted/40 font-black uppercase text-[9px] tracking-widest">
                            Re-send <Text className="text-primary">Signal</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => logoutMutation.mutate()}
                        className="flex-1 items-end"
                    >
                        <Text className="text-error/60 font-black uppercase text-[9px] tracking-widest">
                            Abort <Text className="text-error">Protocol</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}
