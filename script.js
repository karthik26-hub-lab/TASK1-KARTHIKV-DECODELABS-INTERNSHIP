const imgBase = "https://images.unsplash.com/photo-";
const imgParams = "?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

function showToast(msg, type = 'info') {
    const oldToast = document.getElementById('traviqueToast');
    if(oldToast) oldToast.remove();

    const t = document.createElement('div');
    t.id = 'traviqueToast';
    const bg = 'bg-mono-900 text-white';
    let icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-green-400 mr-2"></i>' : '<i class="fa-solid fa-circle-info text-blue-400 mr-2"></i>';
    if(type === 'error') icon = '<i class="fa-solid fa-circle-exclamation text-rose-400 mr-2"></i>';
    
    t.className = `fixed top-24 left-1/2 transform -translate-x-1/2 ${bg} px-6 py-3 rounded-full shadow-2xl z-[200] font-bold text-sm transition-all duration-300 translate-y-[-20px] opacity-0 whitespace-nowrap flex items-center border border-mono-200`;
    t.innerHTML = `${icon} ${msg}`;
    document.body.appendChild(t);
    
    requestAnimationFrame(() => t.classList.remove('translate-y-[-20px]', 'opacity-0'));
    setTimeout(() => {
        t.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

let userProfile = JSON.parse(localStorage.getItem('travique_user_profile')) || null;
let customPlaces = JSON.parse(localStorage.getItem('travique_master_custom_places')) || [];
let savedPlaces = JSON.parse(localStorage.getItem('travique_master_saved')) || [];
if(savedPlaces.length < 10) { savedPlaces.push('mock1','mock2','mock3','mock4','mock5','mock6','mock7','mock8','mock9','mock10'); }

let scrapbookNotes = JSON.parse(localStorage.getItem('travique_master_notes')) || {};
let currentTabIndex = 0;
let shareDestData = null; 
let selectedJournalId = null; 
let selectedAvatar = 'fa-compass';

const rawData = [
    `Munnar|Kerala|Nature|Family,Romantic|mid|Monsoon,Winter|1593693397690-362bb9a11540|10.0889|77.0595|Travique AI`,
    `Udaipur|Rajasthan|Heritage|Romantic,Luxury|luxury|Winter|1615836245337-f589886a0735|24.5854|73.7125|Travique AI`,
    `Goa|Goa|Beaches|Weekend,Solo|mid|Winter,Summer|1512343879784-a960bf40e7f2|15.2993|74.1240|Travique AI`,
    `Spiti Valley|Himachal|Nature|Solo,Nature|mid|Summer|1469854523086-cc02fe5d8800|32.2461|78.0349|Travique AI`,
    `Varanasi|Uttar Pradesh|Heritage|Solo,Wellness|budget|Winter|1561361513-2d000a50f0dc|25.3176|82.9739|Travique AI`,
    `Andaman|Andaman|Beaches|Romantic,Adventure|luxury|Summer,Winter|1589182373726-e4f658ab50f0|11.7401|92.6586|Travique AI`,
    `Hampi|Karnataka|Heritage|Solo,Heritage|budget|Winter|1600100397608-f010f41cb8ea|15.3350|76.4600|Travique AI`,
    `Darjeeling|West Bengal|Nature|Romantic,Family|mid|Summer|1544644181-1484b3fdfc62|27.0360|88.2627|Travique AI`
];

const parseDest = (row, index) => {
    const [name, state, type, vibes, budget, seasons, imgId, lat, lon, foundBy] = row.split('|');
    return { 
        id: `dest_${index}`, name, state, type, vibes: vibes.split(','), 
        budgetTier: budget, seasons: seasons.split(','), 
        image: imgId.startsWith('http') ? imgId : `${imgBase}${imgId}${imgParams}`,
        lat: parseFloat(lat), lon: parseFloat(lon), foundBy,
        desc: `A breathtaking escape in ${state}, perfect for those seeking authentic ${vibes[0]?.toLowerCase() || 'local'} vibes, rich culture, and unforgettable aesthetics.` 
    };
};

let destinations = [...rawData.map(parseDest), ...customPlaces];

function initApp() {
    if(!userProfile) {
        document.getElementById('welcomeGate').classList.remove('translate-y-full');
        document.getElementById('welcomeGate').style.transform = 'translateY(0)';
    } else {
        document.getElementById('welcomeGate').style.display = 'none';
        syncProfileUI();
    }
}

function syncProfileUI() {
    if(!userProfile) return;
    document.getElementById('headerLoc').innerText = userProfile.location || 'Global';
    const hr = new Date().getHours();
    const timeStr = hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening';
    document.getElementById('greetingText').innerText = `Good ${timeStr}, ${userProfile.name.split(' ')[0]}.`;
    
    document.getElementById('profileBigAvatar').className = `fa-solid ${userProfile.avatar}`;
    document.getElementById('profileNameDisplay').innerText = userProfile.name;
    document.getElementById('profileUserDisplay').innerText = userProfile.user;
    document.getElementById('profilePointsText').innerText = userProfile.points || 0;
    
    let rank = "Bronze Scout";
    if(userProfile.points > 1000) rank = "Silver Explorer";
    if(userProfile.points > 5000) rank = "Diamond Concierge";
    document.getElementById('profileRankText').innerText = rank;
}

function nextObStage(stage) {
    document.getElementById('obStage1').classList.add('opacity-0', 'pointer-events-none', '-translate-x-full');
    setTimeout(() => {
        const next = document.getElementById(`obStage${stage}`);
        next.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
    }, 300);
}

function autoDetectLocation() {
    const locInput = document.getElementById('obLocation');
    locInput.value = "Detecting...";
    locInput.classList.remove('border-rose-400', 'placeholder:text-rose-400');
    
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => { setTimeout(() => { locInput.value = "Chennai, IN (Auto)"; }, 800); },
            err => {
                locInput.value = ""; locInput.placeholder = "Type your city manually...";
                locInput.classList.add('animate-shake', 'border-rose-400', 'placeholder:text-rose-400');
                setTimeout(() => locInput.classList.remove('animate-shake'), 500);
            }
        );
    }
}

function validateObForm() {
    const name = document.getElementById('obName').value;
    const user = document.getElementById('obUser').value;
    const loc = document.getElementById('obLocation').value;
    
    if(!name || !user || !loc) { showToast("Please fill out your Passport details.", "error"); return; }
    
    userProfile = { name, user: user.startsWith('@') ? user : '@'+user, location: loc, avatar: 'fa-compass', points: 100 }; 
    
    document.getElementById('obStage2').classList.add('opacity-0', 'pointer-events-none', '-translate-x-full');
    setTimeout(() => { document.getElementById(`obStage3`).classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none'); }, 300);
}

function selectAvatar(el, iconClass) {
    document.querySelectorAll('.avatar-option').forEach(opt => { opt.classList.remove('border-mono-900'); });
    el.classList.add('border-mono-900');
    selectedAvatar = iconClass;
}

function finishOnboarding() {
    userProfile.avatar = selectedAvatar;
    localStorage.setItem('travique_user_profile', JSON.stringify(userProfile));
    
    document.getElementById('welcomeGate').style.transform = 'translateY(-100%)';
    showToast("Welcome to Travique. You earned 100 Pts!", "success");
    setTimeout(() => { initApp(); }, 700);
}

function switchTab(newIndex) {
    if (newIndex === currentTabIndex) return;
    
    for(let i=0; i<4; i++) {
        const pill = document.getElementById(`pill-${i}`);
        if (i === newIndex) pill.classList.add('active');
        else pill.classList.remove('active');
    }

    const tabs = ['tab-explore', 'tab-ai', 'tab-journal', 'tab-profile'];
    tabs.forEach((tabId, idx) => {
        const el = document.getElementById(tabId);
        if (idx === newIndex) { el.classList.remove('hidden'); el.classList.add('fade-in'); } 
        else { el.classList.add('hidden'); el.classList.remove('fade-in'); }
    });
    
    const keyBtn = document.getElementById('keyboardToggleBtn');
    if (newIndex === 1) keyBtn.classList.remove('hidden');
    else { keyBtn.classList.add('hidden'); closeKeyboardMode(); }
    
    currentTabIndex = newIndex;
    window.scrollTo({top:0, behavior:'smooth'});

    if (newIndex === 0) syncProfileUI();
    else if (newIndex === 3) {
        document.getElementById('greetingText').innerText = "Your Passport.";
        renderProfileGems();
    }
    else document.getElementById('greetingText').innerText = "Travique";

    if (newIndex === 2) renderJournalDeck('all');
}

function switchProfileView(view) {
    const vGems = document.getElementById('profileViewGems');
    const vBadges = document.getElementById('profileViewBadges');
    const tGems = document.getElementById('toggleGems');
    const tBadges = document.getElementById('toggleBadges');
    const selector = document.getElementById('pillSelector');

    if(view === 'gems') {
        selector.style.transform = 'translateX(0)';
        vGems.classList.replace('opacity-0', 'opacity-100'); vGems.classList.replace('pointer-events-none', 'pointer-events-auto');
        vBadges.classList.replace('opacity-100', 'opacity-0'); vBadges.classList.replace('pointer-events-auto', 'pointer-events-none');
        tGems.classList.replace('text-mono-500', 'text-mono-900');
        tBadges.classList.replace('text-mono-900', 'text-mono-500');
    } else {
        selector.style.transform = 'translateX(100%)';
        vBadges.classList.replace('opacity-0', 'opacity-100'); vBadges.classList.replace('pointer-events-none', 'pointer-events-auto');
        vGems.classList.replace('opacity-100', 'opacity-0'); vGems.classList.replace('pointer-events-auto', 'pointer-events-none');
        tBadges.classList.replace('text-mono-500', 'text-mono-900');
        tGems.classList.replace('text-mono-900', 'text-mono-500');
    }
}

function renderExploreGrid(dataList = destinations) {
    const container = document.getElementById('exploreGrid');
    let html = '';
    
    dataList.forEach((dest, i) => {
        let spanClass = 'col-span-1 aspect-square'; 
        if (i % 3 === 0) spanClass = 'col-span-2 md:col-span-3 aspect-[4/3] md:aspect-[21/9]'; 
        else if (i % 3 === 1 || i % 3 === 2) spanClass = 'col-span-1 md:col-span-1 aspect-square md:aspect-[3/4]';

        const foundPill = dest.foundBy && dest.foundBy !== 'Travique AI' ? `<span class="absolute top-4 left-4 z-10 px-3 py-1 bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm"><i class="fa-solid fa-crown text-yellow-400 mr-1"></i> ${dest.foundBy}</span>` : '';

        html += `
        <div class="${spanClass} rounded-[2rem] overflow-hidden cursor-pointer group relative shadow-md border border-mono-200" onclick="openImmersive('${dest.id}')">
            <img src="${dest.image}" alt="${dest.name}" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div class="absolute inset-0 bg-gradient-to-t from-mono-900/80 via-transparent to-transparent flex flex-col justify-end p-5 md:p-8">
                ${foundPill}
                <h3 class="font-black text-white text-3xl md:text-5xl leading-none drop-shadow-lg tracking-tight">${dest.name}</h3>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function renderProfileGems() {
    const container = document.getElementById('profileViewGems');
    if(!userProfile) return;
    
    const myGems = customPlaces.filter(d => d.foundBy === userProfile.user);
    if(myGems.length === 0) {
        container.innerHTML = `<div class="col-span-2 py-10 text-center w-full"><p class="text-mono-400 font-bold text-sm">You haven't published any gems yet.</p></div>`;
        return;
    }
    
    container.innerHTML = myGems.map(dest => `
        <div class="col-span-1 aspect-square rounded-[1.5rem] overflow-hidden cursor-pointer group relative shadow-sm border border-mono-200" onclick="openImmersive('${dest.id}')">
            <img src="${dest.image}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                <h3 class="font-black text-white text-xl leading-none drop-shadow-md">${dest.name}</h3>
            </div>
        </div>
    `).join('');
}

function getDistance(lat1, lon1, lat2, lon2) {
    if(!lat1 || !lon1 || !lat2 || !lon2) return 99999;
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function sortByNearMe() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const {latitude, longitude} = pos.coords;
            const sorted = [...destinations].sort((a,b) => getDistance(latitude, longitude, a.lat, a.lon) - getDistance(latitude, longitude, b.lat, b.lon));
            renderExploreGrid(sorted);
            showToast("Grid reordered by nearest!", "success");
        }, () => showToast("Location access denied.", "error"));
    }
}

function openAddPlaceModal() {
    if(savedPlaces.length < 10) {
        showToast(`Trusted Explorer Lock! Save ${10 - savedPlaces.length} more places to unlock publishing.`, "error");
        return;
    }
    const modal = document.getElementById('addPlaceModal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeAddPlaceModal() {
    const modal = document.getElementById('addPlaceModal');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 400);
}

function submitNewPlace() {
    const name = document.getElementById('newPlaceName').value;
    const state = document.getElementById('newPlaceState').value;
    const img = document.getElementById('newPlaceImage').value;
    const mapLink = document.getElementById('newPlaceMapLink').value;
    const desc = document.getElementById('newPlaceDesc').value;
    const budget = document.getElementById('newPlaceBudget').value;
    const vibe = document.getElementById('newPlaceVibe').value;
    
    if(!name || !state || !img || !desc) { showToast("Curator form incomplete. Main fields required.", "error"); return; }
    
    const btn = document.getElementById('publishBtn');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> AI Quality Check...`;
    
    setTimeout(() => {
        const newDest = {
            id: `dest_custom_${Date.now()}`, name, state, type: vibe, vibes: [vibe, 'Community'],
            budgetTier: budget, seasons: ['Year-Round'], image: img, lat: 0, lon: 0,
            mapLink: mapLink,
            foundBy: userProfile ? userProfile.user : '@explorer',
            desc: `Curator's Note: "${desc}"`
        };
        
        customPlaces.unshift(newDest);
        localStorage.setItem('travique_master_custom_places', JSON.stringify(customPlaces));
        
        if(userProfile) {
            userProfile.points += 500;
            localStorage.setItem('travique_user_profile', JSON.stringify(userProfile));
        }

        destinations = [...rawData.map(parseDest), ...customPlaces]; 
        renderExploreGrid();
        closeAddPlaceModal();
        showToast("Gem Published! +500 Pts", "success");
        
        document.getElementById('newPlaceName').value = '';
        document.getElementById('newPlaceState').value = '';
        document.getElementById('newPlaceImage').value = '';
        document.getElementById('newPlaceMapLink').value = '';
        document.getElementById('newPlaceDesc').value = '';
        btn.innerHTML = `Publish Gem <i class="fa-solid fa-arrow-up-right-from-square text-sm"></i>`;
    }, 1500);
}

