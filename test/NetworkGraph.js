import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import { db } from "./firebase-config.js"; 

class FriendNetworkGraph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.db = db; 
    this.allFriends = {};
    this.unsubscribe = null;
    this.isGlobalMode = false; 
  }

  connectedCallback() {
    this.renderSkeleton();
    this.loadData();

    window.addEventListener('popstate', () => {
        this.applyUrlFilter(); 
    });
  }

  renderSkeleton() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; min-height: 600px; }
        #container { 
          width: 100%; 
          height: 75vh; 
          border: 1px solid #30363d; 
          border-radius: 8px; 
          background: #161b22; 
          overflow: hidden; 
          position: relative;
        }

        /* Toggle Switch Styling */
        .controls {
          position: absolute;
          top: 15px;
          right: 15px;
          z-index: 10;
          background: rgba(22, 27, 34, 0.9);
          padding: 8px 12px;
          border-radius: 20px;
          border: 1px solid #30363d;
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-size: 0.8rem;
          user-select: none;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 34px;
          height: 20px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #30363d;
          transition: .4s;
          border-radius: 20px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 14px; width: 14px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: #238636; }
        input:checked + .slider:before { transform: translateX(14px); }

        svg { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .link { stroke: #58a6ff; stroke-opacity: 0.3; stroke-width: 2; }

        /* Base Node Style */
        .node circle { fill: #1f6feb; stroke: #fff; stroke-width: 2; cursor: pointer; transition: fill 0.3s; }
        .node:hover circle { fill: #58a6ff; }
        
        /* Logged in User Style - ORANGE (Priority) */
        .node.is-me circle { fill: #eb7b1f !important; stroke: #fff; stroke-width: 3; }
        
        /* Selected User Style - GREEN */
        .node.is-selected circle { fill: #238636 !important; stroke: #fff; stroke-width: 3; }

        .node text { font-size: 12px; fill: #c9d1d9; pointer-events: none; text-anchor: middle; font-weight: bold; }
      </style>
      <div id="container">
        <div class="controls">
          <span>Global View</span>
          <label class="switch">
            <input type="checkbox" id="view-toggle">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('view-toggle').addEventListener('change', (e) => {
      this.isGlobalMode = e.target.checked;
      this.applyUrlFilter();
    });
  }

  loadData() {
    const dbRef = ref(this.db, "Friends");
    this.unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        this.allFriends = snapshot.val();
        this.applyUrlFilter();
      }
    });
  }

  applyUrlFilter() {
    const params = new URLSearchParams(window.location.search);
    const userFilter = params.get('user'); 
    const filterToUse = this.isGlobalMode ? "" : (userFilter ? userFilter.toLowerCase().trim() : "");
    this.drawGraph(this.allFriends, filterToUse);
  }

    drawGraph(friends, filterQuery = "") {
        const container = this.shadowRoot.getElementById("container");
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        if (width === 0 || height === 0) {
        requestAnimationFrame(() => this.drawGraph(friends, filterQuery));
        return;
        }

        const existingSvg = this.shadowRoot.querySelector("svg");
        if (existingSvg) existingSvg.remove();
        
        const svg = d3.select(container).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);

        const params = new URLSearchParams(window.location.search);
        const urlUser = params.get('user')?.toLowerCase();
        const urlMe = params.get('me')?.toLowerCase();

        // Identify target IDs from names
        const selectedId = Object.keys(friends).find(id => friends[id].name.toLowerCase() === urlUser);
        const meId = Object.keys(friends).find(id => friends[id].name.toLowerCase() === urlMe);

        let filteredNodeIds = Object.keys(friends);

        if (filterQuery) {
        if (selectedId) {
            const connections = friends[selectedId].connections || [];
            // Only include the selected user and their direct connections.
            // If "Me" (the logged-in user) is not in that connections list, 
            // they will not be included in filteredNodeIds.
            filteredNodeIds = [selectedId, ...connections];
        }
        }

        const nodes = filteredNodeIds.map(id => ({ 
            id, 
            name: friends[id].name,
            isMe: id === meId, 
            isSelected: (id === selectedId && id !== meId),
            x: width / 2 + (Math.random() - 0.5) * 100,
            y: height / 2 + (Math.random() - 0.5) * 100
        }));

        const links = [];
        filteredNodeIds.forEach(sourceId => {
        friends[sourceId].connections?.forEach(sid => {
            if (filteredNodeIds.includes(sid)) {
                links.push({ source: sourceId, target: sid });
            }
        });
        });

        const g = svg.append("g");
        
        const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-800))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(60))
        .alphaDecay(0.04)
        .on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        const link = g.append("g").selectAll("line")
        .data(links).join("line").attr("class", "link");
        
        const node = g.append("g").selectAll("g")
        .data(nodes).join("g")
        .attr("class", d => {
            if (d.isMe) return "node is-me";
            if (d.isSelected) return "node is-selected";
            return "node";
        })
        .on("click", (event, d) => {
            const myName = params.get('me');
            const clickedName = encodeURIComponent(d.name);
            if (d.name.toLowerCase() === myName?.toLowerCase()) {
            window.location.href = `user.html?user=${clickedName}&me=${clickedName}`;
            } else {
            window.location.href = `otherUser.html?user=${clickedName}&me=${encodeURIComponent(myName)}`;
            }
        })
        .call(d3.drag()
            .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

        node.append("circle").attr("r", d => (d.isMe || d.isSelected) ? 26 : 20);
        node.append("text").attr("dy", d => (d.isMe || d.isSelected) ? 46 : 40).text(d => d.name);
        
        svg.call(d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (e) => g.attr("transform", e.transform)));
    }
}

customElements.define("network-graph", FriendNetworkGraph);