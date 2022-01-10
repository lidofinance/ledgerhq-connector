export const isHIDSupported = () => {
  try {
    return 'hid' in window.navigator;
  } catch (error) {
    return false;
  }
};

export const checkError = (error: any): never => {
  if (error.statusText === 'INS_NOT_SUPPORTED') {
    error.message =
      'Device is not supported. Make sure the Ethereum app is open on the device.';
  }

  if (error.statusText === 'UNKNOWN_ERROR') {
    error.message =
      'Unknown error. Make sure the device is connected and the Ethereum app is open on the device.';
  }

  if (error.statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED') {
    error.message = 'User rejected the request';
  }

  throw error;
};
