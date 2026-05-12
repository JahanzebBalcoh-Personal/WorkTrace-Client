// WorkTrace Client - Secure Portal Logic
const firebaseConfig = {
  apiKey: "AIzaSyDdRwSkiB4DjRg_W_dh5B50vUzsJtg-dyA",
  authDomain: "worktrace-agency.firebaseapp.com",
  projectId: "worktrace-agency",
  storageBucket: "worktrace-agency.firebasestorage.app",
  messagingSenderId: "891860270689",
  appId: "1:891860270689:web:31cc3e9047bd79bc15b420",
  measurementId: "G-S1HR173NW8"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let currentProject = null;

// ─── AUTHENTICATION ───
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(res => {
        handleUser(res.user);
    }).catch(err => {
        console.error("Login Error:", err);
    });
}

async function handleUser(user) {
    if(!user) return;
    
    // Save/Update client in users collection
    await db.collection('users').doc(user.email).set({
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        role: 'client',
        lastActive: new Date().toISOString()
    }, { merge: true });

    document.getElementById('auth-overlay').style.display = 'none';
    
    // After login, check if there's a project to load
    const pid = getProjectId();
    if(pid) loadProjectData(pid, user.email);
}

// ─── PROJECT LOGIC ───
function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('p');
}

function loadProjectData(id, userEmail) {
    db.collection('projects').doc(id).onSnapshot(doc => {
        if(doc.exists) {
            const p = doc.data();
            // SECURITY: Check if this user is the assigned client
            if(p.clientEmail === userEmail || p.allowPublicView) {
                renderProject(p);
            } else {
                alert("Unauthorized: You don't have access to this project.");
                auth.signOut();
            }
        } else {
            alert("Project not found!");
        }
    });
}

function renderProject(p) {
    const title = document.getElementById('project-title');
    if(title) title.textContent = p.name;
    
    const phase = document.getElementById('current-phase');
    if(phase) phase.textContent = p.currentPhase || 'Discovery';
    
    updateTimeline(p.step || 1);
}

function updateTimeline(step) {
    const steps = document.querySelectorAll('.t-step');
    steps.forEach((el, idx) => {
        if(idx < step) {
            el.classList.add('active');
            el.querySelector('.t-dot').textContent = '✓';
        } else {
            el.classList.remove('active');
            el.querySelector('.t-dot').textContent = String(idx + 1).padStart(2, '0');
        }
    });
}

// Initial Check
auth.onAuthStateChanged(user => {
    if(user) handleUser(user);
    else document.getElementById('auth-overlay').style.display = 'flex';
});
