import { LiquidGlassView } from '@callstack/liquid-glass';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { defaultFontFamily } from '@/constants/theme';
import { SocialPlatform } from '@/app/project/[id]/survey-post';

interface PostPreviewProps {
    text: string;
    pollOptions: { text: string }[];
    platform: SocialPlatform;
}

export function PostPreview({ text, pollOptions, platform }: PostPreviewProps) {
    if (platform === 'x') {
        return <XPreview text={text} pollOptions={pollOptions} />;
    } else {
        return <ThreadsPreview text={text} pollOptions={pollOptions} />;
    }
}

function XPreview({ text, pollOptions }: { text: string; pollOptions: { text: string }[] }) {
    // Calculate mock percentages for preview (distributed evenly)
    const totalVotes = 1000;
    const votesPerOption = Math.floor(totalVotes / pollOptions.length);
    const percentages = pollOptions.map((_, index) => {
        if (index === pollOptions.length - 1) {
            // Last option gets remainder
            return 100 - (votesPerOption * (pollOptions.length - 1) * 100) / totalVotes;
        }
        return (votesPerOption * 100) / totalVotes;
    });

    return (
        <View style={styles.container}>
            <LiquidGlassView style={styles.card} interactive effect="clear">
                <View style={styles.content}>
                    <Text style={styles.title}>Preview</Text>
                    <View style={styles.xPreview}>
                        {/* X/Twitter-like header */}
                        <View style={styles.xHeader}>
                            <View style={styles.xAvatar} />
                            <View style={styles.xHeaderInfo}>
                                <Text style={styles.xName}>Your Name</Text>
                                <Text style={styles.xHandle}>@yourhandle</Text>
                            </View>
                            <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                        </View>
                        {/* X/Twitter-like content */}
                        <View style={styles.xContent}>
                            <Text style={styles.xText}>{text}</Text>
                        </View>
                        {/* Poll Options */}
                        <View style={styles.pollContainer}>
                            {pollOptions.map((option, index) => (
                                <Pressable key={index} style={styles.pollOption}>
                                    <View style={styles.pollOptionContent}>
                                        <View style={styles.pollBarContainer}>
                                            <View
                                                style={[
                                                    styles.pollBar,
                                                    { width: `${percentages[index]}%` },
                                                    index === 0 && styles.pollBarFirst,
                                                ]}
                                            />
                                        </View>
                                        <View style={styles.pollOptionTextContainer}>
                                            <Text style={styles.pollOptionText}>{option.text || `Option ${index + 1}`}</Text>
                                            <Text style={styles.pollPercentage}>
                                                {percentages[index].toFixed(1)}%
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                            <Text style={styles.pollVotes}>{totalVotes.toLocaleString()} votes</Text>
                        </View>
                        {/* X/Twitter-like footer */}
                        <View style={styles.xFooter}>
                            <View style={styles.xFooterItem}>
                                <Ionicons name="chatbubble-outline" size={16} color="#666" />
                                <Text style={styles.xFooterText}>0</Text>
                            </View>
                            <View style={styles.xFooterItem}>
                                <Ionicons name="repeat-outline" size={16} color="#666" />
                                <Text style={styles.xFooterText}>0</Text>
                            </View>
                            <View style={styles.xFooterItem}>
                                <Ionicons name="heart-outline" size={16} color="#666" />
                                <Text style={styles.xFooterText}>0</Text>
                            </View>
                            <View style={styles.xFooterItem}>
                                <Ionicons name="share-outline" size={16} color="#666" />
                            </View>
                        </View>
                    </View>
                </View>
            </LiquidGlassView>
        </View>
    );
}

function ThreadsPreview({ text, pollOptions }: { text: string; pollOptions: { text: string }[] }) {
    // Calculate mock percentages for preview
    const totalVotes = 500;
    const votesPerOption = Math.floor(totalVotes / pollOptions.length);
    const percentages = pollOptions.map((_, index) => {
        if (index === pollOptions.length - 1) {
            return 100 - (votesPerOption * (pollOptions.length - 1) * 100) / totalVotes;
        }
        return (votesPerOption * 100) / totalVotes;
    });
    return (
        <View style={styles.container}>
            <LiquidGlassView style={styles.card} interactive effect="clear">
                <View style={styles.content}>
                    <Text style={styles.title}>Preview</Text>
                    <View style={styles.threadsPreview}>
                        {/* Threads-like header */}
                        <View style={styles.threadsHeader}>
                            <View style={styles.threadsAvatar} />
                            <View style={styles.threadsHeaderInfo}>
                                <Text style={styles.threadsName}>yourhandle</Text>
                                <Text style={styles.threadsTime}>now</Text>
                            </View>
                            <Ionicons name="logo-instagram" size={20} color="#000" />
                        </View>
                        {/* Threads-like content */}
                        <View style={styles.threadsContent}>
                            <Text style={styles.threadsText}>{text}</Text>
                        </View>
                        {/* Poll Options */}
                        <View style={styles.pollContainer}>
                            {pollOptions.map((option, index) => (
                                <Pressable key={index} style={styles.pollOption}>
                                    <View style={styles.pollOptionContent}>
                                        <View style={styles.pollBarContainer}>
                                            <View
                                                style={[
                                                    styles.pollBar,
                                                    { width: `${percentages[index]}%` },
                                                    index === 0 && styles.pollBarFirst,
                                                ]}
                                            />
                                        </View>
                                        <View style={styles.pollOptionTextContainer}>
                                            <Text style={styles.pollOptionText}>{option.text || `Option ${index + 1}`}</Text>
                                            <Text style={styles.pollPercentage}>
                                                {percentages[index].toFixed(1)}%
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                            <Text style={styles.pollVotes}>{totalVotes.toLocaleString()} votes</Text>
                        </View>
                        {/* Threads-like footer */}
                        <View style={styles.threadsFooter}>
                            <Ionicons name="heart-outline" size={24} color="#000" />
                            <Ionicons name="chatbubble-outline" size={24} color="#000" />
                            <Ionicons name="repeat-outline" size={24} color="#000" />
                            <Ionicons name="send-outline" size={24} color="#000" />
                        </View>
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
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        fontFamily: defaultFontFamily,
    },
    // X/Twitter styles
    xPreview: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E1E8ED',
    },
    xHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    xAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1DA1F2',
        marginRight: 12,
    },
    xHeaderInfo: {
        flex: 1,
    },
    xName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#14171A',
        fontFamily: defaultFontFamily,
    },
    xHandle: {
        fontSize: 15,
        color: '#657786',
        fontFamily: defaultFontFamily,
    },
    xContent: {
        marginBottom: 12,
    },
    xText: {
        fontSize: 15,
        color: '#14171A',
        lineHeight: 20,
        fontFamily: defaultFontFamily,
    },
    xFooter: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E1E8ED',
    },
    xFooterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    xFooterText: {
        fontSize: 13,
        color: '#657786',
        fontFamily: defaultFontFamily,
    },
    // Threads styles
    threadsPreview: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E1E8ED',
    },
    threadsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    threadsAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#000',
        marginRight: 12,
    },
    threadsHeaderInfo: {
        flex: 1,
    },
    threadsName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        fontFamily: defaultFontFamily,
    },
    threadsTime: {
        fontSize: 12,
        color: '#666',
        fontFamily: defaultFontFamily,
    },
    threadsContent: {
        marginBottom: 12,
    },
    threadsText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
        fontFamily: defaultFontFamily,
    },
    threadsFooter: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E1E8ED',
    },
    // Poll styles
    pollContainer: {
        marginTop: 12,
        marginBottom: 12,
    },
    pollOption: {
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E1E8ED',
    },
    pollOptionContent: {
        position: 'relative',
        minHeight: 48,
        justifyContent: 'center',
    },
    pollBarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F7F9FA',
    },
    pollBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: '#1DA1F2',
        opacity: 0.2,
    },
    pollBarFirst: {
        backgroundColor: '#1DA1F2',
    },
    pollOptionTextContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        zIndex: 1,
    },
    pollOptionText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#14171A',
        flex: 1,
        fontFamily: defaultFontFamily,
    },
    pollPercentage: {
        fontSize: 15,
        fontWeight: '700',
        color: '#14171A',
        marginLeft: 12,
        fontFamily: defaultFontFamily,
    },
    pollVotes: {
        fontSize: 13,
        color: '#657786',
        marginTop: 8,
        fontFamily: defaultFontFamily,
    },
});

