import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, 
  onAuthStateChanged, sendPasswordResetEmail, updateProfile, updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// State Variables
let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
const postsPerPage = 10;
let activePostId = null;

// Modal Toggles
window.toggleAuthModal = () => document.getElementById("authModal").classList.toggle("hidden");
window.toggleProfileModal = () => {
  if (auth.currentUser) renderUserProfile();
  document.getElementById("profileModal").classList.toggle("hidden");
};
window.toggleWriteModal = (reset = true) => {
  if (reset) {
    document.getElementById("editingPostId").value = "";
    document.getElementById("postTitle").value = "";
    document.getElementById("editorBody").innerHTML = "";
    document.getElementById("writeModalTitle").innerText = "Inscribe New Manuscript";
  }
  document.getElementById("writeModal").classList.toggle("hidden");
};

// Enter key & authentication form handlers
window.handleAuthSubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value;
  const pass = document.getElementById("authPassword").value;
  if (!email || !pass) return alert("Fill in email and password.");

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.toggleAuthModal();
  } catch (err) { alert(err.message); }
};

window.handleEmailRegister = async () => {
  const email = document.getElementById("authEmail").value;
  const pass = document.getElementById("authPassword").value;
  if (!email || !pass) return alert("Fill in email and password.");

  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    alert("Account created successfully!");
    window.toggleAuthModal();
  } catch (err) { alert(err.message); }
};

window.handleForgotPassword = async (e) => {
  e.preventDefault();
  const email = document.getElementById("authEmail").value;
  if (!email) return alert("Please enter your email address first.");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent! Check your inbox.");
  } catch (err) { alert(err.message); }
};

window.handleLogout = async () => { await signOut(auth); };

// Profile Management with Image Compression
function renderUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  document.getElementById("profileEmailDisplay").innerText = user.email;
  document.getElementById("profileNameDisplay").innerText = user.displayName || "Not Set";
  if (user.photoURL) document.getElementById("profileAvatar").src = user.photoURL;

  const userPosts = allPosts.filter(p => p.authorId === user.uid || p.author === user.email);
  const container = document.getElementById("userPostsContainer");
  container.innerHTML = userPosts.length ? userPosts.map(p => `
    <div style="margin: 8px 0; padding: 8px; border-bottom: 1px dashed #8b5a2b; display:flex; justify-content:space-between; align-items:center;">
      <span>${p.title}</span>
      <div>
        <button onclick="window.handleEdit('${p.id}')">Edit</button>
        <button onclick="window.handleDeletePost('${p.id}')">Delete</button>
      </div>
    </div>
  `).join("") : "<p>No manuscripts inscribed yet.</p>";
}

window.handleUpdateProfile = async () => {
  const user = auth.currentUser;
  const name = document.getElementById("editDisplayName").value.trim();
  const fileInput = document.getElementById("editAvatarInput");

  if (!user) return alert("You must be logged in.");

  const updates = {};
  if (name) updates.displayName = name;

  if (fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = async () => {
        // Resize avatar to 150x150 JPEG for optimal Firebase profile storage
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 150;
        canvas.height = 150;
        ctx.drawImage(img, 0, 0, 150, 150);
        
        const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        updates.photoURL = optimizedDataUrl;

        try {
          await updateProfile(user, updates);
          document.getElementById("profileAvatar").src = optimizedDataUrl;
          if (name) document.getElementById("profileNameDisplay").innerText = name;
          alert("Profile & Avatar updated successfully!");
        } catch (err) {
          alert("Failed to update profile image: " + err.message);
        }
      };
    };
    reader.readAsDataURL(file);
  } else if (name) {
    try {
      await updateProfile(user, updates);
      document.getElementById("profileNameDisplay").innerText = name;
      alert("Display Name updated successfully!");
    } catch (err) {
      alert("Error updating profile: " + err.message);
    }
  }
};

window.handleChangePassword = async () => {
  const user = auth.currentUser;
  const newPass = document.getElementById("newPasswordInput").value;
  if (!newPass || newPass.length < 6) return alert("Password must be at least 6 characters.");

  try {
    await updatePassword(user, newPass);
    alert("Password updated successfully!");
    document.getElementById("newPasswordInput").value = "";
  } catch (err) { alert(err.message); }
};

// Rich Text Editor Commands
window.execEditorCmd = (cmd, val = null) => {
  document.execCommand(cmd, false, val);
};

window.insertTable = () => {
  const html = `<table border="1"><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></table>`;
  document.execCommand('insertHTML', false, html);
};

// Manuscript Publishing & Image Base64 Handler
window.handlePublish = async () => {
  const title = document.getElementById("postTitle").value;
  const body = document.getElementById("editorBody").innerHTML;
  const editId = document.getElementById("editingPostId").value;
  const fileInput = document.getElementById("postImage");
  const user = auth.currentUser;

  if (!title || !body) return alert("Fill in title and body.");

  const processPost = async (imageUrl = "") => {
    if (editId) {
      const docData = { title, content: body };
      if (imageUrl) docData.imageUrl = imageUrl;
      await updateDoc(doc(db, "posts", editId), docData);
    } else {
      await addDoc(collection(db, "posts"), {
        title, content: body, author: user.displayName || user.email,
        authorId: user.uid, createdAt: new Date(), imageUrl
      });
    }
    window.toggleWriteModal();
    loadPosts();
  };

  if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => processPost(e.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    processPost();
  }
};

