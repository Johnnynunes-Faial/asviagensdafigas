// Configuration
const CLOUDINARY_CLOUD_NAME = 'Johnnynunes';
const CLOUDINARY_API_KEY = '354617349289351';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; 
const ADMIN_EMAIL = 'anafigas17@hotmail.com';
const ADMIN_PASS = 'Anafigas21';
const DEFAULT_MAIN_PHOTO = 'main-photo.png';

// State
let userData = JSON.parse(localStorage.getItem('figas_travels') || '{}');
let isLoggedIn = sessionStorage.getItem('figas_auth') === 'true';
let selectedCountryId = null;
let currentPhotos = [];
let currentPhotoIndex = 0;

// Initialize UI
updateAuthUI();
updateMainPhoto();

function updateMainPhoto() {
    const mainPhotoUrl = localStorage.getItem('figas_main_photo') || DEFAULT_MAIN_PHOTO;
    if (mainPhotoUrl) {
        document.getElementById('main-photo').innerHTML = `<img src="${mainPhotoUrl}" alt="Foto de Destaque">`;
    }
}

// --- AUTHENTICATION ---
function updateAuthUI() {
    if (isLoggedIn) {
        document.body.classList.add('logged-in');
        document.getElementById('login-trigger').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
    } else {
        document.body.classList.remove('logged-in');
        document.getElementById('login-trigger').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';
    }
}

document.getElementById('login-trigger').onclick = () => {
    document.getElementById('login-modal').classList.add('active');
};

document.getElementById('logout-btn').onclick = () => {
    sessionStorage.removeItem('figas_auth');
    isLoggedIn = false;
    updateAuthUI();
};

document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;

    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        sessionStorage.setItem('figas_auth', 'true');
        isLoggedIn = true;
        updateAuthUI();
        closeModals();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
};

