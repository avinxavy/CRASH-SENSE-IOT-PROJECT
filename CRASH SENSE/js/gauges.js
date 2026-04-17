/* =========================================
   SEGMENTED GAUGE ENGINE (Apple-style)
   Used for SPEED and G-FORCE
========================================= */

/* Configuration (matches your Blynk ranges) */
const GaugeConfig = {
    speed : { min:0, max:200, label:"km/h" },
    gforce: { min:0, max:16,  label:"g" }
};


/* Draw segmented semi-arc gauge */
function drawGauge(canvasId, value, type){

    const cfg = GaugeConfig[type];
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    /* Canvas size */
    const w = canvas.width  = 260;
    const h = canvas.height = 160;

    ctx.clearRect(0,0,w,h);

    const cx = w/2;
    const cy = 140;
    const radius = 110;

    const totalSegments = 28;
    const step = Math.PI / totalSegments;

    /* Normalize value */
    const percent = Math.max(0, Math.min(1, (value - cfg.min) / (cfg.max - cfg.min)));

    /* Draw segments */
    for(let i=0;i<totalSegments;i++){

        const segPercent = i / totalSegments;

        ctx.beginPath();
        ctx.arc(
            cx,
            cy,
            radius,
            Math.PI + i*step,
            Math.PI + (i+0.7)*step
        );

        ctx.lineWidth = 10;

        /* Active vs inactive color */
        if(segPercent <= percent){
            ctx.strokeStyle = "#0a84ff";   // Apple blue
        }else{
            ctx.strokeStyle = "#d1d5db";   // soft gray
        }

        ctx.stroke();
    }

   /* Draw needle */
const angle = Math.PI + percent * Math.PI;

const needleColor =
  getComputedStyle(document.body).getPropertyValue('--needle').trim();

ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.lineTo(
    cx + Math.cos(angle) * (radius-30),
    cy + Math.sin(angle) * (radius-30)
);
ctx.lineWidth = 4;
ctx.strokeStyle = needleColor;   // ✅ dynamic color
ctx.stroke();

/* Needle center */
ctx.beginPath();
ctx.arc(cx,cy,6,0,Math.PI*2);
ctx.fillStyle = needleColor;     // ✅ dynamic color
ctx.fill();
}


/* Smooth value animation helper */
function smoothValue(oldVal, newVal, alpha = 0.15){
    return oldVal + (newVal - oldVal) * alpha;
}