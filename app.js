import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, 
  onAuthStateChanged, sendPasswordResetEmail, updateProfile, updatePassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc, deleteDoc, updateDoc, query, orderBy 
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

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%238b5a2b' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

// State Variables
let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
const postsPerPage = 10;
let activePostId = null;

// Mobile Navigation Toggle
window.toggleMobileNav = () => {
  const container = document.getElementById("navContainer");
  container.classList.toggle("active");
};

// Modal Toggles
window.toggleAuthModal = () => {
  document.getElementById("navContainer").classList.remove("active");
  document.getElementById("authModal").classList.toggle("hidden");
};

window.toggleProfileModal = () => {
  document.getElementById("navContainer").classList.remove("active");
  if (auth.currentUser) renderUserProfile();
  document.getElementById("profileModal").classList.toggle("hidden");
};

window.toggleWriteModal = (reset = true) => {
  document.getElementById("navContainer").classList.remove("active");
  if (reset) {
    document.getElementById("editingPostId").value = "";
    document.getElementById("postTitle").value = "";
    document.getElementById("editorBody").innerHTML = "";
    document.getElementById("writeModalTitle").innerText = "Inscribe New Manuscript";
  }
  document.getElementById("writeModal").classList.toggle("hidden");
};

// Authentication
window.handleAuthSubmit = async (e) => {
  if (e) e.preventDefault();
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
  if (e) e.preventDefault();
  const email = document.getElementById("authEmail").value;
  if (!email) return alert("Please enter your email address first.");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent!");
  } catch (err) { alert(err.message); }
};

window.handleLogout = async () => {
  document.getElementById("navContainer").classList.remove("active");
  await signOut(auth);
};

// ImgBB Upload Service
async function uploadToImgBB(base64Image) {
  const apiKey = "c08129eb0e527dbcfca12f91a0f9b3dd"; 
  const cleanBase64 = base64Image.split(",")[1];

  const formData = new FormData();
  formData.append("image", cleanBase64);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    return data.data.url;
  } else {
    throw new Error("Image upload failed.");
  }
}

// User Profile Management
async function renderUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  document.getElementById("profileEmailDisplay").innerText = user.email;
  document.getElementById("profileNameDisplay").innerText = user.displayName || user.email.split("@")[0];

  let avatarUrl = user.photoURL || DEFAULT_AVATAR;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().photoURL) {
      avatarUrl = userDoc.data().photoURL;
    }
  } catch (err) {
    console.error("Error loading user profile:", err);
  }
  document.getElementById("profileAvatar").src = avatarUrl;

  const userPosts = allPosts.filter(p => p.authorId === user.uid);
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

  try {
    let photoURL = user.photoURL || DEFAULT_AVATAR;

    if (fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          photoURL = await uploadToImgBB(e.target.result);
          const updateData = { photoURL };
          if (name) updateData.displayName = name;

          await updateProfile(user, updateData);
          await setDoc(doc(db, "users", user.uid), { photoURL, displayName: name || user.displayName || user.email.split("@")[0] }, { merge: true });

          document.getElementById("profileAvatar").src = photoURL;
          if (name) document.getElementById("profileNameDisplay").innerText = name;
          alert("Profile updated successfully!");
          loadPosts();
        } catch (err) { alert(err.message); }
      };
      reader.readAsDataURL(file);
    } else if (name) {
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, "users", user.uid), { displayName: name }, { merge: true });
      document.getElementById("profileNameDisplay").innerText = name;
      alert("Display Name updated successfully!");
      loadPosts();
    }
  } catch (err) { alert("Error updating profile: " + err.message); }
};

window.handleChangePassword = async () => {
  const user = auth.currentUser;
  const newPass = document.getElementById("newPasswordInput").value;
  if (!newPass || newPass.length < 6) return alert("Password must be at least 6 characters.");

  try {
    await updatePassword(user, newPass);
    alert("Password updated!");
    document.getElementById("newPasswordInput").value = "";
  } catch (err) { alert(err.message); }
};

// Rich Text Commands
window.execEditorCmd = (cmd, val = null) => { document.execCommand(cmd, false, val); };
window.insertTable = () => {
  const html = `<table border="1"><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></table>`;
  document.execCommand('insertHTML', false, html);
};

