import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  Dimensions,
  SafeAreaView,
  StatusBar
} from "react-native";
import { globalStyles, colors } from "../theme";
import api from "../api";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { 
  ShieldAlert, 
  Users, 
  Database, 
  Fingerprint, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Activity,
  Search,
  CheckCircle2
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function AdminScreen() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [image, setImage] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statsRes = await api.get("/admin/stats");
      setStats(statsRes.data);
      const usersRes = await api.get("/admin/users");
      setUsers(usersRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleBan = async (user: any) => {
    try {
      if (user.status === "ACTIVE") {
        await api.post(`/admin/users/${user.id}/ban`, { durationDays: 7, reason: "Violation of terms" });
        Alert.alert("Enforcement", "Identity restricted for 7 days.");
      } else {
        await api.post(`/admin/users/${user.id}/unban`);
        Alert.alert("Enforcement", "Identity restored to network.");
      }
      fetchData();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "Action failed");
    }
  };

  const pickImageForScan = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      scanImage(uri);
    }
  };

  const scanImage = async (uri: string) => {
    setScanning(true);
    setMatchData(null);
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image`;

      formData.append("image", { uri, name: filename, type } as any);

      const res = await api.post("/admin/find-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMatchData(res.data);
    } catch (e: any) {
      Alert.alert("Scan Failed", e.response?.data?.error || e.message);
    } finally {
      setScanning(false);
    }
  };

  const deleteGlobally = async () => {
    if (!matchData?.postId) return;
    
    setDeleting(true);
    try {
      const res = await api.delete(`/admin/delete/${matchData.postId}`);
      Alert.alert("Purge Complete", res.data.message);
      setImage(null);
      setMatchData(null);
    } catch (e: any) {
      Alert.alert("Purge Failed", e.response?.data?.error || e.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderStatBox = (icon: any, label: string, value: any, color = colors.primary) => (
    <View style={{ 
      flex: 1, 
      backgroundColor: colors.white, 
      borderWidth: 1, 
      borderColor: colors.border, 
      borderRadius: 24, 
      padding: 18,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.02,
      shadowRadius: 10,
      elevation: 2
    }}>
      <View style={{ 
        width: 36, 
        height: 36, 
        borderRadius: 12, 
        backgroundColor: colors.slate50, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 12
      }}>
        {icon}
      </View>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>{value}</Text>
      <Text style={[globalStyles.smallText, { textTransform: "uppercase", fontSize: 9, letterSpacing: 1, marginTop: 4 }]}>{label}</Text>
    </View>
  );

  const renderUser = ({ item }: { item: any }) => (
    <View style={[globalStyles.card, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderWidth: 1, borderColor: colors.border, marginHorizontal: 0, backgroundColor: colors.white }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>{item.name}</Text>
          {item.role === 'ADMIN' && <ShieldAlert size={12} color={colors.accent} />}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{item.uniqueId}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === "ACTIVE" ? colors.accent : colors.danger }} />
          <Text style={{ color: item.status === "ACTIVE" ? colors.accent : colors.danger, fontWeight: '900', fontSize: 10, textTransform: 'uppercase' }}>
            {item.status}
          </Text>
        </View>
      </View>
      {item.role !== "ADMIN" && (
        <TouchableOpacity 
          style={{ 
            backgroundColor: item.status === "ACTIVE" ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)", 
            padding: 14, 
            borderRadius: 18,
            borderWidth: 1,
            borderColor: item.status === "ACTIVE" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)"
          }}
          onPress={() => toggleBan(item)}
        >
          {item.status === "ACTIVE" ? <UserMinus color={colors.danger} size={22} /> : <UserPlus color={colors.accent} size={22} />}
        </TouchableOpacity>
      )}
    </View>
  );

  if (loadingStats) return (
    <View style={[globalStyles.container, { justifyContent: "center", backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[globalStyles.text, { textAlign: "center", marginTop: 20, color: colors.textMuted, fontWeight: '900', letterSpacing: 1 }]}>ESTABLISHING COMMAND LINK...</Text>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24, gap: 32 }}>
          {/* Header */}
          <View>
            <Text style={[globalStyles.title, { marginBottom: 0, color: colors.primary }]}>Control Panel</Text>
            <Text style={[globalStyles.subtitle, { color: colors.textMuted }]}>Platform Oversight & Security</Text>
          </View>

          {/* Stats Grid */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {renderStatBox(<Users color={colors.primary} size={18} />, "Users", stats.totalUsers)}
              {renderStatBox(<Activity color={colors.accent} size={18} />, "Network", stats.activeUsers)}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {renderStatBox(<Database color={colors.primary} size={18} />, "Assets", stats.totalPosts)}
              {renderStatBox(<ShieldAlert color={colors.danger} size={18} />, "Breaches", stats.flaggedCount)}
            </View>
          </View>

          {/* Trace Scanner */}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Fingerprint color={colors.primary} size={16} />
               <Text style={[globalStyles.subtitle, { color: colors.text }]}>Forensic Image Scanner</Text>
            </View>
            <View style={[globalStyles.card, { marginHorizontal: 0, padding: 24, backgroundColor: colors.white }]}>
              <TouchableOpacity 
                style={[globalStyles.buttonPrimary, { flexDirection: "row", gap: 12, height: 64, borderRadius: 20 }]} 
                onPress={pickImageForScan}
                disabled={scanning}
              >
                <Search color={colors.white} size={20} />
                <Text style={globalStyles.buttonText}>{scanning ? "ANALYZING..." : "SCAN SOURCE ASSET"}</Text>
              </TouchableOpacity>
              
              {scanning && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
              
              {image && !scanning && (
                <View style={{ alignItems: "center", marginTop: 24, gap: 20 }}>
                  <View style={{ padding: 6, backgroundColor: colors.white, borderRadius: 32, borderWidth: 1, borderColor: colors.border }}>
                    <Image source={{ uri: image }} style={{ width: 220, height: 220, borderRadius: 28 }} />
                  </View>
                  
                  {matchData && matchData.matchCount > 0 ? (
                    <View style={{ width: "100%", gap: 12 }}>
                      <View style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.1)" }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                          <ShieldAlert color={colors.danger} size={16} />
                          <Text style={{ color: colors.danger, fontWeight: "900", fontSize: 16 }}>
                             {matchData.matchCount} CLONES DETECTED
                          </Text>
                        </View>
                        <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 11, fontWeight: "700", textTransform: 'uppercase' }}>
                           Confidence: {matchData.similarity} | Algorithm: pHash
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[globalStyles.buttonPrimary, { backgroundColor: colors.danger, height: 60, borderRadius: 20, flexDirection: "row", gap: 12, shadowColor: colors.danger, shadowOpacity: 0.2 }]} 
                        onPress={deleteGlobally} 
                        disabled={deleting}
                      >
                        <Trash2 color={colors.white} size={20} />
                        <Text style={[globalStyles.buttonText, { color: colors.white }]}>{deleting ? "PURGING..." : "EXECUTE GLOBAL PURGE"}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : matchData && matchData.matchCount === 0 ? (
                    <View style={{ backgroundColor: colors.slate50, padding: 20, borderRadius: 24, width: "100%", borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                       <CheckCircle2 color={colors.accent} size={18} />
                       <Text style={{ color: colors.text, fontWeight: "900", fontSize: 13, textTransform: 'uppercase' }}>No Matched Identifiers</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* User Management */}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Users color={colors.primary} size={16} />
               <Text style={[globalStyles.subtitle, { color: colors.text }]}>Identity Management</Text>
            </View>
            <FlatList
              data={users}
              keyExtractor={item => item.id.toString()}
              renderItem={renderUser}
              scrollEnabled={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
