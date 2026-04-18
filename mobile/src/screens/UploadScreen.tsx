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
  DeviceEventEmitter,
  Dimensions
} from "react-native";
import { globalStyles, colors } from "../theme";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import api from "../api";
import { useNavigation } from "@react-navigation/native";
import { Camera, Image as ImageIcon, Send, X, MapPin, CheckCircle2, Plus } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function UploadScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigation = useNavigation<any>();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newUris = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newUris].slice(0, 10));
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
      setImages(prev => [...prev, result.assets[0].uri].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      Alert.alert("Target Required", "Neural link requires at least one visual asset for network indexing.");
      return;
    }

    setUploading(true);
    setProgress(0.1);
    try {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("location", location);
      
      // Parallel compression and appending
      for (const uri of images) {
        console.log(`[UPLOAD] Processing asset: ${uri}`);
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        const finalUri = compressed.uri;
        const filename = finalUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename || "");
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("images", { uri: finalUri, name: filename, type } as any);
      }

      const res = await api.post("/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProgress(1);
      DeviceEventEmitter.emit("NEW_POST", res.data.post);

      setTimeout(() => {
        Alert.alert("Commit Success", "Signal cluster indexed successfully.");
        setImages([]);
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <View>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary }}>Capture</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>New Signal Broadcast</Text>
            </View>
          </View>

          {/* Multi-Image Preview List */}
          <View style={{ marginBottom: 32 }}>
             {images.length > 0 ? (
               <View>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {images.map((uri, index) => (
                      <View key={index} style={{ width: width * 0.7, aspectRatio: 4/5, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.border }}>
                         <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                         <TouchableOpacity 
                           onPress={() => removeImage(index)} 
                           style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 12 }}>
                            <X color="white" size={16} />
                         </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity 
                      onPress={pickImage}
                      style={{ width: 120, aspectRatio: 4/10, backgroundColor: colors.slate50, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                       <Plus color={colors.textMuted} size={32} />
                    </TouchableOpacity>
                 </ScrollView>
                 <Text style={{ marginTop: 12, fontSize: 10, fontWeight: '800', color: colors.slate100, letterSpacing: 1 }}>{images.length}/10 ASSETS SELECTED</Text>
               </View>
             ) : (
               <View style={{ gap: 16 }}>
                 <TouchableOpacity style={{ width: "100%", aspectRatio: 1.5, backgroundColor: colors.white, borderRadius: 40, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 12 }} onPress={pickImage}>
                   <ImageIcon color={colors.slate100} size={54} />
                   <Text style={{ color: colors.text, fontWeight: "900", letterSpacing: 1, fontSize: 13 }}>SELECT SIGNAL CLUSTER</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.slate50, padding: 24, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: colors.border }} onPress={takePhoto}>
                   <Camera color={colors.text} size={22} />
                   <Text style={{ color: colors.text, fontWeight: "900", letterSpacing: 0.5 }}>OPEN CAPTURE DEVICE</Text>
                 </TouchableOpacity>
               </View>
             )}
          </View>

          {/* Metadata Input */}
          <View style={{ gap: 24 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMuted, marginLeft: 4, marginBottom: 8 }}>CAPTION</Text>
              <TextInput
                style={[globalStyles.input, { height: 120, paddingTop: 18, textAlignVertical: "top", fontSize: 16, backgroundColor: colors.white }]}
                placeholder="Broadcast metadata..."
                placeholderTextColor={colors.textMuted}
                value={caption}
                onChangeText={setCaption}
                multiline
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', marginLeft: 4, marginBottom: 8 }}>GPS COORDINATES</Text>
              <TextInput
                style={[globalStyles.input, { height: 60, backgroundColor: colors.white }]}
                placeholder="Coordinate index..."
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <TouchableOpacity 
              style={[globalStyles.buttonPrimary, { marginTop: 12, height: 72, borderRadius: 24 }]} 
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={[globalStyles.buttonText, { fontSize: 16 }]}>EXECUTE TRANSMISSION</Text>
                  <Send color={colors.white} size={22} />
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
