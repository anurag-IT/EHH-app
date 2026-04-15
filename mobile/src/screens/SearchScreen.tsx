import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator,
  Dimensions
} from "react-native";
import { globalStyles, colors } from "../theme";
import { Search, Image as ImageIcon, Scan, CheckCircle2 } from "lucide-react-native";
import { Image } from "expo-image";
import api, { getOptimizedImageUrl } from "../api";

const { width } = Dimensions.get("window");

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/posts/search?q=${query}`);
      setResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderPost = React.useCallback(({ item }: { item: any }) => (
    <TouchableOpacity style={{ 
      width: (width - 48) / 2, 
      aspectRatio: 1, 
      marginBottom: 16, 
      borderRadius: 20, 
      overflow: "hidden",
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2
    }}>
      <Image 
        source={{ uri: getOptimizedImageUrl(item.imageUrl, 400) }} 
        style={{ width: "100%", height: "100%" }} 
        contentFit="cover"
        transition={300}
        cachePolicy="disk"
      />
      <View style={{ 
        position: "absolute", 
        bottom: 0, 
        left: 0, 
        right: 0, 
        paddingHorizontal: 10,
        paddingVertical: 8, 
        backgroundColor: "rgba(255, 255, 255, 0.9)"
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 10, fontWeight: "900" }} numberOfLines={1}>@{item.user.name}</Text>
          <CheckCircle2 size={8} color={colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, padding: 20 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={[globalStyles.title, { marginBottom: 0, color: colors.primary }]}>Discovery</Text>
          <Text style={[globalStyles.subtitle, { color: colors.textMuted }]}>Global Asset Intelligence</Text>
        </View>

        {/* Search Bar */}
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          backgroundColor: colors.white, 
          borderRadius: 24, 
          paddingHorizontal: 20,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.03,
          shadowRadius: 15,
          elevation: 5
        }}>
          <Search size={22} color={colors.primary} />
          <TextInput
            style={{ 
              flex: 1, 
              height: 64, 
              color: colors.text, 
              paddingHorizontal: 16,
              fontWeight: "600",
              fontSize: 16
            }}
            placeholder="Search network buffer..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
          />
          {loading && <ActivityIndicator color={colors.primary} />}
        </View>

        {/* Empty State */}
        {!query && results.length === 0 && (
           <View style={{ 
             flex: 1,
             justifyContent: 'center',
             alignItems: "center", 
             padding: 40,
           }}>
             <View style={{ 
               width: 100, 
               height: 100, 
               borderRadius: 50, 
               backgroundColor: colors.slate50, 
               alignItems: 'center', 
               justifyContent: 'center',
               marginBottom: 24,
               borderWidth: 1,
               borderColor: colors.border
             }}>
               <Scan size={42} color={colors.slate100} />
             </View>
             <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center", textTransform: 'uppercase', letterSpacing: 1 }}>Ready to Scan</Text>
             <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 14, marginTop: 12, lineHeight: 22 }}>
               Input identifiers or keywords to cross-reference the global tracking network.
             </Text>
           </View>
        )}

        <FlatList
          data={results}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={results.length > 0 ? (
             <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color={colors.accent} />
                <Text style={{ fontSize: 12, fontWeight: "900", letterSpacing: 1, color: colors.text }}>
                   {results.length} CLONES IDENTIFIED
                </Text>
             </View>
          ) : null}
        />
      </View>
    </SafeAreaView>
  );
}
