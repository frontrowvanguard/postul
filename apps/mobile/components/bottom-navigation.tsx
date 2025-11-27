import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ModeSwitchButton } from './mode-switch-button';

interface BottomNavigationProps {
    conversationMode: 'single-turn' | 'tiki-taka';
    onModeSwitchPress: () => void;
    onRecordPress?: () => void;
    onListPress?: () => void;
    onKeypadPress?: () => void;
    isRecording?: boolean;
    isAnalyzing?: boolean;
    disabled?: boolean;
}

export function BottomNavigation({
    conversationMode,
    onModeSwitchPress,
    onRecordPress,
    onListPress,
    onKeypadPress,
    isRecording = false,
    isAnalyzing = false,
    disabled = false,
}: BottomNavigationProps) {
    return (
        <View style={styles.container}>
            <LiquidGlassView style={styles.navBar} interactive effect="clear">
                <Pressable
                    style={styles.icon}
                    onPress={() => {
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        onKeypadPress?.();
                    }}
                    disabled={disabled}>
                    <Ionicons name="keypad-outline" size={24} color="#666" />
                </Pressable>

                <Pressable
                    style={styles.centerButton}
                    onPress={onRecordPress}
                    disabled={disabled || isAnalyzing}>
                    {isRecording || isAnalyzing ? (
                        <LiquidGlassView style={styles.centerButtonInner} interactive effect="clear">
                            {isAnalyzing ? (
                                <ActivityIndicator size="small" color="#666" />
                            ) : (
                                <Ionicons name="mic" size={24} color="#666" />
                            )}
                        </LiquidGlassView>
                    ) : (
                        <LinearGradient
                            colors={['#FF4444', '#0066FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.centerButtonGradient}>
                            <LiquidGlassView style={styles.centerButtonInner} interactive effect="clear">
                            </LiquidGlassView>
                        </LinearGradient>
                    )}
                </Pressable>

                <ModeSwitchButton mode={conversationMode} onPress={onModeSwitchPress} />
            </LiquidGlassView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 50,
        minWidth: '80%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    icon: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerButton: {
        width: 60,
        height: 60,
    },
    centerButtonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        padding: 2,
    },
    centerButtonInner: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

