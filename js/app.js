// WorkTrace Client - Professional Experience Logic
const firebaseConfig = {
  apiKey: "AIzaSyDdRwSkiB4DjRg_W_dh5B50vUzsJtg-dyA",
  authDomain: "worktrace-agency.firebaseapp.com",
  projectId: "worktrace-agency",
  storageBucket: "worktrace-agency.firebasestorage.app",
  messagingSenderId: "891860270689",
  appId: "1:891860270689:web:31cc3e9047bd79bc15b420",
  measurementId: "G-S1HR173NW8"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ─── AUTHENTICATION ───
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(() => console.log("Login successful"))
        .catch(e => {
            console.error(e);
            alert("Login Error: " + e.message + "\n\nNote: Google Login might not work on 'file://' links. Try using a local server or deploying it.");
        });
}

async function handleUser(user) {
    if(!user) return;
    await db.collection('users').doc(user.email).set({
        name: user.displayName || 'User', email: user.email, role: 'client', lastActive: new Date().toISOString()
    }, { merge: true });

    document.getElementById('auth-overlay').style.display = 'none';
    
    // Update Sidebar
    document.getElementById('user-name').textContent = user.displayName || 'User';
    document.getElementById('user-email').textContent = user.email;
    
    const initials = (user.displayName || user.email || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    document.getElementById('user-initials').textContent = initials;

    loadWorkspaceData(user.email);
}

function loadWorkspaceData(userEmail) {
    // Listen to all projects for this client
    db.collection('projects')
      .where('clientEmail', '==', userEmail)
      .onSnapshot(snapshot => {
          renderWorkspace(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

    // Also listen to public projects if any
    db.collection('projects')
      .where('allowPublicView', '==', true)
      .onSnapshot(snapshot => {
          // This might overlap, but for simplicity:
          const publicProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // We can merge these or just use the first listener if it covers everything
      });
}

// ─── RENDERING ───
function renderWorkspace(projects) {
    const categories = [
        { id: 'todo', name: 'To Do', color: 'var(--todo-color)' },
        { id: 'progress', name: 'In Progress', color: 'var(--progress-color)' },
        { id: 'revisions', name: 'Revisions', color: 'var(--revisions-color)' },
        { id: 'supervisor', name: 'Supervisor', color: 'var(--supervisor-color)' },
        { id: 'approved', name: 'Approved', color: 'var(--approved-color)' },
        { id: 'posted', name: 'Posted', color: 'var(--posted-color)' }
    ];

    const container = document.getElementById('status-groups');
    container.innerHTML = ''; // Clear previous

    categories.forEach(cat => {
        const catProjects = projects.filter(p => (p.status || 'todo').toLowerCase() === cat.id);
        
        const catEl = document.createElement('div');
        catEl.className = `category ${cat.id === 'supervisor' ? 'active' : ''}`;
        catEl.id = `cat-${cat.id}`;
        
        catEl.innerHTML = `
            <div class="category-header" onclick="toggleCategory('cat-${cat.id}')">
                <div class="cat-info">
                    <span class="chevron">❯</span>
                    <div class="cat-dot" style="background: ${cat.color}; box-shadow: 0 0 10px ${cat.color}66;"></div>
                    <span class="cat-name">${cat.name}</span>
                </div>
                <span class="cat-count">${catProjects.length}</span>
            </div>
            <div class="cat-items" id="items-${cat.id}"></div>
        `;
        
        container.appendChild(catEl);
        
        const itemsContainer = catEl.querySelector(`#items-${cat.id}`);
        catProjects.forEach(p => {
            itemsContainer.appendChild(createProjectItem(p));
        });
    });
}

function createProjectItem(p) {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.onclick = () => { if(p.editorLink) window.open(p.editorLink, '_blank'); };
    
    const date = p.assetSubmittedAt ? new Date(p.assetSubmittedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : '04/23';
    const size = p.fileSize || '259.2 MB';
    const version = p.version || 'V2';
    const status = (p.status || 'todo').toUpperCase();

    item.innerHTML = `
        <div class="item-thumb">
            <img src="${p.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=150&q=80'}" alt="Thumb">
        </div>
        <div class="item-details">
            <div class="item-title">${p.name || 'Untitled Project'}</div>
            <div class="item-meta">
                <span class="status-pill">${status}</span>
                <span>•</span>
                <span>${date}</span>
                <span>•</span>
                <span>${size}</span>
            </div>
        </div>
        <div style="display:flex; align-items:center; color:var(--text-muted); font-size:18px;">
            <span>❯</span>
        </div>
    `;
    return item;
}

// ─── INIT ───
auth.onAuthStateChanged(user => {
    if(user) handleUser(user);
    else document.getElementById('auth-overlay').style.display = 'flex';
});
