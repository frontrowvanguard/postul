import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass-card';

// Sample project data
const SAMPLE_PROJECTS = [
  {
    id: 1,
    title: 'Project Example',
    user: 'User 1',
    description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
  {
    id: 2,
    title: 'Project Example',
    user: 'User 2',
    description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
];

export default function HomeScreen() {
  const [isRecording, setIsRecording] = useState(false);

  const handleToggleRecord = () => {
    setIsRecording(!isRecording);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#E0D9E8', '#F2C5D6', '#F6D3B5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#444" />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Ionicons name="settings" size={24} color="#444" />
          </Pressable>
        </View>

        {/* Main Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Top Card */}
          <GlassCard 
            style={[
              styles.topCard,
              isRecording && styles.topCardGrayscaled
            ]}
            intensity={20}
            tint="light">
            <View style={styles.topCardContent}>
              <Text 
                style={[
                  styles.topCardTitle,
                  isRecording && styles.grayscaledText
                ]}>
                What's on{'\n'}your mind?
              </Text>
              <Text 
                style={[
                  styles.topCardSubtitle,
                  isRecording && styles.grayscaledText
                ]}>
                Great idea starts from{'\n'}spitting out
              </Text>
            </View>
          </GlassCard>

          {/* Projects Card */}
          <GlassCard 
            style={[
              styles.projectsCard,
              isRecording && styles.projectsCardGrayscaled
            ]}
            intensity={20}
            tint="light">
            {SAMPLE_PROJECTS.map((project, index) => (
              <View key={project.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.projectItem}>
                  <View style={[
                    styles.avatarPlaceholder,
                    isRecording && styles.grayscaledAvatar
                  ]} />
                  <View style={styles.projectInfo}>
                    <Text 
                      style={[
                        styles.projectTitle,
                        isRecording && styles.grayscaledText
                      ]}>
                      {project.title}
                    </Text>
                    <Text 
                      style={[
                        styles.projectUser,
                        isRecording && styles.grayscaledText
                      ]}>
                      {project.user}
                    </Text>
                    <Text 
                      style={[
                        styles.projectDescription,
                        isRecording && styles.grayscaledText
                      ]}>
                      {project.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </GlassCard>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavContainer}>
          <BlurView intensity={30} tint="light" style={styles.bottomNav}>
            {/* Voice Record Button */}
            <Pressable 
              onPress={handleToggleRecord}
              style={styles.recordButtonContainer}>
              {isRecording ? (
                <BlurView intensity={30} tint="light" style={styles.recordButtonBlur}>
                  <View style={styles.recordButtonInner}>
                    <Ionicons name="mic" size={32} color="#666" />
                  </View>
                </BlurView>
              ) : (
                <LinearGradient
                  colors={['#FF4444', '#0066FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 1]}
                  style={styles.recordButtonGradient}>
                  <View style={styles.recordButtonInner}>
                    <Ionicons name="mic" size={32} color="#FFF" />
                  </View>
                </LinearGradient>
              )}
            </Pressable>
          </BlurView>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  topCard: {
    borderRadius: 30,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  topCardGrayscaled: {
    opacity: 0.4,
  },
  topCardContent: {
    padding: 40,
    alignItems: 'center',
  },
  topCardTitle: {
    fontSize: 38,
    fontWeight: '200',
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  topCardSubtitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#AAA',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  projectsCard: {
    borderRadius: 30,
    overflow: 'hidden',
    minHeight: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  projectsCardGrayscaled: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    marginVertical: 24,
  },
  projectItem: {
    flexDirection: 'row',
    padding: 24,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
    marginRight: 16,
  },
  grayscaledAvatar: {
    opacity: 0.6,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  projectUser: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: '#888',
    lineHeight: 20,
  },
  grayscaledText: {
    opacity: 0.6,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderRadius: 35,
    overflow: 'hidden',
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
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonBlur: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordButtonGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
