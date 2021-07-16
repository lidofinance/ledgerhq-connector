export const isHIDSupported = () => {
  try {
    return 'hid' in window.navigator;
  } catch (error) {
    return false;
  }
};
