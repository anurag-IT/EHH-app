import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter
} from "react-native";
import { globalStyles, colors } from "../theme";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import api from "../api";
import { useNavigation } from "@react-navigation/native";
import { Camera, Image as ImageIcon, Send, X, MapPin, CheckCircle2 } from "lucide-react-native";

export default function UploadScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigation = useNavigation<any>();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission required", "Allow camera access to take photos.");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

// ... (inside the component)

  const handleUpload = async () => {
    if (!image) {
      Alert.alert("Target Required", "Neural link requires a visual asset for network indexing.");
      return;
    }

    setUploading(true);
    setProgress(0.1);
    try {
      // COMPRESSION STEP
      console.log("[UPLOAD] Compressing asset...");
      const compressed = await ImageManipulator.manipulateAsync(
        image,
        [{ resize: { width: 1080 } }], // Resize for optimal mobile viewing
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("location", location);
      
      const uri = compressed.uri;
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("image", { uri, name: filename, type } as any);

      const interval = setInterval(() => {
        setProgress(p => (p < 0.9 ? p + 0.1 : p));
      }, 400);

      const res = await api.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearInterval(interval);
      setProgress(1);

      // REQUIREMENT: Instant UI Update Broadcast
      console.log("[UPLOAD] Broadcast NEW_POST event...");
      DeviceEventEmitter.emit("NEW_POST", res.data.post);

      setTimeout(() => {
        Alert.alert("Commit Success", "Asset has been successfully indexed and broadcasted.");
        setImage(null);
        setCaption("");
        setLocation("");
        navigation.navigate("Feed");
      }, 500);

    } catch (e: any) {
      Alert.alert("Link Failure", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <View>
              <Text style={[globalStyles.title, { marginBottom: 0, color: colors.primary }]}>Capture</Text>
              <Text style={[globalStyles.subtitle, { color: colors.textMuted }]}>New Asset Indexing</Text>
            </View>
            {image && (
               <TouchableOpacity onPress={() => setImage(null)} style={{ padding: 12, backgroundColor: colors.slate50, borderRadius: 20 }}>
                 <X color={colors.text} size={24} />
               </TouchableOpacity>
            )}
          </View>

          {/* Asset Preview */}
          <View style={{ marginBottom: 32 }}>
             {image ? (
               <View style={{ position: "relative", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
                 <Image 
                   source={{ uri: image }} 
                   style={{ width: "100%", aspectRatio: 4/5, borderRadius: 40, borderWidth: 1, borderColor: colors.border }} 
                   contentFit="cover"
                 />
                 {uploading && (
                   <View style={{ 
                     position: "absolute", 
                     top: 0, left: 0, right: 0, bottom: 0, 
                     backgroundColor: "rgba(255, 255, 255, 0.9)", 
                     borderRadius: 40,
                     alignItems: "center",
                     justifyContent: "center",
                     padding: 40
                   }}>
                     <ActivityIndicator size="large" color={colors.primary} />
                     <Text style={[globalStyles.subtitle, { marginTop: 24, color: colors.primary }]}>Indexing Asset: {Math.round(progress * 100)}%</Text>
                     <View style={{ width: "100%", height: 6, backgroundColor: colors.slate50, borderRadius: 3, marginTop: 16, overflow: "hidden" }}>
                        <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: colors.accent }} />
                     </View>
                   </View>
                 )}
               </View>
             ) : (
               <View style={{ gap: 16 }}>
                 <TouchableOpacity 
                   style={{ 
                     width: "100%", 
                     aspectRatio: 1.5, 
                     backgroundColor: colors.white, 
                     borderRadius: 40, 
                     borderWidth: 2, 
                     borderStyle: "dashed", 
                     borderColor: colors.border,
                     alignItems: "center", 
                     justifyContent: "center",
                     gap: 12
                   }} 
                   onPress={pickImage}
                 >
                   <ImageIcon color={colors.slate100} size={54} />
                   <Text style={{ color: colors.text, fontWeight: "900", letterSpacing: 1, fontSize: 13 }}>SELECT FROM GALLERY</Text>
                 </TouchableOpacity>

                 <TouchableOpacity 
                   style={{ 
                     flexDirection: "row", 
                     alignItems: "center", 
                     justifyContent: "center", 
                     backgroundColor: colors.slate50, 
                     padding: 24, 
                     borderRadius: 24,
                     gap: 12,
                     borderWidth: 1,
                     borderColor: colors.border
                   }} 
                   onPress={takePhoto}
                 >
                   <Camera color={colors.text} size={22} />
                   <Text style={{ color: colors.text, fontWeight: "900", letterSpacing: 0.5 }}>OPEN SYSTEM CAMERA</Text>
                 </TouchableOpacity>
               </View>
             )}
          </View>

          {/* Metadata Input */}
          <View style={{ gap: 24 }}>
            <View>
              <Text style={[globalStyles.subtitle, { marginBottom: 12, marginLeft: 8 }]}>Caption Details</Text>
              <TextInput
                style={[globalStyles.input, { height: 140, paddingTop: 18, textAlignVertical: "top", fontSize: 16, lineHeight: 24, backgroundColor: colors.white }]}
                placeholder="Describe current signal..."
                placeholderTextColor={colors.textMuted}
                value={caption}
                onChangeText={setCaption}
                multiline
              />
            </View>

            <View>
              <Text style={[globalStyles.subtitle, { marginBottom: 12, marginLeft: 8 }]}>Network Position</Text>
              <View style={{ position: "relative" }}>
                 <View style={{ position: "absolute", left: 20, top: 22, zIndex: 10 }}>
                   <MapPin size={20} color={colors.accent} />
                 </View>
                 <TextInput
                   style={[globalStyles.input, { paddingLeft: 56, height: 64, backgroundColor: colors.white }]}
                   placeholder="Grid Coordinates..."
                   placeholderTextColor={colors.textMuted}
                   value={location}
                   onChangeText={setLocation}
                 />
              </View>
            </View>

            <TouchableOpacity 
              style={[globalStyles.buttonPrimary, { marginTop: 12, height: 72, flexDirection: "row", gap: 12, borderRadius: 24 }]} 
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.9}
            >
              <Text style={[globalStyles.buttonText, { fontSize: 16 }]}>COMMIT BROADCAST</Text>
              {!uploading && <Send color={colors.white} size={22} />}
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center', marginTop: 12, gap: 8, flexDirection: 'row', justifyContent: 'center' }}>
               <CheckCircle2 color={colors.accent} size={14} />
               <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>ENCRYPTED END-TO-END</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
