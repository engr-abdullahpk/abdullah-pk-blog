import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, 
  onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy, getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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

// State Variables
let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
const postsPerPage = 10;
let activePostId = null;
let confirmationResult = null;

// Modal Controls
window.toggleAuthModal = () => document.getElementById("authModal").classList.toggle("hidden");
window.toggleProfileModal = () => {
  if (auth.currentUser) renderUserProfile();
  document.getElementById("profileModal").classList.toggle("hidden");
};
window.toggleWriteModal = (reset = true) => {
  if (reset) {
    document.getElementById("editingPostId").value = "";
    document.getElementById("postTitle").value = "";
    document.getElementById("postBody").value = "";
    document.getElementById("writeModalTitle").innerText = "Inscribe New Manuscript";
  }
  document.getElementById("writeModal").classList.toggle("hidden");
};

// Auth Tab Switcher
window.switchAuthTab = (tab) => {
  document.getElementById("emailTabBtn").classList.toggle("active", tab === 'email');
  document.getElementById("phoneTabBtn").classList.toggle("active", tab === 'phone');
  document.getElementById("emailAuthSection").classList.toggle("hidden", tab !== 'email');
  document.getElementById("phoneAuthSection").classList.toggle("hidden", tab !== 'phone');
};

// Email Authentication
window.handleEmailRegister = async () => {
  const e = document.getElementById("authEmail").value, p = document.getElementById("authPassword").value;
  try { await createUserWithEmailAndPassword(auth, e, p); window.toggleAuthModal(); } catch (err) { alert(err.message); }
};

window.handleEmailLogin = async () => {
  const e = document.getElementById("authEmail").value, p = document.getElementById("authPassword").value;
  try { await signInWithEmailAndPassword(auth, e, p); window.toggleAuthModal(); } catch (err) { alert(err.message); }
};

window.handleLogout = async () => { await signOut(auth); };

// Phone Authentication & Recaptcha OTP
function setupRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'normal'
    });
  }
}

window.handleSendOTP = async () => {
  const phone = document.getElementById("authPhone").value;
  if (!phone) return alert("Please enter a valid phone number with country code (e.g., +8801700000000)");

  setupRecaptcha();
  const appVerifier = window.recaptchaVerifier;

  try {
    confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
    document.getElementById("otpInputGroup").classList.remove("hidden");
    alert("Verification OTP sent to your phone!");
  } catch (error) {
    alert(`Phone Auth Error: ${error.message}`);
  }
};

window.handleVerifyOTP = async () => {
  const code = document.getElementById("authOtp").value;
  if (!code) return alert("Enter the OTP code.");

  try {
    await confirmationResult.confirm(code);
    alert("Signed in successfully!");
    window.toggleAuthModal();
  } catch (error) {
    alert(`Invalid OTP: ${error.message}`);
  }
};

// Search & Pagination Logic
window.handleSearch = () => {
  const term = document.getElementById("searchInput").value.toLowerCase();
  filteredPosts = allPosts.filter(p => 
    p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term)
  );
  currentPage = 1;
  renderPaginatedPosts();
};

window.changePage = (direction) => {
  currentPage += direction;
  renderPaginatedPosts();
};

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

  if (!pagePosts.length) {
    container.innerHTML = `<p style="color:#d4af37; text-align:center;">No manuscripts found in the archives.</p>`;
    return;
  }

  container.innerHTML = pagePosts.map(p => `
    <article class="post-card parchment-bg">
      <div>
        <h3>${p.title}</h3>
        <div class="post-card-meta">Inscribed by ${p.author}</div>
        <div class="post-card-snippet">${p.content.substring(0, 120)}...</div>
      </div>
      <button class="see-more-btn" onclick="window.openBookModal('${p.id}')">See More</button>
    </article>
  `).join("");
}

// 3D Book Animation & Content Viewing
window.openBookModal = async (id) => {
  activePostId = id;
  const post = allPosts.find(p => p.id === id);
  if (!post) return;

  document.getElementById("readTitle").innerText = post.title;
  document.getElementById("coverTitleDisplay").innerText = post.title;
  
  const formattedDate = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : "Ancient Date";
  document.getElementById("readMeta").innerText = `Inscribed by ${post.author} on ${formattedDate}`;
  document.getElementById("readBody").innerText = post.content;
  document.getElementById("readImageContainer").innerHTML = post.imageUrl 
    ? `<img src="${post.imageUrl}" style="max-width:100%; margin:15px 0; border:1px solid #8b5a2b;">` : "";

  // Auth Conditionals for PDF/Comments
  const user = auth.currentUser;
  document.getElementById("pdfDownloadSection").classList.toggle("hidden", !user);
  document.getElementById("commentFormSection").classList.toggle("hidden", !user);
  document.getElementById("commentSignInNotice").classList.toggle("hidden", !!user);

  await loadComments(id);
  await loadReactions(id);

  const bookModal = document.getElementById("bookModal");
  const bookElement = document.getElementById("bookElement");
  bookModal.classList.remove("hidden");
  
  // Trigger 3D Opening Animation after modal displays
  setTimeout(() => bookElement.classList.add("open"), 100);
};

