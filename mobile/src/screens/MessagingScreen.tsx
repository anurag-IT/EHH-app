import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { Search, Mail, Edit3, ChevronRight, MessageSquareOff } from "lucide-react-native";
import { Image } from "expo-image";
import { globalStyles, colors } from "../theme";
import api from "../api";
import { useNavigation } from "@react-navigation/native";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";

export default function MessagingScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  const fetchConversations = async () => {
    try {
      const res = await api.get(`/api/messages/conversations/${user?.id}`);
      setConversations(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const filteredConversations = conversations.filter(conv => 
     conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversation = ({ item }: { item: any }) => {
    const isOnline = onlineUsers.has(item.otherUser.id);
    return (
      <TouchableOpacity 
        style={styles.convItem}
        onPress={() => navigation.navigate("Chat", { otherUser: item.otherUser })}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.otherUser.avatar }} style={styles.avatar} />
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.convText}>
          <Text style={styles.userName}>{item.otherUser.name}</Text>
          <Text style={[styles.lastMsg, !item.isRead && { fontWeight: '900', color: colors.text }]} numberOfLines={1}>
             {item.lastMessage?.content || "No messages yet"}
          </Text>
        </View>
        <View style={styles.meta}>
           {!item.isRead && <View style={styles.unreadBadge} />}
           <ChevronRight size={16} color={colors.border} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={[globalStyles.title, { marginBottom: 0, color: colors.primary }]}>Signals</Text>
          <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 2 }}>ENCRYPTED COMMS CHANNEL</Text>
        </View>
        <TouchableOpacity style={styles.headerIcon}>
           <Edit3 size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        <View style={styles.searchBar}>
           <Search size={18} color={colors.textMuted} />
           <TextInput 
             style={styles.searchInput} 
             placeholder="Search identifiers..." 
             placeholderTextColor={colors.textMuted}
             value={searchQuery}
             onChangeText={setSearchQuery}
           />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList 
            data={filteredConversations}
            keyExtractor={(item) => item.otherUser.id.toString()}
            renderItem={renderConversation}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                 <MessageSquareOff size={48} color={colors.slate100} />
                 <Text style={styles.emptyText}>No active transmissions</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24,
    paddingBottom: 20
  },
  headerIcon: { backgroundColor: colors.slate50, padding: 12, borderRadius: 15 },
 pocket: { backgroundColor: colors.slate50, padding: 12, borderRadius: 15 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    borderWidth: 1, 
    borderColor: colors.border,
    marginBottom: 24
  },
  searchInput: { flex: 1, height: 50, marginLeft: 10, fontWeight: '600', color: colors.text },
  convItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent' // colors.border
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  onlineDot: { 
    position: 'absolute', 
    right: 2, 
    bottom: 2, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: '#32CD32', 
    borderWidth: 3, 
    borderColor: 'white' 
  },
  convText: { flex: 1, marginLeft: 15 },
  userName: { fontWeight: '900', color: colors.text, fontSize: 16 },
  lastMsg: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  meta: { alignItems: 'flex-end', gap: 8 },
  unreadBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: colors.textMuted, fontWeight: '800', marginTop: 20, fontSize: 12, letterSpacing: 2 }
});
