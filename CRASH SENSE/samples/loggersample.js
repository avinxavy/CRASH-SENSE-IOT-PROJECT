/* =========================================
   BLACK BOX LOGGER
   Records telemetry + exports CSV
========================================= */

const tableBody = document.querySelector("#eventTable tbody");
const exportBtn = document.getElementById("exportCSV");

/* Store all records */
let records = [];


/* Log one telemetry frame */
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

    /* Create table row */
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

    /* Keep table light */
    if(tableBody.children.length > 120){
        tableBody.removeChild(tableBody.lastChild);
    }

    // /* 🔴 Update ALERT panel color + message */
    // if(typeof updateAlert === "function"){
    //     updateAlert(status);
    // }
}


/* =========================================
   EXPORT REAL EXCEL WITH COLORS (ExcelJS)
========================================= */

exportBtn.addEventListener("click", async () => {

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("BlackBox Data");

    /* Define Columns */
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

    /* Style Header */
    sheet.getRow(1).font = { bold:true };
    sheet.getRow(1).alignment = { vertical:"middle", horizontal:"center" };

    /* Add Rows */
    records.forEach(r => {

        const row = sheet.addRow(r);

        /* Apply Color Based on Status */
        const fillColor = r.status === "ACCIDENT"
            ? "FFB71C1C"   // dark red
            : "FF1B5E20";  // dark green

        row.eachCell(cell => {
            cell.fill = {
                type:"pattern",
                pattern:"solid",
                fgColor:{ argb: fillColor }
            };

            cell.font = {
                color:{ argb:"FFFFFFFF" } // white text
            };

            cell.alignment = { horizontal:"center" };
        });

    });

    /* Create File */
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "RC_BLACKBOX_DATA.xlsx");

});