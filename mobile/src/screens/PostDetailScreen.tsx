import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet
} from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, MessageCircle, Heart, Send, MoreVertical, ShieldCheck } from "lucide-react-native";
import { colors, globalStyles } from "../theme";
import api, { getOptimizedImageUrl } from "../api";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function PostDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { postId } = route.params;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPostData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/api/posts/${postId}`),
        api.get(`/api/posts/${postId}/comments`)
      ]);
      setPost(pRes.data);
      setComments(cRes.data);
    } catch (e) {
      console.error(e);
      Alert.alert("Link Failure", "Resource corrupted or missing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostData();
  }, [postId]);

  const postComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/api/posts/${postId}/comment`, { text: commentText });
      setComments([...comments, res.data]);
      setCommentText("");
    } catch (e) {
      Alert.alert("Sync Failure", "Unable to broadcast comment.");
    }
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OBJECT DETAIL</Text>
        <TouchableOpacity>
           <MoreVertical color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
         {/* Post content - simplified for detail */}
         <Image 
           source={{ uri: getOptimizedImageUrl(post.imageUrl || (post.imageUrls && post.imageUrls[0]), 800) }} 
           style={styles.mainImage} 
         />
         
         <View style={{ padding: 20 }}>
            <View style={styles.authorRow}>
               <Image source={{ uri: post.user.avatar }} style={styles.authorAvatar} />
               <View>
                 <Text style={styles.authorName}>{post.user.name}</Text>
                 <Text style={styles.location}>{post.location || "Global Buffer"}</Text>
               </View>
            </View>

            <Text style={styles.caption}>{post.caption}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.commentTitle}>COMMS LOGS ({comments.length})</Text>
            {comments.map((c, i) => (
              <View key={i} style={styles.commentBox}>
                 <Image source={{ uri: c.user.avatar }} style={styles.commentAvatar} />
                 <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.commentUser}>{c.user.name}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                 </View>
              </View>
            ))}
         </View>
      </ScrollView>

      <View style={styles.inputBar}>
         <TextInput 
           style={styles.input} 
           placeholder="Index comment..." 
           placeholderTextColor={colors.textMuted}
           value={commentText}
           onChangeText={setCommentText}
         />
         <TouchableOpacity onPress={postComment}>
            <Send color={colors.primary} size={24} />
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontWeight: '900', fontSize: 12, letterSpacing: 2, color: colors.textMuted },
  mainImage: { width: '100%', aspectRatio: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  authorName: { fontWeight: '900', color: colors.text },
  location: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  caption: { fontSize: 14, color: colors.text, lineHeight: 22, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  commentTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 1, marginBottom: 15 },
  commentBox: { flexDirection: 'row', marginBottom: 16 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentUser: { fontWeight: '900', fontSize: 12, color: colors.text },
  commentText: { fontSize: 13, color: colors.text, marginTop: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'white' },
  input: { flex: 1, height: 44, backgroundColor: colors.slate50, borderRadius: 15, paddingHorizontal: 15, marginRight: 12, fontWeight: '600' }
});
