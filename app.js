import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Modal Toggles
window.toggleAuthModal = () => {
  document.getElementById("authModal").classList.toggle("hidden");
};

window.togglePostModal = () => {
  document.getElementById("postModal").classList.toggle("hidden");
};

window.openNewPostModal = () => {
  document.getElementById("postModal").classList.remove("hidden");
};

// Email Sign Up
window.handleEmailSignUp = async () => {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created!");
    window.toggleAuthModal();
  } catch (err) {
    alert("Sign Up Error: " + err.message);
  }
};

// Email Sign In
window.handleEmailSignIn = async () => {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Signed in successfully!");
    window.toggleAuthModal();
  } catch (err) {
    alert("Sign In Error: " + err.message);
  }
};

// Phone / OTP Verification Setup
let confirmationResultGlobal = null;

window.handleSendOTP = async () => {
  const phoneNumber = document.getElementById("phoneNumber").value;
  if (!phoneNumber) return alert("Enter a phone number with country code.");

  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });

  try {
    confirmationResultGlobal = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    document.getElementById("otpSection").classList.remove("hidden");
    alert("OTP Sent to " + phoneNumber);
  } catch (err) {
    alert("OTP Send Error: " + err.message);
  }
};

window.handleVerifyOTP = async () => {
  const code = document.getElementById("otpCode").value;
  try {
    await confirmationResultGlobal.confirm(code);
    alert("Phone Verified and Logged In!");
    window.toggleAuthModal();
  } catch (err) {
    alert("Invalid OTP code: " + err.message);
  }
};

// New Post Submission handler
window.submitNewPost = () => {
  const title = document.getElementById("newPostTitle").value;
  const body = document.getElementById("newPostBody").value;
  if (!title || !body) return alert("Fill in both title and manuscript body.");

  window.createPost(title, body);
  document.getElementById("newPostTitle").value = "";
  document.getElementById("newPostBody").value = "";
  window.togglePostModal();
};