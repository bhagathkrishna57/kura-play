// ==============================================================
// KURA CYBER-ARCADE // FIREBASE INITIALIZATION & TELEMETRY
// ==============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics, isSupported, logEvent } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Official Firebase configuration for Kura Cyber-Arcade
const firebaseConfig = {
  apiKey: "AIzaSyDc55x5cTfsyiBLONSfz99tXYmO3iEyJFo",
  authDomain: "kura-play.firebaseapp.com",
  projectId: "kura-play",
  storageBucket: "kura-play.firebasestorage.app",
  messagingSenderId: "282523951472",
  appId: "1:282523951472:web:6de398e241c48c99ecafb5",
  measurementId: "G-2NGKRDMDFE"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (conditionally if supported by browser)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    try {
      logEvent(analytics, 'app_initialized', {
        app_name: 'KURA Cyber-Arcade',
        timestamp: Date.now()
      });
    } catch (e) {}
  }
}).catch((err) => {
  console.warn('[Kura Firebase] Analytics initialization deferred:', err.message);
});

// Initialize Firebase Auth & Google Auth Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Helper: Real Firebase Google Sign-In with Popup
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (analytics) {
      try { logEvent(analytics, 'login', { method: 'google' }); } catch (e) {}
    }
    return {
      success: true,
      user: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }
    };
  } catch (error) {
    console.warn('[Kura Firebase] Google Auth Error or Cancelled:', error.code || error.message);
    let friendlyMessage = 'Google authentication failed.';
    if (error.code === 'auth/popup-closed-by-user') {
      friendlyMessage = 'Google Sign-In popup was closed before completing.';
    } else if (error.code === 'auth/popup-blocked') {
      friendlyMessage = 'Popup was blocked by your browser. Please allow popups for this site.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      friendlyMessage = 'Sign-in cancelled due to multiple open popups.';
    } else if (error.message) {
      friendlyMessage = error.message;
    }
    return {
      success: false,
      code: error.code,
      message: friendlyMessage
    };
  }
}

// Helper: Real Firebase Sign-Out
async function signOutUser() {
  try {
    await signOut(auth);
    if (analytics) {
      try { logEvent(analytics, 'logout', { method: 'google' }); } catch (e) {}
    }
    return { success: true };
  } catch (error) {
    console.warn('[Kura Firebase] SignOut Error:', error);
    return { success: false, error: error.message };
  }
}

// Helper: Global Auth State Listener
function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// Helper: Log custom analytics event
function trackEvent(eventName, params = {}) {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  } catch (e) {
    // silent
  }
}

// Export for global access in Kura arcade components
window.KuraFirebase = {
  app,
  analytics,
  auth,
  googleProvider,
  signInWithGoogle,
  signOutUser,
  signOut: signOutUser,
  onAuthStateChanged: subscribeAuthState,
  trackEvent,
  config: firebaseConfig,
  isReady: true
};

window.firebaseApp = app;

// Signal ready event to any asynchronous listeners
window.dispatchEvent(new CustomEvent('kura-firebase-ready', { detail: window.KuraFirebase }));

console.log('⚡ [KURA FIREBASE] Connected to Firebase Project [kura-play]');

export { 
  app, 
  analytics, 
  auth, 
  googleProvider, 
  signInWithGoogle, 
  signOutUser, 
  subscribeAuthState as onAuthStateChanged, 
  trackEvent, 
  firebaseConfig 
};
