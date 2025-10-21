import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Detect tablet vs phone heuristics
export const isTablet = Math.min(width, height) >= 600 || Math.max(width, height) >= 900;

// Adjust guideline base sizes for tablet vs phone
const guidelineBaseWidth = isTablet ? 820 : 350;
const guidelineBaseHeight = isTablet ? 1180 : 680;

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
