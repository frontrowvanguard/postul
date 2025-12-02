import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
} from 'react-native-reanimated';
// Note: File system dependencies temporarily removed due to SDK compatibility
// TODO: Re-add with compatible versions or use alternative approach

import { defaultFontFamily } from '@/constants/theme';
import { apiService, Idea, Project, Flyer } from '@/services/api';
import { FlyerImageViewer } from '@/components/flyer/flyer-image-viewer';
import { FlyerChatInput } from '@/components/flyer/flyer-chat-input';

const MAX_EDITS = 5;

export default function FlyerScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [idea, setIdea] = useState<Idea | null>(null);
    const [flyer, setFlyer] = useState<Flyer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadProjectData = useCallback(async () => {
        if (!id) return;

        try {
            setIsLoading(true);
            const projectId = parseInt(id, 10);
            const [projectData, ideasData] = await Promise.all([
                apiService.getProject(projectId),
                apiService.getIdeas(projectId),
            ]);

            setProject(projectData);
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

    const startPolling = useCallback((flyerId: number) => {
        // Clear any existing polling
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        // Poll every 2 seconds
        pollingIntervalRef.current = setInterval(async () => {
            try {
                const flyerData = await apiService.getFlyer(flyerId);
                setFlyer(flyerData);

                // Stop polling if completed or failed
                if (flyerData.status === 'completed' || flyerData.status === 'failed') {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    setIsGenerating(false);
                    setIsEditing(false);
                    
                    if (flyerData.status === 'completed' && Platform.OS === 'ios') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                }
            } catch (error: any) {
                console.error('Error polling flyer status:', error);
                // Stop polling on error
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            }
        }, 2000) as ReturnType<typeof setInterval>; // Poll every 2 seconds
    }, []);

    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    const loadFlyer = useCallback(async () => {
        if (!id) return;

        try {
            const projectId = parseInt(id, 10);
            const flyerData = await apiService.getFlyerByProject(projectId);
            setFlyer(flyerData);
            
            // Start polling if status is pending or processing
            if (flyerData.status === 'pending' || flyerData.status === 'processing') {
                startPolling(flyerData.id);
            }
        } catch (error: any) {
            // Flyer doesn't exist yet, will generate on mount
            console.log('Flyer not found, will generate:', error.message);
        }
    }, [id, startPolling]);

    const generateFlyer = useCallback(async () => {
        if (!project || !idea) return;

        try {
            setIsGenerating(true);
            const response = await apiService.generateFlyer({
                project_id: project.id,
                idea_id: idea.id,
            });

            // Reload flyer to get full data
            const flyerData = await apiService.getFlyer(response.flyer_id);
            setFlyer(flyerData);
            
            // Start polling if status is pending or processing
            if (flyerData.status === 'pending' || flyerData.status === 'processing') {
                startPolling(flyerData.id);
            }
        } catch (error: any) {
            console.error('Error generating flyer:', error);
            Alert.alert('Error', error.message || 'Failed to generate flyer. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [project, idea, startPolling]);

    const editFlyer = useCallback(async (instruction: string) => {
        if (!flyer) return;

        try {
            setIsEditing(true);
            const response = await apiService.editFlyer(flyer.id, {
                edit_instruction: instruction,
                conversation_history: flyer.conversation_history || [],
            });

            // Update flyer state with response
            setFlyer({
                ...flyer,
                edit_count: response.edit_count,
                conversation_history: response.conversation_history,
                status: response.status,
            });

            // Start polling if status is pending or processing
            if (response.status === 'pending' || response.status === 'processing') {
                startPolling(flyer.id);
            } else if (response.status === 'completed' && response.image_url) {
                // Update with completed image
                setFlyer((prev) => prev ? { ...prev, image_url: response.image_url, status: 'completed' } : null);
                if (Platform.OS === 'ios') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch (error: any) {
            console.error('Error editing flyer:', error);
            Alert.alert('Error', error.message || 'Failed to edit flyer. Please try again.');
        } finally {
            setIsEditing(false);
        }
    }, [flyer, startPolling]);

    const saveFlyer = useCallback(async () => {
        // TODO: Implement save functionality with compatible file-system dependency
        Alert.alert(
            'Coming Soon',
            'Save functionality will be available soon. For now, you can take a screenshot of the flyer.'
        );
    }, []);

    const shareFlyer = useCallback(async () => {
        // TODO: Implement share functionality with compatible file-system dependency
        Alert.alert(
            'Coming Soon',
            'Share functionality will be available soon. For now, you can take a screenshot of the flyer.'
        );
    }, []);

    const shareToInstagram = useCallback(async () => {
        // TODO: Implement Instagram share with compatible file-system dependency
        Alert.alert(
            'Coming Soon',
            'Instagram sharing will be available soon. For now, you can take a screenshot of the flyer.'
        );
    }, []);

    useEffect(() => {
        loadProjectData();
    }, [loadProjectData]);

    useEffect(() => {
        if (project && idea) {
            loadFlyer();
        }
    }, [project, idea, loadFlyer]);

    useEffect(() => {
        if (project && idea && !flyer && !isGenerating && !isLoading) {
            generateFlyer();
        }
    }, [project, idea, flyer, isGenerating, isLoading, generateFlyer]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

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
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    if (!project || !idea) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
                <LinearGradient
                    colors={['#E0D9E8', '#F2C5D6', '#F6D3B5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.gradient}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Project or idea not found</Text>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    const remainingEdits = flyer ? MAX_EDITS - flyer.edit_count : MAX_EDITS;
    const isEditDisabled =
        !flyer ||
        flyer.edit_count >= MAX_EDITS ||
        isEditing ||
        isGenerating ||
        flyer.status === 'pending' ||
        flyer.status === 'processing';

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
                            router.back();
                        }}>
                        <LiquidGlassView style={styles.iconButton} interactive effect="clear">
                            <Ionicons name="arrow-back" size={24} color="#444" />
                        </LiquidGlassView>
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Flyer</Text>
                    </View>
                    <View style={styles.iconButton} />
                </View>

                {/* Main Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {/* Image Viewer */}
                    <View style={styles.imageViewerContainer}>
                        <FlyerImageViewer
                            imageUrl={flyer?.image_url || null}
                            isLoading={
                                isGenerating ||
                                isEditing ||
                                flyer?.status === 'pending' ||
                                flyer?.status === 'processing'
                            }
                            editCount={flyer?.edit_count}
                            maxEdits={MAX_EDITS}
                        />
                        {/* Status message */}
                        {flyer && (flyer.status === 'pending' || flyer.status === 'processing') && (
                            <View style={styles.statusOverlay}>
                                <Text style={styles.statusText}>
                                    {flyer.status === 'pending' ? 'Starting...' : 'Generating flyer...'}
                                </Text>
                            </View>
                        )}
                        {flyer && flyer.status === 'failed' && (
                            <View style={styles.errorOverlay}>
                                <Text style={styles.errorOverlayText}>
                                    {flyer.error_message || 'Generation failed. Please try again.'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    {flyer && flyer.image_url && (
                        <Animated.View
                            entering={FadeInDown.delay(100).duration(400).springify()}
                            style={styles.actionButtonsContainer}>
                            <Pressable
                                style={styles.actionButton}
                                onPress={saveFlyer}>
                                <LiquidGlassView style={styles.actionButtonInner} interactive effect="clear">
                                    <Ionicons name="download-outline" size={20} color="#000" />
                                    <Text style={styles.actionButtonText}>Save</Text>
                                </LiquidGlassView>
                            </Pressable>
                            <Pressable
                                style={styles.actionButton}
                                onPress={shareToInstagram}>
                                <LiquidGlassView style={styles.actionButtonInner} interactive effect="clear">
                                    <Ionicons name="logo-instagram" size={20} color="#000" />
                                    <Text style={styles.actionButtonText}>Share</Text>
                                </LiquidGlassView>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* Chat Input for Editing */}
                    {flyer && (
                        <Animated.View
                            entering={FadeInDown.delay(200).duration(400).springify()}
                            style={styles.chatInputContainer}>
                            <FlyerChatInput
                                onSend={editFlyer}
                                disabled={isEditDisabled}
                                remainingEdits={remainingEdits}
                                maxEdits={MAX_EDITS}
                            />
                        </Animated.View>
                    )}
                </ScrollView>
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
        paddingTop: Platform.OS === 'ios' ? 56 : 20,
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
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        fontFamily: defaultFontFamily,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexGrow: 1,
    },
    imageViewerContainer: {
        width: '100%',
        height: 600, // Fixed height for the image viewer
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        borderRadius: 20,
    },
    actionButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        gap: 8,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        fontFamily: defaultFontFamily,
    },
    chatInputContainer: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    statusOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 12,
        borderRadius: 12,
        zIndex: 10,
    },
    statusText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: defaultFontFamily,
        textAlign: 'center',
    },
    errorOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 107, 157, 0.9)',
        padding: 12,
        borderRadius: 12,
        zIndex: 10,
    },
    errorOverlayText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: defaultFontFamily,
        textAlign: 'center',
        fontWeight: '600',
    },
});