function openImmersive(destId) {
    const dest = destinations.find(d => d.id === destId);
    if(!dest) return;
    shareDestData = dest; 

    document.getElementById('immImage').src = dest.image;
    document.getElementById('immTitle').innerText = dest.name;
    document.getElementById('immDesc').innerText = dest.desc;
    document.getElementById('immTag').innerText = dest.type;
    document.getElementById('immState').innerText = dest.state;
    
    if(dest.foundBy && dest.foundBy !== 'Travique AI') {
        document.getElementById('immFoundBy').innerHTML = `<i class="fa-solid fa-crown text-yellow-400 mr-1"></i> Found by ${dest.foundBy}`;
        document.getElementById('immFoundBy').style.display = 'inline-block';
    } else {
        document.getElementById('immFoundBy').style.display = 'none';
    }

    let estB = dest.budgetTier === 'budget' ? '₹8,000 - ₹12k' : dest.budgetTier === 'luxury' ? '₹35,000+' : '₹18,000 - ₹25k';
    document.getElementById('immBudget').innerText = estB;
    document.getElementById('immTime').innerText = dest.seasons.join(', ');

    // Use specific map link if provided, otherwise fallback to name/state search
    document.getElementById('immMapJump').onclick = () => window.open(dest.mapLink || `https://maps.google.com/?q=${encodeURIComponent(dest.name + ', ' + dest.state)}`, '_blank');

    const modal = document.getElementById('immersiveArticle');
    modal.classList.remove('translate-y-full');
    document.getElementById('immersiveScroll').scrollTop = 0;
}

