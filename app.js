import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbICAoF4wtt8WAuH_vlpiSALDrhAs18_U",
  authDomain: "abdullah-pk-s-blog.firebaseapp.com",
  projectId: "abdullah-pk-s-blog",
  storageBucket: "abdullah-pk-s-blog.firebasestorage.app",
  messagingSenderId: "244124472259",
  appId: "1:244124472259:web:65de32f9caf1e38812e376"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let allPosts = [];
let currentActivePostId = null;

// Modal Toggles
window.toggleAuthModal = () => document.getElementById("authModal").classList.toggle("hidden");
window.toggleProfileModal = () => document.getElementById("profileModal").classList.toggle("hidden");
window.toggleReadMoreModal = () => document.getElementById("readMoreModal").classList.toggle("hidden");
window.toggleWriteModal = (reset = true) => {
  if (reset) {
    document.getElementById("editingPostId").value = "";
    document.getElementById("postTitle").value = "";
    document.getElementById("postBody").value = "";
    document.getElementById("writeModalTitle").innerText = "Inscribe Manuscript";
  }
  document.getElementById("writeModal").classList.toggle("hidden");
};

// Auth Actions
window.handleRegister = async () => {
  const e = document.getElementById("authEmail").value, p = document.getElementById("authPassword").value;
  try { await createUserWithEmailAndPassword(auth, e, p); window.toggleAuthModal(); } catch (err) { alert(err.message); }
};
window.handleLogin = async () => {
  const e = document.getElementById("authEmail").value, p = document.getElementById("authPassword").value;
  try { await signInWithEmailAndPassword(auth, e, p); window.toggleAuthModal(); } catch (err) { alert(err.message); }
};
window.handleLogout = async () => { await signOut(auth); };

// Profile Section
window.openProfile = () => {
  const user = auth.currentUser;
  if (!user) return;
  document.getElementById("profileEmail").innerText = user.email;
  const count = allPosts.filter(p => p.author === user.email).length;
  document.getElementById("profilePostCount").innerText = count;
  window.toggleProfileModal();
};

// Publish / Edit Post with Image Upload
window.handlePublish = async () => {
  const title = document.getElementById("postTitle").value;
  const body = document.getElementById("postBody").value;
  const editId = document.getElementById("editingPostId").value;
  const fileInput = document.getElementById("postImage");
  const user = auth.currentUser;

  if (!title || !body) return alert("Fill in title and body.");

  try {
    let imageUrl = "";
    if (fileInput.files[0]) {
      const file = fileInput.files[0];
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    if (editId) {
      const docData = { title, content: body };
      if (imageUrl) docData.imageUrl = imageUrl;
      await updateDoc(doc(db, "posts", editId), docData);
    } else {
      await addDoc(collection(db, "posts"), {
        title, content: body, author: user ? user.email : "Anonymous Scribe",
        createdAt: new Date(), imageUrl
      });
    }

    window.toggleWriteModal();
    loadPosts();
  } catch (err) { alert(err.message); }
};

// Delete Post
window.handleDelete = async (id) => {
  if (confirm("Are you sure you want to delete this manuscript?")) {
    await deleteDoc(doc(db, "posts", id));
    loadPosts();
  }
};

// Edit Modal Setup
window.handleEdit = (id) => {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
  document.getElementById("editingPostId").value = id;
  document.getElementById("postTitle").value = post.title;
  document.getElementById("postBody").value = post.content;
  document.getElementById("writeModalTitle").innerText = "Edit Manuscript";
  window.toggleWriteModal(false);
};

// Search Filter
window.handleSearch = () => {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allPosts.filter(p => 
    p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term)
  );
  renderPosts(filtered);
};

// Read More & PDF Export
window.openReadMore = async (id) => {
  currentActivePostId = id;
  const post = allPosts.find(p => p.id === id);
  if (!post) return;

  document.getElementById("readTitle").innerText = post.title;
  document.getElementById("readMeta").innerText = `Inscribed by ${post.author}`;
  document.getElementById("readBody").innerText = post.content;
  document.getElementById("readImageContainer").innerHTML = post.imageUrl 
    ? `<img src="${post.imageUrl}" style="max-width:100%; margin:10px 0;">` : "";

  await loadComments(id);
  window.toggleReadMoreModal();
};

window.downloadPDF = () => {
  const element = document.getElementById("pdfContent");
  html2pdf().from(element).save("manuscript.pdf");
};

// Comments Management
async function loadComments(postId) {
  const container = document.getElementById("commentsContainer");
  container.innerHTML = "Loading comments...";
  const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  
  let html = "";
  snap.forEach(d => {
    const c = d.data();
    html += `<div class="comment-item"><strong>${c.author}:</strong> ${c.text}</div>`;
  });
  container.innerHTML = html || "<p>No comments yet.</p>";
}

window.handleAddComment = async () => {
  const text = document.getElementById("commentInput").value;
  const user = auth.currentUser;
  if (!text) return;

  await addDoc(collection(db, `posts/${currentActivePostId}/comments`), {
    text, author: user ? user.email : "Anonymous", createdAt: new Date()
  });
  document.getElementById("commentInput").value = "";
  loadComments(currentActivePostId);
};

// Render Functions
function renderPosts(posts) {
  const container = document.getElementById("postsContainer");
  if (!posts.length) {
    container.innerHTML = "<p>No manuscripts found.</p>";
    return;
  }

  const user = auth.currentUser;
  container.innerHTML = posts.map(p => `
    <article class="book-card">
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="book-cover-img">` : ""}
      <h3>${p.title}</h3>
      <p class="post-meta">By ${p.author}</p>
      <p>${p.content.substring(0, 100)}...</p>
      <button class="read-more-btn" onclick="window.openReadMore('${p.id}')">Read More</button>
      ${user && user.email === p.author ? `
        <button class="action-btn" onclick="window.handleEdit('${p.id}')">Edit</button>
        <button class="action-btn" onclick="window.handleDelete('${p.id}')">Delete</button>
      ` : ""}
    </article>
  `).join("");
}

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPosts(allPosts);
}

function renderNav(user) {
  const nav = document.getElementById("navLinks");
  nav.innerHTML = user ? `
    <button onclick="window.openProfile()">Profile</button>
    <button onclick="window.toggleWriteModal()">Write</button>
    <button onclick="window.handleLogout()">Sign Out</button>
  ` : `<button onclick="window.toggleAuthModal()">Scribe Login</button>`;
}

onAuthStateChanged(auth, (user) => {
  renderNav(user);
  loadPosts();
});