/* =========================================
   ORIENTATION DISPLAY (STATIC GIF MODE)
   Keeps data updates, removes rotation.
========================================= */

/* Store values (used for display/logging) */
let orientationState = {
    pitch: 0,
    roll: 0,
    yaw: 0
};

/* Smooth values */
function smoothAngle(oldVal, newVal, alpha = 0.2){
    return oldVal + (newVal - oldVal) * alpha;
}

/* Update values WITHOUT rotating GIF */
function updateOrientation(pitch, roll, yaw){

    orientationState.pitch = smoothAngle(orientationState.pitch, pitch);
    orientationState.roll  = smoothAngle(orientationState.roll,  roll);
    orientationState.yaw   = smoothAngle(orientationState.yaw,   yaw);

    /* Only update numbers (GIF stays static) */
    document.getElementById("pitchVal").innerText =
        orientationState.pitch.toFixed(1);

    document.getElementById("rollVal").innerText =
        orientationState.roll.toFixed(1);

    document.getElementById("yawVal").innerText =
        orientationState.yaw.toFixed(1);
}