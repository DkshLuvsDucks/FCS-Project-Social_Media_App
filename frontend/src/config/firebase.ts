// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDS3zM7mNwSUDNgvuSnPNC46u3VEdVNZ6o",
  authDomain: "vendr-55387.firebaseapp.com",
  projectId: "vendr-55387",
  storageBucket: "vendr-55387.firebasestorage.app",
  messagingSenderId: "671976055716",
  appId: "1:671976055716:web:827255cca32986b7b75731",
  measurementId: "G-SKNDBXF4TE"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(firebaseApp);

export default firebaseApp; 