function closeImmersive() { document.getElementById('immersiveArticle').classList.add('translate-y-full'); }

function shareArticle() {
    if(!shareDestData) return;
    const modal = document.getElementById('sharePreviewModal');
    document.getElementById('shareImg').src = shareDestData.image;
    document.getElementById('shareTitle').innerText = shareDestData.name;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}
function closeShareModal() {
    const modal = document.getElementById('sharePreviewModal');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 400);
}
function confirmShare() {
    showToast("Native Share Sheet Opened!", "success");
    closeShareModal();
}

let isListening = false;
let aiActiveDeck = [];

function openKeyboardMode() {
    document.getElementById('keyboardToggleBtn').classList.add('scale-0'); 
    document.getElementById('aiVoiceCenter').classList.add('opacity-30', 'scale-90');
    document.getElementById('mainDock').classList.add('translate-y-32', 'opacity-0', 'pointer-events-none'); 
    
    const chatbar = document.getElementById('aiChatbarState');
    chatbar.classList.remove('translate-y-[150%]', 'opacity-0', 'pointer-events-none');
    setTimeout(() => document.getElementById('aiTextInput').focus(), 300);
}

function closeKeyboardMode() {
    document.getElementById('aiTextInput').blur();
    const chatbar = document.getElementById('aiChatbarState');
    chatbar.classList.add('translate-y-[150%]', 'opacity-0', 'pointer-events-none'); 
    
    if(currentTabIndex === 1) document.getElementById('keyboardToggleBtn').classList.remove('scale-0'); 
    
    document.getElementById('aiVoiceCenter').classList.remove('opacity-30', 'scale-90');
    document.getElementById('mainDock').classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
}

