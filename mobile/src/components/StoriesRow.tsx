import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Dimensions, 
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { Plus, X, Heart, MessageCircle, Send, Eye } from "lucide-react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  cancelAnimation,
  runOnJS
} from "react-native-reanimated";
import api, { getOptimizedImageUrl } from "../api";
import { colors } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

const STORY_DURATION = 5000;

export default function StoriesRow() {
  const [groupedStories, setGroupedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<{ userIndex: number, storyIndex: number } | null>(null);
  const [seenStories, setSeenStories] = useState<Set<number>>(new Set());
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();

  const fetchStories = async () => {
    try {
      const res = await api.get("/api/stories");
      setGroupedStories(res.data);
      
      const seen = await AsyncStorage.getItem("seen_stories");
      if (seen) setSeenStories(new Set(JSON.parse(seen)));
    } catch (e) {
      console.error("[STORIES FETCH ERROR]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const markAsSeen = async (storyId: number) => {
    if (!seenStories.has(storyId)) {
      const newSeen = new Set(seenStories);
      newSeen.add(storyId);
      setSeenStories(newSeen);
      await AsyncStorage.setItem("seen_stories", JSON.stringify(Array.from(newSeen)));
      await api.post(`/api/stories/${storyId}/view`);
    }
  };

  const hasUnseen = (stories: any[]) => {
    return stories.some(s => !seenStories.has(s.id));
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 15 }}>
        
        {/* Post Button */}
        <TouchableOpacity style={styles.storyCircle} onPress={() => navigation.navigate("StoryCreator")}>
           <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
             <Image source={{ uri: currentUser?.avatar }} style={styles.avatar} />
             <View style={styles.plusIcon}>
               <Plus color="white" size={14} strokeWidth={4} />
             </View>
           </View>
           <Text style={styles.username}>Your Story</Text>
        </TouchableOpacity>

        {groupedStories.map((group, idx) => (
          <TouchableOpacity 
            key={group.userId} 
            style={styles.storyCircle} 
            onPress={() => setActiveSegment({ userIndex: idx, storyIndex: 0 })}
          >
            <View style={[
              styles.avatarContainer, 
              { borderColor: hasUnseen(group.stories) ? colors.primary : colors.border }
            ]}>
              <Image source={{ uri: group.user.avatar }} style={styles.avatar} />
            </View>
            <Text style={styles.username} numberOfLines={1}>{group.user.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Story Viewer Modal */}
      <Modal visible={!!activeSegment} transparent animationType="fade">
        {activeSegment && (
          <StoryViewer 
            groups={groupedStories} 
            initialUserIndex={activeSegment.userIndex} 
            initialStoryIndex={activeSegment.storyIndex}
            onClose={() => {
              setActiveSegment(null);
              fetchStories();
            }}
            markAsSeen={markAsSeen}
          />
        )}
      </Modal>
    </View>
  );
}

/**
 * Advanced Story Viewer Component
 */
const StoryViewer = ({ groups, initialUserIndex, initialStoryIndex, onClose, markAsSeen }: any) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const progress = useSharedValue(0);

  const currentUserGroup = groups[userIndex];
  const currentStory = currentUserGroup.stories[storyIndex];

  useEffect(() => {
    if (!isPaused) {
      startAnimation();
    } else {
      cancelAnimation(progress);
    }
  }, [storyIndex, userIndex, isPaused]);

  const startAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: STORY_DURATION,
      easing: Easing.linear
    }, (finished) => {
      if (finished) runOnJS(nextStory)();
    });
    runOnJS(markAsSeen)(currentStory.id);
  };

  const nextStory = () => {
    if (storyIndex < currentUserGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (userIndex < groups.length - 1) {
      setUserIndex(userIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (userIndex > 0) {
      setUserIndex(userIndex - 1);
      setStoryIndex(groups[userIndex - 1].stories.length - 1);
    }
  };

  const handlePress = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      prevStory();
    } else {
      nextStory();
    }
  };

  const sendStoryReply = async () => {
    if (!reply.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/api/stories/${currentStory.id}/reply`, { message: reply });
      setReply("");
      Alert.alert("Transmitted", "Your reply has been encrypted and sent to the owner.");
    } catch (e) {
      Alert.alert("Sync Failure", "Unable to transmit reply.");
    } finally {
      setSendingReply(false);
    }
  };

  const reactToStory = async (emoji: string) => {
    try {
      await api.post(`/api/stories/${currentStory.id}/react`, { emoji });
    } catch (e) {
      console.error(e);
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`
  }));

  return (
    <View style={styles.viewerContainer}>
      <StatusBar hidden />
      
      {/* Background */}
      <View style={[styles.viewerContent, { backgroundColor: currentStory.bgColor || '#000' }]}>
        {currentStory.imageUrl && (
          <Image source={{ uri: currentStory.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
        )}
        
        {/* Metadata Overlays */}
        {currentStory.caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.captionText, { color: currentStory.textColor || 'white' }]}>{currentStory.caption}</Text>
          </View>
        )}

        {/* Stickers */}
        {currentStory.stickers?.map((s: any, i: number) => (
           <View key={i} style={[styles.sticker, { left: s.x || width/2 - 20, top: s.y || height/2 }]}>
             <Text style={{ fontSize: 40 }}>{s.content}</Text>
           </View>
        ))}
      </View>

      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        {currentUserGroup.stories.map((_: any, i: number) => (
          <View key={i} style={styles.progressBarBg}>
            <Animated.View style={[
              styles.progressBarFill, 
              i === storyIndex ? progressStyle : { width: i < storyIndex ? '100%' : '0%' }
            ]} />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.viewerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={{ uri: currentUserGroup.user.avatar }} style={styles.headerAvatar} />
          <Text style={styles.headerName}>{currentUserGroup.user.name}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <X color="white" size={28} />
        </TouchableOpacity>
      </View>

      {/* Touch Interaction Areas */}
      <TouchableWithoutFeedback 
        onPressIn={() => setIsPaused(true)} 
        onPressOut={() => setIsPaused(false)}
        onPress={handlePress}
      >
        <View style={styles.interactionLayer} />
      </TouchableWithoutFeedback>

      {/* Bottom Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.bottomBar}>
        <View style={styles.replyRow}>
          <TextInput 
            style={styles.replyInput} 
            placeholder="Send signal..." 
            placeholderTextColor="white"
            value={reply}
            onChangeText={setReply}
          />
          <TouchableOpacity onPress={sendStoryReply} disabled={sendingReply}>
            {sendingReply ? <ActivityIndicator color="white" /> : <Send color="white" size={24} />}
          </TouchableOpacity>
        </View>
        <View style={styles.reactionRow}>
          {["❤️", "😂", "😮", "😢", "🔥", "👏"].map(e => (
            <TouchableOpacity key={e} onPress={() => reactToStory(e)}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 15, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  storyCircle: { alignItems: "center", width: 75, gap: 6 },
  avatarContainer: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, padding: 3, alignItems: "center", justifyContent: "center" },
  avatar: { width: "100%", height: "100%", borderRadius: 30 },
  plusIcon: { position: "absolute", bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 10, padding: 2, borderWidth: 2, borderColor: colors.surface },
  username: { fontSize: 11, fontWeight: "900", color: colors.text, maxWidth: 65 },

  // Viewer
  viewerContainer: { flex: 1, backgroundColor: 'black' },
  viewerContent: { flex: 1 },
  interactionLayer: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  progressContainer: { 
    position: 'absolute', 
    top: 60, 
    flexDirection: 'row', 
    width: '100%', 
    paddingHorizontal: 10, 
    gap: 5,
    zIndex: 10 
  },
  progressBarBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: 'white' },
  viewerHeader: { 
    position: 'absolute', 
    top: 80, 
    width: '100%', 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    zIndex: 10 
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerName: { color: 'white', fontWeight: '900', fontSize: 14 },
  captionContainer: { position: 'absolute', bottom: 150, width: '100%', alignItems: 'center', paddingHorizontal: 20 },
  captionText: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  sticker: { position: 'absolute' },
  bottomBar: { position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20, zIndex: 10 },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  replyInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.5)', 
    borderRadius: 25, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    color: 'white' 
  },
  reactionRow: { flexDirection: 'row', justifyContent: 'space-between' }
});
