import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  Dimensions,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { globalStyles, colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { Image } from "expo-image";
import { 
  LogOut, 
  CheckCircle2, 
  Fingerprint, 
  ChevronRight,
  Bell,
  Lock,
  Globe,
  Activity,
  Plus,
  Settings,
  Grid,
  ShieldAlert
} from "lucide-react-native";
import api, { getOptimizedImageUrl } from "../api";
import { useNavigation, useIsFocused } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      const [statsRes, postsRes] = await Promise.all([
        api.get(`/api/users/${user?.id}/stats`),
        api.get(`/api/posts?userId=${user?.id}`)
      ]);
      setStats(statsRes.data);
      setPosts(postsRes.data.posts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchProfileData();
  }, [isFocused]);

  const renderOption = (icon: any, label: string, sub: string, danger = false) => (
    <TouchableOpacity 
      style={styles.optionBtn}
      activeOpacity={0.7}
      onPress={() => {
        if (label === "Logout") logout();
        if (label === "Admin Panel") navigation.navigate("Admin");
      }}
    >
      <View style={[styles.optionIcon, { backgroundColor: danger ? "rgba(239, 68, 68, 0.05)" : colors.slate50 }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 16, fontWeight: "900" }}>{label}</Text>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
      <ChevronRight color={colors.border} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.profileHeader}>
         <Text style={styles.headerId}>{user?.uniqueId}</Text>
         <View style={{ flexDirection: 'row', gap: 15 }}>
            <Plus color={colors.text} size={26} />
            <Settings color={colors.text} size={26} />
         </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 20 }}>
          
          {/* Main Info */}
          <View style={styles.topSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <Image 
                  source={{ uri: user?.avatar }} 
                  style={styles.avatar} 
                />
              </View>
              <View style={styles.plusBadge}>
                <CheckCircle2 color="white" size={14} strokeWidth={3} />
              </View>
            </View>
            
            <View style={styles.statsRow}>
               <View style={styles.statContainer}>
                  <Text style={styles.statVal}>{stats.postsCount}</Text>
                  <Text style={styles.statLab}>POSTS</Text>
               </View>
               <View style={styles.statContainer}>
                  <Text style={styles.statVal}>{stats.followersCount}</Text>
                  <Text style={styles.statLab}>INDEXED</Text>
               </View>
               <View style={styles.statContainer}>
                  <Text style={styles.statVal}>{stats.followingCount}</Text>
                  <Text style={styles.statLab}>TRACKING</Text>
               </View>
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userBio}>Biological entity verified. Initializing global social cross-reference.</Text>
            
            <TouchableOpacity style={styles.editBtn}>
               <Text style={styles.editBtnText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          </View>

          {/* Highlights */}
          <View style={styles.highlights}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingLeft: 20 }}>
                {["Story", "Memories", "Index", "Logs"].map((h, i) => (
                  <View key={i} style={styles.highlightItem}>
                    <View style={styles.highlightCircle}>
                       <View style={styles.highlightInner} />
                    </View>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
                <View style={styles.highlightItem}>
                  <View style={[styles.highlightCircle, { borderStyle: 'dashed' }]}>
                     <Plus color={colors.textMuted} size={20} />
                  </View>
                  <Text style={styles.highlightText}>New</Text>
                </View>
             </ScrollView>
          </View>

          {/* Post Grid Section */}
          <View style={styles.gridTabs}>
             <View style={styles.activeTab}>
                <Grid color={colors.primary} size={24} />
             </View>
          </View>

          {loading ? (
             <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
             <View style={styles.grid}>
                {posts.map((post, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.gridItem}
                    onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
                  >
                     <Image 
                       source={{ uri: getOptimizedImageUrl(post.imageUrl || (post.imageUrls && post.imageUrls[0]), 300) }} 
                       style={styles.gridImage} 
                       contentFit="cover"
                     />
                  </TouchableOpacity>
                ))}
                {posts.length === 0 && (
                   <View style={styles.emptyGrid}>
                      <Text style={styles.emptyText}>NO ASSETS IDENTIFIED</Text>
                   </View>
                )}
             </View>
          )}

          {/* Menu Sections (Settings) */}
          <View style={{ padding: 20, marginTop: 20 }}>
            <Text style={styles.sectionTitle}>System Settings</Text>
            {user?.role === "ADMIN" && renderOption(<ShieldAlert color={colors.primary} size={20} />, "Admin Panel", "Central command access")}
            {renderOption(<Lock color={colors.text} size={20} />, "Access Keys", "Manage network credentials")}
            {renderOption(<Bell color={colors.text} size={20} />, "Monitoring", "Global activity notifications")}
            {renderOption(<LogOut color={colors.danger} size={20} />, "Logout", "Securely disconnect session", true)}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  headerId: { fontWeight: '900', fontSize: 18, color: colors.text, letterSpacing: 1 },
  topSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  avatarContainer: { position: 'relative' },
  avatarBorder: { padding: 3, borderRadius: 50, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 86, height: 86, borderRadius: 43 },
  plusBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, padding: 6, borderRadius: 15, borderWidth: 3, borderColor: 'white' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: 10 },
  statContainer: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLab: { fontSize: 9, fontWeight: '700', color: colors.textMuted, marginTop: 2, letterSpacing: 1 },
  bioSection: { paddingHorizontal: 20, marginBottom: 30 },
  userName: { fontWeight: '900', fontSize: 15, color: colors.text },
  userBio: { fontSize: 13, color: colors.text, marginTop: 5, lineHeight: 18, fontWeight: '500' },
  editBtn: { backgroundColor: colors.slate50, paddingVertical: 10, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  editBtnText: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  highlights: { marginBottom: 30 },
  highlightItem: { alignItems: 'center', gap: 6 },
  highlightCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 3 },
  highlightInner: { flex: 1, width: '100%', borderRadius: 30, backgroundColor: colors.slate50 },
  highlightText: { fontSize: 10, fontWeight: '700', color: colors.text },
  gridTabs: { height: 50, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  activeTab: { width: 40, borderTopWidth: 2, borderTopColor: colors.primary, height: '100%', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: width / 3, height: width / 3, borderWidth: 1, borderColor: 'white' },
  gridImage: { width: '100%', height: '100%' },
  emptyGrid: { width: '100%', padding: 60, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.textMuted, marginBottom: 15, marginLeft: 5, letterSpacing: 1 },
  optionBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 16, 
    backgroundColor: 'white', 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10
  },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 15 },
  optionSub: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }
});
