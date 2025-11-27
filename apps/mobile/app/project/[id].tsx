import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown, useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

import { defaultFontFamily } from '@/constants/theme';
import { apiService, Idea, Project } from '@/services/api';
import { BottomNavigation } from '@/components/bottom-navigation';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Reusable animated button component that manages its own animation state
function AnimatedButton({
    children,
    style,
    onPress,
}: {
    children: React.ReactNode;
    style?: any;
    onPress?: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <AnimatedPressable
            style={[style, animatedStyle]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}>
            {children}
        </AnimatedPressable>
    );
}

export default function ProjectDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [idea, setIdea] = useState<Idea | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [conversationMode, setConversationMode] = useState<'single-turn' | 'tiki-taka'>('single-turn');

    const loadProjectData = useCallback(async () => {
        if (!id) return;
        
        try {
            setIsLoading(true);
            const projectId = parseInt(id, 10);
            // Fetch project and ideas filtered by project_id
            const [projectData, ideasData] = await Promise.all([
                apiService.getProject(projectId),
                apiService.getIdeas(projectId),
            ]);

            setProject(projectData);
            // Get the first (most recent) idea associated with this project
            if (ideasData && ideasData.length > 0) {
                setIdea(ideasData[0]);
            }
        } catch (error: any) {
            console.error('Error loading project data:', error);
            Alert.alert('Error', error.message || 'Failed to load project data.');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProjectData();
    }, [loadProjectData]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
                <LinearGradient
                    colors={['#E0D9E8', '#F2C5D6', '#F6D3B5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.gradient}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#666" />
                        <Text style={styles.loadingText}>Loading project...</Text>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    if (!project) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
                <LinearGradient
                    colors={['#E0D9E8', '#F2C5D6', '#F6D3B5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.gradient}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Project not found</Text>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    const analysis = idea?.analysis;
    const summaryText = analysis?.summary || 'No analysis available yet.';
    const displaySummary = summaryExpanded || summaryText.length < 200
        ? summaryText
        : summaryText.substring(0, 200) + '...';

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
                            router.back();
                        }}>
                        <LiquidGlassView style={styles.iconButton} interactive effect="clear">
                            <Ionicons name="arrow-back" size={24} color="#444" />
                        </LiquidGlassView>
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{project.name}</Text>
                        <Text style={styles.headerTimestamp}>{formatDate(project.created_at)}</Text>
                    </View>
                    <Pressable
                        style={styles.iconButton}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            // Share functionality placeholder
                        }}>
                        <LiquidGlassView style={styles.iconButton} interactive effect="clear">
                            <Ionicons name="share-outline" size={24} color="#444" />
                        </LiquidGlassView>
                    </Pressable>
                </View>

                {/* Main Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}>
                    {/* Analysis Card */}
                    <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
                        <LiquidGlassView style={styles.card} interactive effect="clear">
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>Analysis</Text>

                                <Text style={styles.sectionTitle}>Summary</Text>
                                <Text style={styles.summaryText}>{displaySummary}</Text>
                                {summaryText.length > 200 && (
                                    <Pressable
                                        onPress={() => {
                                            setSummaryExpanded(!summaryExpanded);
                                            if (Platform.OS === 'ios') {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}>
                                        <Text style={styles.expandText}>
                                            {summaryExpanded ? 'Show less' : '... more'}
                                        </Text>
                                    </Pressable>
                                )}

                                {/* Placeholder Images */}
                                <View style={styles.imagePlaceholders}>
                                    <View style={styles.imagePlaceholder} />
                                    <View style={styles.imagePlaceholder} />
                                    <View style={styles.imagePlaceholder} />
                                </View>

                                {/* Scores */}
                                <View style={styles.scoresContainer}>
                                    <View style={styles.scoreItem}>
                                        <Text style={styles.scoreLabel}>Saturation Score</Text>
                                        <Text style={[styles.scoreValue, styles.scoreValueRed]}>
                                            {analysis?.saturation_score?.toFixed(1) || '0.0'} / 10.0
                                        </Text>
                                    </View>
                                    <View style={styles.scoreItem}>
                                        <Text style={styles.scoreLabel}>Juicy Score</Text>
                                        <Text style={[styles.scoreValue, styles.scoreValueBlue]}>
                                            {analysis?.juicy_score?.toFixed(1) || '0.0'} / 10.0
                                        </Text>
                                    </View>
                                </View>

                                {/* Divider */}
                                <View style={styles.divider} />

                                {/* Sources */}
                                {analysis?.sources && analysis.sources.length > 0 && (
                                    <View style={styles.sourcesContainer}>
                                        {analysis.sources.map((source, index) => (
                                            <View key={index} style={styles.sourceItem}>
                                                <Pressable
                                                    style={styles.checkbox}
                                                    onPress={() => {
                                                        if (Platform.OS === 'ios') {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }
                                                        // Toggle source checked state (placeholder)
                                                    }}>
                                                    <Ionicons
                                                        name={source.checked ? 'checkbox' : 'square-outline'}
                                                        size={20}
                                                        color="#fff"
                                                    />
                                                </Pressable>
                                                <View style={styles.sourceInfo}>
                                                    <Text style={styles.sourceTitle}>{source.title}</Text>
                                                    <Text style={styles.sourceUrl}>{source.url}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Action Icons */}
                                <View style={styles.actionIcons}>
                                    <Pressable
                                        style={styles.actionIcon}
                                        onPress={() => {
                                            if (Platform.OS === 'ios') {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}>
                                        <Ionicons name="search" size={20} color="#fff" />
                                    </Pressable>
                                    <Pressable
                                        style={styles.actionIcon}
                                        onPress={() => {
                                            if (Platform.OS === 'ios') {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}>
                                        <Ionicons name="play" size={20} color="#fff" />
                                    </Pressable>
                                </View>
                            </View>
                        </LiquidGlassView>
                    </Animated.View>

                    {/* Actions Card */}
                    <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
                        <LiquidGlassView style={styles.card} interactive effect="clear">
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>Actions</Text>

                                {/* Action Agents */}
                                <Text style={styles.sectionTitle}>Action Agents</Text>
                                <View style={styles.actionAgentsContainer}>
                                    {[
                                        'Post Reddit at r/resumes',
                                        'Write a X post',
                                        'Create a discord poll',
                                    ].map((label, index) => (
                                        <AnimatedButton
                                            key={index}
                                            style={styles.actionAgentButton}
                                            onPress={() => {
                                                if (Platform.OS === 'ios') {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                }
                                            }}>
                                            <LiquidGlassView style={styles.actionAgentButtonInner} interactive effect="clear">
                                                <Text style={styles.actionAgentText}>{label}</Text>
                                            </LiquidGlassView>
                                        </AnimatedButton>
                                    ))}
                                    <View style={styles.actionAgentButtonPlaceholder} />
                                </View>

                                {/* Talk it out */}
                                <Text style={styles.sectionTitle}>Talk it out</Text>
                                <AnimatedButton
                                    style={styles.talkButton}
                                    onPress={() => {
                                        if (Platform.OS === 'ios') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        }
                                    }}>
                                    <LinearGradient
                                        colors={['#FF6B9D', '#C44569', '#A8E6CF']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.talkButtonGradient}>
                                        <LiquidGlassView style={styles.talkButtonInner} interactive effect="clear">
                                            <Ionicons name="chatbubble" size={24} color="#000" />
                                            <Text style={styles.talkButtonText}>Talk with Copilot</Text>
                                        </LiquidGlassView>
                                    </LinearGradient>
                                </AnimatedButton>

                                {/* Standalone Polls/Enablers */}
                                <Text style={styles.sectionTitle}>Standalone Polls/Enablers</Text>
                                <View style={styles.pollsContainer}>
                                    {[
                                        'Create a Cahoot!',
                                        'Create a Landing page',
                                        'Create interview script',
                                        'Write an email draft',
                                        'Create QR for ideation',
                                    ].map((label, index) => (
                                        <AnimatedButton
                                            key={index}
                                            style={styles.pollButton}
                                            onPress={() => {
                                                if (Platform.OS === 'ios') {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                }
                                            }}>
                                            <LiquidGlassView style={styles.pollButtonInner} interactive effect="clear">
                                                <Text style={styles.pollButtonText}>{label}</Text>
                                            </LiquidGlassView>
                                        </AnimatedButton>
                                    ))}
                                    <View style={styles.pollButtonPlaceholder} />
                                </View>
                            </View>
                        </LiquidGlassView>
                    </Animated.View>
                </ScrollView>

                {/* Bottom Navigation */}
                <BottomNavigation
                    conversationMode={conversationMode}
                    onModeSwitchPress={() => {
                        // TODO: Open mode selection sheet
                        console.log('Mode switch pressed');
                    }}
                    onRecordPress={() => {
                        if (Platform.OS === 'ios') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        // TODO: Handle record action
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontFamily: defaultFontFamily,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        fontFamily: defaultFontFamily,
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
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        fontFamily: defaultFontFamily,
    },
    headerTimestamp: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontFamily: defaultFontFamily,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 30,
        marginBottom: 16,
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
    cardContent: {
        padding: 24,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 20,
        fontFamily: defaultFontFamily,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
        marginBottom: 12,
        fontFamily: defaultFontFamily,
    },
    summaryText: {
        fontSize: 14,
        color: '#fff',
        lineHeight: 20,
        marginBottom: 8,
        fontFamily: defaultFontFamily,
    },
    expandText: {
        fontSize: 14,
        color: '#A8E6CF',
        fontFamily: defaultFontFamily,
    },
    imagePlaceholders: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 16,
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    scoresContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 24,
        marginVertical: 16,
    },
    scoreItem: {
        alignItems: 'flex-end',
    },
    scoreLabel: {
        fontSize: 12,
        color: '#fff',
        marginBottom: 4,
        fontFamily: defaultFontFamily,
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: defaultFontFamily,
    },
    scoreValueRed: {
        color: '#FF6B9D',
    },
    scoreValueBlue: {
        color: '#A8E6CF',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginVertical: 16,
    },
    sourcesContainer: {
        gap: 12,
    },
    sourceItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        marginTop: 2,
    },
    sourceInfo: {
        flex: 1,
    },
    sourceTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
        marginBottom: 4,
        fontFamily: defaultFontFamily,
    },
    sourceUrl: {
        fontSize: 12,
        color: '#A8E6CF',
        fontFamily: defaultFontFamily,
    },
    actionIcons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionAgentsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    actionAgentButton: {
        flex: 1,
        minWidth: '45%',
    },
    actionAgentButtonInner: {
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
    },
    actionAgentText: {
        fontSize: 12,
        color: '#fff',
        textAlign: 'center',
        fontFamily: defaultFontFamily,
    },
    actionAgentButtonPlaceholder: {
        flex: 1,
        minWidth: '45%',
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    talkButton: {
        marginBottom: 24,
    },
    talkButtonGradient: {
        borderRadius: 20,
        padding: 2,
    },
    talkButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        gap: 8,
    },
    talkButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        fontFamily: defaultFontFamily,
    },
    pollsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    pollButton: {
        flex: 1,
        minWidth: '30%',
    },
    pollButtonInner: {
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
    },
    pollButtonText: {
        fontSize: 11,
        color: '#fff',
        textAlign: 'center',
        fontFamily: defaultFontFamily,
    },
    pollButtonPlaceholder: {
        flex: 1,
        minWidth: '30%',
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
});

