import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { defaultFontFamily } from '@/constants/theme';

interface SourceAvatarProps {
  imageUrl?: string | null;
  title: string;
  size?: number;
}

/**
 * Avatar component for source images with fallback.
 * Displays OG image if available, otherwise shows a colorful gradient avatar
 * with the first letter of the source title.
 */
export function SourceAvatar({ imageUrl, title, size = 80 }: SourceAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  // Get first letter for fallback
  const firstLetter = title.charAt(0).toUpperCase() || '?';
  
  // Generate colors based on title hash for consistent colors
  const getColorsForTitle = (text: string): [string, string, string] => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate colors from hash
    const hue = Math.abs(hash) % 360;
    const color1 = `hsl(${hue}, 70%, 60%)`;
    const color2 = `hsl(${(hue + 60) % 360}, 70%, 65%)`;
    const color3 = `hsl(${(hue + 120) % 360}, 70%, 70%)`;
    
    return [color1, color2, color3];
  };

  const gradientColors = getColorsForTitle(title);

  if (imageUrl && !imageError) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size * 0.15 }]}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => setImageLoading(false)}
        />
        {imageLoading && (
          <View style={[styles.loadingOverlay, { width: size, height: size, borderRadius: size * 0.15 }]}>
            <View style={[styles.fallbackContainer, { width: size, height: size }]}>
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradient, { borderRadius: size * 0.15 }]}>
                <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
                  {firstLetter}
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Fallback avatar
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { width: size, height: size, borderRadius: size * 0.15 }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
          {firstLetter}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: defaultFontFamily,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

