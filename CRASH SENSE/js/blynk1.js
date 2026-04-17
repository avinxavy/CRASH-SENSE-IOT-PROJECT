/* =========================================
   BLYNK CLOUD CONNECTOR
   Fetches telemetry using ONE request
========================================= */

/* 🔑 Your Blynk Device Token */
const BLYNK_TOKEN = "XXXXXXXXXXX";

/* Base API */
const BLYNK_BASE_URL = "XXXXXXXXX";


/* =========================================
   FETCH TELEMETRY DATA
========================================= */

async function fetchBlynkData(){

    try {

        const response = await fetch(
            `${BLYNK_BASE_URL}?token=${BLYNK_TOKEN}&v1&v2&v3&v4&v5&v12&v13&v14`
        );

        if(!response.ok) return null;

        const data = await response.json();

        return {

            speed:   parseFloat(data.v1)  || 0,
            accident: data.v2 == 1,
            gforce:  parseFloat(data.v3)  || 0,

            lat:     parseFloat(data.v4)  || 0,
            lon:     parseFloat(data.v5)  || 0,

            pitch:   parseFloat(data.v12) || 0,
            roll:    parseFloat(data.v13) || 0,
            yaw:     parseFloat(data.v14) || 0
        };

    } catch(error){

        console.error("Blynk fetch error:", error);
        return null;
    }
}
