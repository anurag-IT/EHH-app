import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  Dimensions
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
  Activity
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const renderOption = (icon: any, label: string, sub: string, danger = false) => (
    <TouchableOpacity 
      style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        padding: 20, 
        backgroundColor: colors.white, 
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 5,
        elevation: 1
      }}
      activeOpacity={0.7}
      onPress={label === "Logout" ? logout : undefined}
    >
      <View style={{ 
        width: 48, 
        height: 48, 
        backgroundColor: danger ? "rgba(239, 68, 68, 0.05)" : colors.slate50, 
        borderRadius: 16, 
        alignItems: "center", 
        justifyContent: "center",
        marginRight: 16
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 16, fontWeight: "900" }}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>{sub}</Text>
      </View>
      <ChevronRight color={colors.border} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24, paddingTop: 40, alignItems: "center" }}>
          
          {/* Profile Header */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View style={{ position: "relative", marginBottom: 20 }}>
              <View style={{ 
                padding: 4, 
                backgroundColor: colors.white, 
                borderRadius: 54,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10
              }}>
                <Image 
                  source={{ uri: user?.avatar }} 
                  style={{ width: 110, height: 110, borderRadius: 50 }} 
                />
              </View>
              <View style={{ 
                position: "absolute", 
                bottom: 0, 
                right: 0, 
                backgroundColor: colors.primary, 
                padding: 8, 
                borderRadius: 16,
                borderWidth: 4,
                borderColor: colors.background,
                shadowColor: colors.primary,
                shadowRadius: 10,
                shadowOpacity: 0.2
              }}>
                <CheckCircle2 color={colors.white} size={18} strokeWidth={3} />
              </View>
            </View>
            
            <Text style={[globalStyles.title, { marginBottom: 4, color: colors.primary, textAlign: 'center' }]}>{user?.name}</Text>
            <View style={{ 
              backgroundColor: colors.slate50, 
              paddingHorizontal: 16, 
              paddingVertical: 6, 
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border
            }}>
              <Text style={{ color: colors.textMuted, fontWeight: "900", fontSize: 11, letterSpacing: 2 }}>{user?.uniqueId}</Text>
            </View>
          </View>

          {/* Activity Section */}
          <View style={{ 
            flexDirection: "row", 
            width: "100%", 
            backgroundColor: colors.white, 
            borderRadius: 32, 
            padding: 24, 
            marginBottom: 32,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.03,
            shadowRadius: 20,
            elevation: 2
          }}>
             <View style={{ flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: colors.border }}>
               <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "900" }}>{user?.role}</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                 <Globe size={10} color={colors.textMuted} />
                 <Text style={[globalStyles.smallText, { textTransform: "uppercase", fontSize: 9, letterSpacing: 1 }]}>IDENTITY</Text>
               </View>
             </View>
             <View style={{ flex: 1, alignItems: "center" }}>
               <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "900" }}>ACTIVE</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                 <Activity size={10} color={colors.textMuted} />
                 <Text style={[globalStyles.smallText, { textTransform: "uppercase", fontSize: 9, letterSpacing: 1 }]}>NETWORK</Text>
               </View>
             </View>
          </View>

          {/* Menu Sections */}
          <View style={{ width: "100%", gap: 6 }}>
            <Text style={[globalStyles.subtitle, { marginLeft: 12, marginBottom: 8, fontSize: 11 }]}>Security Settings</Text>
            {renderOption(<Lock color={colors.text} size={20} />, "Access Keys", "Manage network credentials")}
            {renderOption(<Bell color={colors.text} size={20} />, "Monitoring", "Global activity notifications")}
            {renderOption(<Fingerprint color={colors.text} size={20} />, "Identity Info", "Update biometric records")}
            
            <View style={{ marginTop: 24 }}>
              <Text style={[globalStyles.subtitle, { marginLeft: 12, marginBottom: 8, fontSize: 11 }]}>Network Options</Text>
              {renderOption(<LogOut color={colors.danger} size={20} />, "Logout", "Securely disconnect session", true)}
            </View>
          </View>
          
          <Text style={{ 
            textAlign: "center", 
            marginTop: 48, 
            marginBottom: 24,
            color: colors.slate100, 
            fontSize: 10, 
            fontWeight: "900", 
            letterSpacing: 4 
          }}>
            EHH SECURE PROTOCOL V2.4
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
