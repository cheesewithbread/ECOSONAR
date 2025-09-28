// js/state.js — Estado/persistencia y arranque. Expone window.ECOSONAR.init
(function(){
const ECOSONAR = (window.ECOSONAR = window.ECOSONAR || {});
const KEY = 'ecosonar.config.v1';


ECOSONAR.init = function(){
// Cargar config guardada
const cfg = load();
// Vincular inputs si existen
bind('freqMin'); bind('freqMax'); bind('lat'); bind('lng'); bind('ocean'); bind('sessionDuration'); bind('sessionInterval');
// Aplicar valores
for (const k in cfg) { const el = document.getElementById(k); if (el) el.value = cfg[k]; }


// Interceptar el flujo de análisis de imagen para usar la IA real
patchImageAnalyzer();


// Conectar stream en tiempo real (si usas backend cambia en api.js)
const stop = window.ECOSONAR.api.streamMetrics(updateRealtimeFromAPI);
window.addEventListener('beforeunload', stop);


// Hook exportaciones reales
setupExportButtons();


// Botones de herramientas (comparativo, capas, predicción)
setupToolButtons();
};


function bind(id){
const el = document.getElementById(id); if (!el) return;
el.addEventListener('change', ()=> save());
el.addEventListener('input', ()=> save());
}

function load(){
try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}


function save(){
const cfg = {};
['freqMin','freqMax','lat','lng','ocean','sessionDuration','sessionInterval'].forEach(id=>{
const el = document.getElementById(id); if (el) cfg[id] = el.value;
});
localStorage.setItem(KEY, JSON.stringify(cfg));
}


function patchImageAnalyzer(){
const uploadArea = document.getElementById('uploadArea');
if (!uploadArea) return;


// Intercepta la llamada cuando se termine la "simulación" y reemplaza por IA real
const originalDisplay = window.displayAnalysisResults; // por si existe global
// Reemplazamos la cadena: al seleccionar archivo → analizamos con api.analyzeImageWithAI
const fileInput = document.getElementById('fileInput');
if (fileInput) {
fileInput.addEventListener('change', async (e)=>{
const file = e.target.files && e.target.files[0];
if (file) await analyzeNow(file);
});
}



uploadArea.addEventListener('drop', async (e)=>{
const files = e.dataTransfer?.files; const file = files && files[0];
if (file) await analyzeNow(file);
});


async function analyzeNow(file){
try {
const results = await window.ECOSONAR.api.analyzeImageWithAI(file);
applyAnalysisToUI(results);
} catch(err){
console.error(err);
}
}
}

function applyAnalysisToUI(res){
// Espera los IDs/estructura de tu UI
const analysisResults = document.getElementById('analysisResults');
const uploadArea = document.getElementById('uploadArea');
if (uploadArea && analysisResults) { uploadArea.style.display='none'; analysisResults.style.display='block'; }
const map = {
speciesCount: 'speciesCount',
noiseLevel: 'noiseLevel',
waterQuality: 'waterQuality',
biodiversity: 'biodiversity'
};
for (const k in map) { const el = document.getElementById(map[k]); if (el && res[k] != null) el.textContent = res[k]; }
const ul = document.getElementById('analysisDetailsList');
if (ul) {
ul.innerHTML = '';
(res.details || []).forEach(t=>{ const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
}
// Barra de progreso a 100%
const pf = document.getElementById('progressFill'); if (pf) pf.style.width = '100%';
// Guarda resultado al historial para análisis temporal
pushHistory({ ts: Date.now(), res });
}


function pushHistory(entry){
const KEYH = 'ecosonar.history.v1';
const list = JSON.parse(localStorage.getItem(KEYH) || '[]');
list.push(entry); localStorage.setItem(KEYH, JSON.stringify(list));
}


function updateRealtimeFromAPI(pkt){
const map = [ ['activeSpecies','species'], ['noiseDb','noiseDb'], ['temperature','temperature'], ['salinity','salinity'] ];
map.forEach(([id,k])=>{ const el = document.getElementById(id); if (el && pkt[k]!=null) el.textContent = k==='noiseDb'? pkt[k]+" dB" : k==='temperature'? pkt[k]+"°C" : k==='salinity'? pkt[k]+" PSU" : pkt[k]; });
}


function setupExportButtons(){
document.querySelectorAll('.export-card .btn-export').forEach(btn=>{
btn.addEventListener('click', (e)=>{
const title = btn.closest('.export-card')?.querySelector('h3')?.textContent || '';
if (title.includes('PDF')) {
window.ECOSONAR.exports.exportPDF();
} else if (title.includes('Excel')) {
window.ECOSONAR.exports.exportCSV(true);
} else {
window.ECOSONAR.exports.configureAPI(); // "Base de Datos"
}
});
});
}


function setupToolButtons(){
document.querySelectorAll('.tool-card .btn-tool').forEach(btn=>{
const name = btn.closest('.tool-card')?.querySelector('h3')?.textContent || '';
if (name.includes('Temporal')) btn.addEventListener('click', ()=> window.ECOSONAR.compare.runTemporal());
if (name.includes('Capas')) btn.addEventListener('click', ()=> window.ECOSONAR.compare.runLayers());
if (name.includes('Predictiva')) btn.addEventListener('click', ()=> window.ECOSONAR.compare.runPredict());
});
}
})();