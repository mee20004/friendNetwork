import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth } from "./firebase-config.js"; 

class AuthHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.auth = auth;
  }

  connectedCallback() {
    this.render(); 
    
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        const username = user.displayName || user.email.split('@')[0];
        const url = new URL(window.location);
        
        let needsUpdate = false;

        if (url.searchParams.get('me') !== username) {
          url.searchParams.set('me', username);
          needsUpdate = true;
        }

        if (!url.searchParams.has('user')) {
          url.searchParams.set('user', username);
          needsUpdate = true;
        }

        if (needsUpdate) {
          window.history.replaceState({}, '', url);
          window.dispatchEvent(new Event('popstate'));
        }

        this.dispatchEvent(new CustomEvent('user-authenticated', {
          detail: { username: username },
          bubbles: true,
          composed: true 
        }));
      }
      this.updateUI(user);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { 
          display: block; 
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 100%; 
          z-index: 10000; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; 
        }
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          background: rgba(13, 17, 23, 0.9);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid #30363d;
          box-sizing: border-box; /* Ensures padding doesn't affect 100% width */
        }
        .brand {
          font-weight: bold;
          font-size: 1.2rem;
          color: white;
          text-decoration: none;
        }
        .brand:hover { color: #58a6ff; }
        .auth-pill { 
          background: #1c2128; 
          border: 1px solid #30363d; 
          padding: 5px 12px; 
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          color: white; 
        }
        /* Make the photo clickable to go to dashboard instead of the house */
        .user-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }
        .user-photo {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid #30363d;
          object-fit: cover;
        }
        .login-btn { background: #238636; color: white; padding: 8px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.9rem; border: none; cursor: pointer; }
        .login-btn:hover { background: #2ea043; }
        button.logout { background: transparent; border: 1px solid #f85149; color: #f85149; padding: 3px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-left: 5px; }
        button.logout:hover { background: #da3633; color: white; }
      </style>
      <div class="navbar">
        <a href="index.html" class="brand">Friend Network</a>
        <div id="auth-content"></div>
      </div>
    `;
  }

  updateUI(user) {
    const content = this.shadowRoot.getElementById("auth-content");
    if (!content) return;
    if (user) {
      const username = user.displayName || user.email.split('@')[0];
      const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${username}&background=random`;
      
      content.innerHTML = `
        <div class="auth-pill">
          <a href="user.html?user=${username}&me=${username}" class="user-link">
            <img src="${photoURL}" class="user-photo" alt="${username}">
            <span>${username}</span>
          </a>
          <button class="logout" id="logout-btn">Logout</button>
        </div>`;
        
      this.shadowRoot.getElementById("logout-btn").onclick = () => {
        signOut(this.auth).then(() => {
          window.location.href = "index.html"; 
        });
      };
    } else {
      content.innerHTML = `<a href="../login.html" class="login-btn">Sign In</a>`;
    }
  }
}
customElements.define("auth-header", AuthHeader);