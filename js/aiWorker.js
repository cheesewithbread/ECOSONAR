// js/aiWorker.js — Análisis en Web Worker (no bloquea la UI)
// Procesa: imagen → métricas (ruido, contraste, blobs = "especies"),
// series temporales → anomalías y predicción simple, capas por profundidad.


self.addEventListener('message', async (e) => {
const { type, payload } = e.data || {};
try {
if (type === 'image-analyze') {
const res = analyzeImage(payload.imageData);
self.postMessage({ type: 'image-result', ok: true, data: res });
} else if (type === 'timeseries-analyze') {
const res = analyzeSeries(payload.values);
self.postMessage({ type: 'timeseries-result', ok: true, data: res });
} else if (type === 'layers-analyze') {
const res = analyzeLayers(payload.imageData, payload.bands || 5);
self.postMessage({ type: 'layers-result', ok: true, data: res });
}
} catch (err) {
self.postMessage({ type: 'error', ok: false, message: String(err) });
}
});

function analyzeImage(imageData) {
const { data, width, height } = imageData;
const gray = new Uint8ClampedArray(width * height);
let sum = 0, sum2 = 0;


// 1) Escala de grises + stats
for (let i = 0, j = 0; i < data.length; i += 4, j++) {
const r = data[i], g = data[i + 1], b = data[i + 2];
const v = (r + g + b) / 3; // sonar suele ser mono
gray[j] = v;
sum += v; sum2 += v * v;
}
const N = gray.length;
const mean = sum / N;
const variance = Math.max(1e-6, sum2 / N - mean * mean);
const std = Math.sqrt(variance);


// 2) Sobel (borde/alto-frecuencia → proxy de ruido/actividad)
const sob = sobel(gray, width, height);
const edgeAvg = sob.avg;


// 3) Umbral simple (mean + 0.5*std) → blobs (posibles objetos/especies)
const thr = Math.min(255, Math.max(0, mean + 0.5 * std));
const bin = new Uint8Array(N);
for (let i = 0; i < N; i++) bin[i] = gray[i] > thr ? 1 : 0;


const { components, sizes } = connectedComponents(bin, width, height, 50); // min 50 px
const speciesCount = components;


// Heurísticas legibles
const noiseLevel = edgeAvg > 35 ? 'Alto' : edgeAvg > 20 ? 'Medio' : 'Bajo';
const waterQuality = std > 55 ? 'Excelente' : std > 35 ? 'Buena' : 'Regular';
const biodiversity = speciesCount >= 12 ? 'Muy Alta' : speciesCount >= 7 ? 'Alta' : 'Media';


const details = [
`Umbral: ${thr.toFixed(1)} | Media: ${mean.toFixed(1)} | Desv: ${std.toFixed(1)}`,
`Bordes promedio (Sobel): ${edgeAvg.toFixed(1)}`,
`Blobs detectados (min 50px): ${speciesCount}`,
];


return { speciesCount, noiseLevel, waterQuality, biodiversity, details, sizes, mean, std, edgeAvg };
}

function sobel(gray, w, h) {
const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
let sumMag = 0, count = 0;
for (let y = 1; y < h - 1; y++) {
for (let x = 1; x < w - 1; x++) {
let sx = 0, sy = 0, k = 0;
for (let j = -1; j <= 1; j++) {
for (let i = -1; i <= 1; i++) {
const p = gray[(y + j) * w + (x + i)];
sx += p * Gx[k];
sy += p * Gy[k];
k++;
}
}
const mag = Math.hypot(sx, sy) / 8; // normaliza aprox
sumMag += mag; count++;
}
}
return { avg: sumMag / Math.max(1, count) };
}


function connectedComponents(bin, w, h, minSize) {
const vis = new Uint8Array(bin.length);
let comps = 0; const sizes = [];
const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
for (let y = 0; y < h; y++) {
for (let x = 0; x < w; x++) {
const idx = y * w + x;
if (bin[idx] && !vis[idx]) {
// BFS
let qx = [x], qy = [y], head = 0, size = 0;
vis[idx] = 1;
while (head < qx.length) {
const cx = qx[head], cy = qy[head]; head++;
size++;
for (const [dx, dy] of dirs) {
const nx = cx + dx, ny = cy + dy;
if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
const nidx = ny * w + nx;
if (bin[nidx] && !vis[nidx]) { vis[nidx] = 1; qx.push(nx); qy.push(ny); }
}
}
if (size >= minSize) { comps++; sizes.push(size); }
}
}
}
return { components: comps, sizes };
}


function analyzeSeries(values) {
if (!values || values.length < 6) return { forecast: [], anomalies: [] };
// z-score para anomalías
const mean = values.reduce((a,b)=>a+b,0)/values.length;
const std = Math.sqrt(values.reduce((a,b)=>a+(b-mean)*(b-mean),0)/values.length) || 1;
const anomalies = [];
values.forEach((v,i)=>{ if (Math.abs((v-mean)/std) > 2.5) anomalies.push(i); });
// Predicción lineal simple (últimas N)
const N = Math.min(24, values.length);
const xs = Array.from({length:N}, (_,i)=>i);
const ys = values.slice(values.length-N);
const sx = xs.reduce((a,b)=>a+b,0), sy = ys.reduce((a,b)=>a+b,0);
const sxx = xs.reduce((a,b)=>a+b*b,0), sxy = xs.reduce((a,i)=>a+i*ys[i],0);
const denom = N*sxx - sx*sx || 1;
const m = (N*sxy - sx*sy)/denom; const b = (sy - m*sx)/N;
const horizon = 12; // 12 pasos
const forecast = Array.from({length:horizon}, (_,k)=> m*(N+k) + b);
return { forecast, anomalies, mean, std };
}



function analyzeLayers(imageData, bands=5) {
const { data, width, height } = imageData;
const bandH = Math.floor(height / bands);
const avgs = [];
for (let b = 0; b < bands; b++) {
let sum = 0, count = 0;
for (let y = b*bandH; y < Math.min(height, (b+1)*bandH); y++) {
for (let x = 0; x < width; x++) {
const i = (y*width + x) * 4;
const v = (data[i] + data[i+1] + data[i+2]) / 3;
sum += v; count++;
}
}
avgs.push(sum/Math.max(1,count));
}
return { bands, avgs };
}