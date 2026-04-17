/* =========================================
   MAIN CONTROLLER
   BLYNK → UI → LOGGER
========================================= */


/* ===============================
   THEME TOGGLE
================================= */

const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
});


/* ===============================
   SMOOTH STATE
================================= */

let smoothState = {
    speed: 0,
    gforce: 0
};

function smooth(oldVal, newVal, alpha = 0.15){
    return oldVal + (newVal - oldVal) * alpha;
}


/* =========================================
   MAIN UPDATE LOOP
========================================= */

async function updateDashboard(){

    try {

        /* Fetch telemetry from Blynk */
        const d = await fetchBlynkData();

        if(!d) return;


        /* Smooth values */
        smoothState.speed  = smooth(smoothState.speed , d.speed);
        smoothState.gforce = smooth(smoothState.gforce, d.gforce);


        /* ===== Gauges ===== */

        drawGauge("speedGauge", smoothState.speed, "speed");
        drawGauge("gGauge", smoothState.gforce, "gforce");

        document.getElementById("speedVal").innerText =
            smoothState.speed.toFixed(1);

        document.getElementById("gVal").innerText =
            smoothState.gforce.toFixed(2);


        /* ===== GPS INFO ===== */

        document.getElementById("lat").innerText  = d.lat.toFixed(5);
        document.getElementById("lon").innerText  = d.lon.toFixed(5);

        document.getElementById("time").innerText =
            new Date().toLocaleTimeString();


        /* ===== ORIENTATION ===== */

        updateOrientation(d.pitch, d.roll, d.yaw);


        /* ===== MAP ===== */

        updateMap(d.lat, d.lon);


        /* ===== ALERT SYSTEM ===== */

        handleAccident(d.accident, d);


    } catch(error) {

        console.error("Dashboard update error:", error);
    }
}


/* ===============================
   RUN LOOP
================================= */

setInterval(updateDashboard, 1000);

/* First immediate run */
updateDashboard();