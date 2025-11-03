import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  children?: React.ReactNode;
}

export function GlassCard({ 
  style, 
  children, 
  intensity = 20, 
  tint = 'light',
  ...otherProps 
}: GlassCardProps) {
  return (
    <View style={[styles.container, style]} {...otherProps}>
      <BlurView intensity={intensity} tint={tint} style={styles.blurView}>
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  blurView: {
    width: '100%',
    height: '100%',
  },
});

