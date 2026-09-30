import { NativeModule, requireNativeModule } from 'expo';

declare class TelephonyModule extends NativeModule<{}> {}

export default requireNativeModule<TelephonyModule>('Telephony');
