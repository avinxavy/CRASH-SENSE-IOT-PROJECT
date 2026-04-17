/* =========================================
   BLACK BOX LOGGER
   Logs telemetry + exports XLSX with colors
   (LibreOffice Calc compatible)
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
        time,
        speed: data.speed,
        gforce: data.gforce,
        lat: data.lat,
        lon: data.lon,
        pitch: data.pitch,
        roll: data.roll,
        yaw: data.yaw,
        status
    };

    records.push(record);

    if(records.length > 2000){
        records.shift();
    }

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

    tableBody.prepend(row);

    if(tableBody.children.length > 120){
        tableBody.removeChild(tableBody.lastChild);
    }
}


/* =========================================
   EXPORT XLSX WITH COLOR (Calc compatible)
========================================= */

exportBtn.addEventListener("click", async () => {

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Telemetry Log");

    sheet.columns = [
        { header:"Time", key:"time", width:12 },
        { header:"Speed", key:"speed", width:10 },
        { header:"GForce", key:"gforce", width:10 },
        { header:"Latitude", key:"lat", width:14 },
        { header:"Longitude", key:"lon", width:14 },
        { header:"Pitch", key:"pitch", width:10 },
        { header:"Roll", key:"roll", width:10 },
        { header:"Yaw", key:"yaw", width:10 },
        { header:"Status", key:"status", width:12 }
    ];

    sheet.getRow(1).font = { bold:true };
    sheet.getRow(1).alignment = { horizontal:"center" };

    records.forEach(r => {

        const row = sheet.addRow(r);

        const color = r.status === "ACCIDENT"
            ? "FFFF4C4C"   // red
            : "FF4CAF50";  // green

        row.eachCell(cell => {

            cell.fill = {
                type:"pattern",
                pattern:"solid",
                fgColor:{ argb: color }
            };

            cell.font = {
                color:{ argb:"FFFFFFFF" }
            };

            cell.alignment = {
                horizontal:"center"
            };

        });

    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
        new Blob([buffer]),
        "RC_BLACKBOX_DATA.xlsx"
    );

});