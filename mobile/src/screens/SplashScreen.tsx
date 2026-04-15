import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
  Image,
} from "react-native";
import { colors } from "../theme";
import * as SystemSplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible while we initialize
SystemSplashScreen.preventAutoHideAsync().catch(() => {});


interface SplashScreenProps {
  /** Whether auth is still being read from AsyncStorage */
  authLoading: boolean;
  /** Called when BOTH the animation is done AND auth has finished loading */
  onAuthReady: () => void;
}

export default function SplashScreen({ authLoading, onAuthReady }: SplashScreenProps) {
  const [animDone, setAnimDone] = useState(false);

  // Animation refs
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(0.72)).current;
  const logoFade     = useRef(new Animated.Value(0)).current;
  const taglineFade  = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(24)).current;
  const dotOpacity   = useRef(new Animated.Value(0)).current;
  const dotPulse     = useRef(new Animated.Value(1)).current;
  const exitFade     = useRef(new Animated.Value(1)).current;

  // When BOTH conditions are met, fade out and call onAuthReady
  useEffect(() => {
    if (animDone && !authLoading) {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => onAuthReady());
    }
  }, [animDone, authLoading]);

  useEffect(() => {
    // Hide the native system splash screen as soon as our JS animation starts
    SystemSplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      // 1. Background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // 2. Logo pop in with spring
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 55,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
      // 3. Tagline slides up
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // 4. Red dot appears
      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start pulsing dot loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotPulse, {
            toValue: 1.45,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(dotPulse, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Hold for a moment, then mark animation done
      setTimeout(() => {
        setAnimDone(true);
      }, 900);
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitFade }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Soft decorative blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Logo + text */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: logoFade,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Icon card */}
        <View style={styles.logoCard}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* Red accent dot — trademark of the splash */}
          <Animated.View
            style={[
              styles.accentDot,
              {
                opacity: dotOpacity,
                transform: [{ scale: dotPulse }],
              },
            ]}
          />
        </View>

        {/* EHH wordmark */}
        <Text style={styles.brandName}>EHH</Text>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineFade,
            transform: [{ translateY: taglineSlide }],
          }}
        >
          <View style={styles.taglineRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.tagline}>NETWORK PROTOCOL</Text>
            <View style={styles.dividerLine} />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: taglineFade }]}>
        <Text style={styles.versionText}>Identity Archive · V2.4-STABLE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  blobTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accent,
    opacity: 0.045,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -110,
    left: -110,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: colors.primary,
    opacity: 0.045,
  },
  content: {
    alignItems: "center",
  },
  logoCard: {
    width: 132,
    height: 132,
    borderRadius: 40,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    elevation: 14,
  },
  logo: {
    width: 90,
    height: 90,
  },
  accentDot: {
    position: "absolute",
    bottom: 15,
    right: 15,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 6,
  },
  brandName: {
    fontSize: 76,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -4,
    marginBottom: 10,
    lineHeight: 76,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    width: 26,
    height: 1.5,
    backgroundColor: colors.accent,
    opacity: 0.55,
    borderRadius: 1,
  },
  tagline: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 48,
    alignItems: "center",
  },
  versionText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 2.5,
    opacity: 0.45,
  },
});
