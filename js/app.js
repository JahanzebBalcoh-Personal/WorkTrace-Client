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

let currentPid = null;

// ─── AUTHENTICATION ───
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => console.error(e));
}

async function handleUser(user) {
    if(!user) return;
    await db.collection('users').doc(user.email).set({
        name: user.displayName, email: user.email, role: 'client', lastActive: new Date().toISOString()
    }, { merge: true });

    document.getElementById('auth-overlay').style.display = 'none';
    const pid = getProjectId();
    if(pid) {
        currentPid = pid;
        loadProjectData(pid, user.email);
    }
}

function getProjectId() { return new URLSearchParams(window.location.search).get('p'); }

function loadProjectData(id, userEmail) {
    db.collection('projects').doc(id).onSnapshot(doc => {
        if(doc.exists) {
            const p = doc.data();
            if(p.clientEmail === userEmail || p.allowPublicView) renderProject(p);
            else { alert("Access Denied."); auth.signOut(); }
        }
    });
}

// ─── RENDERING ───
function renderProject(p) {
    document.getElementById('project-title').textContent = p.name;
    document.getElementById('current-phase').textContent = p.currentPhase || 'Discovery';
    
    // Timeline
    updateTimeline(p.step || 1);

    // Review Section
    const reviewBox = document.getElementById('review-section');
    if(p.status === 'Review' && p.editorLink) {
        reviewBox.style.display = 'block';
        document.getElementById('work-link').href = p.editorLink;
    } else {
        reviewBox.style.display = 'none';
    }

    // Billing
    document.getElementById('total-price').textContent = '$' + (p.revenue || 0).toLocaleString();
    const balance = (p.revenue || 0) - (p.paidAmount || 0);
    document.getElementById('balance-due').textContent = '$' + balance.toLocaleString();
}

function updateTimeline(step) {
    const steps = document.querySelectorAll('.t-step');
    steps.forEach((el, idx) => {
        if(idx < step) { el.classList.add('active'); el.querySelector('.t-dot').textContent = '✓'; }
        else { el.classList.remove('active'); el.querySelector('.t-dot').textContent = String(idx + 1).padStart(2, '0'); }
    });
}

// ─── ACTIONS ───
async function approveWork() {
    if(confirm("Are you satisfied with the work? This will move project to Completion.")) {
        await db.collection('projects').doc(currentPid).update({
            status: 'Completed',
            step: 5,
            progress: 100,
            currentPhase: 'Delivered'
        });
        alert("Project marked as Completed! 🎉");
    }
}

async function requestRevision() {
    const feedback = prompt("Please provide your feedback / revision requests:");
    if(!feedback) return;
    await db.collection('projects').doc(currentPid).update({
        status: 'Active',
        feedback: feedback,
        currentPhase: 'Revision Requested'
    });
    alert("Feedback sent to the team! 🔄");
}

async function submitAssets() {
    const link = document.getElementById('asset-link').value;
    if(!link) return alert("Please paste a link!");
    
    await db.collection('projects').doc(currentPid).update({
        rawAssets: link,
        assetSubmittedAt: new Date().toISOString()
    });
    document.getElementById('asset-status').style.display = 'block';
}

// ─── INIT ───
auth.onAuthStateChanged(user => {
    if(user) handleUser(user);
    else document.getElementById('auth-overlay').style.display = 'flex';
});
