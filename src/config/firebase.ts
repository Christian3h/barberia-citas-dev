// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA50Akf_FC6eR8hh-FwPfSUw1PyCYd5ESQ",
  authDomain: "barberia-cotas.firebaseapp.com",
  projectId: "barberia-cotas",
  storageBucket: "barberia-cotas.firebasestorage.app",
  messagingSenderId: "801708801389",
  appId: "1:801708801389:web:ae8fdab41f42ee1379ae64",
  measurementId: "G-5NW4Y1W9GB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
