import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  StatusBar,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import { ChevronLeft, Send, Camera, MoreVertical, Info } from "lucide-react-native";
import { colors, globalStyles } from "../theme";
import api from "../api";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { otherUser } = route.params;
  const { user: currentUser } = useAuth();
  const { socket, typingUsers, sendTyping, markAsRead } = useSocket();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isOtherTyping = typingUsers.has(otherUser.id);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/api/messages/chat/${currentUser?.id}/${otherUser.id}`);
      setMessages(res.data);
      markAsRead(otherUser.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    if (socket) {
      socket.on("newMessage", (msg: any) => {
        if (msg.senderId === otherUser.id) {
          setMessages(prev => [msg, ...prev]);
          markAsRead(otherUser.id);
        }
      });
      return () => { socket.off("newMessage"); };
    }
  }, [socket, otherUser.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const msg = {
      id: Date.now(),
      senderId: currentUser?.id,
      receiverId: otherUser.id,
      content: inputText,
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => [msg, ...prev]);
    socket?.emit("sendMessage", { receiverId: otherUser.id, content: inputText });
    setInputText("");
    sendTyping(otherUser.id, false);
  };

  const onTyping = (text: string) => {
    setInputText(text);
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      sendTyping(otherUser.id, true);
    } else if (isTyping && text.length === 0) {
      setIsTyping(false);
      sendTyping(otherUser.id, false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.senderId === currentUser?.id;
    return (
      <View style={[styles.msgWrapper, isMine ? styles.msgMine : styles.msgTheirs]}>
        {!isMine && (
          <Image source={{ uri: otherUser.avatar }} style={styles.bubbleAvatar} />
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
           <Text style={[styles.msgText, isMine && { color: 'white' }]}>{item.content}</Text>
           <Text style={[styles.time, isMine ? { color: 'rgba(255,255,255,0.6)' } : { color: colors.textMuted }]}>
             {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: 'white' }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerUser}
          onPress={() => navigation.navigate("UserProfile", { userId: otherUser.id })}
        >
          <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{otherUser.name}</Text>
            {isOtherTyping ? (
              <Text style={styles.typingText}>typing signal...</Text>
            ) : (
              <Text style={styles.statusText}>Live Protocol Active</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerBtn}>
          <Info color={colors.text} size={22} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
             <Camera size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TextInput 
            style={styles.input}
            placeholder="Type encrypted message..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={onTyping}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send color={colors.primary} size={24} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'white'
  },
  headerBtn: { padding: 8 },
  headerUser: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { fontWeight: '900', color: colors.text, fontSize: 16 },
  statusText: { fontSize: 10, color: '#32CD32', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  typingText: { fontSize: 10, color: colors.primary, fontWeight: '800', fontStyle: 'italic' },
  msgWrapper: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
  msgMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgTheirs: { alignSelf: 'flex-start' },
  bubbleAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10, alignSelf: 'flex-end' },
  bubble: { padding: 16, borderRadius: 25 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  bubbleTheirs: { backgroundColor: colors.slate50, borderBottomLeftRadius: 5 },
  msgText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  time: { fontSize: 9, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: colors.border,
    backgroundColor: 'white'
  },
  attachBtn: { padding: 8 },
  input: { 
    flex: 1, 
    backgroundColor: colors.slate50, 
    borderRadius: 25, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    maxHeight: 100,
    marginHorizontal: 12,
    color: colors.text,
    fontWeight: '600'
  },
  sendBtn: { padding: 8 }
});
