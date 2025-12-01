import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { defaultFontFamily } from '@/constants/theme';
import { apiService, Project, TikiTakaMessage } from '@/services/api';
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
  const [tikiTakaHistory, setTikiTakaHistory] = useState<TikiTakaMessage[]>([]);
  const [initialIdeaContext, setInitialIdeaContext] = useState<string | null>(null);
  const [isWaitingForAdvisor, setIsWaitingForAdvisor] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');
  const tikiTakaScrollViewRef = useRef<ScrollView>(null);
  const previousHistoryLengthRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

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
      const fullTranscript = results[results.length - 1].transcript
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
      if (conversationMode === 'tiki-taka') {
        await handleTikiTakaConversation(transcript);
      } else {
        await analyzeIdea(transcript);
      }
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

  const handleTikiTakaConversation = async (transcribedText: string) => {
    try {
      setIsWaitingForAdvisor(true);
      console.log('Tiki-taka conversation:', transcribedText);

      // If this is the first message, store it as initial context
      if (tikiTakaHistory.length === 0 && !initialIdeaContext) {
        setInitialIdeaContext(transcribedText);
      }

      // Call tiki-taka endpoint
      const response = await apiService.tikiTakaConversation({
        transcribed_text: transcribedText,
        conversation_history: tikiTakaHistory,
        idea_context: initialIdeaContext,
      });

      console.log('Tiki-taka response:', response);

      // Update conversation history
      setTikiTakaHistory(response.conversation_history);

      // Scroll to bottom after a short delay to ensure the new message is rendered
      setTimeout(() => {
        tikiTakaScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error in tiki-taka conversation:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to get advisor response. Please try again.',
      );
    } finally {
      setIsWaitingForAdvisor(false);
    }
  };

  // Reset conversation when switching modes
  useEffect(() => {
    const cleanup = async () => {
      if (conversationMode === 'single-turn') {
        // Stop any ongoing audio playback
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch (error) {
            console.error('Error stopping audio:', error);
          }
          soundRef.current = null;
        }
        setTikiTakaHistory([]);
        setInitialIdeaContext(null);
        previousHistoryLengthRef.current = 0;
      }
    };
    cleanup();
  }, [conversationMode]);

  // Read advisor messages using TTS when they arrive
  useEffect(() => {
    let isMounted = true;

    const playTTSAudio = async (text: string) => {
      try {
        // Stop any currently playing audio
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        // Request audio from server (using base64 endpoint)
        const ttsResponse = await apiService.synthesizeSpeech({
          text,
          inference_steps: 2,
          style_id: 0,
        });

        if (!isMounted) return;

        // Create data URI from base64 audio
        const audioUri = `data:audio/wav;base64,${ttsResponse.audio_base64}`;

        // Configure audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Load and play the audio
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, volume: 1.0 }
        );

        soundRef.current = sound;

        // Clean up when playback finishes
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('Finished playing advisor message');
            sound.unloadAsync().catch(console.error);
            soundRef.current = null;
          }
        });
      } catch (error: any) {
        console.error('TTS playback error:', error);
        // Fallback: silently fail, don't interrupt the user experience
      }
    };

    // Only process if we're in tiki-taka mode and have messages
    if (conversationMode !== 'tiki-taka' || tikiTakaHistory.length === 0) {
      previousHistoryLengthRef.current = tikiTakaHistory.length;
      return;
    }

    // Check if a new advisor message was added
    const currentLength = tikiTakaHistory.length;
    const previousLength = previousHistoryLengthRef.current;

    if (currentLength > previousLength) {
      // Find the latest advisor message
      const latestAdvisorMessage = [...tikiTakaHistory]
        .reverse()
        .find(msg => msg.role === 'assistant');

      if (latestAdvisorMessage) {
        // Play the advisor's message using server TTS
        playTTSAudio(latestAdvisorMessage.content);
      }
    }

    // Update the ref to track the current length
    previousHistoryLengthRef.current = currentLength;

    // Cleanup function
    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
        soundRef.current = null;
      }
    };
  }, [tikiTakaHistory, conversationMode]);

  const clearTikiTakaConversation = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Stop any ongoing audio playback
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
      soundRef.current = null;
    }
    setTikiTakaHistory([]);
    setInitialIdeaContext(null);
    previousHistoryLengthRef.current = 0;
  };

  const submitTikiTakaConversation = async () => {
    if (tikiTakaHistory.length === 0) {
      return;
    }

    try {
      setIsAnalyzing(true);

      // Combine all user messages from the conversation into a comprehensive idea text
      const userMessages = tikiTakaHistory
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      // Also include advisor messages for context (optional, but helpful)
      const advisorMessages = tikiTakaHistory
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .join(' ');

      // Create a comprehensive idea description combining the conversation
      const comprehensiveIdea = userMessages + (advisorMessages ? `\n\nContext from conversation: ${advisorMessages}` : '');

      console.log('Submitting tiki-taka conversation for analysis:', comprehensiveIdea);

      // Step 1: Generate project details and create project first
      const projectDetailsResponse = await apiService.generateProjectDetails({
        transcribed_text: comprehensiveIdea,
      });

      const project = await apiService.createProject({
        name: projectDetailsResponse.name,
        description: projectDetailsResponse.description,
      });

      console.log('Created project:', project);

      // Step 2: Analyze idea with project_id to link them
      const analysisResponse = await apiService.analyzeIdea({
        transcribed_text: comprehensiveIdea,
        project_id: project.id,
      });

      console.log('Analysis response:', analysisResponse);

      // Clear conversation history
      setTikiTakaHistory([]);
      setInitialIdeaContext(null);

      // Navigate to project detail screen
      router.push(`/project/${project.id}` as any);
    } catch (error: any) {
      console.error('Error submitting tiki-taka conversation:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to analyze conversation. Please try again.',
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
        setIsRecording(false); // Immediately update state to reflect stopped state
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

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isAnalyzing || isWaitingForAdvisor) {
      return;
    }

    const inputText = textInput.trim();
    // Don't clear input immediately - keep it visible during loading
    // setTextInput(''); // Clear input immediately

    try {
      if (conversationMode === 'tiki-taka') {
        await handleTikiTakaConversation(inputText);
      } else {
        await analyzeIdea(inputText);
      }
      // Clear input after successful submission
      setTextInput('');
    } catch (error: any) {
      console.error('Error submitting text:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to submit message. Please try again.',
      );
      // Don't clear input on error so user can retry
    }
  };

  const handleToggleInputMode = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newMode = inputMode === 'voice' ? 'text' : 'voice';
    setInputMode(newMode);
    if (newMode === 'voice') {
      setTextInput(''); // Clear text input when switching back to voice
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
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
              {isAnalyzing && conversationMode === 'single-turn' && (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.analyzingText}>Analyzing your idea...</Text>
                </View>
              )}
            </ScrollView>
          </LiquidGlassView>
        </ScrollView>

        {/* Tiki-Taka Conversation Display */}
        {conversationMode === 'tiki-taka' && tikiTakaHistory.length > 0 && (
          <>
            {/* Blurred Backdrop */}
            <BlurView intensity={20} style={styles.tikiTakaBackdrop} />

            {/* Conversation Container */}
            <View style={styles.tikiTakaContainer}>
              {/* Header */}
              <View style={styles.tikiTakaHeader}>
                <View style={styles.tikiTakaHeaderLeft}>
                  <Text style={styles.tikiTakaHeaderTitle}>Tiki-Taka</Text>
                  <Text style={styles.tikiTakaHeaderSubtitle}>Conversation Mode</Text>
                </View>
                <Pressable
                  style={styles.tikiTakaCloseButton}
                  onPress={clearTikiTakaConversation}>
                  <LiquidGlassView
                    style={styles.tikiTakaCloseButtonInner}
                    interactive
                    effect="clear">
                    <Ionicons name="close" size={20} color="#666" />
                  </LiquidGlassView>
                </Pressable>
              </View>

              {/* Messages */}
              <ScrollView
                ref={tikiTakaScrollViewRef}
                style={styles.tikiTakaScrollView}
                contentContainerStyle={styles.tikiTakaScrollContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  tikiTakaScrollViewRef.current?.scrollToEnd({ animated: true });
                }}>
                {tikiTakaHistory.map((message, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tikiTakaMessageContainer,
                      message.role === 'user' ? styles.userMessageContainer : styles.advisorMessageContainer,
                    ]}>
                    <LiquidGlassView
                      style={[
                        styles.tikiTakaMessageCard,
                        message.role === 'user' ? styles.userMessageCard : styles.advisorMessageCard,
                      ]}
                      interactive
                      effect="clear">
                      <Text style={[
                        styles.tikiTakaMessageText,
                        message.role === 'user' ? styles.userMessageText : styles.advisorMessageText,
                      ]}>
                        {message.content}
                      </Text>
                    </LiquidGlassView>
                  </View>
                ))}
                {isWaitingForAdvisor && (
                  <View style={styles.advisorMessageContainer}>
                    <LiquidGlassView style={styles.advisorMessageCard} interactive effect="clear">
                      <View style={styles.thinkingIndicator}>
                        <ActivityIndicator size="small" color="#666" />
                        <Text style={styles.thinkingText}>Thinking...</Text>
                      </View>
                    </LiquidGlassView>
                  </View>
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* Transcript Display - Shown during recording and analyzing */}
        {(isRecording || isAnalyzing || isWaitingForAdvisor) && currentTranscript.length > 0 && (
          <View style={styles.transcriptContainer}>
            <LiquidGlassView style={styles.transcriptCard} interactive effect="clear">
              <Text style={styles.transcriptText}>{currentTranscript}</Text>
            </LiquidGlassView>
          </View>
        )}

        {/* Bottom Navigation */}
        <BottomNavigation
          conversationMode={conversationMode}
          inputMode={inputMode}
          textInputValue={textInput}
          onTextInputChange={setTextInput}
          onTextSubmit={handleTextSubmit}
          onModeSwitchPress={() => setIsModeSheetVisible(true)}
          onRecordPress={inputMode === 'voice' ? handleToggleRecord : undefined}
          onKeypadPress={handleToggleInputMode}
          onListPress={() => setIsSidepanelVisible(true)}
          onSubmitPress={submitTikiTakaConversation}
          isRecording={isRecording}
          isAnalyzing={isAnalyzing || isWaitingForAdvisor}
          disabled={isAnalyzing || isWaitingForAdvisor}
          showSubmitButton={conversationMode === 'tiki-taka' && tikiTakaHistory.length > 0 && inputMode === 'voice'}
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
            // Reset conversation when switching modes
            if (mode === 'single-turn') {
              setTikiTakaHistory([]);
              setInitialIdeaContext(null);
            }
          }}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
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
  transcriptContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 130 : 110,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  transcriptCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  transcriptText: {
    color: '#333',
    fontSize: 14,
    fontFamily: defaultFontFamily,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'left',
  },
  tikiTakaBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tikiTakaContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 130 : 110,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tikiTakaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  tikiTakaHeaderLeft: {
    flex: 1,
  },
  tikiTakaHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    fontFamily: defaultFontFamily,
    marginBottom: 2,
  },
  tikiTakaHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    fontFamily: defaultFontFamily,
  },
  tikiTakaCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tikiTakaCloseButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tikiTakaScrollView: {
    flex: 1,
  },
  tikiTakaScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingVertical: 12,
    gap: 12,
  },
  tikiTakaMessageContainer: {
    marginBottom: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  advisorMessageContainer: {
    alignItems: 'flex-start',
  },
  tikiTakaMessageCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '75%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userMessageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  advisorMessageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tikiTakaMessageText: {
    fontSize: 14,
    fontFamily: defaultFontFamily,
    fontWeight: '400',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#333',
    textAlign: 'right',
  },
  advisorMessageText: {
    color: '#444',
    textAlign: 'left',
  },
  thinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingText: {
    color: '#666',
    fontSize: 14,
    fontFamily: defaultFontFamily,
    fontStyle: 'italic',
  },
});