// --- MAP RENDERING (D3.js) ---
const mapContainer = d3.select("#map");
const svg = mapContainer.append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 960 500`)
    .append("g");

const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([480, 250]);

const path = d3.geoPath().projection(projection);

// Zoom behavior
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
        svg.attr("transform", event.transform);
    });

d3.select("#map svg").call(zoom);

// Load Map Data
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
    const countries = topojson.feature(world, world.objects.countries).features;

    svg.selectAll(".country")
        .data(countries)
        .enter().append("path")
        .attr("class", (d) => `country country-path-${d.id} ${userData[d.id] ? 'visited' : ''}`)
        .attr("d", path)
        .style("fill", (d) => getCountryColor(d.id))
        .on("click", (event, d) => openCountryModal(d))
        .append("title")
        .text(d => d.properties.name);
});

function getCountryColor(id) {
    if (!userData[id]) return null; 
    const hash = Array.from(id.toString()).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = (hash * 137.5) % 360;
    return `hsl(${hue}, 70%, 60%)`;
}

// --- COUNTRY MODAL ---
function openCountryModal(country) {
    selectedCountryId = country.id;
    let data = userData[selectedCountryId] || { description: '', albums: [] };
    
    // Migrate old data if necessary
    if (data.photos && !data.albums) {
        data.albums = data.photos.length > 0 ? [{ id: Date.now().toString(), name: 'Fotos (Geral)', photos: data.photos }] : [];
        delete data.photos;
        saveData();
    }
    if (!data.albums) data.albums = [];
    
    document.getElementById('country-name').textContent = country.properties.name;
    document.getElementById('country-desc-display').textContent = data.description || "Nenhuma descrição ainda.";
    document.getElementById('country-desc-input').value = data.description;
    
    renderAlbums(data.albums);
    
    document.getElementById('country-modal').classList.add('active');
}

function renderAlbums(albums) {
    const container = document.getElementById('country-albums-container');
    container.innerHTML = '';
    currentPhotos = []; // flat array for lightbox
    
    if (albums.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Ainda não há álbuns para este país.</p>';
    }
    
    albums.forEach(album => {
        const albumDiv = document.createElement('div');
        albumDiv.style.marginBottom = '2.5rem';
        albumDiv.style.background = 'rgba(255, 255, 255, 0.02)';
        albumDiv.style.padding = '1.5rem';
        albumDiv.style.borderRadius = '0.5rem';
        
        // Header
        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.marginBottom = '1.5rem';
        headerDiv.style.flexWrap = 'wrap';
        headerDiv.style.gap = '1rem';
        
        let titleHtml = '';
        if (isLoggedIn) {
            titleHtml = `<input type="text" value="${album.name}" class="album-title-input" data-id="${album.id}" style="font-size: 1.5rem; font-weight: 600; background: transparent; border: none; border-bottom: 2px solid var(--text-muted); color: var(--text-light); width: 250px; padding-bottom: 0.2rem;">`;
        } else {
            titleHtml = `<h3 style="font-size: 1.5rem; font-weight: 600; color: var(--text-light); margin: 0;">${album.name}</h3>`;
        }
        
        let actionsHtml = '';
        if (isLoggedIn) {
            actionsHtml = `
                <button class="upload-album-photo-btn" data-id="${album.id}" style="background: var(--accent); padding: 0.5rem 1rem; font-size: 0.9rem;">Adicionar Foto</button>
                <button class="delete-album-btn" data-id="${album.id}" style="background: #ef4444; padding: 0.5rem 1rem; font-size: 0.9rem; margin-left: 0.5rem;">Apagar Álbum</button>
            `;
        }
        
        headerDiv.innerHTML = `<div>${titleHtml}</div><div>${actionsHtml}</div>`;
        albumDiv.appendChild(headerDiv);
        
        // Photos Grid
        const gridDiv = document.createElement('div');
        gridDiv.className = 'photo-grid';
        
        album.photos.forEach(url => {
            const globalIndex = currentPhotos.length;
            currentPhotos.push(url);
            
            const photoDiv = document.createElement('div');
            photoDiv.className = 'photo-item';
            photoDiv.style.position = 'relative';
            photoDiv.innerHTML = `<img src="${url}" alt="Foto de viagem">`;
            
            if (isLoggedIn) {
                const deletePhotoBtn = document.createElement('button');
                deletePhotoBtn.innerHTML = '&times;';
                deletePhotoBtn.style.position = 'absolute';
                deletePhotoBtn.style.top = '0.5rem';
                deletePhotoBtn.style.right = '0.5rem';
                deletePhotoBtn.style.background = 'rgba(239, 68, 68, 0.9)';
                deletePhotoBtn.style.color = 'white';
                deletePhotoBtn.style.border = 'none';
                deletePhotoBtn.style.borderRadius = '50%';
                deletePhotoBtn.style.width = '30px';
                deletePhotoBtn.style.height = '30px';
                deletePhotoBtn.style.cursor = 'pointer';
                deletePhotoBtn.style.fontSize = '1.2rem';
                deletePhotoBtn.style.display = 'flex';
                deletePhotoBtn.style.alignItems = 'center';
                deletePhotoBtn.style.justifyContent = 'center';
                deletePhotoBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm('Apagar esta foto?')) {
                        album.photos = album.photos.filter(p => p !== url);
                        saveData();
                        renderAlbums(userData[selectedCountryId].albums);
                    }
                };
                photoDiv.appendChild(deletePhotoBtn);
            }
            
            photoDiv.onclick = (e) => {
                e.stopPropagation();
                openLightbox(globalIndex);
            };
            gridDiv.appendChild(photoDiv);
        });
        
        if (album.photos.length === 0) {
            gridDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1 / -1;">Nenhuma foto neste álbum.</p>';
        }
        
        albumDiv.appendChild(gridDiv);
        container.appendChild(albumDiv);
    });
    
    // Attach Listeners
    if (isLoggedIn) {
        document.querySelectorAll('.album-title-input').forEach(input => {
            input.onchange = (e) => {
                const id = e.target.getAttribute('data-id');
                const album = userData[selectedCountryId].albums.find(a => a.id === id);
                if (album) {
                    album.name = e.target.value.trim() || 'Sem Nome';
                    saveData();
                }
            };
        });
        
        document.querySelectorAll('.upload-album-photo-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.getAttribute('data-id');
                uploadPhotoToAlbum(id);
            };
        });

        document.querySelectorAll('.delete-album-btn').forEach(btn => {
            btn.onclick = (e) => {
                if (confirm('Tens a certeza que queres apagar este álbum e todas as suas fotos?')) {
                    const id = e.target.getAttribute('data-id');
                    userData[selectedCountryId].albums = userData[selectedCountryId].albums.filter(a => a.id !== id);
                    saveData();
                    renderAlbums(userData[selectedCountryId].albums);
                }
            };
        });
    }
}

// --- LIGHTBOX ---
function openLightbox(index) {
    currentPhotoIndex = index;
    updateLightbox();
    document.getElementById('lightbox').classList.add('active');
}

function updateLightbox() {
    const url = currentPhotos[currentPhotoIndex];
    document.getElementById('lightbox-img').src = url;
    
    const hasMultiple = currentPhotos.length > 1;
    document.getElementById('prev-photo').style.display = hasMultiple ? 'block' : 'none';
    document.getElementById('next-photo').style.display = hasMultiple ? 'block' : 'none';
}

document.getElementById('prev-photo').onclick = (e) => {
    e.stopPropagation();
    currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
    updateLightbox();
};

document.getElementById('next-photo').onclick = (e) => {
    e.stopPropagation();
    currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
    updateLightbox();
};

document.getElementById('save-country-data').onclick = () => {
    if (!selectedCountryId) return;
    
    if (!userData[selectedCountryId]) {
        userData[selectedCountryId] = { description: '', photos: [] };
    }
    
    userData[selectedCountryId].description = document.getElementById('country-desc-input').value;
    saveData();
    
    d3.select(`.country-path-${selectedCountryId}`)
        .classed('visited', true)
        .style('fill', getCountryColor(selectedCountryId));
        
    document.getElementById('country-desc-display').textContent = userData[selectedCountryId].description;
    alert('Dados guardados!');
};

function saveData() {
    localStorage.setItem('figas_travels', JSON.stringify(userData));
}

// --- CLOUDINARY INTEGRATION ---
document.getElementById('create-album-btn').onclick = () => {
    const nameInput = document.getElementById('new-album-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert('Por favor insere um nome para o álbum.');
        return;
    }
    if (!selectedCountryId) return;
    
    if (!userData[selectedCountryId]) {
        userData[selectedCountryId] = { description: '', albums: [] };
    }
    if (!userData[selectedCountryId].albums) {
        userData[selectedCountryId].albums = [];
    }
    
    userData[selectedCountryId].albums.unshift({
        id: Date.now().toString(),
        name: name,
        photos: []
    });
    
    saveData();
    nameInput.value = '';
    renderAlbums(userData[selectedCountryId].albums);
    
    d3.select(`.country-path-${selectedCountryId}`)
        .classed('visited', true)
        .style('fill', getCountryColor(selectedCountryId));
};

function uploadPhotoToAlbum(albumId) {
    const myWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME, 
        apiKey: CLOUDINARY_API_KEY,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET
    }, (error, result) => { 
        if (!error && result && result.event === "success") { 
            const photoUrl = result.info.secure_url;
            const album = userData[selectedCountryId].albums.find(a => a.id === albumId);
            if (album) {
                album.photos.push(photoUrl);
                saveData();
                renderAlbums(userData[selectedCountryId].albums);
                
                d3.select(`.country-path-${selectedCountryId}`)
                    .classed('visited', true)
                    .style('fill', getCountryColor(selectedCountryId));
            }
        }
    });
    myWidget.open();
}

document.getElementById('upload-main-btn').onclick = () => {
    const myWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME, 
        apiKey: CLOUDINARY_API_KEY,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET
    }, (error, result) => { 
        if (!error && result && result.event === "success") { 
            const photoUrl = result.info.secure_url;
            localStorage.setItem('figas_main_photo', photoUrl);
            updateMainPhoto();
        }
    });
    myWidget.open();
};

// --- UTILS ---
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.getElementById('login-error').style.display = 'none';
}

document.querySelectorAll('.close-btn').forEach(btn => {
    btn.onclick = closeModals;
});

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModals();
};
