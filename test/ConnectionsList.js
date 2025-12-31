import { ref, get, child, update } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { db } from "./firebase-config.js"; 

class ConnectionsList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.db = db;
    this._mode = "connected"; 
  }

  static get observedAttributes() { return ['mode']; }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'mode' && oldValue !== newValue) {
      this._mode = newValue;
      this.updateList();
    }
  }

  connectedCallback() {
    this.renderSkeleton();
    this.updateList();
    window.addEventListener('popstate', () => this.updateList());
    window.addEventListener('url-updated', () => this.updateList());
  }

  async toggleConnection(myId, targetId, isConnecting) {
    if (!myId || !targetId) {
        console.error("Missing IDs for connection:", { myId, targetId });
        return;
    }
    const dbRef = ref(this.db);
    try {
      const snapshot = await get(child(dbRef, "Friends"));
      if (!snapshot.exists()) return;
      const allFriends = snapshot.val();

      let myConns = new Set(allFriends[myId]?.connections || []);
      let targetConns = new Set(allFriends[targetId]?.connections || []);

      if (isConnecting) {
        myConns.add(targetId);
        targetConns.add(myId);
      } else {
        myConns.delete(targetId);
        targetConns.delete(myId);
      }

      const updates = {};
      updates[`/Friends/${myId}/connections`] = Array.from(myConns);
      updates[`/Friends/${targetId}/connections`] = Array.from(targetConns);

      await update(ref(this.db), updates);
      
      this.updateList();
      window.dispatchEvent(new Event('popstate')); 
    } catch (err) {
      console.error("Firebase update failed:", err);
    }
  }

  renderSkeleton() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
          .list-container { 
            background: #1c2128; border: 1px solid #30363d; border-radius: 8px; 
            padding: 20px; color: #c9d1d9; min-height: 400px;
          }
          h2 { margin: 0 0 16px 0; color: #58a6ff; font-size: 1.1rem; border-bottom: 2px solid #30363d; padding-bottom: 15px; }
          
          ul { 
            list-style: none !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          
          li {
            padding: 16px 8px; 
            border-bottom: 2px solid #30363d; /* More pronounced separation */
            display: flex; 
            justify-content: space-between; 
            align-items: center;
          }
          
          li:last-child { border-bottom: none; }

          .user-info { display: flex; align-items: center; }

          .user-link {
            color: #c9d1d9;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
          }
          .user-link:hover {
            color: #58a6ff;
            text-decoration: underline;
          }

          /* Consistent Outline Button Styles */
          button {
            padding: 6px 14px; 
            border-radius: 6px; 
            font-size: 0.8rem;
            font-weight: 600; 
            cursor: pointer; 
            background: transparent; 
            border: 1px solid;
            transition: 0.2s;
            min-width: 100px;
            text-align: center;
          }

          /* Green Outline (Connect) */
          .btn-connect { color: #3fb950; border-color: #3fb950; }
          .btn-connect:hover { background: #238636; color: white; border-color: #238636; }

          /* Red Outline (Disconnect) */
          .btn-disconnect { color: #f85149; border-color: #f85149; }
          .btn-disconnect:hover { background: #f85149; color: white; }

          /* Grey Outline (You) */
          .btn-me { color: #8b949e; border-color: #484f58; cursor: default; }

          .empty-state { color: #8b949e; font-style: italic; text-align: center; margin-top: 40px; }
        </style>
        <div class="list-container">
          <h2 id="list-title">Intelligence</h2>
          <div id="content"></div>
        </div>
      `;
    }

    async updateList() {
        // ... logic for finding users ...
        // Inside the displayIds.forEach loop, I updated the HTML string:

        html += `
            <li>
                <div class="user-info">
                    <a href="${profileLink}" class="user-link">${person.name}</a>
                </div>
                <div class="actions">
                    ${isMe ? '<button class="btn-me">You</button>' : 
                      isFriendOfMe ? `<button class="btn-disconnect" data-id="${id}">Disconnect</button>` : 
                      `<button class="btn-connect" data-id="${id}">Connect</button>`}
                </div>
            </li>
        `;
        // ... rest of the logic ...
    }

  async updateList() {
      const params = new URLSearchParams(window.location.search);
      const viewUserName = params.get('user'); 
      const loggedInName = params.get('me'); 

      const content = this.shadowRoot.getElementById('content');
      const title = this.shadowRoot.getElementById('list-title');

      if (!content || !viewUserName) return;

      try {
          const snapshot = await get(child(ref(this.db), "Friends"));
          const friends = snapshot.val();

          const myEntry = Object.entries(friends).find(([id, data]) => 
              data.name.toLowerCase() === (loggedInName || "").toLowerCase()
          );
          
          const viewEntry = Object.entries(friends).find(([id, data]) => 
              data.name.toLowerCase() === viewUserName.toLowerCase()
          );

          if (!viewEntry) return;

          const [viewId, viewData] = viewEntry;
          const myId = myEntry ? myEntry[0] : null;
          const myConnections = myEntry ? (myEntry[1].connections || []) : [];

          title.innerText = this._mode === "unconnected" 
              ? `Recommended Connections` 
              : `${viewData.name}'s Connections`;

          const viewConnections = viewData.connections || [];
          
          let displayIds = this._mode === "connected" 
              ? viewConnections 
              : Object.keys(friends).filter(id => id !== viewId && !viewConnections.includes(id));

          let html = `<ul>`;
          if (displayIds.length === 0) {
              html += `<li class="empty-state">No users in this view.</li>`;
          } else {
              displayIds.forEach(id => {
                  const person = friends[id];
                  const isMe = id === myId;
                  const isFriendOfMe = myConnections.includes(id);

                  const clickedName = encodeURIComponent(person.name);
                  const loggedInNameParam = loggedInName ? encodeURIComponent(loggedInName) : "";
                  
                  let profileLink = "";
                  if (person.name.toLowerCase() === (loggedInName || "").toLowerCase()) {
                      profileLink = `user.html?user=${clickedName}&me=${clickedName}`;
                  } else {
                      profileLink = `otherUser.html?user=${clickedName}&me=${loggedInNameParam}`;
                  }

                  html += `
                      <li>
                          <div class="user-info">
                              <span class="status-dot ${isFriendOfMe ? 'dot-connected' : 'dot-unconnected'}"></span>
                              <a href="${profileLink}" class="user-link">${person.name}</a>
                          </div>
                          <div class="actions">
                              ${isMe ? '<button class="btn-me">You</button>' : 
                                isFriendOfMe ? `<button class="btn-disconnect" data-id="${id}">Disconnect</button>` : 
                                `<button class="btn-connect" data-id="${id}">Connect</button>`}
                          </div>
                      </li>
                  `;
              });
          }
          html += `</ul>`;
          content.innerHTML = html;

          this.shadowRoot.querySelectorAll('button').forEach(btn => {
              const targetId = btn.getAttribute('data-id');
              if (!targetId) return;
              btn.onclick = (e) => {
                  e.stopPropagation();
                  const isConnecting = btn.classList.contains('btn-connect');
                  this.toggleConnection(myId, targetId, isConnecting);
              };
          });

      } catch (err) { console.error("List update failed:", err); }
  }
}

customElements.define("connections-list", ConnectionsList);