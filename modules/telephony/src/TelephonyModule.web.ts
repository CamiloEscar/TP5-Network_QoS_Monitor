import { registerWebModule, NativeModule } from 'expo';

// TelephonyModule is not available on the web platform.
class TelephonyModule extends NativeModule<{}> {}

export default registerWebModule(TelephonyModule, 'TelephonyModule');