function startListening() {
    if (isListening) return;
    isListening = true;
    document.getElementById('micRing').classList.add('mic-pulse');
    const micIcon = document.getElementById('micIcon');
    micIcon.classList.remove('fa-microphone');
    micIcon.classList.add('fa-waveform', 'animate-pulse');
    document.getElementById('keyboardToggleBtn').classList.add('scale-0');
    
    const aiPromptText = document.getElementById('aiPromptText');
    aiPromptText.innerHTML = '<span class="text-mono-300">Listening...</span>';
    
    setTimeout(() => {
        const targetText = "Quiet places with mountain views...";
        let current = "";
        let i = 0;
        aiPromptText.innerHTML = '<span class="cursor-blink"></span>';
        
        const typeInterval = setInterval(() => {
            current += targetText[i];
            aiPromptText.innerHTML = current + '<span class="cursor-blink"></span>';
            i++;
            if(i >= targetText.length) {
                clearInterval(typeInterval);
                setTimeout(() => triggerAskAI(targetText), 600);
            }
        }, 60); 
    }, 800);
}

function submitTextAI() {
    const val = document.getElementById('aiTextInput').value;
    if(val) {
        closeKeyboardMode(); 
        triggerAskAI(val);
        document.getElementById('aiTextInput').value = '';
    }
}