window.handleEdit = (id) => {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
  document.getElementById("editingPostId").value = id;
  document.getElementById("postTitle").value = post.title;
  document.getElementById("editorBody").innerHTML = post.content;
  document.getElementById("writeModalTitle").innerText = "Edit Manuscript";
  document.getElementById("profileModal").classList.add("hidden");
  window.toggleWriteModal(false);
};

window.handleDeletePost = async (id) => {
  if (confirm("Delete manuscript?")) {
    await deleteDoc(doc(db, "posts", id));
    window.closeBookModal();
    loadPosts();
  }
};

// Search & Pagination Logic
window.handleSearch = () => {
  const term = document.getElementById("searchInput").value.toLowerCase();
  filteredPosts = allPosts.filter(p => p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term));
  currentPage = 1;
  renderPaginatedPosts();
};

window.changePage = (dir) => { currentPage += dir; renderPaginatedPosts(); };

function renderPaginatedPosts() {
  const container = document.getElementById("postsContainer");
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * postsPerPage;
  const pagePosts = filteredPosts.slice(start, start + postsPerPage);

  document.getElementById("pageIndicator").innerText = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled = currentPage === totalPages;

  container.innerHTML = pagePosts.map(p => `
    <article class="post-card parchment-bg">
      <div>
        <h3>${p.title}</h3>
        <div class="post-card-meta">Inscribed by ${p.author}</div>
        <div class="post-card-snippet">${p.content.replace(/<[^>]*>/g, '').substring(0, 120)}...</div>
      </div>
      <button class="see-more-btn" onclick="window.openBookModal('${p.id}')">See More</button>
    </article>
  `).join("");
}

// 3D Fullscreen Animation Controls
window.openBookModal = async (id) => {
  activePostId = id;
  const post = allPosts.find(p => p.id === id);
  if (!post) return;

  document.getElementById("readTitle").innerText = post.title;
  document.getElementById("coverTitleDisplay").innerText = post.title;
  
  const formattedDate = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : "Ancient Date";
  document.getElementById("readMeta").innerText = `Inscribed by ${post.author} on ${formattedDate}`;
  document.getElementById("readBody").innerHTML = post.content;
  document.getElementById("readImageContainer").innerHTML = post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:100%; margin:15px 0;">` : "";

  const user = auth.currentUser;
  document.getElementById("pdfDownloadSection").classList.toggle("hidden", !user);
  document.getElementById("commentFormSection").classList.toggle("hidden", !user);
  document.getElementById("commentSignInNotice").classList.toggle("hidden", !!user);

  await loadComments(id);
  const bookModal = document.getElementById("bookModal");
  bookModal.classList.remove("hidden");
  setTimeout(() => document.getElementById("bookElement").classList.add("open"), 100);
};

window.closeBookModal = () => {
  document.getElementById("bookElement").classList.remove("open");
  setTimeout(() => document.getElementById("bookModal").classList.add("hidden"), 600);
};

window.downloadPDF = () => {
  const element = document.getElementById("printableArea");
  html2pdf().set({
    margin: 15, filename: 'manuscript.pdf', html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' }
  }).from(element).save();
};

// Reaction & Comments Logic
async function loadComments(postId) {
  const container = document.getElementById("commentsContainer");
  const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const user = auth.currentUser;

  let html = "";
  snap.forEach(d => {
    const c = d.data();
    const isOwner = user && (user.uid === c.authorId);
    html += `<div class="comment-item"><strong>${c.author}:</strong> ${c.text}${isOwner ? `<button onclick="window.handleDeleteComment('${postId}', '${d.id}')" style="float:right; color:red; border:none; background:none;">&times;</button>` : ""}</div>`;
  });
  container.innerHTML = html || "<p style='font-style:italic;'>No transcriptions yet.</p>";
}

window.handleAddComment = async () => {
  const text = document.getElementById("commentInput").value;
  const user = auth.currentUser;
  if (!text || !user) return;

  await addDoc(collection(db, `posts/${activePostId}/comments`), {
    text, author: user.displayName || user.email, authorId: user.uid, createdAt: new Date()
  });
  document.getElementById("commentInput").value = "";
  loadComments(activePostId);
};

window.handleDeleteComment = async (postId, commentId) => {
  await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
  loadComments(postId);
};

async function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  filteredPosts = [...allPosts];
  renderPaginatedPosts();
}

function renderNav(user) {
  const nav = document.getElementById("navLinks");
  nav.innerHTML = user ? `
    <button onclick="window.toggleProfileModal()">Profile</button>
    <button onclick="window.toggleWriteModal()">Inscribe</button>
    <button onclick="window.handleLogout()">Sign Out</button>
  ` : `<button onclick="window.toggleAuthModal()">Scribe Login</button>`;
}

onAuthStateChanged(auth, (user) => {
  renderNav(user);
  loadPosts();
});