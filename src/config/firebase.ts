// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD2mRu9hp8JeayIffm01XKsI82LJ9f7_2Y",
  authDomain: "barberia-elite-838bf.firebaseapp.com",
  projectId: "barberia-elite-838bf",
  storageBucket: "barberia-elite-838bf.firebasestorage.app",
  messagingSenderId: "298314847993",
  appId: "1:298314847993:web:deb21be08725a0d105f428",
  measurementId: "G-WMDCKS1XK5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
