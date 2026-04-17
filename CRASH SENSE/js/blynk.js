/* =========================================
   BLYNK CLOUD CONNECTOR
   Fetches telemetry from Blynk IoT
========================================= */

/* 🔑 PUT YOUR REAL BLYNK DEVICE TOKEN HERE */
const BLYNK_TOKEN = "xI5MfI5eeobFaSr08LAa9fe6dbjqoBtT";

/* Base URL */
const BLYNK_BASE_URL = "https://blynk.cloud/external/api/get";

/* Helper to fetch single pin */
 async function getBlynkValue(pin){

     try{
         const response = await fetch(
          `${BLYNK_BASE_URL}?token=${BLYNK_TOKEN}&${pin}`
       );

       if(!response.ok) return null;

         const text = await response.text();

         if(text === "" || text === "null") return null;

         return parseFloat(text);

     }catch(error){
         console.warn("Blynk fetch error:", error);
         return null;
     }
 }

// async function fetchBlynkData() {

//     try {

//         const response = await fetch(
//             `${BLYNK_BASE_URL}?token=${BLYNK_TOKEN}&v1&v2&v3&v4&v5&v12&v13&v14`
//         );

//         if (!response.ok) return null;

//         const data = await response.json();

//         return {
//             speed:   parseFloat(data.v1)  || 0,
//             accident: parseFloat(data.v2) === 1,
//             gforce:  parseFloat(data.v3)  || 0,
//             lat:     parseFloat(data.v4)  || 0,
//             lon:     parseFloat(data.v5)  || 0,
//             pitch:   parseFloat(data.v12) || 0,
//             roll:    parseFloat(data.v13) || 0,
//             yaw:     parseFloat(data.v14) || 0
//         };

//     } catch (error) {
//         console.error("Blynk multi-fetch failed:", error);
//         return null;
//     }
// }
/* =========================================
   FETCH ALL REQUIRED TELEMETRY
========================================= */

async function fetchBlynkData(){

    try{

        /* Fetch all pins in parallel */
        const [
            speed,
            accidentFlag,
            gforce,
            lat,
            lon,
            pitch,
            roll,
            yaw
        ] = await Promise.all([
            getBlynkValue("v1"),   // Speed
            getBlynkValue("v2"),   // Accident flag
            getBlynkValue("v3"),   // G force
            getBlynkValue("v4"),   // Latitude
            getBlynkValue("v5"),   // Longitude
            getBlynkValue("v12"),  // Pitch
            getBlynkValue("v13"),  // Roll
            getBlynkValue("v14")   // Yaw
        ]);

        return {
            speed:  speed  ?? 0,
            gforce: gforce ?? 0,
            lat:    lat    ?? 0,
            lon:    lon    ?? 0,
            pitch:  pitch  ?? 0,
            roll:   roll   ?? 0,
            yaw:    yaw    ?? 0,
            accident: accidentFlag === 1
        };

    }catch(error){

        console.error("Blynk data fetch failed:", error);
        return null;
    }
}