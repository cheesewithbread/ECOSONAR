// js/api.js — Capa de red/stream (mock o real). Expone window.ECOSONAR.api
(function(){
const ECOSONAR = (window.ECOSONAR = window.ECOSONAR || {});
const CONFIG = {
USE_BACKEND: false, // cambia a true cuando tengas endpoints
ENDPOINTS: {
ANALYZE: '/api/analyze-image', // POST imagen
STREAM_SSE: '/api/metrics/stream', // EventSource
STREAM_WS: 'wss://tu-servidor/metrics', // WebSocket opcional
}
};

// Worker IA (mismo hilo si falla)
let worker = null;
try { worker = new Worker('./js/aiWorker.js', { type: 'module' }); } catch(e){}


ECOSONAR.api = {
async analyzeImageWithAI(file){
if (CONFIG.USE_BACKEND) {
const fd = new FormData(); fd.append('file', file);
const res = await fetch(CONFIG.ENDPOINTS.ANALYZE, { method:'POST', body: fd });
if (!res.ok) throw new Error('Error de backend');
return await res.json();
}
// Modo local (worker): leer a ImageData
const imageData = await fileToImageData(file);
return new Promise((resolve, reject)=>{
if (!worker) { return resolve(fallbackLocal(imageData)); }
const onMsg = (ev)=>{
if (ev.data?.type === 'image-result') {
worker.removeEventListener('message', onMsg);
resolve(ev.data.data);
}
};
worker.addEventListener('message', onMsg);
worker.postMessage({ type:'image-analyze', payload:{ imageData } });
setTimeout(()=>{ // timeout de seguridad
worker.removeEventListener('message', onMsg);
resolve(fallbackLocal(imageData));
}, 5000);
});
},
streamMetrics(onData){
if (CONFIG.USE_BACKEND) {
// 1) SSE
if (CONFIG.ENDPOINTS.STREAM_SSE) {
try {
const es = new EventSource(CONFIG.ENDPOINTS.STREAM_SSE);
es.onmessage = (ev)=>{ try{ onData(JSON.parse(ev.data)); }catch{} };
es.onerror = ()=> es.close();
return ()=> es.close();
} catch(e) {}
}
// 2) WS
if (CONFIG.ENDPOINTS.STREAM_WS) {
const ws = new WebSocket(CONFIG.ENDPOINTS.STREAM_WS);
ws.onmessage = (ev)=>{ try{ onData(JSON.parse(ev.data)); }catch{} };
return ()=> ws.close();
}
}
// Mock: emite cada 5s
const id = setInterval(()=>{
onData({
species: Math.floor(Math.random()*5)+10,
noiseDb: +(Math.random()*20+35).toFixed(1),
temperature: +(Math.random()*4+16).toFixed(1),
salinity: +(Math.random()*2+34).toFixed(1)
});
}, 5000);
return ()=> clearInterval(id);
}
};



async function fileToImageData(file){
const bmp = await createImageBitmap(file);
const off = new OffscreenCanvas(bmp.width, bmp.height);
const ctx = off.getContext('2d');
ctx.drawImage(bmp, 0, 0);
return ctx.getImageData(0,0,bmp.width,bmp.height);
}


function fallbackLocal(imageData){
// Sube al worker real si quieres; aquí devolvemos algo seguro
return { speciesCount: 5, noiseLevel: 'Medio', waterQuality: 'Buena', biodiversity: 'Alta', details: ['Modo fallback local'] };
}
})();