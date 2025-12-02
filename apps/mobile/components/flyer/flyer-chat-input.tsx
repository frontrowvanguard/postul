import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { defaultFontFamily } from '@/constants/theme';

interface FlyerChatInputProps {
  onSend: (instruction: string) => void;
  disabled?: boolean;
  remainingEdits?: number;
  maxEdits?: number;
}

export function FlyerChatInput({
  onSend,
  disabled = false,
  remainingEdits = 5,
  maxEdits = 5,
}: FlyerChatInputProps) {
  const [instruction, setInstruction] = useState('');

  const handleSend = () => {
    const trimmedInstruction = instruction.trim();
    if (trimmedInstruction && !disabled && remainingEdits > 0) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onSend(trimmedInstruction);
      setInstruction('');
    }
  };

  const canSend = instruction.trim().length > 0 && !disabled && remainingEdits > 0;

  return (
    <View style={styles.container}>
      <LiquidGlassView style={styles.card} interactive effect="clear">
        <View style={styles.content}>
          {/* Edit count display */}
          <View style={styles.editCountContainer}>
            <Text style={styles.editCountText}>
              {remainingEdits > 0 ? (
                <>
                  <Text style={styles.editCountNumber}>{remainingEdits}</Text> edits remaining
                </>
              ) : (
                <Text style={styles.editCountWarning}>No edits remaining</Text>
              )}
            </Text>
          </View>

          {/* Input area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, disabled && styles.inputDisabled]}
              value={instruction}
              onChangeText={setInstruction}
              placeholder={
                remainingEdits > 0
                  ? "Describe how you'd like to edit the flyer..."
                  : 'Maximum edits reached'
              }
              placeholderTextColor="rgba(0, 0, 0, 0.5)"
              multiline
              maxLength={500}
              editable={!disabled && remainingEdits > 0}
              textAlignVertical="top"
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend}>
              <LiquidGlassView
                style={[styles.sendButtonInner, !canSend && styles.sendButtonInnerDisabled]}
                interactive={canSend}
                effect="clear">
                <Ionicons
                  name="send"
                  size={20}
                  color={canSend ? '#000' : 'rgba(255, 255, 255, 0.3)'}
                />
              </LiquidGlassView>
            </Pressable>
          </View>

          {/* Character count */}
          <View style={styles.footer}>
            <Text style={styles.charCount}>
              {instruction.length} / 500
            </Text>
          </View>
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
    padding: 20,
  },
  editCountContainer: {
    marginBottom: 12,
  },
  editCountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: defaultFontFamily,
  },
  editCountNumber: {
    fontWeight: '700',
    color: '#fff',
  },
  editCountWarning: {
    color: '#FF6B9D',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 80,
    maxHeight: 120,
    fontSize: 16,
    color: '#000',
    fontFamily: defaultFontFamily,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendButtonInnerDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: defaultFontFamily,
  },
});



