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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile
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

// Initialize Firebase Analytics (gracefully safe if blocked by ad-blockers)
let analytics = null;
try {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
        logEvent(analytics, 'app_initialized', {
          app_name: 'KURA Cyber-Arcade',
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }).catch(() => {});
} catch (e) {}

// Initialize Firebase Auth & Google Auth Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Helper: Verify whether Google Auth provider has been enabled in Firebase Console
let googleProviderConfigured = null;
async function verifyGoogleProvider() {
  if (googleProviderConfigured !== null) return googleProviderConfigured;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'google.com',
        continueUri: window.location.origin
      })
    });
    const data = await res.json().catch(() => ({}));
    if (data.error && data.error.message === 'CONFIGURATION_NOT_FOUND') {
      googleProviderConfigured = false;
      return false;
    }
    googleProviderConfigured = true;
    return true;
  } catch (e) {
    return true;
  }
}

verifyGoogleProvider().catch(() => {});

// Helper 1: Real Firebase Google Sign-In with Popup
async function signInWithGoogle() {
  const isConfigured = await verifyGoogleProvider();
  if (isConfigured === false) {
    return {
      success: false,
      code: 'auth/configuration-not-found',
      message: 'Google Sign-In is not activated yet in the Firebase Console.',
      needsConsoleSetup: true,
      consoleUrl: 'https://console.firebase.google.com/project/kura-play/authentication/providers'
    };
  }

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
        photoURL: user.photoURL,
        provider: 'google'
      }
    };
  } catch (error) {
    console.warn('[Kura Firebase] Google Auth Error or Cancelled:', error.code || error.message);
    
    const isStillConfigured = await verifyGoogleProvider();
    if (isStillConfigured === false || error.code === 'auth/configuration-not-found') {
      return {
        success: false,
        code: 'auth/configuration-not-found',
        message: 'Google Sign-In is not activated yet in the Firebase Console.',
        needsConsoleSetup: true,
        consoleUrl: 'https://console.firebase.google.com/project/kura-play/authentication/providers'
      };
    }

    let friendlyMessage = 'Google authentication failed.';
    if (error.code === 'auth/popup-closed-by-user') {
      friendlyMessage = 'Google Sign-In popup was closed before completing.';
    } else if (error.code === 'auth/popup-blocked') {
      friendlyMessage = 'Popup was blocked by your browser. Please allow popups for this site.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      friendlyMessage = 'Sign-in cancelled due to multiple open popups.';
    } else if (error.code === 'auth/unauthorized-domain') {
      return {
        success: false,
        code: 'auth/unauthorized-domain',
        message: 'Domain not authorized in Firebase Console.',
        needsConsoleSetup: true,
        consoleUrl: 'https://console.firebase.google.com/project/kura-play/authentication/settings'
      };
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

// Helper 2: Firebase Email & Password Login
async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;
    if (analytics) {
      try { logEvent(analytics, 'login', { method: 'email' }); } catch (e) {}
    }
    return {
      success: true,
      user: {
        uid: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || '',
        provider: 'email'
      }
    };
  } catch (error) {
    console.warn('[Kura Firebase] Email Login Error:', error.code, error.message);
    let message = error.message;
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      message = 'Invalid email or password. Please verify credentials or sign up.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email format. Please enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed login attempts. Please reset password or wait a few minutes.';
    }
    return { success: false, code: error.code, message };
  }
}

// Helper 3: Firebase Email & Password Registration (Sign Up)
async function signUpWithEmail(email, password, callsign = '') {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;
    if (callsign && callsign.trim()) {
      try {
        await updateProfile(user, { displayName: callsign.trim() });
      } catch (e) {}
    }
    if (analytics) {
      try { logEvent(analytics, 'sign_up', { method: 'email' }); } catch (e) {}
    }
    return {
      success: true,
      user: {
        uid: user.uid,
        displayName: callsign.trim() || user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || '',
        provider: 'email'
      }
    };
  } catch (error) {
    console.warn('[Kura Firebase] Email SignUp Error:', error.code, error.message);
    let message = error.message;
    if (error.code === 'auth/email-already-in-use') {
      message = 'An account with this email already exists. Please log in instead.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Security password must be at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email format. Please enter a valid email address.';
    }
    return { success: false, code: error.code, message };
  }
}