function triggerAskAI(query) {
    document.getElementById('aiDeckContainer').innerHTML = ''; 
    document.getElementById('aiInputState').classList.add('hidden');
    
    const deckState = document.getElementById('aiDeckState');
    deckState.classList.remove('hidden');
    setTimeout(() => deckState.classList.remove('opacity-0'), 50);

    document.getElementById('aiResultLabel').innerText = `"${query}"`;
    const container = document.getElementById('aiDeckContainer');
    
    container.innerHTML = Array(4).fill().map((_, i) => `
        <div class="deck-card bg-white border border-mono-200 flex flex-col justify-end p-8" style="animation: fadeIn 0.4s ease ${i*0.1}s forwards; opacity:0; z-index:${10-i}">
            <div class="w-1/2 h-8 bg-mono-100 rounded-full mb-4 animate-pulse"></div>
            <div class="w-3/4 h-4 bg-mono-100 rounded-full animate-pulse"></div>
        </div>
    `).join('');

    setTimeout(() => {
        document.getElementById('keyboardToggleBtn').classList.remove('scale-0');
        aiActiveDeck = [...destinations].sort(() => 0.5 - Math.random()).slice(0, 5);
        renderAIDeckDOM();
    }, 2000);
}

function resetAI() {
    const deckState = document.getElementById('aiDeckState');
    deckState.classList.add('opacity-0');
    setTimeout(() => {
        deckState.classList.add('hidden');
        document.getElementById('aiInputState').classList.remove('hidden');
        isListening = false;
        document.getElementById('micRing').classList.remove('mic-pulse');
        const micIcon = document.getElementById('micIcon');
        micIcon.classList.add('fa-microphone');
        micIcon.classList.remove('fa-waveform', 'animate-pulse');
        document.getElementById('keyboardToggleBtn').classList.remove('scale-0');
        document.getElementById('aiPromptText').innerHTML = 'Tap to speak.';
        document.getElementById('aiTextInput').value = '';
        closeKeyboardMode(); 
    }, 500);
}

