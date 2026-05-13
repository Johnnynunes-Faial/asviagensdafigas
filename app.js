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
    const data = userData[selectedCountryId] || { description: '', photos: [] };
    
    document.getElementById('country-name').textContent = country.properties.name;
    document.getElementById('country-desc-display').textContent = data.description || "Nenhuma descrição ainda.";
    document.getElementById('country-desc-input').value = data.description;
    
    currentPhotos = data.photos;
    renderPhotos(data.photos);
    
    document.getElementById('country-modal').classList.add('active');
}

function renderPhotos(photos) {
    const container = document.getElementById('country-photos');
    container.innerHTML = '';
    photos.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.innerHTML = `<img src="${url}" alt="Foto de viagem">`;
        div.onclick = (e) => {
            e.stopPropagation();
            openLightbox(index);
        };
        container.appendChild(div);
    });
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
document.getElementById('upload-photo-btn').onclick = () => {
    const myWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME, 
        apiKey: CLOUDINARY_API_KEY,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET
    }, (error, result) => { 
        if (!error && result && result.event === "success") { 
            const photoUrl = result.info.secure_url;
            if (!userData[selectedCountryId]) {
                userData[selectedCountryId] = { description: '', photos: [] };
            }
            userData[selectedCountryId].photos.push(photoUrl);
            saveData();
            currentPhotos = userData[selectedCountryId].photos;
            renderPhotos(currentPhotos);
            
            d3.select(`.country-path-${selectedCountryId}`)
                .classed('visited', true)
                .style('fill', getCountryColor(selectedCountryId));
        }
    });
    myWidget.open();
};

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
