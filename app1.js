let currentSatId = '25544'; // Default ISS NORAD ID
let satNameText = 'ISS (ZARYA)';
let tleCache = null;

// Switch target satellite and fetch fresh live TLE tracking records
async function switchSatellite(name, noradId) {
    satNameText = name;
    currentSatId = noradId;
    
    document.getElementById('satName').innerText = name;
    document.getElementById('activeRadarLabel').innerText = name.toUpperCase();
    
    // Update button states in UI
    document.querySelectorAll('.sat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('connectionStatus').innerText = `Fetching telemetry for ${name}...`;
    await fetchAndTrackSatellite();
}

async function fetchAndTrackSatellite() {
    try {
        // Fetch live TLE data directly from CelesTrak public API
        const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${currentSatId}&FORMAT=TLE`);
        const text = await response.text();
        const lines = text.trim().split('\n');

        if (lines.length < 2) throw new Error("Invalid TLE data returned");

        const tleLine1 = lines.length === 3 ? lines[1] : lines[0];
        const tleLine2 = lines.length === 3 ? lines[2] : lines[1];

        document.getElementById('connectionStatus').innerText = "Live Telemetry Locked 🟢";
        document.getElementById('connectionStatus').style.color = "#3fb950";

        // Initialize Satellite.js propagation model
        const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

        // Run live calculations every second
        clearInterval(window.trackerInterval);
        window.trackerInterval = setInterval(() => {
            updateOrbitPosition(satrec);
        }, 1000);

        updateOrbitPosition(satrec); // Run immediately once

    } catch (err) {
        console.error(err);
        document.getElementById('connectionStatus').innerText = "Using Simulated Telemetry Feed";
        document.getElementById('connectionStatus').style.color = "#d29922";
        runFallbackSimulation();
    }
}

function updateOrbitPosition(satrec) {
    const now = new Date();
    const positionAndVelocity = satellite.propagate(satrec, now);
    const gmst = satellite.gstime(now);

    if (positionAndVelocity.position) {
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        
        const lat = satellite.degreesLat(positionGd.latitude);
        const lng = satellite.degreesLong(positionGd.longitude);
        const height = positionGd.height; // km

        // Calculate velocity magnitude vector
        const velVel = positionAndVelocity.velocity;
        const speed = Math.sqrt(velVel.x**2 + velVel.y**2 + velVel.z**2);

        // Update Text Telemetry UI
        document.getElementById('satLat').innerText = lat.toFixed(2) + "°";
        document.getElementById('satLng').innerText = lng.toFixed(2) + "°";
        document.getElementById('satAlt').innerText = height.toFixed(1) + " km";
        document.getElementById('satVel').innerText = speed.toFixed(2) + " km/s";

        // Map Lat/Lng smoothly onto our visual radar box UI coordinates
        const mapX = ((lng + 180) / 360) * 100;
        const mapY = ((90 - lat) / 180) * 100;

        const blip = document.getElementById('targetBlip');
        blip.style.left = `${mapX}%`;
        blip.style.top = `${mapY}%`;
    }
}

function runFallbackSimulation() {
    // Fallback loop if network blocks direct external API requests
    let step = 0;
    clearInterval(window.trackerInterval);
    window.trackerInterval = setInterval(() => {
        step += 0.05;
        let lat = Math.sin(step) * 45;
        let lng = (step * 20) % 360 - 180;
        let alt = 415.2;
        let vel = 7.66;

        document.getElementById('satLat').innerText = lat.toFixed(2) + "°";
        document.getElementById('satLng').innerText = lng.toFixed(2) + "°";
        document.getElementById('satAlt').innerText = alt.toFixed(1) + " km";
        document.getElementById('satVel').innerText = vel.toFixed(2) + " km/s";

        const mapX = ((lng + 180) / 360) * 100;
        const mapY = ((90 - lat) / 180) * 100;

        const blip = document.getElementById('targetBlip');
        blip.style.left = `${mapX}%`;
        blip.style.top = `${mapY}%`;
    }, 1000);
}

// Start application load on startup
window.onload = () => {
    fetchAndTrackSatellite();
};