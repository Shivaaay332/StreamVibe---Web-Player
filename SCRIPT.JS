const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const seekSlider = document.getElementById('seek-slider');
const resultsContainer = document.getElementById('results-container');
const searchInput = document.getElementById('searchInput');

let currentPlaylist = [];
let currentSongIndex = 0;
let myLibrary = JSON.parse(localStorage.getItem('myLibrary')) || [];
let activeTab = 'search'; // 'search' or 'library'

// --- 1. SEARCH ENGINE (iTunes API) ---
async function searchMusic() {
    const query = searchInput.value;
    if (!query) return;

    // Switch to search view if not already there
    switchTab('search');
    resultsContainer.innerHTML = '<p>Searching...</p>';

    try {
        // Fetch data from iTunes Search API
        const response = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=20`);
        const data = await response.json();
        
        displaySongs(data.results);
        currentPlaylist = data.results; // Update playlist to search results
    } catch (error) {
        console.error("Error fetching music:", error);
        resultsContainer.innerHTML = '<p>Error loading songs. Please try again.</p>';
    }
}

// Allow pressing "Enter" to search
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMusic();
});

// --- 2. DISPLAY LOGIC ---
function displaySongs(songs, isLibrary = false) {
    resultsContainer.innerHTML = '';

    if (songs.length === 0) {
        resultsContainer.innerHTML = '<p>No songs found.</p>';
        return;
    }

    songs.forEach((song, index) => {
        const div = document.createElement('div');
        div.classList.add('song-card');
        
        // Handle iTunes vs LocalStorage data structure differences
        const art = song.artworkUrl100 || 'https://via.placeholder.com/150';
        const title = song.trackName;
        const artist = song.artistName;

        div.innerHTML = `
            <div onclick="playSongFromList(${index})">
                <img src="${art}" alt="${title}">
                <h4>${title}</h4>
                <p>${artist}</p>
            </div>
            ${!isLibrary ? `<button class="add-btn" onclick="saveToLibrary(${index})">Add to Library</button>` : `<button class="add-btn" onclick="removeFromLibrary(${index})">Remove</button>`}
        `;
        resultsContainer.appendChild(div);
    });
}

// --- 3. PLAYER CONTROLS ---
function playSongFromList(index) {
    currentSongIndex = index;
    // If we are in library view, use library list, else use search results
    const sourceList = activeTab === 'library' ? myLibrary : currentPlaylist;
    loadSong(sourceList[index]);
}

function loadSong(song) {
    // Set UI
    document.getElementById('player-title').innerText = song.trackName;
    document.getElementById('player-artist').innerText = song.artistName;
    document.getElementById('player-art').src = song.artworkUrl100;
    
    // Set Audio
    audioPlayer.src = song.previewUrl; // iTunes provides a 30s preview
    audioPlayer.play();
    updatePlayIcon(true);
}

function togglePlay() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        updatePlayIcon(true);
    } else {
        audioPlayer.pause();
        updatePlayIcon(false);
    }
}

function updatePlayIcon(isPlaying) {
    playBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-circle-pause"></i>' : '<i class="fa-solid fa-circle-play"></i>';
}

function nextSong() {
    const sourceList = activeTab === 'library' ? myLibrary : currentPlaylist;
    currentSongIndex = (currentSongIndex + 1) % sourceList.length;
    loadSong(sourceList[currentSongIndex]);
}

function prevSong() {
    const sourceList = activeTab === 'library' ? myLibrary : currentPlaylist;
    currentSongIndex = (currentSongIndex - 1 + sourceList.length) % sourceList.length;
    loadSong(sourceList[currentSongIndex]);
}

// Progress Bar Logic
audioPlayer.addEventListener('timeupdate', () => {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    seekSlider.value = progress || 0;
    
    // Update time text
    const curMins = Math.floor(audioPlayer.currentTime / 60);
    const curSecs = Math.floor(audioPlayer.currentTime % 60);
    document.getElementById('curr-time').innerText = `${curMins}:${curSecs < 10 ? '0' : ''}${curSecs}`;
});

seekSlider.addEventListener('input', () => {
    const time = (seekSlider.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = time;
});

// Volume Control
document.getElementById('volume-slider').addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value;
});

// --- 4. LIBRARY FEATURE (Local Storage) ---
function saveToLibrary(index) {
    const song = currentPlaylist[index];
    
    // Check if song already exists
    if (!myLibrary.some(s => s.trackId === song.trackId)) {
        myLibrary.push(song);
        localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
        alert('Song added to library!');
    } else {
        alert('Song is already in your library.');
    }
}

function removeFromLibrary(index) {
    myLibrary.splice(index, 1);
    localStorage.setItem('myLibrary', JSON.stringify(myLibrary));
    displaySongs(myLibrary, true); // Refresh view
}

// --- 5. NAVIGATION ---
function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    
    if (tab === 'search') {
        document.querySelector('.nav-links li:first-child').classList.add('active');
        document.getElementById('search-header').style.display = 'block';
        // If there are search results, show them, otherwise placeholder
        if(currentPlaylist.length > 0) displaySongs(currentPlaylist);
        else resultsContainer.innerHTML = '<div class="placeholder-text">Search for an artist...</div>';
    } else {
        document.querySelector('.nav-links li:last-child').classList.add('active');
        document.getElementById('search-header').style.display = 'none';
        displaySongs(myLibrary, true);
    }
}