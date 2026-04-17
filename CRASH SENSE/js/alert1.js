/* =========================================
   ACCIDENT ALERT CONTROLLER (STABLE)
   Prevents repeated accident logging
========================================= */

const alertPanel = document.getElementById("alertPanel");
const alertMsg   = document.getElementById("alertMsg");

/* Store previous accident state */
let accidentTriggered = false;

function handleAccident(isAccident, data){

    /* Accident detected for the first time */
    if(isAccident && !accidentTriggered){

        accidentTriggered = true;

        alertPanel.classList.remove("normal");
        alertPanel.classList.add("accident");

        alertMsg.innerHTML = `
        ⚠️ <strong>Accident Detected</strong><br>
        Sudden impact or abnormal motion recorded.<br>
        Telemetry data stored in event log.<br>
        Please inspect the vehicle immediately.
        `;

        /* Log event only once */
        if(typeof logEvent === "function"){
            logEvent(data);
        }

    }

    /* System back to normal */
    if(!isAccident && accidentTriggered){

        accidentTriggered = false;

        alertPanel.classList.remove("accident");
        alertPanel.classList.add("normal");

        alertMsg.innerHTML = `
        ✅ <strong>System Normal</strong><br>
        Vehicle operating within safe parameters.<br>
        Monitoring continues in real time.
        `;
    }
}