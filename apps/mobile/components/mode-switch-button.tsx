import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet } from 'react-native';

interface ModeSwitchButtonProps {
  mode: 'single-turn' | 'tiki-taka';
  onPress: () => void;
}

export function ModeSwitchButton({ mode, onPress }: ModeSwitchButtonProps) {
  const iconName = mode === 'single-turn' ? 'document-text-outline' : 'chatbubbles-outline';

  return (
    <Pressable
      style={styles.button}
      onPress={() => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}>
      <Ionicons name={iconName} size={24} color="#444" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

