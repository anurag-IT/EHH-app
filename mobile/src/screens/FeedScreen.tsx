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
  DeviceEventEmitter,
  Modal,
  StyleSheet
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
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react-native";

const { width } = Dimensions.get("window");

/**
 * Reusable Mobile Image Grid (Facebook Style)
 */
const MobileImageGrid = ({ imageUrls, onImagePress }: { imageUrls: string[], onImagePress: (index: number) => void }) => {
  const count = imageUrls.length;

  if (count === 1) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(0)} style={{ width: '100%', aspectRatio: 1 }}>
        <Image source={{ uri: getOptimizedImageUrl(imageUrls[0]) }} style={styles.gridImage} contentFit="cover" />
      </TouchableOpacity>
    );
  }

  if (count === 2) {
    return (
      <View style={{ flexDirection: 'row', width: '100%', aspectRatio: 1, gap: 2 }}>
        {imageUrls.map((url, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onImagePress(i)} style={{ flex: 1 }}>
            <Image source={{ uri: getOptimizedImageUrl(url) }} style={styles.gridImage} contentFit="cover" />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (count === 3) {
    return (
      <View style={{ flexDirection: 'row', width: '100%', aspectRatio: 1, gap: 2 }}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(0)} style={{ flex: 1 }}>
          <Image source={{ uri: getOptimizedImageUrl(imageUrls[0]) }} style={styles.gridImage} contentFit="cover" />
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 2 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(1)} style={{ flex: 1 }}>
            <Image source={{ uri: getOptimizedImageUrl(imageUrls[1]) }} style={styles.gridImage} contentFit="cover" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(2)} style={{ flex: 1 }}>
            <Image source={{ uri: getOptimizedImageUrl(imageUrls[2]) }} style={styles.gridImage} contentFit="cover" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (count === 4) {
    return (
      <View style={{ width: '100%', aspectRatio: 1, gap: 2 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
           <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(0)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[0]) }} style={styles.gridImage} /></TouchableOpacity>
           <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(1)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[1]) }} style={styles.gridImage} /></TouchableOpacity>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
           <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(2)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[2]) }} style={styles.gridImage} /></TouchableOpacity>
           <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(3)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[3]) }} style={styles.gridImage} /></TouchableOpacity>
        </View>
      </View>
    );
  }

  // 5+ grid (2 on top, 3 on bottom)
  return (
    <View style={{ width: '100%', aspectRatio: 1, gap: 2 }}>
       <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(0)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[0]) }} style={styles.gridImage} /></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(1)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[1]) }} style={styles.gridImage} /></TouchableOpacity>
       </View>
       <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(2)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[2]) }} style={styles.gridImage} /></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(3)} style={{ flex: 1 }}><Image source={{ uri: getOptimizedImageUrl(imageUrls[3]) }} style={styles.gridImage} /></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(4)} style={{ flex: 1, position: 'relative' }}>
             <Image source={{ uri: getOptimizedImageUrl(imageUrls[4]) }} style={styles.gridImage} />
             {count > 5 && (
               <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 20 }}>+{count - 5}</Text>
               </View>
             )}
          </TouchableOpacity>
       </View>
    </View>
  );
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [viewerIndex, setViewerIndex] = useState<{ post: any, index: number } | null>(null);

  const fetchPosts = async (cursor?: number) => {
    try {
      const res = await api.get(`/api/posts${cursor ? `?cursor=${cursor}` : ""}`);
      setPosts(prev => cursor ? [...prev, ...res.data.posts] : res.data.posts);
      setNextCursor(res.data.nextCursor);
    } catch (e) {
      console.error("[FEED ERROR]", e);
    }
  };

  useEffect(() => {
    fetchPosts();
    const uploadListener = DeviceEventEmitter.addListener("NEW_POST", (newPost) => {
      setPosts(prev => [newPost, ...prev]);
    });
    return () => uploadListener.remove();
  }, []);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <PostItem item={item} onOpenViewer={(idx) => setViewerIndex({ post: item, index: idx })} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />}
        onEndReached={() => nextCursor && fetchPosts(nextCursor)}
        contentContainerStyle={{ padding: 16 }}
      />

      {/* Full Screen Viewer Modal */}
      <Modal visible={!!viewerIndex} transparent animationType="fade">
         {viewerIndex && (
           <View style={{ flex: 1, backgroundColor: 'black' }}>
              <TouchableOpacity onPress={() => setViewerIndex(null)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}>
                 <X color="white" size={32} />
              </TouchableOpacity>
              
              <View style={{ flex: 1, justifyContent: 'center' }}>
                 <Image 
                   source={{ uri: viewerIndex.post.imageUrls[viewerIndex.index] }} 
                   style={{ width: '100%', height: '80%' }} 
                   contentFit="contain" 
                 />

                 {viewerIndex.post.imageUrls.length > 1 && (
                   <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                      <TouchableOpacity 
                        onPress={() => setViewerIndex({ ...viewerIndex, index: Math.max(0, viewerIndex.index - 1) })}
                        disabled={viewerIndex.index === 0}
                      >
                         <ChevronLeft color="white" size={40} opacity={viewerIndex.index === 0 ? 0.3 : 1} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setViewerIndex({ ...viewerIndex, index: Math.min(viewerIndex.post.imageUrls.length - 1, viewerIndex.index + 1) })}
                        disabled={viewerIndex.index === viewerIndex.post.imageUrls.length - 1}
                      >
                         <ChevronRight color="white" size={40} opacity={viewerIndex.index === viewerIndex.post.imageUrls.length - 1 ? 0.3 : 1} />
                      </TouchableOpacity>
                   </View>
                 )}
              </View>
           </View>
         )}
      </Modal>
    </SafeAreaView>
  );
}

const PostItem = memo(({ item, onOpenViewer }: { item: any, onOpenViewer: (idx: number) => void }) => {
  const [liked, setLiked] = useState(item.isLiked);
  const [likesCount, setLikesCount] = useState(item.likesCount);

  const toggleLike = async () => {
    const prevLiked = liked;
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    try {
      await api.post(`/api/posts/${item.id}/like`);
    } catch {
      setLiked(prevLiked);
    }
  };

  const imagesArr = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl];

  return (
    <View style={[globalStyles.card, { padding: 0, overflow: "hidden", marginBottom: 20, borderRadius: 24, backgroundColor: colors.surface }]}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <Image source={{ uri: item.user.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
        <View style={{ marginLeft: 12 }}>
          <Text style={{ fontWeight: "900", color: colors.text }}>{item.user.name}</Text>
          {item.location && <Text style={{ fontSize: 10, color: colors.textMuted }}>{item.location}</Text>}
        </View>
      </View>

      {/* Grid Content */}
      <MobileImageGrid imageUrls={imagesArr} onImagePress={onOpenViewer} />

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
          <TouchableOpacity onPress={toggleLike}><Heart size={26} color={liked ? "#EF4444" : colors.text} fill={liked ? "#EF4444" : "transparent"} /></TouchableOpacity>
          <TouchableOpacity><MessageCircle size={26} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity><Repeat2 size={26} color={colors.text} /></TouchableOpacity>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: 8 }}>{likesCount} Interactions</Text>
        <Text style={{ color: colors.text }}>
          <Text style={{ fontWeight: "900" }}>{item.user.name} </Text>
          {item.caption}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  gridImage: {
    width: '100%',
    height: '100%'
  }
});
