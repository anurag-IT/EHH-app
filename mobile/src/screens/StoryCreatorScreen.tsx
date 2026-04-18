import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  StatusBar,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import ViewShot from "react-native-view-shot";
import { GestureHandlerRootView, PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";
import Animated, { 
  useAnimatedGestureHandler, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from "react-native-reanimated";
import { X, Type, Smile, BarChart2, Palette, Send, Camera, Image as ImageIcon } from "lucide-react-native";
import { colors } from "../theme";
import api from "../api";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

const PRESET_COLORS = ["#FFFFFF", "#000000", "#FFD700", "#FF69B4", "#00FFFF", "#32CD32", "#FF4500"];
const GRADIENTS = [
  ["#833ab4", "#fd1d1d", "#fcb045"],
  ["#22c1c3", "#fdbb2d"],
  ["#ff9966", "#ff5e62"],
  ["#7F00FF", "#E100FF"],
  ["#00b09b", "#96c93d"],
  ["#4e54c8", "#8f94fb"],
  ["#11998e", "#38ef7d"]
];

const EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "😍", "🎉", "💯", "🙏", "✨", "🙌", "💀", "💩", "🌈"];

/**
 * Draggable Sticker / Text Component
 */
const DraggableItem = ({ children, initialX = 0, initialY = 0 }: any) => {
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const scale = useSharedValue(1);

  const panHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = x.value;
      ctx.startY = y.value;
    },
    onActive: (event, ctx: any) => {
      x.value = ctx.startX + event.translationX;
      y.value = ctx.startY + event.translationY;
    },
  });

  const pinchHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = event.scale;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
    position: 'absolute',
  }));

  return (
    <PanGestureHandler onGestureEvent={panHandler}>
      <Animated.View>
        <PinchGestureHandler onGestureEvent={pinchHandler}>
          <Animated.View style={animatedStyle}>
            {children}
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default function StoryCreatorScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [bgGradient, setBgGradient] = useState(GRADIENTS[0]);
  const [items, setItems] = useState<any[]>([]); // { id, type, content, color }
  const [showTextModal, setShowTextModal] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [currentColor, setCurrentColor] = useState("#FFFFFF");
  const [uploading, setUploading] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);
  const navigation = useNavigation<any>();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const addText = () => {
    if (currentText.trim()) {
      setItems([...items, { 
        id: Date.now(), 
        type: 'text', 
        content: currentText, 
        color: currentColor,
        x: width / 2 - 50,
        y: height / 2
      }]);
      setCurrentText("");
      setShowTextModal(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setItems([...items, { 
      id: Date.now(), 
      type: 'emoji', 
      content: emoji,
      x: width / 2 - 30,
      y: height / 2
    }]);
  };

  const handleShare = async () => {
    setUploading(true);
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error("Composition capture failed");

      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("images", { uri, name: filename, type } as any);
      // Simplify stickers metadata for storage
      formData.append("stickers", JSON.stringify(items.map(item => ({
        type: item.type,
        content: item.content,
        color: item.color
      }))));

      await api.post("/api/stories", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      Alert.alert("Target Indexed", "Your signal has been broadcasted to the network.");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Broadcast Failure", e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <View style={styles.container}>
        
        {/* Composition Canvas */}
        <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.canvas}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
             <View style={[StyleSheet.absoluteFill, { backgroundColor: bgGradient[0] }]} />
          )}

          {items.map(item => (
            <DraggableItem key={item.id} initialX={item.x} initialY={item.y}>
              {item.type === 'text' ? (
                <Text style={[styles.itemText, { color: item.color }]}>{item.content}</Text>
              ) : (
                <Text style={styles.itemEmoji}>{item.content}</Text>
              )}
            </DraggableItem>
          ))}
        </ViewShot>

        {/* Top Tools */}
        <View style={styles.topTools}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolIcon}>
            <X color="white" size={28} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => setShowTextModal(true)} style={styles.toolIcon}>
              <Type color="white" size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBgGradient(GRADIENTS[(GRADIENTS.indexOf(bgGradient) + 1) % GRADIENTS.length])} style={styles.toolIcon}>
              <Palette color="white" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Tools */}
        <View style={styles.bottomTools}>
          {!image && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
               <TouchableOpacity onPress={pickImage} style={styles.actionBtn}>
                  <ImageIcon color="white" size={20} />
                  <Text style={styles.actionBtnText}>Gallery</Text>
               </TouchableOpacity>
               <TouchableOpacity onPress={takePhoto} style={styles.actionBtn}>
                  <Camera color="white" size={20} />
                  <Text style={styles.actionBtnText}>Camera</Text>
               </TouchableOpacity>
            </View>
          )}

          <View style={styles.emojiRow}>
             {EMOJIS.slice(0, 8).map(e => (
               <TouchableOpacity key={e} onPress={() => addEmoji(e)}>
                 <Text style={{ fontSize: 28 }}>{e}</Text>
               </TouchableOpacity>
             ))}
          </View>

          <TouchableOpacity 
            onPress={handleShare} 
            disabled={uploading}
            style={[styles.shareBtn, { opacity: uploading ? 0.7 : 1 }]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.shareBtnText}>Share to Story</Text>
                <Send color={colors.primary} size={20} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Text Entry Modal */}
        <Modal visible={showTextModal} transparent animationType="fade">
           <View style={styles.modalOverlay}>
              <View style={styles.colorPicker}>
                {PRESET_COLORS.map(c => (
                  <TouchableOpacity 
                    key={c} 
                    onPress={() => setCurrentColor(c)}
                    style={[styles.colorDot, { backgroundColor: c, borderWidth: currentColor === c ? 3 : 0, borderColor: 'white' }]} 
                  />
                ))}
              </View>
              <TextInput 
                autoFocus 
                multiline
                style={[styles.modalInput, { color: currentColor }]}
                placeholder="Type something..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={currentText}
                onChangeText={setCurrentText}
              />
              <TouchableOpacity onPress={addText} style={styles.doneBtn}>
                 <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
           </View>
        </Modal>

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  canvas: { width, height, backgroundColor: '#111' },
  topTools: { 
    position: 'absolute', 
    top: 50, 
    width: '100%', 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    zIndex: 10 
  },
  toolIcon: { 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 10, 
    borderRadius: 25 
  },
  bottomTools: { 
    position: 'absolute', 
    bottom: 40, 
    width: '100%', 
    paddingHorizontal: 20, 
    alignItems: 'center',
    zIndex: 10 
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 20 
  },
  actionBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
  emojiRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 20
  },
  shareBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    backgroundColor: 'white', 
    paddingVertical: 15, 
    paddingHorizontal: 30, 
    borderRadius: 30 
  },
  shareBtnText: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  itemText: { fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 10 },
  itemEmoji: { fontSize: 60 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.9)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalInput: { 
    fontSize: 42, 
    fontWeight: '900', 
    textAlign: 'center', 
    width: '100%',
    maxHeight: height * 0.4 
  },
  colorPicker: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 40 
  },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  doneBtn: { 
    position: 'absolute', 
    top: 50, 
    right: 20 
  },
  doneBtnText: { color: 'white', fontSize: 18, fontWeight: '900' }
});
