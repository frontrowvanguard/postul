import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ModeSwitchButton } from './mode-switch-button';
import { defaultFontFamily } from '@/constants/theme';

interface BottomNavigationProps {
    conversationMode: 'single-turn' | 'tiki-taka';
    onModeSwitchPress: () => void;
    onRecordPress?: () => void;
    onListPress?: () => void;
    onKeypadPress?: () => void;
    onSubmitPress?: () => void;
    isRecording?: boolean;
    isAnalyzing?: boolean;
    disabled?: boolean;
    showSubmitButton?: boolean;
    inputMode?: 'voice' | 'text';
    textInputValue?: string;
    onTextInputChange?: (text: string) => void;
    onTextSubmit?: () => void;
}

export function BottomNavigation({
    conversationMode,
    onModeSwitchPress,
    onRecordPress,
    onListPress,
    onKeypadPress,
    onSubmitPress,
    isRecording = false,
    isAnalyzing = false,
    disabled = false,
    showSubmitButton = false,
    inputMode = 'voice',
    textInputValue = '',
    onTextInputChange,
    onTextSubmit,
}: BottomNavigationProps) {
    // Text input mode - show text input field
    if (inputMode === 'text') {
        return (
            <View style={styles.container}>
                <LiquidGlassView style={styles.textInputNavBar} interactive effect="clear">
                    <Pressable
                        style={styles.textModeIcon}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            onKeypadPress?.();
                        }}
                        disabled={disabled || isAnalyzing}>
                        <Ionicons name="mic-outline" size={24} color={(disabled || isAnalyzing) ? "#999" : "#A8E6CF"} />
                    </Pressable>
                    <TextInput
                        style={[styles.textInputField, (disabled || isAnalyzing) && styles.textInputFieldDisabled]}
                        value={textInputValue}
                        onChangeText={onTextInputChange}
                        placeholder="Type your message..."
                        placeholderTextColor="rgba(102, 102, 102, 0.6)"
                        multiline
                        autoFocus={!isAnalyzing}
                        textAlignVertical="center"
                        editable={!disabled && !isAnalyzing}
                    />
                    <Pressable
                        style={[styles.sendButton, (!textInputValue.trim() || disabled || isAnalyzing) && styles.sendButtonDisabled]}
                        onPress={() => {
                            if (!textInputValue.trim() || disabled || isAnalyzing) return;
                            if (Platform.OS === 'ios') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            }
                            onTextSubmit?.();
                        }}
                        disabled={!textInputValue.trim() || disabled || isAnalyzing}>
                        {isAnalyzing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color={textInputValue.trim() && !disabled && !isAnalyzing ? "#fff" : "#999"} />
                        )}
                    </Pressable>
                </LiquidGlassView>
            </View>
        );
    }

    // Voice mode - show normal navigation
    return (
        <View style={styles.container}>
            <LiquidGlassView style={styles.navBar} interactive effect="clear">
                {showSubmitButton && onSubmitPress ? (
                    <Pressable
                        style={styles.submitButton}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            }
                            onSubmitPress();
                        }}
                        disabled={disabled || isAnalyzing}>
                        <LinearGradient
                            colors={['#4CAF50', '#45A049']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.submitButtonGradient}>
                            <LiquidGlassView style={styles.submitButtonInner} interactive effect="clear">
                                <Ionicons name="checkmark" size={24} color="#fff" />
                            </LiquidGlassView>
                        </LinearGradient>
                    </Pressable>
                ) : (
                    <Pressable
                        style={styles.icon}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            onKeypadPress?.();
                        }}
                        disabled={disabled}>
                        <Ionicons name="text-outline" size={24} color="#666" />
                    </Pressable>
                )}

                <Pressable
                    style={styles.centerButton}
                    onPress={onRecordPress}
                    disabled={isAnalyzing}>
                    {isRecording || isAnalyzing ? (
                        <LiquidGlassView style={styles.centerButtonInner} interactive effect="clear">
                            {isAnalyzing ? (
                                <ActivityIndicator size="small" color="#666" />
                            ) : (
                                <Ionicons name="stop-outline" size={24} color="red" />
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
    submitButton: {
        width: 44,
        height: 44,
    },
    submitButtonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
        padding: 2,
    },
    submitButtonInner: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInputNavBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 50,
        minWidth: '90%',
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
    textModeIcon: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInputField: {
        flex: 1,
        marginHorizontal: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: '#333',
        fontSize: 16,
        fontFamily: defaultFontFamily,
        maxHeight: 100,
    },
    textInputFieldDisabled: {
        opacity: 0.5,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#A8E6CF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        opacity: 0.5,
    },
});

