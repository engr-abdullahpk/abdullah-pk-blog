console.log("App script initialized successfully!");

// Sample Initial Data for Immediate Fallback Render
const defaultPosts = [
  {
    id: "1",
    title: "Welcome to the Antique Scribe",
    date: "August 19, 2026",
    author: "Abdullah Pk",
    content: "Greetings traveler. This blog operates as an ancient parchment manuscript preserved across time. Feel free to explore, comment, or authenticate as a scribe."
  }
];

// Attach Modal Toggle Handlers directly to Window for HTML Inline Onclick Attributes
window.toggleAuthModal = function() {
  const modal = document.getElementById("authModal");
  if (modal) modal.classList.toggle("hidden");
};

window.toggleWriteModal = function() {
  const modal = document.getElementById("writeModal");
  if (modal) modal.classList.toggle("hidden");
};

window.handleRegister = function() {
  alert("Registration function ready. Ensure Firebase Auth is enabled.");
  window.toggleAuthModal();
};

window.handleLogin = function() {
  alert("Signed in successfully!");
  window.toggleAuthModal();
  renderNav(true);
};

window.handleLogout = function() {
  alert("Signed out.");
  renderNav(false);
};

window.handlePublish = function() {
  const title = document.getElementById("postTitle").value;
  const body = document.getElementById("postBody").value;
  if (!title || !body) return alert("Please complete both fields.");

  defaultPosts.unshift({
    id: Date.now().toString(),
    title: title,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    author: "Authenticated Scribe",
    content: body
  });

  document.getElementById("postTitle").value = "";
  document.getElementById("postBody").value = "";
  window.toggleWriteModal();
  renderPosts();
};

// Render Functions
function renderNav(isLoggedIn = false) {
  const nav = document.getElementById("navLinks");
  if (!nav) return console.error("navLinks container missing in DOM");

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
  if (!container) return console.error("postsContainer missing in DOM");

  container.innerHTML = defaultPosts.map(post => `
    <article class="post-card">
      <h2 class="post-title">${post.title}</h2>
      <div class="post-meta">Inscribed by ${post.author} on ${post.date}</div>
      <div class="post-body-full">${post.content}</div>
    </article>
  `).join("");
}

// Initialize Application once DOM Content is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded. Executing render functions...");
  renderNav(false);
  renderPosts();
});