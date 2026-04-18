import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import { Heart, UserPlus, MessageCircle, AlertTriangle, ShieldCheck } from "lucide-react-native";
import { colors, globalStyles } from "../theme";
import api from "../api";
import { useNavigation } from "@react-navigation/native";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderIcon = (type: string) => {
    switch (type) {
      case "LIKE": return <Heart size={16} color="white" fill="white" />;
      case "FOLLOW": return <UserPlus size={16} color="white" />;
      case "COMMENT": return <MessageCircle size={16} color="white" />;
      default: return <AlertTriangle size={16} color="white" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "LIKE": return "#EF4444";
      case "FOLLOW": return colors.primary;
      case "COMMENT": return colors.accent;
      default: return colors.textMuted;
    }
  };

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.notifItem}
      onPress={() => {
        if (item.postId) navigation.navigate("PostDetail", { postId: item.postId });
        else navigation.navigate("UserProfile", { userId: item.senderId });
      }}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.sender?.avatar }} style={styles.avatar} />
        <View style={[styles.typeIcon, { backgroundColor: getIconBg(item.type) }]}>
           {renderIcon(item.type)}
        </View>
      </View>
      
      <View style={styles.notifContent}>
        <Text style={styles.notifText}>
          <Text style={styles.senderName}>{item.sender?.name} </Text>
          {item.content}
        </Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>

      {item.type === "FOLLOW" && (
        <TouchableOpacity style={styles.followBackBtn}>
          <Text style={styles.followBackText}>Follow</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={[globalStyles.title, { marginBottom: 0, color: colors.primary }]}>Alerts</Text>
        <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textMuted, letterSpacing: 2 }}>NETWORK ACTIVITY FEED</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList 
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <ShieldCheck size={48} color={colors.slate100} />
               <Text style={styles.emptyText}>Protocol Clear</Text>
               <Text style={styles.emptySub}>No recent network interactions detected.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 24, paddingBottom: 20 },
  notifItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  typeIcon: { position: 'absolute', bottom: -2, right: -2, padding: 4, borderRadius: 10, borderWidth: 2, borderColor: 'white' },
  notifContent: { flex: 1, marginLeft: 15 },
  notifText: { fontSize: 13, color: colors.text, lineHeight: 18, fontWeight: '500' },
  senderName: { fontWeight: '900' },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '800' },
  followBackBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  followBackText: { color: 'white', fontWeight: '900', fontSize: 11 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: colors.text, fontWeight: '900', marginTop: 20, fontSize: 16 },
  emptySub: { color: colors.textMuted, textAlign: 'center', marginTop: 8, fontSize: 12 }
});
