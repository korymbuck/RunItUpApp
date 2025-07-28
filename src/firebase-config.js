// Import from the full CDN URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDk-n02q6hW_41tCnLw4oaYYjEh3codxcw",
  authDomain: "runit-91e6f.firebaseapp.com",
  projectId: "runit-91e6f",
  storageBucket: "runit-91e6f.appspot.com",
  messagingSenderId: "1098137720623",
  appId: "1:1098137720623:web:48a6cb82eb37a08fd6b3da",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
