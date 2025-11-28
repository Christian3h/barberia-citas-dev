// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBt_CwSEQTkUlSohOosEblLwtXxmHEi5sc",
  authDomain: "barberia-7841d.firebaseapp.com",
  projectId: "barberia-7841d",
  storageBucket: "barberia-7841d.firebasestorage.app",
  messagingSenderId: "107382493890",
  appId: "1:107382493890:web:73633d612a1940a338215b",
  measurementId: "G-6PHRG0G9BD"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
