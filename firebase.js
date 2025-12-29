// Firebase core
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// Auth
import { getAuth } from
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firestore
import { getFirestore } from
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDpFJP5PPZTjDFKEclH3FVW_9zRXqzHm3s",
    authDomain: "smart-study-planner-1ce05.firebaseapp.com",
    projectId: "smart-study-planner-1ce05",
    appId: "1:603891925160:web:02c37cb0410277050f829d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
