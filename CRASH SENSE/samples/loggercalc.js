/* =========================================
   BLACK BOX LOGGER
   Logs telemetry + exports CSV (LibreOffice)
========================================= */

const tableBody = document.querySelector("#eventTable tbody");
const exportBtn = document.getElementById("exportCSV");

/* Store telemetry records */
let records = [];


/* =========================================
   LOG EVENT
========================================= */

function logEvent(data){

    const time = new Date().toLocaleTimeString();
    const status = data.accident ? "ACCIDENT" : "NORMAL";

    const record = {
        time: time,
        speed: data.speed,
        gforce: data.gforce,
        lat: data.lat,
        lon: data.lon,
        pitch: data.pitch,
        roll: data.roll,
        yaw: data.yaw,
        status: status
    };

    records.push(record);

    /* prevent memory overflow */
    if(records.length > 2000){
        records.shift();
    }

    /* create table row */
    const row = document.createElement("tr");

    row.classList.add(data.accident ? "accidentRow" : "normalRow");

    row.innerHTML = `
        <td>${time}</td>
        <td>${data.speed.toFixed(1)}</td>
        <td>${data.gforce.toFixed(2)}</td>
        <td>${data.lat.toFixed(5)}</td>
        <td>${data.lon.toFixed(5)}</td>
        <td>${data.pitch.toFixed(1)}</td>
        <td>${data.roll.toFixed(1)}</td>
        <td>${data.yaw.toFixed(1)}</td>
        <td>${status}</td>
    `;

    /* newest row on top */
    tableBody.prepend(row);

    /* keep table light */
    if(tableBody.children.length > 120){
        tableBody.removeChild(tableBody.lastChild);
    }
}


/* =========================================
   EXPORT CSV (LibreOffice / Excel)
========================================= */

exportBtn.addEventListener("click", () => {

    let csv = "Time,Speed,GForce,Latitude,Longitude,Pitch,Roll,Yaw,Status\n";

    records.forEach(r => {
        csv += `${r.time},${r.speed},${r.gforce},${r.lat},${r.lon},${r.pitch},${r.roll},${r.yaw},${r.status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "RC_BLACKBOX_DATA.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

});
