import { LiquidGlassView } from '@callstack/liquid-glass';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { defaultFontFamily } from '@/constants/theme';
import { SocialPlatform } from '@/app/project/[id]/survey-post';

interface EditablePostInputProps {
    text: string;
    onChangeText: (text: string) => void;
    pollOptions: { text: string }[];
    onPollOptionsChange: (options: { text: string }[]) => void;
    platform: SocialPlatform;
}

export function EditablePostInput({ text, onChangeText, pollOptions, onPollOptionsChange, platform }: EditablePostInputProps) {
    const maxLength = platform === 'x' ? 280 : 500; // X has 280 char limit, Threads has 500
    const charCount = text.length;
    const isNearLimit = charCount > maxLength * 0.8;

    return (
        <View style={styles.container}>
            <LiquidGlassView style={styles.card} interactive effect="clear">
                <View style={styles.content}>
                    <Text style={styles.title}>Edit Post</Text>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={onChangeText}
                        placeholder="Write your post..."
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        multiline
                        maxLength={maxLength}
                        textAlignVertical="top"
                    />
                    <View style={styles.footer}>
                        <Text
                            style={[
                                styles.charCount,
                                isNearLimit && styles.charCountWarning,
                                charCount >= maxLength && styles.charCountError,
                            ]}>
                            {charCount} / {maxLength}
                        </Text>
                    </View>

                    {/* Poll Options */}
                    <Text style={styles.pollTitle}>Poll Options</Text>
                    {pollOptions.map((option, index) => (
                        <TextInput
                            key={index}
                            style={styles.pollInput}
                            value={option.text}
                            onChangeText={(newText) => {
                                const updatedOptions = [...pollOptions];
                                updatedOptions[index] = { text: newText };
                                onPollOptionsChange(updatedOptions);
                            }}
                            placeholder={`Option ${index + 1}`}
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            maxLength={25}
                        />
                    ))}
                </View>
            </LiquidGlassView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    card: {
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#26262640',
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        fontFamily: defaultFontFamily,
    },
    input: {
        minHeight: 120,
        fontSize: 16,
        color: '#fff',
        fontFamily: defaultFontFamily,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
    },
    charCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: defaultFontFamily,
    },
    charCountWarning: {
        color: '#F6D3B5',
    },
    charCountError: {
        color: '#FF6B9D',
    },
    pollTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
        marginTop: 20,
        marginBottom: 12,
        fontFamily: defaultFontFamily,
    },
    pollInput: {
        height: 44,
        fontSize: 14,
        color: '#fff',
        fontFamily: defaultFontFamily,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 8,
    },
});

