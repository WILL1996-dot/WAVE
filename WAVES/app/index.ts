
import { registerRootComponent } from 'expo';
import { registerGlobals } from '@livekit/react-native';

// Register native WebRTC support before loading the WAVES app.
registerGlobals();

// Load App only after LiveKit has registered its globals.
const App = require('./App').default;

registerRootComponent(App);
