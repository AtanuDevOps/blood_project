document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check Authentication State
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            console.log("User is logged in:", user.uid);
            
            // 2. Fetch User Data from Firestore
            fetchUserData(user.uid);
            
        } else {
            // No user is signed in. Redirect to login.
            console.log("No user logged in. Redirecting...");
            window.location.href = 'index.html';
        }
    });

    // 4. Handle Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => {
                // Sign-out successful.
                console.log("Signed out.");
                window.location.href = 'index.html';
            }).catch((error) => {
                // An error happened.
                console.error("Sign out error:", error);
            });
        });
    }
});

/**
 * Fetch User Data from Firestore
 * @param {string} uid 
 */
function fetchUserData(uid) {
    const db = firebase.firestore();
    
    db.collection("users").doc(uid).get().then((doc) => {
        if (doc.exists) {
            console.log("User data:", doc.data());
            const data = doc.data();
            
            // 3. Populate Profile
            document.getElementById('userName').textContent = data.name || 'User';
            document.getElementById('userPhone').textContent = data.phone || '-';
            document.getElementById('userBlood').textContent = data.bloodGroup || '-';
            document.getElementById('userLocation').textContent = data.location || '-';
            
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
            document.getElementById('userName').textContent = "Profile Not Found";
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });
}
