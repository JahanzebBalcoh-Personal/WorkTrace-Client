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

window.addEventListener('worktrace-upload', e => {
    uploadRawData(e.detail.files);
});

async function uploadRawData(files) {
    const user = auth.currentUser;
    if(!user) return;

    for (const file of files) {
        const storageRef = firebase.storage().ref(`workspaces/${user.email}/raw/${file.name}`);
        const uploadTask = storageRef.put(file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                // Progress tracking if needed
            }, 
            (error) => console.error(error), 
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                // Save record to Firestore
                await db.collection('workspaces').doc(user.email).collection('files').add({
                    name: file.name,
                    size: file.size,
                    url: downloadURL,
                    uploadedAt: new Date().toISOString(),
                    type: file.type
                });
                
                // Update workspace usage
                const wsRef = db.collection('workspaces').doc(user.email);
                const wsDoc = await wsRef.get();
                const currentUsage = wsDoc.exists ? (wsDoc.data().usedBytes || 0) : 0;
                const newUsage = currentUsage + file.size;
                await wsRef.set({ usedBytes: newUsage }, { merge: true });
                
                // Also update user doc for Admin visibility
                await db.collection('users').doc(user.email).set({ usedBytes: newUsage }, { merge: true });
                
                alert(`Uploaded: ${file.name}`);
            }
        );
    }
}

function listenToStorage(userEmail) {
    db.collection('workspaces').doc(userEmail).onSnapshot(doc => {
        const data = doc.exists ? doc.data() : { usedBytes: 0, totalBytes: 100 * 1024 * 1024 * 1024 };
        const used = data.usedBytes || 0;
        const total = data.totalBytes || (100 * 1024 * 1024 * 1024);
        const pct = Math.min(100, Math.round((used / total) * 100));

        document.getElementById('storage-bar').style.width = pct + '%';
        document.getElementById('storage-pct').textContent = pct + '%';
        document.getElementById('storage-used').textContent = (used / (1024 ** 3)).toFixed(1) + ' GB';
        document.getElementById('storage-total').textContent = (total / (1024 ** 3)).toFixed(0) + ' GB';
    });

    db.collection('workspaces').doc(userEmail).collection('files').orderBy('uploadedAt', 'desc').onSnapshot(snap => {
        const fileList = document.getElementById('file-list');
        if(snap.empty) return;

        fileList.innerHTML = snap.docs.map(doc => {
            const f = doc.data();
            const size = (f.size / (1024 * 1024)).toFixed(1) + ' MB';
            return `
                <div class="project-item" style="cursor: default;">
                    <div class="item-thumb" style="display:flex; align-items:center; justify-content:center; background: rgba(0, 209, 255, 0.05); color: var(--secondary); font-size: 24px;">
                        📄
                    </div>
                    <div class="item-details">
                        <div class="item-title">${f.name}</div>
                        <div class="item-meta">
                            <span>${size}</span>
                            <span>•</span>
                            <span>${new Date(f.uploadedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <button onclick="window.open('${f.url}', '_blank')" style="background:transparent; border:1px solid var(--border); color:var(--accent); padding:8px 12px; border-radius:10px; font-size:11px; font-weight:800; cursor:pointer;">DOWNLOAD</button>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// Update handleUser to include storage listener
const originalHandleUser = handleUser;
handleUser = async function(user) {
    await originalHandleUser(user);
    listenToStorage(user.email);
}
