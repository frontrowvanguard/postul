import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { defaultFontFamily } from '@/constants/theme';

interface ModeSelectionBottomSheetProps {
  visible: boolean;
  currentMode: 'single-turn' | 'tiki-taka';
  onClose: () => void;
  onSelectMode: (mode: 'single-turn' | 'tiki-taka') => void;
}

interface ModeOption {
  id: 'single-turn' | 'tiki-taka';
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const modeOptions: ModeOption[] = [
  {
    id: 'single-turn',
    title: 'Single Turn',
    description: 'Generates analysis report and actions after each input',
    icon: 'document-text-outline',
  },
  {
    id: 'tiki-taka',
    title: 'Tiki Taka',
    description: 'Live conversation with real-time transcription. Left: agent, Right: you',
    icon: 'chatbubbles-outline',
  },
];

export function ModeSelectionBottomSheet({
  visible,
  currentMode,
  onClose,
  onSelectMode,
}: ModeSelectionBottomSheetProps) {
  const [slideAnim] = useState(new Animated.Value(500));
  const [backdropOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Animate slide up and fade in backdrop
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate slide down and fade out backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelectMode = (mode: 'single-turn' | 'tiki-taka') => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSelectMode(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <LinearGradient
            colors={['#E0D9E8', '#F2C5D6', '#F6D3B5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradient}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Title */}
            <View style={styles.header}>
              <Text style={styles.title}>Select Conversation Mode</Text>
            </View>

            {/* Mode Options */}
            <View style={styles.optionsContainer}>
              {modeOptions.map((option) => {
                const isSelected = currentMode === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.option}
                    onPress={() => handleSelectMode(option.id)}
                    activeOpacity={0.7}>
                    <LiquidGlassView
                      style={[
                        styles.optionInner,
                        isSelected && styles.optionInnerSelected,
                      ]}
                      interactive
                      effect="clear">
                      <View style={styles.optionContent}>
                        <View
                          style={[
                            styles.iconContainer,
                            isSelected && styles.iconContainerSelected,
                          ]}>
                          <Ionicons
                            name={option.icon}
                            size={24}
                            color={isSelected ? '#fff' : '#666'}
                          />
                        </View>
                        <View style={styles.textContainer}>
                          <Text
                            style={[
                              styles.optionTitle,
                              isSelected && styles.optionTitleSelected,
                            ]}>
                            {option.title}
                          </Text>
                          <Text style={styles.optionDescription}>
                            {option.description}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.checkmarkContainer}>
                            <Ionicons name="checkmark-circle" size={24} color="#A8E6CF" />
                          </View>
                        )}
                      </View>
                    </LiquidGlassView>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backdropPressable: {
    flex: 1,
  },
  bottomSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  gradient: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    fontFamily: defaultFontFamily,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  option: {
    marginBottom: 4,
  },
  optionInner: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionInnerSelected: {
    backgroundColor: 'rgba(168, 230, 207, 0.3)',
    borderColor: '#A8E6CF',
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#A8E6CF',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: defaultFontFamily,
  },
  optionTitleSelected: {
    color: '#000',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    fontFamily: defaultFontFamily,
  },
  checkmarkContainer: {
    marginLeft: 8,
  },
});

