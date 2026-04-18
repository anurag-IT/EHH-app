import React, { useEffect, useState, useRef, memo } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Alert,
  DeviceEventEmitter
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { globalStyles, colors } from "../theme";
import api, { getOptimizedImageUrl } from "../api";
import { Image } from "expo-image";
import { 
  Heart, 
  MessageCircle, 
  Flag, 
  Repeat2, 
  MoreHorizontal, 
  MapPin, 
  Zap,
  CheckCircle2
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function FeedScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchPosts = async (cursor?: number) => {
    try {
      if (cursor) setLoadingMore(true);
      
      const res = await api.get(`/api/posts${cursor ? `?cursor=${cursor}` : ""}`);
      const newPosts = res.data.posts;
      
      setPosts(prev => cursor ? [...prev, ...newPosts] : newPosts);
      setNextCursor(res.data.nextCursor);
    } catch (e) {
      console.error("[FEED ERROR]", e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // REQUIREMENT: Instant UI Update
    const uploadListener = DeviceEventEmitter.addListener("NEW_POST", (newPost) => {
      console.log("[FEED] Instant post received, injecting into state...");
      setPosts(prev => [newPost, ...prev]);
      scrollToTop();
    });

    return () => uploadListener.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchPosts(nextCursor);
    }
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderPost = ({ item }: { item: any }) => (
    <PostItem item={item} />
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
      }}>
        <TouchableOpacity onPress={scrollToTop}>
          <Text style={[globalStyles.title, { marginBottom: 0, fontSize: 22, color: colors.primary }]}>EHH</Text>
          <Text style={[globalStyles.subtitle, { fontSize: 8, color: colors.textMuted }]}>NETWORK FEED</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 10, backgroundColor: colors.slate50, borderRadius: 16 }}>
          <Zap size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        windowSize={10}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}

const PostItem = memo(({ item }: { item: any }) => {
  const [liked, setLiked] = useState(item.isLiked);
  const [likesCount, setLikesCount] = useState(item.likesCount);
  const [reposted, setReposted] = useState(false); // Local only for now
  const [repostsCount, setRepostsCount] = useState(item.repostsCount);
  const [lastTap, setLastTap] = useState(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Track if we're currently syncing with server to prevent double-processing
  const isSyncing = useRef(false);

  const triggerHeartAnimation = () => {
    // RESET animation values immediately if they were running
    heartScale.setValue(0.5);
    opacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(heartScale, { toValue: 1.2, useNativeDriver: true, friction: 3 }),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true })
      ]),
      Animated.delay(100), // Short pause
      Animated.parallel([
        Animated.spring(heartScale, { toValue: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true })
      ])
    ]).start();
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      // REQUIREMENT: Always trigger heart animation
      triggerHeartAnimation();
      
      // REQUIREMENT: Only toggle if NOT liked (Double tap never unlikes)
      if (!liked) {
        toggleLike();
      }
    } else {
      setLastTap(now);
    }
  };

  const toggleLike = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    // OPTIMISTIC UI
    const previousLiked = liked;
    const previousCount = likesCount;
    
    const newLiked = !previousLiked;
    const newCount = newLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    setLiked(newLiked);
    setLikesCount(newCount);

    // API CALL
    try {
      const res = await api.post(`/api/posts/${item.id}/like`);
      // SYNC WITH SERVER REALITY
      if (res.data.success) {
        setLiked(res.data.liked);
        if (typeof res.data.likesCount === 'number') {
          setLikesCount(res.data.likesCount);
        }
      }
    } catch (e) {
      console.error("[LIKE API ERROR]", e);
      // ROLLBACK on error
      setLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      // Debounce period to prevent spamming
      setTimeout(() => {
        isSyncing.current = false;
      }, 300);
    }
  };

  const toggleRepost = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    // FULL OPTIMISTIC UI FOR REPOST
    const previousReposted = reposted;
    const previousCount = repostsCount;

    setReposted(true);
    setRepostsCount(previousCount + 1);

    try {
      const userId = await AsyncStorage.getItem("userId");
      await api.post("/api/posts", { 
        parentId: item.id,
        userId: userId,
        caption: `Reposted: ${item.caption || ""}`
      });
      // Success - keep optimistic state
    } catch (e: any) {
      console.error("[REPOST API ERROR]", e);
      // ROLLBACK on error or timeout
      setReposted(previousReposted);
      setRepostsCount(previousCount);
      Alert.alert("Repost Failed", e.code === 'ECONNABORTED' ? "Network timeout. Try again." : "Could not complete repost.");
    } finally {
      // Release lock after a debounce period
      setTimeout(() => {
        isSyncing.current = false;
      }, 300);
    }
  };

  return (
    <View style={[globalStyles.card, { padding: 0, overflow: "hidden", marginBottom: 20, borderRadius: 32, backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: item.user.avatar }} style={{ width: 42, height: 42, borderRadius: 18, borderWidth: 2, borderColor: colors.border }} />
            <View style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, backgroundColor: colors.accent, borderRadius: 7, borderWidth: 2, borderColor: colors.white }} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>{item.user.name}</Text>
              <CheckCircle2 size={12} color={colors.accent} />
            </View>
            {item.location && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <MapPin size={10} color={colors.textMuted} />
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "600" }}>{item.location}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={{ padding: 8 }}>
          <MoreHorizontal color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      {/* Main Image with Double Tap */}
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={{ width: "100%", aspectRatio: 4/5, backgroundColor: colors.slate100, position: "relative" }}>
          <Image 
            source={{ uri: getOptimizedImageUrl(item.imageUrl) }} 
            style={{ width: "100%", height: "100%" }} 
            contentFit="cover"
            transition={500}
            priority="high"
          />
          
          {/* Animated Heart Overlay */}
          <Animated.View style={{ 
            position: "absolute", 
            top: 0, left: 0, right: 0, bottom: 0, 
            justifyContent: "center", 
            alignItems: "center",
            opacity: opacity,
            transform: [{ scale: heartScale }]
          }}>
            <Heart size={100} color={colors.white} fill={colors.accent} style={{ shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }} />
          </Animated.View>

          {item.parentId && (
            <View style={{ position: "absolute", top: 16, left: 16, backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5 }}>
              <Repeat2 size={12} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 10, letterSpacing: 0.5 }}>IDENTIFIED ASSET</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Footer / Actions */}
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity onPress={() => toggleLike()} hitSlop={10}>
                <Heart size={26} color={liked ? "#EF4444" : colors.text} fill={liked ? "#EF4444" : "transparent"} />
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{likesCount}</Text>
            </View>

            <TouchableOpacity hitSlop={10}>
              <MessageCircle size={26} color={colors.text} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity onPress={toggleRepost} hitSlop={10}>
                <Repeat2 size={26} color={reposted ? colors.primary : colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{repostsCount}</Text>
            </View>
          </View>
          <TouchableOpacity hitSlop={10}>
            <Flag size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
          <Text style={{ fontWeight: "900" }}>{item.user.name} </Text>
          {item.caption}
        </Text>
        
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "700" }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "600", fontStyle: 'italic' }}>
            ID: {item.id}
          </Text>
        </View>
      </View>
    </View>
  );
});
