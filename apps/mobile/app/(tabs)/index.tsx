import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { defaultFontFamily } from '@/constants/theme';
import { apiService, Project } from '@/services/api';
import { useRouter } from 'expo-router';
import { ConversationListSidepanel } from '@/components/conversation-list-sidepanel';
import { SettingsPanel } from '@/components/settings-panel';
import { ModeSelectionBottomSheet } from '@/components/mode-selection-bottom-sheet';
import { BottomNavigation } from '@/components/bottom-navigation';

export default function HomeScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const finalTranscriptRef = useRef<string>('');
  const [isSidepanelVisible, setIsSidepanelVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [conversationMode, setConversationMode] = useState<'single-turn' | 'tiki-taka'>('single-turn');
  const [isModeSheetVisible, setIsModeSheetVisible] = useState(false);

  // Listen to speech recognition events
  useSpeechRecognitionEvent('start', () => {
    console.log('Speech recognition started');
  });

  useSpeechRecognitionEvent('audiostart', () => {
    console.log('Audio capture started');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const { results, isFinal } = event as any;
    if (results && results.length > 0) {
      // Build complete transcript from all results
      // The results array contains all transcript parts so far
      const fullTranscript = results
        .map((result: any) => result.transcript)
        .join(' ')
        .trim();

      console.log('Speech recognition result:', {
        fullTranscript,
        isFinal,
        resultsCount: results.length,
        latestResult: results[results.length - 1],
      });

      // Update current transcript for display
      setCurrentTranscript(fullTranscript);

      // Store transcript (will be used when recording stops)
      // We update it on every result so we have the latest
      finalTranscriptRef.current = fullTranscript;

      if (isFinal) {
        console.log('=== FINAL TRANSCRIPTION DETECTED ===');
        console.log(fullTranscript);
        console.log('====================================');
      }
    }
  });

  useSpeechRecognitionEvent('audioend', () => {
    console.log('Audio capture ended');
  });

  useSpeechRecognitionEvent('end', async () => {
    console.log('Speech recognition ended');
    setIsRecording(false);

    // Get the final transcript (use current transcript if final transcript is empty)
    let transcript = finalTranscriptRef.current.trim();
    if (!transcript && currentTranscript) {
      transcript = currentTranscript.trim();
    }

    console.log('Final transcript to send:', transcript);

    // Send transcript to server for analysis if we have content
    if (transcript.length > 0) {
      await analyzeIdea(transcript);
    } else {
      console.log('No transcript to send');
    }

    // Clear transcript
    setCurrentTranscript('');
    finalTranscriptRef.current = '';
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech recognition error:', event.error);
    Alert.alert('Recognition Error', event.error || 'An error occurred during speech recognition.');
    setIsRecording(false);
  });

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Check if speech recognition is available
  useEffect(() => {
    (async () => {
      try {
        const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
        console.log('Speech recognition available:', available);

        if (!available) {
          Alert.alert(
            'Not Available',
            'Speech recognition is not available on this device.',
          );
        }
      } catch (error) {
        console.error('Error checking speech recognition availability:', error);
      }
    })();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const fetchedProjects = await apiService.getProjects();
      setProjects(fetchedProjects);
      console.log('Fetched projects:', fetchedProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to fetch projects. Please check your connection.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeIdea = async (transcribedText: string) => {
    try {
      setIsAnalyzing(true);
      console.log('Analyzing idea:', transcribedText);

      // Step 1: Generate project details and create project first
      const projectDetailsResponse = await apiService.generateProjectDetails({
        transcribed_text: transcribedText,
      });

      const project = await apiService.createProject({
        name: projectDetailsResponse.name,
        description: projectDetailsResponse.description,
      });

      console.log('Created project:', project);

      // Step 2: Analyze idea with project_id to link them
      const analysisResponse = await apiService.analyzeIdea({
        transcribed_text: transcribedText,
        project_id: project.id,
      });

      console.log('Analysis response:', analysisResponse);

      // Navigate to project detail screen
      router.push(`/project/${project.id}` as any);
    } catch (error: any) {
      console.error('Error analyzing idea:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to analyze idea. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleRecord = async () => {
    // Don't allow toggling while analyzing
    if (isAnalyzing) {
      return;
    }

    try {
      if (isRecording) {
        // Stop recognition
        // Haptic feedback for stop
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Clear transcripts before stopping
        // The 'end' event will handle sending the final transcript
        await ExpoSpeechRecognitionModule.stop();
        console.log('Stopped speech recognition');
      } else {
        // Start recognition
        // Haptic feedback for start
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Clear previous transcript
        setCurrentTranscript('');
        finalTranscriptRef.current = '';

        await ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true, // Get partial results as user speaks
          continuous: true, // Keep recording until manually stopped
        });

        setIsRecording(true);
        console.log('Started speech recognition');
      }
    } catch (error: any) {
      console.error('Error toggling speech recognition:', error);
      Alert.alert('Error', error.message || 'Something went wrong with speech recognition.');
      setIsRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#E0D9E8', '#F2C5D6', '#F6D3B5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setIsSidepanelVisible(true);
            }}>
            <LiquidGlassView
              style={styles.iconButton}
              interactive
              effect="clear">
              <Ionicons name="menu-outline" size={24} color="#444" />
            </LiquidGlassView>
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setIsSettingsVisible(true);
            }}>
            <LiquidGlassView
              style={styles.iconButton}
              interactive
              effect="clear">
              <Ionicons name="settings" size={24} color="#444" />
            </LiquidGlassView>
          </Pressable>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Top Card */}
          <LiquidGlassView
            style={[
              styles.topCard,
              isRecording && styles.topCardGrayscaled
            ]}
            interactive
            effect="clear">
            <View style={styles.topCardContent}>
              <Text
                style={[
                  styles.topCardTitle,
                  isRecording && styles.grayscaledText
                ]}>
                What&apos;s on{'\n'}your mind?
              </Text>
              <Text
                style={[
                  styles.topCardSubtitle,
                  isRecording && styles.grayscaledText
                ]}>
                Great idea starts from{'\n'}just spitting it out
              </Text>
            </View>
          </LiquidGlassView>

          {/* Projects Card */}
          <LiquidGlassView
            style={[
              styles.projectsCard,
              (isRecording || isAnalyzing) && styles.projectsCardGrayscaled
            ]}
            interactive
            effect="clear">
            <ScrollView>
              {isLoading && projects.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>Loading projects...</Text>
                </View>
              ) : projects.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No projects yet.{'\n'}Your projects will appear here.
                  </Text>
                </View>
              ) : (
                projects.map((project, index) => (
                  <View key={project.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <Pressable
                      style={styles.projectItem}
                      onPress={() => {
                        if (!isRecording && !isAnalyzing) {
                          if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          router.push(`/project/${project.id}` as any);
                        }
                      }}
                      disabled={isRecording || isAnalyzing}>
                      <View style={[
                        styles.avatarPlaceholder,
                        (isRecording || isAnalyzing) && styles.grayscaledAvatar
                      ]} />
                      <View style={styles.projectInfo}>
                        <Text
                          style={[
                            styles.projectTitle,
                            (isRecording || isAnalyzing) && styles.grayscaledText
                          ]}>
                          {project.name}
                        </Text>
                        <Text
                          style={[
                            styles.projectUser,
                            (isRecording || isAnalyzing) && styles.grayscaledText
                          ]}>
                          {new Date(project.created_at).toLocaleDateString()}
                        </Text>
                        {project.description && (
                          <Text
                            style={[
                              styles.projectDescription,
                              (isRecording || isAnalyzing) && styles.grayscaledText
                            ]}
                            numberOfLines={6}
                            ellipsizeMode="tail"
                          >
                            {project.description}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  </View>
                ))
              )}
              {isAnalyzing && (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.analyzingText}>Analyzing your idea...</Text>
                </View>
              )}
            </ScrollView>
          </LiquidGlassView>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigation
          conversationMode={conversationMode}
          onModeSwitchPress={() => setIsModeSheetVisible(true)}
          onRecordPress={handleToggleRecord}
          onListPress={() => setIsSidepanelVisible(true)}
          isRecording={isRecording}
          isAnalyzing={isAnalyzing}
          disabled={isRecording || isAnalyzing}
        />

        {/* Conversation List Sidepanel */}
        <ConversationListSidepanel
          visible={isSidepanelVisible}
          onClose={() => setIsSidepanelVisible(false)}
        />

        {/* Settings Panel */}
        <SettingsPanel
          visible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
        />

        {/* Mode Selection Bottom Sheet */}
        <ModeSelectionBottomSheet
          visible={isModeSheetVisible}
          currentMode={conversationMode}
          onClose={() => setIsModeSheetVisible(false)}
          onSelectMode={(mode) => {
            setConversationMode(mode);
            setIsModeSheetVisible(false);
          }}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0D9E8',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    paddingVertical: 20,
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
    fontSize: 40,
    fontWeight: '100',
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
    fontFamily: defaultFontFamily,
    shadowColor: '#000',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  topCardSubtitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#AAA',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: defaultFontFamily,
    // backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 1,
    borderRadius: 10,
  },
  projectsCard: {
    borderRadius: 30,
    overflow: 'hidden',
    maxHeight: 400,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    backgroundColor: '#26262640',
    color: '#fff',
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
  projectsCardGrayscaled: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    color: '#fff',
    marginBottom: 8,
    fontFamily: defaultFontFamily,
  },
  projectUser: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 8,
    fontFamily: defaultFontFamily,
  },
  projectDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: '#fff',
    lineHeight: 20,
    fontFamily: defaultFontFamily,
  },
  grayscaledText: {
    opacity: 0.6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontFamily: defaultFontFamily,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: defaultFontFamily,
    opacity: 0.7,
  },
  analyzingContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: defaultFontFamily,
  },
  priorityBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: defaultFontFamily,
    fontWeight: '500',
  },
});
