/* =========================================
   TELEMETRY DATA SIMULATOR
   Replaces Blynk for dashboard testing
========================================= */

let simState = {
    speed: 0,
    gforce: 0,
    lat: 10.5276,
    lon: 76.2144,
    pitch: 0,
    roll: 0,
    yaw: 0,
    accident: false
};


/* Random helper */
function rand(min, max){
    return Math.random() * (max - min) + min;
}


/* Simulated data generator */
async function fetchBlynkData(){

    /* Simulate speed changes */
    simState.speed += rand(-5,5);
    simState.speed = Math.max(0, Math.min(120, simState.speed));

    /* G force */
    simState.gforce = rand(0.1,2.5);

    /* Orientation */
    simState.pitch = rand(-20,20);
    simState.roll  = rand(-30,30);
    simState.yaw   = rand(-180,180);

    /* GPS movement simulation */
    simState.lat += rand(-0.00005,0.00005);
    simState.lon += rand(-0.00005,0.00005);

    /* Random accident event */
    if(Math.random() < 0.02){
        simState.accident = true;
        simState.gforce = rand(8,14);
    } else {
        simState.accident = false;
    }

    return simState;
}