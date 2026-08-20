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
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbICAoF4wtt8WAuH_vlpiSALDrhAs18_U",
  authDomain: "abdullah-pk-s-blog.firebaseapp.com",
  projectId: "abdullah-pk-s-blog",
  storageBucket: "abdullah-pk-s-blog.firebasestorage.app",
  messagingSenderId: "244124472259",
  appId: "1:244124472259:web:65de32f9caf1e38812e376"
};

// 3. Initialize Firebase, Auth, & Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Global Window Modal Handlers
window.toggleAuthModal = function() {
  const modal = document.getElementById("authModal");
  if (modal) modal.classList.toggle("hidden");
};

window.toggleWriteModal = function() {
  const modal = document.getElementById("writeModal");
  if (modal) modal.classList.toggle("hidden");
};

// 5. Authentication Handlers
window.handleRegister = async function() {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  if (!email || !password) return alert("Please fill in all fields.");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created successfully!");
    window.toggleAuthModal();
  } catch (error) {
    alert(`Registration Error: ${error.message}`);
  }
};

window.handleLogin = async function() {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  if (!email || !password) return alert("Please fill in all fields.");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Signed in successfully!");
    window.toggleAuthModal();
  } catch (error) {
    alert(`Login Error: ${error.message}`);
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

// 6. Save Manuscript to Firestore
window.handlePublish = async function() {
  const title = document.getElementById("postTitle").value;
  const body = document.getElementById("postBody").value;
  if (!title || !body) return alert("Please fill out both the title and manuscript body.");

  const currentUser = auth.currentUser;
  const authorName = currentUser ? currentUser.email : "Anonymous Scribe";

  try {
    await addDoc(collection(db, "posts"), {
      title: title,
      content: body,
      author: authorName,
      createdAt: new Date()
    });

    document.getElementById("postTitle").value = "";
    document.getElementById("postBody").value = "";
    window.toggleWriteModal();
    loadPosts();
  } catch (error) {
    alert(`Publishing Error: ${error.message}`);
  }
};

// 7. Dynamic Navigation UI
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

// 8. Load Posts Live from Firestore
async function loadPosts() {
  const container = document.getElementById("postsContainer");
  if (!container) return;

  try {
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(postsQuery);
    
    if (querySnapshot.empty) {
      container.innerHTML = `<p style="text-align:center; color: #d4af37;">No manuscripts found in the archives yet.</p>`;
      return;
    }

    let postsHTML = "";
    querySnapshot.forEach((doc) => {
      const post = doc.data();
      const dateString = post.createdAt 
        ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
        : "Ancient Date";
      
      postsHTML += `
        <article class="post-card">
          <h2 class="post-title">${post.title}</h2>
          <div class="post-meta">Inscribed by ${post.author} on ${dateString}</div>
          <div class="post-body-full">${post.content}</div>
        </article>
      `;
    });

    container.innerHTML = postsHTML;
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

// 9. Auth State Listener
onAuthStateChanged(auth, (user) => {
  renderNav(!!user);
});

// 10. Application Initialization
document.addEventListener("DOMContentLoaded", () => {
  loadPosts();
});