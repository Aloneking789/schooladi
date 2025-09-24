import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Logo animation
    Animated.sequence([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Title animation (delayed)
    setTimeout(() => {
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Subtitle animation (more delayed)
    setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 1300);

    // Pulse animation for logo
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1500);

    // Complete animation and navigate
    setTimeout(() => {
      onAnimationComplete();
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fb', '#e9ecf3', '#667eea', '#764ba2']}
        style={styles.gradientContainer}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoOpacity,
                  transform: [
                    { scale: logoScale },
                    { scale: pulseAnim }
                  ],
                },
              ]}
            >
              <View style={styles.logoBackground}>
                <Animated.Image
                  source={require('../../assets/images/pmblogo.jpg')}
                  style={[
                    styles.logoImage,
                    {
                      opacity: logoOpacity,
                      transform: [{ scale: logoScale }],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            {/* Floating particles */}
            <View style={styles.particlesContainer}>
              {[...Array(6)].map((_, index) => (
                <FloatingParticle key={index} delay={index * 200} />
              ))}
            </View>
          </View>

          {/* Text Section */}
          <View style={styles.textSection}>
            <Animated.Text
              style={[
                styles.appTitle,
                {
                  opacity: titleOpacity,
                },
              ]}
            >
              PBM Public School
            </Animated.Text>

            <Animated.Text
              style={[
                styles.appSubtitle,
                {
                  opacity: subtitleOpacity,
                },
              ]}
            >
              School Management System
            </Animated.Text>

            <View style={styles.taglineContainer}>
              <Animated.View
                style={[
                  styles.tagline,
                  {
                    opacity: subtitleOpacity,
                  },
                ]}
              >
                <View style={styles.taglineContent}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.taglineText}>Professional</Text>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.taglineText}>Secure</Text>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.taglineText}>Reliable</Text>
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Loading Animation */}
          <View style={styles.loadingSection}>
            <LoadingDots />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Floating Particle Component
const FloatingParticle: React.FC<{ delay: number }> = ({ delay }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -30,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
};

// Loading Dots Component
const LoadingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => animateDots());
    };

    setTimeout(animateDots, 1500);
  }, []);

  return (
    <View style={styles.loadingDots}>
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 50,
    position: 'relative',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  particlesContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    top: Math.random() * 200,
    left: Math.random() * 200,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 1,
  },
  taglineContainer: {
    marginTop: 20,
  },
  tagline: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  taglineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taglineText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingSection: {
    position: 'absolute',
    bottom: 100,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default SplashScreen;