// Manuscript Publishing
window.handlePublish = async () => {
  const title = document.getElementById("postTitle").value;
  const body = document.getElementById("editorBody").innerHTML;
  const editId = document.getElementById("editingPostId").value;
  const fileInput = document.getElementById("postImage");
  const user = auth.currentUser;

  if (!title || !body) return alert("Fill in title and body.");

  const authorName = user.displayName || user.email.split("@")[0];
  let authorPhoto = user.photoURL || DEFAULT_AVATAR;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().photoURL) authorPhoto = userDoc.data().photoURL;
  } catch(e) {}

  const processPost = async (imageUrl = "") => {
    if (editId) {
      const docData = { title, content: body, authorName, authorPhoto };
      if (imageUrl) docData.imageUrl = imageUrl;
      await updateDoc(doc(db, "posts", editId), docData);
    } else {
      await addDoc(collection(db, "posts"), {
        title, content: body, authorName, authorPhoto,
        authorId: user.uid, createdAt: new Date(), imageUrl
      });
    }
    window.toggleWriteModal();
    loadPosts();
  };

  if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const shortUrl = await uploadToImgBB(e.target.result);
        processPost(shortUrl);
      } catch (err) { alert("Failed to upload manuscript cover image."); }
    };
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

// Search & Pagination
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
        <div class="author-badge">
          <img src="${p.authorPhoto || DEFAULT_AVATAR}" class="author-avatar" alt="Avatar">
          <span class="author-name">${p.authorName || p.author || 'Anonymous'}</span>
        </div>
        <h3>${p.title}</h3>
        <div class="post-card-snippet">${p.content.replace(/<[^>]*>/g, '').substring(0, 120)}...</div>
      </div>
      <button class="see-more-btn" onclick="window.openBookModal('${p.id}')">See More</button>
    </article>
  `).join("");
}

// 3D Fullscreen Book Modal Opening
window.openBookModal = async (id) => {
  activePostId = id;
  const post = allPosts.find(p => p.id === id);
  if (!post) return;

  document.getElementById("readTitle").innerText = post.title;
  document.getElementById("coverTitleDisplay").innerText = post.title;
  
  const formattedDate = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : "Ancient Date";
  document.getElementById("readMeta").innerHTML = `
    <div class="author-badge" style="margin-top:10px;">
      <img src="${post.authorPhoto || DEFAULT_AVATAR}" class="author-avatar">
      <div>
        <div class="author-name">${post.authorName || post.author || 'Anonymous'}</div>
        <div style="font-size:0.8rem; color:#774820;">Inscribed on ${formattedDate}</div>
      </div>
    </div>
  `;
  document.getElementById("readBody").innerHTML = post.content;
  document.getElementById("readImageContainer").innerHTML = post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:100%; border-radius:4px; margin:15px 0;">` : "";

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

// Comments Management
async function loadComments(postId) {
  const container = document.getElementById("commentsContainer");
  const q = query(collection(db, `posts/${postId}/comments`), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const user = auth.currentUser;

  let html = "";
  snap.forEach(d => {
    const c = d.data();
    const isOwner = user && (user.uid === c.authorId);
    html += `
      <div class="comment-item">
        <img src="${c.authorPhoto || DEFAULT_AVATAR}" class="comment-avatar" alt="Avatar">
        <div class="comment-content">
          <div class="comment-author">${c.authorName || c.author || 'Anonymous'}</div>
          <div class="comment-text">${c.text}</div>
        </div>
        ${isOwner ? `<button onclick="window.handleDeleteComment('${postId}', '${d.id}')" style="color:#8b0000; border:none; background:none; cursor:pointer; font-weight:bold;">&times;</button>` : ""}
      </div>
    `;
  });
  container.innerHTML = html || "<p style='font-style:italic;'>No transcriptions yet.</p>";
}

window.handleAddComment = async () => {
  const text = document.getElementById("commentInput").value.trim();
  const user = auth.currentUser;
  if (!text || !user) return;

  const authorName = user.displayName || user.email.split("@")[0];
  let authorPhoto = user.photoURL || DEFAULT_AVATAR;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().photoURL) authorPhoto = userDoc.data().photoURL;
  } catch(e) {}

  await addDoc(collection(db, `posts/${activePostId}/comments`), {
    text, authorName, authorPhoto, authorId: user.uid, createdAt: new Date()
  });
  document.getElementById("commentInput").value = "";
  loadComments(activePostId);
};

window.handleDeleteComment = async (postId, commentId) => {
  await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
  loadComments(postId);
};

// Keyboard Enter Listener Submissions for Comments & Blog Post Inputs
document.addEventListener("DOMContentLoaded", () => {
  // Enter key inside comment input
  const commentInput = document.getElementById("commentInput");
  if (commentInput) {
    commentInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        window.handleAddComment();
      }
    });
  }

  // Enter key inside manuscript post title input
  const postTitle = document.getElementById("postTitle");
  if (postTitle) {
    postTitle.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("editorBody").focus();
      }
    });
  }
});

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