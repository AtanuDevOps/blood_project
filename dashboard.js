document.addEventListener('DOMContentLoaded', () => {
    
    // 1. AUTHENTICATION CHECK
    // -----------------------------------------------------------------
    let currentUser = null;

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            // Fetch user name for navbar
            const db = firebase.firestore();
            db.collection("users").doc(user.uid).get().then((doc) => {
                if(doc.exists) {
                    const userData = doc.data();
                    document.getElementById('navUserName').textContent = userData.name || "User";
                }
            });

            // Initial Load of Donors
            fetchDonors();
        } else {
            // Not logged in, redirect to login
            window.location.href = 'index.html';
        }
    });

    // 2. LOGOUT LOGIC
    // -----------------------------------------------------------------
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }

    // 3. SEARCH & FILTER LOGIC
    // -----------------------------------------------------------------
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', () => {
        const nameQuery = document.getElementById('searchName').value.toLowerCase().trim();
        const locationQuery = document.getElementById('searchLocation').value.toLowerCase().trim();
        const bloodQuery = document.getElementById('searchBloodGroup').value;

        fetchDonors(nameQuery, locationQuery, bloodQuery);
    });

    // 4. FETCH DONORS FROM FIRESTORE
    // -----------------------------------------------------------------
    function fetchDonors(nameFilter = "", locationFilter = "", bloodFilter = "") {
        const donorList = document.getElementById('donorList');
        donorList.innerHTML = '<div class="loading-spinner">Searching donors...</div>';

        const db = firebase.firestore();
        
        // In a real app with millions of users, we would use backend indexing (Algolia/Elastic).
        // For this student project with Firebase Client SDK, we will fetch all users 
        // and filter client-side (simplest approach for small datasets).
        
        db.collection("users").get().then((querySnapshot) => {
            let donorsHTML = "";
            let count = 0;

            querySnapshot.forEach((doc) => {
                const donor = doc.data();
                
                // Exclude current user from results (optional)
                if(currentUser && doc.id === currentUser.uid) return;

                // --- FILTERING LOGIC ---
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

    // Helper: Create HTML String for Card
    function createDonorCard(id, donor) {
        // Fallbacks
        const name = donor.name || "Unknown Name";
        const blood = donor.bloodGroup || "?";
        const location = donor.location || "Unknown Location";
        
        // Encode data into data attributes for easy access
        // (Avoiding complex JSON passing in HTML string)
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
                    data-phone="${escapeHtml(donor.phone || '')}">
                    View Profile
                </button>
            </div>
        `;
    }

    // Helper: Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return text;
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 5. MODAL LOGIC
    // -----------------------------------------------------------------
    const modal = document.getElementById('donorModal');
    const closeModal = document.querySelector('.close-modal');
    const showContactBtn = document.getElementById('showContactBtn');
    const callBtn = document.getElementById('callBtn');
    const modalPhone = document.getElementById('modalPhone');

    // Close Modal Events
    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.classList.remove('show');
        }
    });

    // View Profile Click Events
    function attachViewProfileEvents() {
        const viewButtons = document.querySelectorAll('.btn-view');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const data = e.target.dataset;
                openModal(data);
            });
        });
    }

    function openModal(data) {
        // Reset state
        modalPhone.classList.remove('revealed');
        modalPhone.textContent = "Click 'Show Contact'";
        showContactBtn.classList.remove('hidden');
        callBtn.classList.add('hidden');

        // Fill Data
        document.getElementById('modalName').textContent = data.name;
        document.getElementById('modalBlood').textContent = data.blood;
        document.getElementById('modalLocation').textContent = data.location;
        
        // Store phone for reveal
        const phone = data.phone;
        
        // Show Contact Logic
        // Remove old listener to prevent duplicates (cloning element is a quick hack)
        const newBtn = showContactBtn.cloneNode(true);
        showContactBtn.parentNode.replaceChild(newBtn, showContactBtn);
        
        newBtn.addEventListener('click', () => {
            modalPhone.textContent = phone;
            modalPhone.classList.add('revealed');
            
            // Show Call Button
            callBtn.href = `tel:${phone}`;
            callBtn.classList.remove('hidden');
            newBtn.classList.add('hidden');
        });

        // Show Modal
        modal.classList.add('show');
    }

});
