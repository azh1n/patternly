import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCMyFc50nQcJVRPWAJr7Hjf7TI-GOj7sjw",
    authDomain: "azh1ns-dojo.firebaseapp.com",
    projectId: "azh1ns-dojo",
    storageBucket: "azh1ns-dojo.firebasestorage.app",
    messagingSenderId: "405678442359",
    appId: "1:405678442359:web:395dcbf3d73d9776260372",
    measurementId: "G-SFYEETJTT6"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db } 