function renderCardHTML(dest) {
    return `
    <div class="deck-card group" data-id="${dest.id}">
        <img src="${dest.image}" alt="${dest.name}" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-mono-900/90 via-transparent to-transparent pointer-events-none"></div>
        <div class="glow-overlay glow-pass"></div>
        <div class="glow-overlay glow-save"></div>
        <div class="absolute bottom-8 left-8 right-8 pointer-events-none flex flex-col items-start z-10">
            <span class="px-3 py-1.5 bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-sm">${dest.type}</span>
            <h3 class="text-4xl font-black tracking-tighter text-white leading-none drop-shadow-md mb-2">${dest.name}</h3>
            <p class="text-white/80 font-bold text-sm"><i class="fa-solid fa-location-dot"></i> ${dest.state}</p>
        </div>
    </div>`;
}

function renderAIDeckDOM() {
    const container = document.getElementById('aiDeckContainer');
    if(aiActiveDeck.length === 0) {
        setTimeout(() => resetAI(), 400);
        return;
    }
    container.innerHTML = aiActiveDeck.map(d => renderCardHTML(d)).join('');
    attachSwipeHandlers(container);
}

function attachSwipeHandlers(container) {
    const cards = container.querySelectorAll('.deck-card');
    cards.forEach(card => {
        let startX = 0, currentX = 0, isDragging = false, hasMoved = false;
        const passGlow = card.querySelector('.glow-pass');
        const saveGlow = card.querySelector('.glow-save');

        const onStart = (e) => {
            isDragging = true; hasMoved = false;
            startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            card.classList.add('swiping');
        };
        const onMove = (e) => {
            if (!isDragging) return;
            currentX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - startX;
            if(Math.abs(currentX) > 5) hasMoved = true;
            const rotate = currentX * 0.05; 
            card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
            const opacity = Math.min(Math.abs(currentX) / 120, 0.9);
            if (currentX > 0) { saveGlow.style.opacity = opacity; passGlow.style.opacity = 0; }
            else if (currentX < 0) { passGlow.style.opacity = opacity; saveGlow.style.opacity = 0; }
        };
        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            card.classList.remove('swiping');
            const threshold = 90; 
            const id = card.getAttribute('data-id');

            if(!hasMoved) {
                openImmersive(id);
                card.style.transform = '';
                saveGlow.style.opacity = 0; passGlow.style.opacity = 0;
                return;
            }
            if (currentX > threshold) {
                card.style.transform = `translateX(100vw) rotate(30deg)`;
                card.style.opacity = 0;
                setTimeout(() => card.remove(), 300);
                if(!savedPlaces.includes(id)) savedPlaces.push(id);
                aiActiveDeck.pop();
                if(aiActiveDeck.length === 0) renderAIDeckDOM();
                showToast("Saved to Journal", "success");
            } else if (currentX < -threshold) {
                card.style.transform = `translateX(-100vw) rotate(-30deg)`;
                card.style.opacity = 0;
                setTimeout(() => card.remove(), 300);
                aiActiveDeck.pop();
                if(aiActiveDeck.length === 0) renderAIDeckDOM();
            } else {
                card.style.transform = '';
                saveGlow.style.opacity = 0; passGlow.style.opacity = 0;
            }
            localStorage.setItem('travique_master_saved', JSON.stringify(savedPlaces));
            currentX = 0;
        };

        card.addEventListener('mousedown', onStart); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onEnd);
        card.addEventListener('touchstart', onStart, {passive: true}); window.addEventListener('touchmove', onMove, {passive: true}); window.addEventListener('touchend', onEnd);
    });
}