window.closeBookModal = () => {
  const bookElement = document.getElementById("bookElement");
  bookElement.classList.remove("open");
  setTimeout(() => document.getElementById("bookModal").classList.add("hidden"), 600);
};

// Standard A4 PDF Generation (Title, Body, Author, Date with Matching Website Styling)
window.downloadPDF = () => {
  const element = document.getElementById("printableArea");
  
  const opt = {
    margin:       15,
    filename:     'manuscript.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};

// Publish / Edit Post
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
        title, content: body, 
        author: user.email || user.phoneNumber || "Scribe",
        authorId: user.uid,
        createdAt: new Date(), imageUrl
      });
    }

    window.toggleWriteModal();
    loadPosts();
  } catch (err) { alert(err.message); }
};

window.handleDeletePost = async (id) => {
  if (confirm("Delete this manuscript permanently?")) {
    await deleteDoc(doc(db, "posts", id));
    window.closeBookModal();
    loadPosts();
  }
};

// Reaction System
window.handleReaction = async (type) => {
  const user = auth.currentUser;
  if (!user) return alert("Please sign in to react.");

  const refDoc = doc(db, `posts/${activePostId}/reactions`, `${user.uid}_${type}`);
  await updateDoc(refDoc, { count: 1 }).catch(async () => {
    await addDoc(collection(db, `posts/${activePostId}/reactions`), { user: user.uid, type });
  });
  loadReactions(activePostId);
};

async function loadReactions(postId) {
  const snap = await getDocs(collection(db, `posts/${postId}/reactions`));
  let quill = 0, candle = 0, scroll = 0;
  snap.forEach(d => {
    const data = d.data();
    if (data.type === 'quill') quill++;
    if (data.type === 'candle') candle++;
    if (data.type === 'scroll') scroll++;
  });
  document.getElementById("reactQuillCount").innerText = quill;
  document.getElementById("reactCandleCount").innerText = candle;
  document.getElementById("reactScrollCount").innerText = scroll;
}

// Commenting System (With Delete Capability for Owner)
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
        <strong>${c.author}:</strong> ${c.text}
        ${isOwner ? `<button onclick="window.handleDeleteComment('${postId}', '${d.id}')" style="float:right; color:red; background:none; border:none; cursor:pointer;">&times;</button>` : ""}
      </div>`;
  });
  container.innerHTML = html || "<p style='font-style:italic;'>No transcriptions yet.</p>";
}

window.handleAddComment = async () => {
  const text = document.getElementById("commentInput").value;
  const user = auth.currentUser;
  if (!text || !user) return;

  await addDoc(collection(db, `posts/${activePostId}/comments`), {
    text, 
    author: user.email || user.phoneNumber, 
    authorId: user.uid,
    createdAt: new Date()
  });
  document.getElementById("commentInput").value = "";
  loadComments(activePostId);
};

window.handleDeleteComment = async (postId, commentId) => {
  await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
  loadComments(postId);
};

// User Profile Section Rendering
function renderUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  document.getElementById("profileUserDetail").innerText = user.email || user.phoneNumber;
  const userPosts = allPosts.filter(p => p.authorId === user.uid || p.author === (user.email || user.phoneNumber));
  
  const container = document.getElementById("userPostsContainer");
  container.innerHTML = userPosts.length ? userPosts.map(p => `
    <div style="margin: 8px 0; padding: 8px; border-bottom: 1px dashed #8b5a2b; display:flex; justify-content:space-between;">
      <span>${p.title}</span>
      <div>
        <button onclick="window.handleEdit('${p.id}')">Edit</button>
        <button onclick="window.handleDeletePost('${p.id}')">Delete</button>
      </div>
    </div>
  `).join("") : "<p>You have not inscribed any manuscripts yet.</p>";
}

window.handleEdit = (id) => {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;
  document.getElementById("editingPostId").value = id;
  document.getElementById("postTitle").value = post.title;
  document.getElementById("postBody").value = post.content;
  document.getElementById("writeModalTitle").innerText = "Edit Manuscript";
  window.toggleProfileModal();
  window.toggleWriteModal(false);
};

// Core Loaders & Auth Watchers
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