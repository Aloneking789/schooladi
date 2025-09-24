import { StatusBar, Platform } from 'react-native';

export const configureStatusBar = () => {
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('#000000', true);
    StatusBar.setBarStyle('light-content', true);
    StatusBar.setTranslucent(false);
  } else {
    StatusBar.setBarStyle('light-content', true);
  }
};

export const forceBlackStatusBar = () => {
  StatusBar.setBarStyle('light-content', true);
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor('#000000', true);
  }
};

export const hideStatusBar = () => {
  StatusBar.setHidden(true, 'fade');
};