function openJournalCategories() {
    const blur = document.getElementById('journalCategoryBlur');
    blur.classList.remove('hidden');
    setTimeout(() => blur.classList.remove('opacity-0'), 10);
}
function closeAllOverlays() {
    const overlay = document.getElementById('globalOverlay');
    overlay.classList.add('opacity-0');
    document.getElementById('aiHistoryDrawer').classList.add('-translate-y-full');
    document.getElementById('journalCategoryBlur').classList.add('opacity-0');
    setTimeout(() => { overlay.classList.add('hidden'); document.getElementById('journalCategoryBlur').classList.add('hidden'); }, 400);
}

function filterJournal(filter) {
    closeAllOverlays();
    renderJournalDeck(filter);
}

function renderJournalDeck(filter = 'all') {
    const container = document.getElementById('journalDeckContainer');
    const emptyState = document.getElementById('journalEmpty');
    let titleText = filter === 'all' ? 'All Saved' : filter;
    document.getElementById('journalTitleDisplay').innerHTML = `${titleText} <i class="fa-solid fa-chevron-down text-xl text-mono-300"></i>`;
    container.innerHTML = '';
    
    let list = savedPlaces;
    if(filter !== 'all') list = savedPlaces.filter(id => {
        const d = destinations.find(x=>x.id===id);
        return d && (d.type === filter || d.vibes.includes(filter));
    });

    const realList = list.filter(id => !id.startsWith('mock'));

    if(realList.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        const dests = realList.map(id => destinations.find(d => d.id === id)).filter(Boolean);
        let html = '';
        dests.forEach(dest => {
            const noteObj = scrapbookNotes[dest.id] || "Add Dates +";
            const displayPill = noteObj.length > 15 ? "Notes Added" : noteObj;
            html += `
            <div class="w-full h-48 relative rounded-[2rem] overflow-hidden shadow-md cursor-pointer group strip-card border border-mono-200" data-id="${dest.id}">
                <img src="${dest.image}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-mono-900/80 via-transparent to-transparent pointer-events-none"></div>
                <div class="absolute bottom-4 left-5 right-5 flex items-end justify-between pointer-events-none">
                    <div>
                        <p class="text-white/80 font-bold text-xs uppercase tracking-widest drop-shadow-sm mb-1">${dest.state}</p>
                        <h3 class="text-3xl font-black text-white drop-shadow-md leading-none">${dest.name}</h3>
                    </div>
                    <span class="px-3 py-1.5 bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">${displayPill}</span>
                </div>
            </div>`;
        });
        container.innerHTML = html;
        setupStrips();
    }
}

function setupStrips() {
    const strips = document.querySelectorAll('.strip-card');
    strips.forEach(strip => {
        const id = strip.getAttribute('data-id');
        let timer; let isLongPress = false;
        const start = (e) => {
            isLongPress = false;
            timer = setTimeout(() => { isLongPress = true; if(navigator.vibrate) navigator.vibrate(50); openLongPressMenu(id); }, 500); 
        };
        const cancel = () => clearTimeout(timer);
        strip.addEventListener('mousedown', start); strip.addEventListener('touchstart', start, {passive:true});
        strip.addEventListener('mouseup', cancel); strip.addEventListener('mouseleave', cancel);
        strip.addEventListener('touchend', cancel); strip.addEventListener('touchmove', cancel);
        
        strip.addEventListener('click', (e) => { if(isLongPress) { e.preventDefault(); e.stopPropagation(); return; } openScrapbook(id); });
        strip.addEventListener('contextmenu', (e) => { e.preventDefault(); openLongPressMenu(id); });
    });
}

