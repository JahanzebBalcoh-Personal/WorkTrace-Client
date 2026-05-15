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
    // Reset counts and containers
    const categories = ['todo', 'progress', 'revisions', 'supervisor', 'approved', 'posted'];
    const counts = { todo: 0, progress: 0, revisions: 0, supervisor: 0, approved: 0, posted: 0 };
    
    categories.forEach(cat => {
        document.getElementById(`items-${cat}`).innerHTML = '';
    });

    projects.forEach(p => {
        const status = (p.status || 'todo').toLowerCase();
        const container = document.getElementById(`items-${status}`);
        if(container) {
            counts[status]++;
            const item = createProjectItem(p);
            container.appendChild(item);
        }
    });

    // Update UI counts
    categories.forEach(cat => {
        const countEl = document.querySelector(`#cat-${cat} .cat-count`);
        if(countEl) countEl.textContent = counts[cat] > 0 ? counts[cat] : '+ 0';
    });
}

function createProjectItem(p) {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.onclick = () => { if(p.editorLink) window.open(p.editorLink, '_blank'); };
    
    const date = p.assetSubmittedAt ? new Date(p.assetSubmittedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : '04/23';
    const size = p.fileSize || '259.2 MB';
    const version = p.version || 'V2';

    item.innerHTML = `
        <div class="item-thumb">
            <img src="${p.thumbnail || 'https://via.placeholder.com/80x50/2a2a2a/ffffff?text=Video'}" alt="Thumb">
        </div>
        <div class="item-details">
            <div class="item-title">[${p.editorName || 'NextWave_Bob'}]_${p.name || 'Project Title'}</div>
            <div class="item-meta">
                <span>${date}</span>
                <span>•</span>
                <span>${size}</span>
                <span>•</span>
                <span style="color: var(--accent); font-weight: 800;">${version}</span>
            </div>
        </div>
    `;
    return item;
}

// ─── INIT ───
auth.onAuthStateChanged(user => {
    if(user) handleUser(user);
    else document.getElementById('auth-overlay').style.display = 'flex';
});
