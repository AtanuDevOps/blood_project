// -------------------------------------------------------------------------
// FIREBASE CONFIGURATION
// -------------------------------------------------------------------------
// INSTRUCTIONS:
// 1. Go to Firebase Console > Project Settings > General > Your apps
// 2. Copy the "firebaseConfig" object (SDK setup and configuration)
// 3. PASTE it below to replace the placeholder const firebaseConfig = { ... };
// -------------------------------------------------------------------------

const firebaseConfig = {
    apiKey: "AIzaSyDMUghG0jF3lRPC_7LZpMGD2fC3S73-Aos",
    authDomain: "blood-d19dd.firebaseapp.com",
    projectId: "blood-d19dd",
    storageBucket: "blood-d19dd.firebasestorage.app",
    messagingSenderId: "67230824613",
    appId: "1:672308246138:web:ec5e7715f02b77ecc32dc3"
};

// Initialize Firebase
// (Using the compat libraries loaded in HTML)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    
    // Initialize Services
    const auth = firebase.auth();
    const db = firebase.firestore();

    console.log("Firebase Initialized Successfully");
} else {
    console.error("Firebase SDK not found. Make sure script tags are in HTML.");
}
