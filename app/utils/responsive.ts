import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Based on guidelines from react-native-size-matters / scaled-size
const guidelineBaseWidth = 350; // good baseline for mobile devices
const guidelineBaseHeight = 680;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const isSmallDevice = width < 380;
export const isVerySmallDevice = width < 340;

// Utility to convert px-like numbers or style objects quickly
export const rem = (n: number) => moderateScale(n);

// Platform safe pixel rounding (optional)
export const px = (n: number) => Math.round(n);

export default {
  width,
  height,
  scale,
  verticalScale,
  moderateScale,
  isSmallDevice,
  isVerySmallDevice,
  rem,
  px,
};
