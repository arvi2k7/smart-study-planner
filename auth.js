import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ---------- Signup ----------
const signupForm = document.getElementById("signup-form");

if (signupForm) {
    signupForm.addEventListener("submit", e => {
        e.preventDefault();

        const email =
            document.getElementById("signup-email").value;
        const password =
            document.getElementById("signup-password").value;

        createUserWithEmailAndPassword(auth, email, password)
            .catch(err => alert(err.message));
    });
}

// ---------- Login ----------
const loginForm = document.getElementById("login-form");

if (loginForm) {
    loginForm.addEventListener("submit", e => {
        e.preventDefault();

        const email =
            document.getElementById("login-email").value;
        const password =
            document.getElementById("login-password").value;

        signInWithEmailAndPassword(auth, email, password)
            .catch(err => alert(err.message));
    });
}

// ---------- Redirect on auth state ----------
onAuthStateChanged(auth, user => {
    if (user) {
        // Logged in → go to dashboard
        if (
            location.pathname.includes("login") ||
            location.pathname.includes("signup")
        ) {
            window.location.href = "index.html";
        }
    }
});
