import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList
} from "react-native";
import { Image } from "expo-image";
import { 
  ChevronLeft, 
  MoreHorizontal, 
  MapPin, 
  Globe, 
  Lock, 
  Grid, 
  Tag, 
  CheckCircle2,
  MessageCircle,
  Share2
} from "lucide-react-native";
import { colors, globalStyles } from "../theme";
import api, { getOptimizedImageUrl } from "../api";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const [profRes, postsRes] = await Promise.all([
        api.get(`/api/users/${userId}/profile`),
        api.get(`/api/posts?userId=${userId}`)
      ]);
      setProfile(profRes.data);
      setPosts(postsRes.data.posts);
    } catch (e) {
      console.error(e);
      Alert.alert("Link Failure", "Target profile inaccessible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleFollow = async () => {
    setFollowLoading(true);
    const prevState = profile.followStatus;
    const isPrivate = profile.isPrivate;
    
    // Optimistic UI
    let nextStatus = "NONE";
    if (prevState === "NONE") nextStatus = isPrivate ? "PENDING" : "ACCEPTED";
    else nextStatus = "NONE";

    setProfile({ ...profile, followStatus: nextStatus });

    try {
      await api.post(`/api/users/${userId}/follow`);
    } catch (e) {
      setProfile({ ...profile, followStatus: prevState });
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const isFollowing = profile.followStatus === "ACCEPTED";
  const isPrivate = profile.isPrivate && !isFollowing && profile.id !== currentUser?.id;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <TouchableOpacity>
          <MoreHorizontal color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
           <View style={styles.avatarRow}>
              <View style={styles.avatarContainer}>
                 <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                 {profile.followStatus === "ACCEPTED" && (
                    <View style={styles.verifiedBadge}>
                       <CheckCircle2 color="white" size={12} strokeWidth={3} />
                    </View>
                 )}
              </View>
              
              <View style={styles.statsRow}>
                 <View style={styles.statItem}>
                   <Text style={styles.statNum}>{profile.postsCount}</Text>
                   <Text style={styles.statLabel}>POSTS</Text>
                 </View>
                 <View style={styles.statItem}>
                   <Text style={styles.statNum}>{profile.followersCount}</Text>
                   <Text style={styles.statLabel}>INDEXED</Text>
                 </View>
                 <View style={styles.statItem}>
                   <Text style={styles.statNum}>{profile.followingCount}</Text>
                   <Text style={styles.statLabel}>TRACKING</Text>
                 </View>
              </View>
           </View>

           <View style={styles.bioSection}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.uniqueId}>IDENTIFIER: {profile.uniqueId}</Text>
              <Text style={styles.bio}>{profile.bio || "No system profile bio provided."}</Text>
           </View>

           {/* Actions */}
           <View style={styles.actionRow}>
              {profile.id !== currentUser?.id && (
                <>
                  <TouchableOpacity 
                    onPress={handleFollow}
                    disabled={followLoading}
                    style={[
                      styles.actionBtn, 
                      { flex: 2, backgroundColor: isFollowing ? colors.slate50 : colors.primary }
                    ]}
                  >
                    <Text style={[styles.actionBtnText, { color: isFollowing ? colors.text : 'white' }]}>
                       {profile.followStatus === "ACCEPTED" ? "FOLLOWING" : 
                        profile.followStatus === "PENDING" ? "REQUESTED" : "FOLLOW"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate("Chat", { otherUser: profile })}
                    style={[styles.actionBtn, { flex: 2, backgroundColor: colors.slate50 }]}
                  >
                    <Text style={styles.actionBtnText}>MESSAGE</Text>
                  </TouchableOpacity>
                </>
              )}
              {profile.id === currentUser?.id && (
                <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.slate50 }]}>
                   <Text style={styles.actionBtnText}>EDIT PROFILE</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, { flex: 0.5, backgroundColor: colors.slate50 }]}>
                 <Share2 size={18} color={colors.text} />
              </TouchableOpacity>
           </View>
        </View>

        {/* Visibility Check */}
        {isPrivate ? (
          <View style={styles.privateContainer}>
            <View style={styles.lockCircle}>
               <Lock size={32} color={colors.textMuted} />
            </View>
            <Text style={styles.privateTitle}>PRIVATE PROTOCOL</Text>
            <Text style={styles.privateSub}>Follow this identifier to cross-reference their signal history.</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
             <View style={styles.tabHeader}>
                <View style={styles.activeTabIndicator} />
                <Grid size={22} color={colors.primary} />
             </View>
             
             <View style={styles.grid}>
                {posts.map((post) => (
                  <TouchableOpacity 
                    key={post.id} 
                    style={styles.gridItem}
                    onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
                  >
                    <Image 
                      source={{ uri: getOptimizedImageUrl(post.imageUrl || (post.imageUrls && post.imageUrls[0]), 300) }} 
                      style={styles.gridImage} 
                    />
                  </TouchableOpacity>
                ))}
             </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'white' },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15 },
  profileInfo: { paddingHorizontal: 20, paddingBottom: 24 },
  avatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: colors.border },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 10, padding: 4, borderWidth: 2, borderColor: 'white' },
  statsRow: { flexDirection: "row", flex: 1, marginLeft: 30, justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, marginTop: 4, letterSpacing: 1 },
  bioSection: { marginBottom: 24 },
  name: { fontSize: 22, fontWeight: '900', color: colors.text },
  uniqueId: { fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 4, letterSpacing: 2 },
  bio: { fontSize: 14, color: colors.text, marginTop: 12, lineHeight: 20, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  privateContainer: { padding: 60, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  lockCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.slate50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  privateTitle: { fontSize: 16, fontWeight: '900', color: colors.text, letterSpacing: 2 },
  privateSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  gridContainer: { borderTopWidth: 1, borderTopColor: colors.border },
  tabHeader: { height: 50, alignItems: 'center', justifyContent: 'center' },
  activeTabIndicator: { position: 'absolute', top: 0, width: 40, height: 2, backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: width / 3, height: width / 3, borderWidth: 0.5, borderColor: 'white' },
  gridImage: { width: '100%', height: '100%' }
});
