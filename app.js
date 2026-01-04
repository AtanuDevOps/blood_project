
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
                
                // Exclude current user from results if logged in
                if(currentUser && doc.id === currentUser.uid) return;

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
                    data-id="${id}" 
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

    function getOrSetRequesterId() {
        if (currentUser) return currentUser.uid;
        
        let anonId = localStorage.getItem('anonymousRequesterId');
        if (!anonId) {
            anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('anonymousRequesterId', anonId);
        }
        return anonId;
    }

    function openModal(data) {
        const modal = document.getElementById('donorModal');
        const modalName = document.getElementById('modalName');
        const modalBlood = document.getElementById('modalBlood');
        const modalLocation = document.getElementById('modalLocation');
        const modalPhone = document.getElementById('modalPhone');
        
        let requestContactBtn = document.getElementById('requestContactBtn');
        const callBtn = document.getElementById('callBtn');
        const statusMsg = document.getElementById('requestStatusMsg');

        if (!modal) return;

        // Fill Data
        modalName.textContent = data.name;
        modalBlood.textContent = data.blood;
        modalLocation.textContent = data.location;
        
        // Reset Phone State (Follow user requirement: Show text if not approved)
        // Remove blur class so text is readable
        modalPhone.classList.remove('blur-text', 'revealed'); 
        modalPhone.textContent = "Contact info will be visible after donor approval";
        modalPhone.style.color = "#888"; // Dimmed text for instruction
        modalPhone.style.fontStyle = "italic";
        
        // Reset Buttons & Status
        // Clone button immediately to remove old listeners and ensure we work with the live DOM element
        const newBtn = requestContactBtn.cloneNode(true);
        requestContactBtn.parentNode.replaceChild(newBtn, requestContactBtn);
        requestContactBtn = newBtn; // Update reference to the live button

        requestContactBtn.classList.remove('hidden');
        requestContactBtn.disabled = false;
        requestContactBtn.textContent = "Request Contact";
        callBtn.classList.add('hidden');
        
        statusMsg.className = 'status-message-box'; // reset classes
        statusMsg.textContent = '';
        statusMsg.classList.remove('visible');

        // Check Request Status
        const requesterId = getOrSetRequesterId();
        const docId = `${data.id}_${requesterId}`;
        const db = firebase.firestore();

        // Show loading state on button
        requestContactBtn.textContent = "Checking...";
        requestContactBtn.disabled = true;

        db.collection('contactRequests').doc(docId).get().then((doc) => {
            if (doc.exists) {
                const req = doc.data();
                if (req.status === 'approved') {
                    // Approved: Show Phone
                    modalPhone.textContent = data.phone;
                    modalPhone.classList.add('revealed'); 
                    modalPhone.style.color = "#333";
                    modalPhone.style.fontStyle = "normal";
                    modalPhone.style.fontWeight = "bold";
                    
                    requestContactBtn.classList.add('hidden');
                    
                    callBtn.href = `tel:${data.phone}`;
                    callBtn.classList.remove('hidden');
                    
                    statusMsg.textContent = "Request Approved! You can now contact this donor.";
                    statusMsg.classList.add('visible', 'approved');
                } else if (req.status === 'pending') {
                    // Pending
                    requestContactBtn.classList.add('hidden'); // Hide button as per requirements
                    statusMsg.textContent = "Request sent. Waiting for approval.";
                    statusMsg.classList.add('visible', 'pending');
                } else if (req.status === 'rejected') {
                    // Rejected
                    requestContactBtn.classList.add('hidden'); // Hide button as per requirements
                    statusMsg.textContent = "Request rejected by donor.";
                    statusMsg.classList.add('visible', 'rejected');
                }
            } else {
                // No request yet
                requestContactBtn.textContent = "Request Contact";
                requestContactBtn.disabled = false;
                requestContactBtn.classList.remove('hidden');
            }
        }).catch(err => {
            console.error("Error checking status:", err);
            requestContactBtn.textContent = "Request Contact";
            requestContactBtn.disabled = false;
            requestContactBtn.classList.remove('hidden');
        });

        // Handle Request Button Click
        requestContactBtn.addEventListener('click', () => {
            const nameInput = prompt("Please enter your name (optional) so the donor knows who is asking:", "Anonymous");
            if (nameInput === null) return; // Cancelled

            const requesterName = nameInput.trim() || "Anonymous";
            
            requestContactBtn.textContent = "Sending...";
            requestContactBtn.disabled = true;

            db.collection('contactRequests').doc(docId).set({
                donorId: data.id,
                requesterId: requesterId,
                requesterName: requesterName,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                requestContactBtn.classList.add('hidden');
                statusMsg.textContent = "Request sent. Waiting for approval.";
                statusMsg.classList.add('visible', 'pending');
            }).catch((error) => {
                console.error("Error sending request:", error);
                alert("Failed to send request. Please try again.");
                requestContactBtn.textContent = "Request Contact";
                requestContactBtn.disabled = false;
            });
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
                
                // Load Contact Requests
                loadContactRequests(uid);
            }
        });
        
        // Logout button in profile is handled by the shared updateNavbar logic 
        // OR the static one in profile.html if navbar isn't there.
        const profileLogoutBtn = document.querySelector('.profile-card #logoutBtn');
        if(profileLogoutBtn) {
            profileLogoutBtn.addEventListener('click', logout);
        }
    }

    function loadContactRequests(uid) {
        const requestsList = document.getElementById('requestsList');
        const section = document.getElementById('contactRequestsSection');
        if (!requestsList || !section) return;

        section.style.display = 'block';

        const db = firebase.firestore();
        
        // Listen for requests (Real-time)
        db.collection('contactRequests')
          .where('donorId', '==', uid)
          .onSnapshot((snapshot) => {
              if (snapshot.empty) {
                  requestsList.innerHTML = '<div style="text-align:center; padding:15px; color:#888; font-size:14px;">No requests yet.</div>';
                  return;
              }

              let html = '';
              const requests = [];
              snapshot.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));
              
              // Client-side Sort (Newest first)
              requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

              requests.forEach(req => {
                  const date = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
                  
                  let actionButtons = '';
                  let statusBadge = '';

                  if (req.status === 'pending') {
                      actionButtons = `
                          <button class="btn-accept" onclick="handleRequestAction('${req.id}', 'approved')">Accept</button>
                          <button class="btn-reject" onclick="handleRequestAction('${req.id}', 'rejected')">Reject</button>
                      `;
                      statusBadge = `<span class="status-badge status-pending">PENDING</span>`;
                  } else if (req.status === 'approved') {
                      statusBadge = `<span class="status-badge status-approved">APPROVED</span>`;
                  } else {
                      statusBadge = `<span class="status-badge status-rejected">REJECTED</span>`;
                  }

                  // If status is not pending, we don't show buttons, just badge
                  // Structure: Info | [Buttons] Badge
                  
                  html += `
                      <div class="request-item">
                          <div class="request-info">
                              <span class="req-name">${escapeHtml(req.requesterName)}</span>
                              <span class="req-date">${date}</span>
                          </div>
                          <div class="req-actions">
                              ${actionButtons}
                              ${statusBadge}
                          </div>
                      </div>
                  `;
              });
              requestsList.innerHTML = html;
          }, (error) => {
              console.error("Error loading requests:", error);
              requestsList.innerHTML = '<div style="color:red;">Error loading requests.</div>';
          });
    }

    // Make available globally for onclick handlers
    window.handleRequestAction = function(requestId, action) {
        if(!confirm(`Are you sure you want to ${action} this request?`)) return;

        firebase.firestore().collection('contactRequests').doc(requestId).update({
            status: action
        }).catch(err => {
            console.error("Error updating request:", err);
            alert("Error: " + err.message);
        });
    }

    // Helper
    function escapeHtml(text) {
        if (!text) return text;
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});
