// js/compare.js — Análisis comparativo/por capas/predictivo. Expone window.ECOSONAR.compare
(function(){
const ECOSONAR = (window.ECOSONAR = window.ECOSONAR || {});
const cmp = (ECOSONAR.compare = {});


const worker = new Worker('./js/aiWorker.js', { type:'module' });


cmp.runTemporal = function(){
const KEYH = 'ecosonar.history.v1';
const list = JSON.parse(localStorage.getItem(KEYH) || '[]');
if (list.length < 2) { alert('Aún no hay suficiente historial. Analiza varias imágenes primero.'); return; }
// Tomar la métrica ruido (edgeAvg si hay, o especie) como serie
const values = list.map(x => x.res.edgeAvg || x.res.speciesCount || 0);
const canvas = document.getElementById('acousticChart'); if (!canvas) return;
const ctx = canvas.getContext('2d');
worker.onmessage = (ev)=>{
if (ev.data?.type === 'timeseries-result') {
const { forecast, anomalies } = ev.data.data;
drawTemporal(ctx, values, forecast, anomalies);
toast('Análisis temporal generado');
}
};
worker.postMessage({ type:'timeseries-analyze', payload:{ values } });
};



cmp.runLayers = async function(){
// Abrir input para que elijas una imagen a analizar por capas
const input = document.getElementById('compareInput');
input.onchange = async ()=>{
const file = input.files && input.files[0]; if (!file) return;
const imgData = await fileToImageData(file);
worker.onmessage = (ev)=>{
if (ev.data?.type === 'layers-result') {
const { avgs } = ev.data.data;
drawBars(document.getElementById('speciesChart'), avgs);
toast('Análisis por capas listo');
}
};
worker.postMessage({ type:'layers-analyze', payload:{ imageData: imgData, bands: 5 } });
};
input.click();
};


cmp.runPredict = function(){
// Usa métricas en vivo como base
const values = window.__ecosonar_noise_series || [];
if (values.length < 6) { alert('Aún no hay suficientes datos en vivo.'); return; }
const canvas = document.getElementById('acousticChart'); if (!canvas) return;
const ctx = canvas.getContext('2d');
worker.onmessage = (ev)=>{
if (ev.data?.type === 'timeseries-result') {
const { forecast } = ev.data.data;
drawPrediction(ctx, values, forecast);
toast('Predicción generada');
}
};
worker.postMessage({ type:'timeseries-analyze', payload:{ values } });
};




// Helpers de dibujo
function drawTemporal(ctx, values, forecast, anomalies){
const w = ctx.canvas.width, h = ctx.canvas.height;
ctx.clearRect(0,0,w,h);
// Ejes
ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1; ctx.strokeRect(0,0,w,h);
// Serie
plotLine(ctx, values, '#0d9488');
// Forecast en gris
plotLine(ctx, values.concat(forecast), '#94a3b8');
// Anomalías
ctx.fillStyle = '#ef4444';
anomalies.forEach(i=>{
const x = (i/(values.length-1))*w; const y = h - (values[i]/max(values))*h;
ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
});
}


function drawPrediction(ctx, values, forecast){
const w = ctx.canvas.width, h = ctx.canvas.height;
ctx.clearRect(0,0,w,h);
plotLine(ctx, values, '#0d9488');
// Línea de forecast a partir del último punto
const merged = values.concat(forecast);
plotLine(ctx, merged, '#06b6d4');
}


function drawBars(canvas, arr){
const ctx = canvas.getContext('2d');
const w = canvas.width, h = canvas.height;
ctx.clearRect(0,0,w,h);
const maxv = max(arr) || 1, barW = w/(arr.length*1.5);
arr.forEach((v,i)=>{
const bh = (v/maxv)*(h*0.9); const x = i*(barW*1.5)+barW*0.25; const y = h - bh;
ctx.fillStyle = '#06b6d4'; ctx.fillRect(x, y, barW, bh);
});
}





function plotLine(ctx, arr, color){
const w = ctx.canvas.width, h = ctx.canvas.height; const n = arr.length;
const maxv = max(arr) || 1; const minv = Math.min(...arr);
ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
arr.forEach((v,i)=>{
const x = (i/(n-1))*w; const y = h - ((v-minv)/(maxv-minv+1e-6))*h;
if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
});
ctx.stroke();
}


function max(a){ return a.reduce((m,v)=> v>m? v : m, -Infinity); }


function toast(msg){ try{ window.showNotification(msg, 'success'); }catch{ alert(msg); } }


async function fileToImageData(file){
const bmp = await createImageBitmap(file);
const off = new OffscreenCanvas(bmp.width, bmp.height);
const ctx = off.getContext('2d');
ctx.drawImage(bmp, 0, 0);
return ctx.getImageData(0,0,bmp.width,bmp.height);
}
})();