// Helper 4: Firebase Phone Number Auth — Send SMS OTP
let phoneRecaptchaVerifier = null;
let currentPhoneConfirmation = null;

async function sendPhoneOtp(phoneNumber, containerId = 'recaptcha-phone-container') {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Missing container element [${containerId}] for phone verification.`);
    }

    if (!phoneRecaptchaVerifier) {
      phoneRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('[Kura Firebase] Phone reCAPTCHA verified.');
        },
        'expired-callback': () => {
          console.warn('[Kura Firebase] Phone reCAPTCHA expired.');
        }
      });
      await phoneRecaptchaVerifier.render();
    }

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    const confirmation = await signInWithPhoneNumber(auth, cleanPhone, phoneRecaptchaVerifier);
    currentPhoneConfirmation = confirmation;
    window._kuraPhoneConfirmation = confirmation;

    if (analytics) {
      try { logEvent(analytics, 'phone_otp_sent'); } catch (e) {}
    }

    return { success: true, confirmation };
  } catch (error) {
    console.warn('[Kura Firebase] Phone OTP Send Error:', error.code, error.message);
    let message = error.message;
    if (error.code === 'auth/invalid-phone-number') {
      message = 'Invalid phone number format. Please include country code (e.g. +1... or +91...).';
    } else if (error.code === 'auth/quota-exceeded') {
      message = 'SMS quota reached for this Firebase project. Please try Email or Google login.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many SMS requests sent. Please wait a few minutes before requesting another code.';
    }

    if (phoneRecaptchaVerifier && typeof phoneRecaptchaVerifier.clear === 'function') {
      try { phoneRecaptchaVerifier.clear(); } catch (e) {}
      phoneRecaptchaVerifier = null;
    }

    return { success: false, code: error.code, message };
  }
}

// Helper 5: Firebase Phone Number Auth — Verify SMS OTP Code
async function verifyPhoneOtp(otpCode, callsign = '') {
  const confirmation = currentPhoneConfirmation || window._kuraPhoneConfirmation;
  if (!confirmation) {
    return { success: false, message: 'No active SMS verification session found. Please transmit an OTP first.' };
  }

  try {
    const cleanOtp = String(otpCode).trim();
    const userCredential = await confirmation.confirm(cleanOtp);
    const user = userCredential.user;

    if (callsign && callsign.trim()) {
      try {
        await updateProfile(user, { displayName: callsign.trim() });
      } catch (e) {}
    }

    if (analytics) {
      try { logEvent(analytics, 'login', { method: 'phone' }); } catch (e) {}
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        displayName: callsign.trim() || user.displayName || user.phoneNumber,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL || '',
        provider: 'phone'
      }
    };
  } catch (error) {
    console.warn('[Kura Firebase] Phone OTP Verify Error:', error.code, error.message);
    let message = error.message;
    if (error.code === 'auth/invalid-verification-code') {
      message = 'Invalid 6-digit SMS verification code. Please check your SMS and retry.';
    } else if (error.code === 'auth/code-expired') {
      message = 'SMS verification code has expired. Please request a new code.';
    }
    return { success: false, code: error.code, message };
  }
}

// Helper: Real Firebase Sign-Out
async function signOutUser() {
  try {
    await signOut(auth);
    if (analytics) {
      try { logEvent(analytics, 'logout'); } catch (e) {}
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
  signInWithEmail,
  signUpWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  signOutUser,
  signOut: signOutUser,
  onAuthStateChanged: subscribeAuthState,
  verifyGoogleProvider,
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
  signInWithEmail,
  signUpWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  signOutUser, 
  subscribeAuthState as onAuthStateChanged, 
  trackEvent, 
  firebaseConfig 
};
