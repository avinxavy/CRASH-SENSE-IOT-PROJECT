/* =========================================
   ALERT PANEL CONTROLLER
========================================= */

const alertPanel = document.getElementById("alertPanel");
const alertMsg   = document.getElementById("alertMsg");
const sosBtn     = document.getElementById("sosBtn");

/* 
   updateAlert expects BOOLEAN
   true  = accident
   false = normal
*/
function updateAlert(isAccident){

    alertPanel.classList.remove("normal","accident");

    if(isAccident){

        alertPanel.classList.add("accident");

        alertMsg.innerHTML = `
        ⚠️ <strong>Accident Detected</strong><br>
        Sudden impact or abnormal motion recorded.<br>
        Safety threshold exceeded by onboard sensors.<br>
        GPS location and telemetry stored in log.<br>
        Immediate inspection is recommended.
        `;

        // sosBtn.disabled = false;

    } else {

        alertPanel.classList.add("normal");

        alertMsg.innerHTML = `
        ✅ <strong>System Normal</strong><br>
        Vehicle operating within safe parameters.<br>
        No abnormal vibration or motion detected.<br>
        Sensors and logging functioning correctly.<br>
        Monitoring continues in real time.
        `;

        // sosBtn.disabled = true;
    }
}


/* =========================================
   SOS BUTTON ACTION
========================================= */

// sosBtn.addEventListener("click", () => {

//     alert(
//         "🚨 SOS SENT\n\n" +
//         "Location Shared Successfully.\n" +
//         "Emergency Contacts Notified."
//     );

//     /* 
//        Later you can replace with:
//        fetch(BLYNK_WEBHOOK_URL)
//     */
// });