import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  StyleSheet
} from "react-native";
import { globalStyles, colors } from "../theme";
import { Search, Image as ImageIcon, Scan, CheckCircle2, User, Users } from "lucide-react-native";
import { Image } from "expo-image";
import api, { getOptimizedImageUrl } from "../api";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "posts">("people");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2 || query.length === 0) {
        handleSearch();
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, tab]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (tab === "people") {
        // If query is empty, it will return suggested/random users (backend should handle q=a or similar)
        const res = await api.get(`/api/users/search?q=${query || 'a'}`);
        setResults(res.data);
      } else {
        const res = await api.get(`/api/posts/search?q=${query}`);
        setResults(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
    >
      <Image 
        source={{ uri: getOptimizedImageUrl(item.imageUrl || (item.imageUrls && item.imageUrls[0]), 400) }} 
        style={{ width: "100%", height: "100%" }} 
        contentFit="cover"
        transition={300}
      />
    </TouchableOpacity>
  ), []);

  const renderUser = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
    >
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.userAvatar} 
      />
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUniqueId}>{item.uniqueId}</Text>
      </View>
      <TouchableOpacity style={styles.followBtn}>
        <Text style={styles.followBtnText}>View</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <Text style={[globalStyles.title, { marginBottom: 0, color: colors.primary }]}>Network Explorer</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 }}>INDEXING GLOBAL SIGNALS</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={20} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === "people" ? "Identify individuals..." : "Trace signal keywords..."}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {loading && <ActivityIndicator color={colors.primary} size="small" />}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            onPress={() => setTab("people")}
            style={[styles.tab, tab === "people" && styles.activeTab]}
          >
            <Users size={18} color={tab === "people" ? "white" : colors.textMuted} />
            <Text style={[styles.tabText, tab === "people" && styles.activeTabText]}>People</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTab("posts")}
            style={[styles.tab, tab === "posts" && styles.activeTab]}
          >
            <ImageIcon size={18} color={tab === "posts" ? "white" : colors.textMuted} />
            <Text style={[styles.tabText, tab === "posts" && styles.activeTabText]}>Posts</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={results}
          key={tab} // Forces re-render when switching tabs
          numColumns={tab === "posts" ? 2 : 1}
          columnWrapperStyle={tab === "posts" ? { justifyContent: "space-between" } : null}
          keyExtractor={(item) => item.id.toString()}
          renderItem={tab === "posts" ? renderPost : renderUser}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={results.length > 0 ? (
            <Text style={styles.resultsLabel}>{results.length} ENTITIES SCANNING COMPLETE</Text>
          ) : null}
          ListEmptyComponent={!loading ? (
             <View style={styles.emptyContainer}>
                <Scan size={48} color={colors.slate100} />
                <Text style={styles.emptyTitle}>NO SIGNALS DETECTED</Text>
                <Text style={styles.emptySub}>Calibration search for broader indexing.</Text>
             </View>
          ) : null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: colors.white, 
    borderRadius: 20, 
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20
  },
  searchInput: { flex: 1, height: 56, color: colors.text, paddingHorizontal: 12, fontWeight: "600" },
  tabContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  tab: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    height: 48, 
    borderRadius: 15, 
    backgroundColor: colors.slate50 
  },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontWeight: '800', fontSize: 13, color: colors.textMuted },
  activeTabText: { color: 'white' },
  postCard: { width: (width - 50) / 2, aspectRatio: 1, marginBottom: 10, borderRadius: 15, overflow: 'hidden' },
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: 'white', 
    borderRadius: 20, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  userAvatar: { width: 50, height: 50, borderRadius: 25 },
  userName: { fontWeight: '900', color: colors.text, fontSize: 16 },
  userUniqueId: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  followBtn: { backgroundColor: colors.slate50, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  followBtnText: { fontWeight: '800', fontSize: 12 },
  resultsLabel: { fontSize: 10, fontWeight: '900', color: colors.textMuted, marginBottom: 15, letterSpacing: 2 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 20 },
  emptySub: { color: colors.textMuted, textAlign: 'center', marginTop: 10 }
});
