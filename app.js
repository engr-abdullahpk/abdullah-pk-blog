import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Paste your configuration details from Firebase here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Download post as PDF function
window.downloadPDF = function(title, body, author, date) {
  const element = document.createElement('div');
  element.style.padding = '20px';
  element.style.fontFamily = 'Georgia, serif';
  element.innerHTML = `
    <h1 style="text-align: center;">${title}</h1>
    <p><strong>Author:</strong> ${author} | <strong>Date:</strong> ${date}</p>
    <hr>
    <div>${body}</div>
  `;

  const opt = {
    margin:       1,
    filename:     `${title}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};