function openLongPressMenu(id) {
    selectedJournalId = id;
    const menu = document.getElementById('longPressMenu');
    const content = document.getElementById('longPressContent');
    menu.classList.remove('hidden'); void menu.offsetWidth;
    menu.classList.remove('opacity-0'); content.classList.remove('translate-y-full');
}
function closeLongPressMenu() {
    const menu = document.getElementById('longPressMenu');
    const content = document.getElementById('longPressContent');
    content.classList.add('translate-y-full'); menu.classList.add('opacity-0');
    setTimeout(() => menu.classList.add('hidden'), 300);
}
function menuRemove() {
    if(!selectedJournalId) return;
    savedPlaces = savedPlaces.filter(x => x !== selectedJournalId);
    localStorage.setItem('travique_master_saved', JSON.stringify(savedPlaces));
    closeLongPressMenu();
    showToast("Removed from Journal", "info");
    setTimeout(() => renderJournalDeck(document.getElementById('journalTitleDisplay').innerText.split(' ')[0]), 300);
}
function menuMoveTop() {
    if(!selectedJournalId) return;
    savedPlaces = savedPlaces.filter(x => x !== selectedJournalId);
    savedPlaces.unshift(selectedJournalId);
    localStorage.setItem('travique_master_saved', JSON.stringify(savedPlaces));
    closeLongPressMenu();
    setTimeout(() => renderJournalDeck(document.getElementById('journalTitleDisplay').innerText.split(' ')[0]), 300);
}
function menuShare() {
    if(!selectedJournalId) return;
    const dest = destinations.find(d => d.id === selectedJournalId);
    if(dest) { shareDestData = dest; closeLongPressMenu(); setTimeout(shareArticle, 300); }
}

function openScrapbook(id) {
    selectedJournalId = id;
    const dest = destinations.find(d => d.id === id);
    if(!dest) return;
    document.getElementById('psImg').src = dest.image;
    document.getElementById('psTitle').innerText = dest.name;
    
    const note = scrapbookNotes[id] || "";
    const displayDiv = document.getElementById('psNotesDisplay');
    if(note) {
        displayDiv.innerText = note; document.getElementById('psTextarea').value = note;
        document.getElementById('psDatesPill').innerHTML = `<i class="fa-solid fa-check"></i> Notes Saved`;
    } else {
        displayDiv.innerText = "Tap the pen to add personal notes, links, or memories..."; document.getElementById('psTextarea').value = "";
        document.getElementById('psDatesPill').innerHTML = `<i class="fa-regular fa-calendar"></i> No Dates Set`;
    }
    document.getElementById('privateScrapbook').classList.remove('translate-y-full');
}
function closeScrapbook() {
    document.getElementById('privateScrapbook').classList.add('translate-y-full');
    closeScrapbookKeyboard(); 
}
function openScrapbookKeyboard() {
    document.getElementById('psKeyboardArea').classList.remove('translate-y-full');
    setTimeout(() => document.getElementById('psTextarea').focus(), 300);
}
function closeScrapbookKeyboard() {
    document.getElementById('psTextarea').blur();
    document.getElementById('psKeyboardArea').classList.add('translate-y-full');
}
function saveScrapbookNotes() {
    const val = document.getElementById('psTextarea').value.trim();
    if(selectedJournalId) {
        scrapbookNotes[selectedJournalId] = val;
        localStorage.setItem('travique_master_notes', JSON.stringify(scrapbookNotes));
        const displayDiv = document.getElementById('psNotesDisplay');
        if(val) {
            displayDiv.innerText = val; document.getElementById('psDatesPill').innerHTML = `<i class="fa-solid fa-check"></i> Notes Saved`;
        } else {
            displayDiv.innerText = "Tap the pen to add personal notes, links, or memories..."; document.getElementById('psDatesPill').innerHTML = `<i class="fa-regular fa-calendar"></i> No Dates Set`;
        }
        renderJournalDeck(document.getElementById('journalTitleDisplay').innerText.split(' ')[0]);
    }
    closeScrapbookKeyboard();
}

function openAIHistory() {
    const overlay = document.getElementById('globalOverlay');
    const drawer = document.getElementById('aiHistoryDrawer');
    overlay.classList.remove('hidden'); void overlay.offsetWidth;
    overlay.classList.remove('opacity-0');
    drawer.classList.remove('-translate-y-full');
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    renderExploreGrid();
    
    const textInput = document.getElementById('aiTextInput');
    if(textInput) { textInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') submitTextAI(); }); }
});