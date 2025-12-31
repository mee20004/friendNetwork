import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRNRlGcGNNT_s6Io1I5KTlzWnAh6SQOaI",
  authDomain: "friendnetwork-862ab.firebaseapp.com",
  databaseURL: "https://friendnetwork-862ab-default-rtdb.firebaseio.com",
  projectId: "friendnetwork-862ab",
  storageBucket: "friendnetwork-862ab.firebasestorage.app",
  messagingSenderId: "63599209189",
  appId: "1:63599209189:web:d319fd76397014f97d820c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);