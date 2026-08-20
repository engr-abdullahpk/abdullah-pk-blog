console.log("App script initialized successfully!");

// 1. Firebase Module Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. Firebase Configuration (Paste your actual values here)
const firebaseConfig = {
  apiKey: "AIzaSyAbICAoF4wtt8WAuH_vlpiSALDrhAs18_U",
  authDomain: "abdullah-pk-s-blog.firebaseapp.com",
  projectId: "abdullah-pk-s-blog",
  storageBucket: "abdullah-pk-s-blog.firebasestorage.app",
  messagingSenderId: "244124472259",
  appId: "1:244124472259:web:65de32f9caf1e38812e376"
};

// 3. Initialize Firebase & Auth Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initial Sample Posts Data (Fallback render)
const defaultPosts = [
  {
    id: "1",
    title: "Welcome to the Antique Scribe",
    date: "August 19, 2026",
    author: "Abdullah Pk",
    content: "Greetings traveler. This blog operates as an ancient parchment manuscript preserved across time. Feel free to explore, comment, or authenticate as a scribe."
  }
];

// 4. Bind Modal Handlers to Global Window
window.toggleAuthModal = function() {
  const modal = document.getElementById("authModal");
  if (modal) modal.classList.toggle("hidden");
};

window.toggleWriteModal = function() {
  const modal = document.getElementById("writeModal");
  if (modal) modal.classList.toggle("hidden");
};

// 5. Real Firebase Authentication Handlers
window.handleRegister = async function() {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  if (!email || !password) {
    return alert("Please enter both an email and password.");
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    alert(`Account created successfully! Welcome, ${userCredential.user.email}`);
    window.toggleAuthModal();
  } catch (error) {
    alert(`Registration Error: ${error.message}`);
  }
};

window.handleLogin = async function() {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  if (!email || !password) {
    return alert("Please enter both an email and password.");
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    alert(`Signed in as ${userCredential.user.email}`);
    window.toggleAuthModal();
  } catch (error) {
    alert(`Sign In Error: ${error.message}`);
  }
};

window.handleLogout = async function() {
  try {
    await signOut(auth);
    alert("Signed out successfully.");
  } catch (error) {
    alert(`Sign Out Error: ${error.message}`);
  }
};

window.handlePublish = function() {
  const title = document.getElementById("postTitle").value;
  const body = document.getElementById("postBody").value;
  if (!title || !body) return alert("Please fill out both the title and manuscript body.");

  const currentUser = auth.currentUser;
  const authorName = currentUser ? currentUser.email : "Anonymous Scribe";

  defaultPosts.unshift({
    id: Date.now().toString(),
    title: title,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    author: authorName,
    content: body
  });

  document.getElementById("postTitle").value = "";
  document.getElementById("postBody").value = "";
  window.toggleWriteModal();
  renderPosts();
};

// 6. Navigation and Post Rendering
function renderNav(isLoggedIn = false) {
  const nav = document.getElementById("navLinks");
  if (!nav) return;

  if (isLoggedIn) {
    nav.innerHTML = `
      <button onclick="window.toggleWriteModal()">Write Manuscript</button>
      <button onclick="window.handleLogout()">Sign Out</button>
    `;
  } else {
    nav.innerHTML = `
      <button onclick="window.toggleAuthModal()">Scribe Login</button>
    `;
  }
}

function renderPosts() {
  const container = document.getElementById("postsContainer");
  if (!container) return;

  container.innerHTML = defaultPosts.map(post => `
    <article class="post-card">
      <h2 class="post-title">${post.title}</h2>
      <div class="post-meta">Inscribed by ${post.author} on ${post.date}</div>
      <div class="post-body-full">${post.content}</div>
    </article>
  `).join("");
}

// 7. Auto Listener for Authentication State Changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.email);
    renderNav(true);
  } else {
    console.log("No user logged in.");
    renderNav(false);
  }
});

// 8. Application Initialization
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded.");
  renderPosts();
});