import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Image, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from "react-native";
import { globalStyles, colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (loading) return;
    try {
      setLoading(true);
      if (isLogin) {
        if (!email) {
          setLoading(false);
          return Alert.alert("Required", "Email identifier missing.");
        }
        await login(email);
      } else {
        if (!name || !email) {
          setLoading(false);
          return Alert.alert("Required", "Protocol requires both name and email.");
        }
        await register(name, email);
      }
    } catch (e: any) {
      Alert.alert("Access Denied", e.response?.data?.error || "Neural link failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={globalStyles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 32, backgroundColor: colors.background }}>
        {/* Logo Section */}
        <View style={{ alignItems: "center", marginBottom: 56 }}>
          <View style={{ 
            padding: 24, 
            backgroundColor: colors.white, 
            borderRadius: 48,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
            shadowColor: colors.primary,
            shadowRadius: 20,
            shadowOpacity: 0.05,
            elevation: 10
          }}>
            <Image 
              source={require("../../assets/icon.png")} 
              style={{ width: 110, height: 110 }} 
              resizeMode="contain"
            />
          </View>
          <Text style={[globalStyles.title, { fontSize: 52, marginBottom: 4, color: colors.primary, letterSpacing: -2 }]}>EHH</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Shield size={14} color={colors.accent} />
            <Text style={[globalStyles.subtitle, { color: colors.textMuted }]}>NETWORK PROTOCOL</Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={{ gap: 24 }}>
          {!isLogin && (
            <View>
              <Text style={[globalStyles.subtitle, { marginLeft: 12, marginBottom: 8 }]}>Full Name</Text>
              <TextInput
                style={[globalStyles.input, { height: 60, fontSize: 16, backgroundColor: colors.white }]}
                placeholder="Enter identity name..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View>
            <Text style={[globalStyles.subtitle, { marginLeft: 12, marginBottom: 8 }]}>Email Identifier</Text>
            <TextInput
              style={[globalStyles.input, { height: 60, fontSize: 16, backgroundColor: colors.white }]}
              placeholder="name@secure-net.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <TouchableOpacity 
            style={[globalStyles.buttonPrimary, { marginTop: 12, height: 72, flexDirection: "row", gap: 12, borderRadius: 24, opacity: loading ? 0.6 : 1 }]} 
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={[globalStyles.buttonText, { fontSize: 16 }]}>
                  {isLogin ? "ENGAGE SESSION" : "INITIATE JOIN"}
                </Text>
                <ArrowRight color={colors.white} size={22} strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Toggle */}
        <View style={{ marginTop: 40, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 }}>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} activeOpacity={0.6}>
            <Text style={{ textAlign: "center", fontSize: 15, color: colors.textMuted, fontWeight: '600' }}>
              {isLogin ? "No identity detected? " : "Already registered? "}
              <Text style={{ color: colors.primary, fontWeight: "900" }}>
                {isLogin ? "CREATE ONE" : "SIGN IN"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ 
          marginTop: 64, 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8
        }}>
          <CheckCircle2 color={colors.accent} size={14} />
          <Text style={{ 
            color: colors.slate100, 
            fontSize: 10, 
            fontWeight: "900", 
            letterSpacing: 4,
            textTransform: 'uppercase'
          }}>
            Identity Archive V2.4-STABLE
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
