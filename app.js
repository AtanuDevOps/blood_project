
document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. GLOBAL STATE & PAGE DETECTION
    // =========================================================================
    const isDashboard = document.getElementById('donorList');
    const isAuthPage = document.getElementById('signupForm'); // Login or Signup page
    const isProfilePage = document.getElementById('userPhone'); // Profile page elements

    let currentUser = null;

    // =========================================================================
    // 2. AUTHENTICATION STATE LISTENER (Runs on all pages)
    // =========================================================================
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        
        // Update UI based on Auth State
        updateNavbar(user);

        // Redirect Logic
        if (isProfilePage && !user) {
            window.location.href = 'login.html';
        }
        
        if (isAuthPage && user) {
            // If user is already logged in, send them to profile or dashboard
            // window.location.href = 'profile.html'; 
            // Optional: Auto-redirect can be annoying if they want to switch accounts, 
            // but for this app it's usually desired.
        }

        // Page Specific Data Loading
        if (isDashboard) {
            // If logged in, maybe show "My Profile" button instead of "Login"
            // But we already handle this in updateNavbar
        }

        if (isProfilePage && user) {
            loadProfileData(user.uid);
        }
    });

    // =========================================================================
    // 3. NAVBAR LOGIC (Shared)
    // =========================================================================
    function updateNavbar(user) {
        const navUserMenu = document.querySelector('.user-menu');
        if (!navUserMenu) return;

        if (user) {
            // User Logged In
            const db = firebase.firestore();
            db.collection("users").doc(user.uid).get().then((doc) => {
                const name = doc.exists ? doc.data().name : "User";
                navUserMenu.innerHTML = `
                    <span id="navUserName" style="margin-right: 10px; font-weight: 500;">Hello, ${escapeHtml(name)}</span>
                    <a href="profile.html" class="btn-view" style="padding: 5px 15px; margin-right: 5px; font-size: 12px;">Profile</a>
                    <button id="logoutBtn" class="btn-logout" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
                `;
                // Re-attach logout listener since we replaced innerHTML
                document.getElementById('logoutBtn').addEventListener('click', logout);
            });
        } else {
            // User Guest
            navUserMenu.innerHTML = `
                <a href="login.html" class="nav-link" style="margin-right: 15px;">Login</a>
                <a href="signup.html" class="nav-link" style="background: white; color: #CE1126; padding: 5px 15px; border-radius: 20px;">Join as Donor</a>
            `;
        }
    }

    function logout() {
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    }

    // =========================================================================
    // 4. DASHBOARD LOGIC (index.html)
    // =========================================================================
    if (isDashboard) {
        // Initial Fetch
        fetchDonors();

        // Search Listener
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const nameQuery = document.getElementById('searchName').value.toLowerCase().trim();
                const locationQuery = document.getElementById('searchLocation').value.toLowerCase().trim();
                const bloodQuery = document.getElementById('searchBloodGroup').value;
                fetchDonors(nameQuery, locationQuery, bloodQuery);
            });
        }

        // Modal Logic
        initModal();
    }

    function fetchDonors(nameFilter = "", locationFilter = "", bloodFilter = "") {
        const donorList = document.getElementById('donorList');
        if (!donorList) return;
        
        donorList.innerHTML = '<div class="loading-spinner">Searching donors...</div>';

        const db = firebase.firestore();
        db.collection("users").get().then((querySnapshot) => {
            let donorsHTML = "";
            let count = 0;

            querySnapshot.forEach((doc) => {
                const donor = doc.data();
                
                // Exclude current user from results if logged in (optional)
                // if(currentUser && doc.id === currentUser.uid) return;

                // Client-side Filtering
                const donorName = (donor.name || "").toLowerCase();
                const donorLocation = (donor.location || "").toLowerCase();
                const donorBlood = donor.bloodGroup || "";

                const matchesName = !nameFilter || donorName.includes(nameFilter);
                const matchesLocation = !locationFilter || donorLocation.includes(locationFilter);
                const matchesBlood = !bloodFilter || donorBlood === bloodFilter;

                if (matchesName && matchesLocation && matchesBlood) {
                    count++;
                    donorsHTML += createDonorCard(doc.id, donor);
                }
            });

            if (count === 0) {
                donorList.innerHTML = '<div class="loading-spinner">No donors found matching criteria.</div>';
            } else {
                donorList.innerHTML = donorsHTML;
                attachViewProfileEvents();
            }
        }).catch((error) => {
            console.error("Error fetching donors: ", error);
            donorList.innerHTML = '<div class="loading-spinner">Error loading data.</div>';
        });
    }

    function createDonorCard(id, donor) {
        const name = donor.name || "Unknown Name";
        const blood = donor.bloodGroup || "?";
        const location = donor.location || "Unknown Location";
        const phone = donor.phone || "";

        return `
            <div class="donor-card">
                <div class="card-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="card-name">${escapeHtml(name)}</div>
                <div class="card-blood">${escapeHtml(blood)}</div>
                <div class="card-info">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(location)}
                </div>
                <button class="btn-view" 
                    data-name="${escapeHtml(name)}"
                    data-blood="${escapeHtml(blood)}"
                    data-location="${escapeHtml(location)}"
                    data-phone="${escapeHtml(phone)}">
                    View Profile
                </button>
            </div>
        `;
    }

    function initModal() {
        const modal = document.getElementById('donorModal');
        const closeModal = document.querySelector('.close-modal');
        
        if (!modal) return;

        // Close Events
        closeModal.addEventListener('click', () => modal.classList.remove('show'));
        window.addEventListener('click', (e) => {
            if (e.target == modal) modal.classList.remove('show');
        });
    }

    function attachViewProfileEvents() {
        const viewButtons = document.querySelectorAll('.btn-view');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Check if it's the navbar profile button (which is an anchor tag, not button usually, but just in case)
                if(e.target.tagName === 'A') return;

                const data = e.target.dataset;
                openModal(data);
            });
        });
    }

    function openModal(data) {
        const modal = document.getElementById('donorModal');
        const modalName = document.getElementById('modalName');
        const modalBlood = document.getElementById('modalBlood');
        const modalLocation = document.getElementById('modalLocation');
        const modalPhone = document.getElementById('modalPhone');
        const showContactBtn = document.getElementById('showContactBtn');
        const callBtn = document.getElementById('callBtn');

        if (!modal) return;

        // Fill Data
        modalName.textContent = data.name;
        modalBlood.textContent = data.blood;
        modalLocation.textContent = data.location;
        
        // Reset Phone State
        modalPhone.textContent = "Click 'Show Contact'";
        modalPhone.classList.remove('revealed');
        showContactBtn.classList.remove('hidden');
        callBtn.classList.add('hidden');

        // Handle Show Contact
        // Clone to remove old listeners
        const newBtn = showContactBtn.cloneNode(true);
        showContactBtn.parentNode.replaceChild(newBtn, showContactBtn);
        
        newBtn.addEventListener('click', () => {
            modalPhone.textContent = data.phone;
            modalPhone.classList.add('revealed');
            callBtn.href = `tel:${data.phone}`;
            callBtn.classList.remove('hidden');
            newBtn.classList.add('hidden');
        });

        modal.classList.add('show');
    }

    // =========================================================================
    // 5. AUTH PAGE LOGIC (login.html / signup.html)
    // =========================================================================
    if (isAuthPage) {
        const signUpButton = document.getElementById('signUp');
        const signInButton = document.getElementById('signIn');
        const container = document.getElementById('container');
        const mobileSignIn = document.getElementById('mobile-signIn');
        const mobileSignUp = document.getElementById('mobile-signUp');

        // Panel Toggles
        if (signUpButton) signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
        if (signInButton) signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));
        if (mobileSignUp) mobileSignUp.addEventListener('click', (e) => { e.preventDefault(); container.classList.add("right-panel-active"); });
        if (mobileSignIn) mobileSignIn.addEventListener('click', (e) => { e.preventDefault(); container.classList.remove("right-panel-active"); });

        // Auto-switch based on URL (simple check)
        if (window.location.pathname.includes('signup.html')) {
            container.classList.add("right-panel-active");
        }

        // Form Submissions
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('signupName').value;
                const phone = document.getElementById('signupPhone').value;
                const bloodGroup = document.getElementById('signupBloodGroup').value;
                const location = document.getElementById('signupLocation').value;
                const password = document.getElementById('signupPassword').value;
                registerUser(name, phone, bloodGroup, location, password);
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const phone = document.getElementById('loginPhone').value;
                const password = document.getElementById('loginPassword').value;
                loginUser(phone, password);
            });
        }
    }

    function registerUser(name, phone, bloodGroup, location, password) {
        if(!name || !phone || !bloodGroup || !location || !password) {
            alert("Please fill in all fields.");
            return;
        }
        const email = `${phone}@bloodlog.com`; // Fake email strategy
        
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                return firebase.firestore().collection("users").doc(userCredential.user.uid).set({
                    name: name,
                    phone: phone,
                    bloodGroup: bloodGroup,
                    location: location,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                alert("Registration Successful!");
                window.location.href = 'profile.html';
            })
            .catch((error) => {
                alert("Error: " + error.message);
            });
    }

    function loginUser(phone, password) {
        if(!phone || !password) {
            alert("Please fill in all fields.");
            return;
        }
        const email = `${phone}@bloodlog.com`;
        
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                // alert("Login Successful!"); // Optional, smoother without
                window.location.href = 'profile.html';
            })
            .catch((error) => {
                alert("Login Failed: " + error.message);
            });
    }

    // =========================================================================
    // 6. PROFILE LOGIC (profile.html)
    // =========================================================================
    function loadProfileData(uid) {
        const db = firebase.firestore();
        db.collection("users").doc(uid).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('userName').textContent = data.name || 'User';
                document.getElementById('userPhone').textContent = data.phone || '-';
                document.getElementById('userBlood').textContent = data.bloodGroup || '-';
                document.getElementById('userLocation').textContent = data.location || '-';
            }
        });
        
        // Logout button in profile is handled by the shared updateNavbar logic 
        // OR the static one in profile.html if navbar isn't there.
        // But wait, profile.html has a specific "LOG OUT" button in the card too.
        const profileLogoutBtn = document.querySelector('.profile-card #logoutBtn');
        if(profileLogoutBtn) {
            profileLogoutBtn.addEventListener('click', logout);
        }
    }

    // Helper
    function escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});
