// =========================================
// MAP ENGINE
// Handles Leaflet map + live GPS updates
// =========================================

// Default starting location (temporary)
const DEFAULT_LAT = 10.5276;
const DEFAULT_LON = 76.2144;

// Initialize Map
let map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LON], 15);

// Load OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'RC Black Box'
}).addTo(map);

// Marker
let marker = L.marker([DEFAULT_LAT, DEFAULT_LON]).addTo(map);

// Force Leaflet resize fix
setTimeout(() => {
    map.invalidateSize();
}, 200);


// =========================================
// Update Map Location
// =========================================

// function updateMap(lat, lon){

//     // Validate properly (not falsy check)
//     if (lat === null || lon === null) return;
//     if (isNaN(lat) || isNaN(lon)) return;

//     const position = [parseFloat(lat), parseFloat(lon)];

//     marker.setLatLng(position);

//     // Smooth movement instead of jump
//     map.panTo(position, { animate:true, duration:0.5 });
// }

function updateMap(lat, lon){

    // If GPS not ready, stay at Thrissur
    if(lat === null || lon === null || lat == 0 || lon == 0){
        lat = DEFAULT_LAT;
        lon = DEFAULT_LON;
    }

    if(isNaN(lat) || isNaN(lon)) return;

    const position = [parseFloat(lat), parseFloat(lon)];

    marker.setLatLng(position);

    map.panTo(position, { animate:true, duration:0.5 });
}