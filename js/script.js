
let analysisInProgress = false
let currentImageFile = null
let progressInterval = null

function beep(duration = 0.22, freq = 740, vol = 0.18) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    gain.gain.value = 0.0001
    osc.connect(gain); gain.connect(ctx.destination); osc.start()
    const t = ctx.currentTime
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.stop(t + duration + 0.02)
  } catch (_) { }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  const analysisResults = document.getElementById("analysisResults")
  if (analysisResults && !analysisResults.querySelector(".btn-reanalyze")) {
    const resetButton = document.createElement("button")
    resetButton.textContent = "Analizar Nueva Imagen"
    resetButton.className = "btn-primary btn-reanalyze"
    resetButton.style.marginTop = "20px"
    resetButton.onclick = resetAnalyzer
    analysisResults.appendChild(resetButton)
  }
})

function initializeApp() {
  setupNavigation()
  setupImageAnalyzer()
  setupAnimations()
  setupCharts()
  startRealTimeUpdates()
  setupScrollEffects()
  setupMusicPlayer() // << NUEVO: reproductor
}

function setupNavigation() {
  const navToggle = document.getElementById("navToggle")
  const navMenu = document.querySelector(".nav-menu")
  if (navToggle) navToggle.addEventListener("click", () => navMenu.classList.toggle("active"))
  document.querySelectorAll(".nav-menu a").forEach((link) => link.addEventListener("click", () => navMenu.classList.remove("active")))
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".header")
    header.style.background = window.scrollY > 100 ? "rgba(10, 15, 28, 0.95)" : "rgba(10, 15, 28, 0.9)"
  })
}

// ===== Analizador REAL + fix duplicados =====
function setupImageAnalyzer() {
  let uploadArea = document.getElementById("uploadArea")
  let fileInput = document.getElementById("fileInput")
  if (!uploadArea || !fileInput) return

  // 👉 FIX: eliminar cualquier listener viejo clonando los nodos
  const uaClone = uploadArea.cloneNode(true)
  uploadArea.parentNode.replaceChild(uaClone, uploadArea)
  uploadArea = uaClone

  const fiClone = fileInput.cloneNode(true)
  fileInput.parentNode.replaceChild(fiClone, fileInput)
  fileInput = fiClone

  uploadArea.addEventListener("click", () => fileInput.click())
  uploadArea.addEventListener("dragover", handleDragOver)
  uploadArea.addEventListener("dragleave", handleDragLeave)
  uploadArea.addEventListener("drop", handleDrop)
  fileInput.addEventListener("change", handleFileSelect)

  function handleDragOver(e) {
    e.preventDefault()
    uploadArea.classList.add("dragging")
  }
  function handleDragLeave(e) {
    e.preventDefault()
    uploadArea.classList.remove("dragging")
  }
  async function handleDrop(e) {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) await processImageFile(files[0])
    handleDragLeave(e)
  }
  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (file) await processImageFile(file)
  }
}

async function processImageFile(file) {
  if (!file.type.startsWith("image/")) {
    showNotification("Por favor selecciona un archivo de imagen válido", "error")
    return
  }
  currentImageFile = file
  await startImageAnalysis(file)
}

async function startImageAnalysis(file) {
  if (analysisInProgress) return
  analysisInProgress = true

  const panel = document.getElementById("analysisResults")
  const up = document.getElementById("uploadArea")
  if (up && panel) { up.style.display = "none"; panel.style.display = "block" }

  animateProgress()
  try {
    const imgData = await fileToImageData(file)
    const res = analyzeImageData(imgData)
    setProgress(100)
    displayAnalysisResults(res)
    beep()
    showNotification("Análisis completado exitosamente", "success")
  } catch (err) {
    console.error(err)
    showNotification("No se pudo analizar la imagen", "error")
  } finally {
    analysisInProgress = false
    stopProgress()
  }
}

function animateProgress() {
  const pf = document.getElementById("progressFill")
  let p = 0
  stopProgress()
  progressInterval = setInterval(() => {
    p = Math.min(98, p + Math.random() * 12)
    if (pf) pf.style.width = p + "%"
  }, 200)
}
function setProgress(v) { const pf = document.getElementById("progressFill"); if (pf) pf.style.width = Math.max(0, Math.min(100, v)) + "%" }
function stopProgress() { if (progressInterval) clearInterval(progressInterval); progressInterval = null }

async function fileToImageData(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
  let canvas = document.getElementById("workCanvas")
  if (!canvas) { canvas = document.createElement("canvas"); canvas.id = "workCanvas"; canvas.style.display = "none"; document.body.appendChild(canvas) }
  const maxSide = 512
  const scale = Math.min(maxSide / img.width, maxSide / img.height, 1)
  const w = Math.max(1, Math.floor(img.width * scale))
  const h = Math.max(1, Math.floor(img.height * scale))
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0, w, h)
  URL.revokeObjectURL(url)
  return ctx.getImageData(0, 0, w, h)
}

function analyzeImageData(imageData) {
  const { data, width: w, height: h } = imageData
  const N = w * h
  const gray = new Uint8ClampedArray(N)
  let sum = 0, sum2 = 0
  for (let i = 0, j = 0; i < data.length; i += 4, j++) { const v = (data[i] + data[i + 1] + data[i + 2]) / 3; gray[j] = v; sum += v; sum2 += v * v }
  const mean = sum / N
  const variance = Math.max(1e-6, sum2 / N - mean * mean)
  const std = Math.sqrt(variance)
  const edgeAvg = sobelAvg(gray, w, h)
  const thr = Math.max(0, Math.min(255, mean + 0.7 * std))
  const bin = new Uint8Array(N); for (let i = 0; i < N; i++) bin[i] = gray[i] > thr ? 1 : 0
  const minSize = Math.max(40, Math.floor(0.0025 * N))
  const speciesCount = countComponents(bin, w, h, minSize)
  const noiseLevel = edgeAvg > 40 ? "Alto" : edgeAvg > 22 ? "Medio" : "Bajo"
  const waterQuality = std > 60 ? "Excelente" : std > 38 ? "Buena" : "Regular"
  const biodiversity = speciesCount >= 12 ? "Muy Alta" : speciesCount >= 7 ? "Alta" : "Media"
  const details = [
    `Media: ${mean.toFixed(1)} | Desv: ${std.toFixed(1)} | Umbral: ${thr.toFixed(1)}`,
    `Bordes (Sobel) promedio: ${edgeAvg.toFixed(1)}`,
    `Blobs/objetos detectados (≥${minSize}px): ${speciesCount}`
  ]
  return { speciesCount, noiseLevel, waterQuality, biodiversity, details, mean, std, edgeAvg }
}
function sobelAvg(gray, w, h) {
  const Gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1], Gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
  let sum = 0, cnt = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sx = 0, sy = 0, k = 0
      for (let j = -1; j <= 1; j++) { for (let i = -1; i <= 1; i++) { const p = gray[(y + j) * w + (x + i)]; sx += p * Gx[k]; sy += p * Gy[k]; k++ } }
      sum += Math.hypot(sx, sy) / 8; cnt++
    }
  } return cnt ? sum / cnt : 0
}
function countComponents(bin, w, h, minSize) {
  const vis = new Uint8Array(bin.length); let comps = 0; const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x; if (bin[idx] && !vis[idx]) {
        let size = 0; const qx = [x], qy = [y]; vis[idx] = 1
        for (let head = 0; head < qx.length; head++) {
          const cx = qx[head], cy = qy[head]; size++
          for (const [dx, dy] of dirs) {
            const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
            const nidx = ny * w + nx; if (bin[nidx] && !vis[nidx]) { vis[nidx] = 1; qx.push(nx); qy.push(ny) }
          }
        }
        if (size >= minSize) comps++
      }
    }
  } return comps
}

function displayAnalysisResults(res) {
  document.getElementById("speciesCount").textContent = res.speciesCount
  document.getElementById("noiseLevel").textContent = res.noiseLevel
  document.getElementById("waterQuality").textContent = res.waterQuality
  document.getElementById("biodiversity").textContent = res.biodiversity
  const ul = document.getElementById("analysisDetailsList")
  ul.innerHTML = ""; (res.details || []).forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li) })
}

// ===== Animaciones / charts / tiempo real (sin cambios mayores) =====
function setupAnimations() {
  const opt = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  const obs = new IntersectionObserver((entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)" } }), opt)
  document.querySelectorAll(".glass-card, .stat-card, .benefit-card").forEach(el => { el.style.opacity = "0"; el.style.transform = "translateY(30px)"; el.style.transition = "opacity .6s ease, transform .6s ease"; obs.observe(el) })
}
function setupCharts() { setupAcousticChart(); setupSpeciesChart() }
function setupAcousticChart() {
  const c = document.getElementById("acousticChart"); if (!c) return
  const ctx = c.getContext("2d"), w = c.width, h = c.height; ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = "#0d9488"; ctx.lineWidth = 2; ctx.fillStyle = "rgba(13,148,136,.1)"
  const n = 24, data = Array.from({ length: n }, () => Math.random() * 80 + 20)
  ctx.beginPath(); ctx.moveTo(0, h - (data[0] / 100) * h)
  for (let i = 1; i < n; i++) { const x = (i / (n - 1)) * w, y = h - (data[i] / 100) * h; ctx.lineTo(x, y) }
  ctx.stroke(); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
}
function setupSpeciesChart() {
  const c = document.getElementById("speciesChart"); if (!c) return
  const ctx = c.getContext("2d"), cx = c.width / 2, cy = c.height / 2, r = Math.min(cx, cy) - 20
  const species = [{ name: "Delfines", value: 35, color: "#0d9488" }, { name: "Ballenas", value: 25, color: "#06b6d4" }, { name: "Peces", value: 30, color: "#3b82f6" }, { name: "Otros", value: 10, color: "#6366f1" }]
  let ang = -Math.PI / 2
  species.forEach(s => { const a = (s.value / 100) * 2 * Math.PI; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang, ang + a); ctx.closePath(); ctx.fillStyle = s.color; ctx.fill(); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.stroke(); ang += a })
}
function startRealTimeUpdates() { setInterval(updateRealTimeStats, 5000); setInterval(() => { setupAcousticChart(); setupSpeciesChart() }, 30000) }
function updateRealTimeStats() {
  const a = document.getElementById("activeSpecies"), n = document.getElementById("noiseDb"), t = document.getElementById("temperature"), s = document.getElementById("salinity")
  if (a) a.textContent = Math.floor(Math.random() * 5) + 10
  if (n) n.textContent = (Math.random() * 20 + 35).toFixed(1) + " dB"
  if (t) t.textContent = (Math.random() * 4 + 16).toFixed(1) + "°C"
  if (s) s.textContent = (Math.random() * 2 + 34).toFixed(1) + " PSU"
}
function setupScrollEffects() {
  window.addEventListener("scroll", () => { const sc = window.pageYOffset, p = document.querySelector(".hero-visual"); if (p) { p.style.transform = `translateY(${sc * 0.5}px)` } })
}

function showNotification(message, type = "info") {
  const n = document.createElement("div"); n.className = `notification ${type}`; n.textContent = message
  Object.assign(n.style, { position: "fixed", top: "20px", right: "20px", padding: "15px 20px", borderRadius: "8px", color: "white", fontWeight: "500", zIndex: "10000", transform: "translateX(100%)", transition: "transform .3s ease", maxWidth: "300px" })
  const colors = { success: "#10b981", error: "#ef4444", warning: "#f59e0b", info: "#3b82f6" }; n.style.background = colors[type] || colors.info
  document.body.appendChild(n); setTimeout(() => { n.style.transform = "translateX(0)" }, 100)
  setTimeout(() => { n.style.transform = "translateX(100%)"; setTimeout(() => document.body.removeChild(n), 300) }, 4000)
}
window.addEventListener("error", (e) => { console.error("Error en ECOSONAR:", e.error); showNotification("Ha ocurrido un error. Por favor, recarga la página.", "error") })

function resetAnalyzer() {
  const up = document.getElementById("uploadArea"), panel = document.getElementById("analysisResults"), fi = document.getElementById("fileInput")
  if (up && panel && fi) { up.style.display = "block"; panel.style.display = "none"; fi.value = ""; currentImageFile = null; analysisInProgress = false; setProgress(0) }
}
function debounce(func, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func(...a), wait) } }
const debouncedScrollHandler = debounce(() => { setupScrollEffects() }, 16); window.addEventListener("scroll", debouncedScrollHandler)




// ===== Reproductor de música =====
function setupMusicPlayer(){
  const audio = document.getElementById("bgMusic")
  const pick  = document.getElementById("musicFile")
  const play  = document.getElementById("musicPlay")
  const vol   = document.getElementById("musicVolume")
  const loop  = document.getElementById("musicLoop")
  const name  = document.getElementById("musicName")
  const urlIn = document.getElementById("musicUrlInput")
  const urlBt = document.getElementById("musicUrlBtn")
  const player = document.querySelector(".music-section .player")

  if(!audio || !pick || !play || !vol || !loop || !name) return

  // Archivo local
  pick.addEventListener("change", ()=>{
    const f = pick.files && pick.files[0]
    if(!f) return
    const url = URL.createObjectURL(f)
    __musicProvider = "audio"
    audio.src = url
    name.textContent = f.name
    showNotification("Música cargada (archivo)", "success")
  })

  // URL (audio directo o YouTube)
  const loadFromURL = async () => {
    const u = (urlIn?.value || "").trim()
    if (!u) { showNotification("Ingresa una URL de audio o YouTube", "warning"); return }
    try{
      if (isYouTubeUrl(u)) {
        const id = getYouTubeId(u)
        if (!id) throw new Error("YT_ID_INVALID")
        await loadYouTubeIntoPlayer(id, loop.checked)
        __musicProvider = "yt"
        name.textContent = `YouTube: ${id}`
        showNotification("YouTube listo", "success")
      } else {
        // tu función existente para audio directo:
        await setAudioFromUrl(audio, u)  // <- ya la tienes; no la borres
        __musicProvider = "audio"
        name.textContent = fileNameFromURL(u)
        showNotification("URL de música cargada", "success")
      }
    }catch(e){
      if (e.message === "MIXED_CONTENT") {
        showNotification("Tu sitio está en HTTPS y la URL es HTTP. Usa HTTPS o sube el archivo.", "error")
      } else if (e.message === "YT_ID_INVALID") {
        showNotification("No pude leer el ID del video de YouTube.", "error")
      } else {
        showNotification("No se pudo cargar esa URL.", "error")
      }
    }
  }
  if (urlBt) urlBt.addEventListener("click", loadFromURL)
  if (urlIn) urlIn.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); loadFromURL() } })

  // Pegar URL en el player
  if (player) {
    player.addEventListener("paste", async (e)=>{
      const text = (e.clipboardData || window.clipboardData)?.getData("text")
      if (text) {
        e.preventDefault()
        urlIn && (urlIn.value = text.trim())
        await loadFromURL()
      }
    })
  }

  // Controles
  play.addEventListener("click", musicPlayToggle)
  vol.addEventListener("input", ()=> musicSetVolume(Number(vol.value)))
  loop.addEventListener("change", ()=> musicSetLoop(loop.checked))
}





// ---- Helpers URL audio ----
function isLikelyUrl(s){
  try { const u = new URL(s); return ["http:","https:"].includes(u.protocol) || s.startsWith("data:audio"); }
  catch { return false }
}

function fileNameFromURL(u){
  try{
    const url = new URL(u)
    const parts = url.pathname.split("/").filter(Boolean)
    return decodeURIComponent(parts[parts.length-1] || u)
  } catch { return u }
}


// Normaliza enlaces y carga audio sin exigir CORS si no hace falta
async function setAudioFromUrl(audio, inputUrl){
  const url = normalizeAudioUrl(inputUrl);

  // Bloqueo por contenido mixto: página en HTTPS pero URL en HTTP
  if (location.protocol === "https:" && url.startsWith("http://")) {
    throw new Error("MIXED_CONTENT"); // Debe ser HTTPS o archivo local
  }

  // Intento directo: sin crossOrigin y sin fetch (esto suele reproducir incluso sin CORS)
  return new Promise((resolve, reject)=>{
    const cleanup = ()=>{
      audio.removeEventListener("canplay", onOK);
      audio.removeEventListener("loadedmetadata", onOK);
      audio.removeEventListener("error", onErr);
    };
    const onOK  = ()=>{ cleanup(); resolve(); };
    const onErr = ()=>{ cleanup(); reject(new Error("LOAD_ERROR")); };

    audio.addEventListener("canplay", onOK);
    audio.addEventListener("loadedmetadata", onOK);
    audio.addEventListener("error", onErr);

    audio.crossOrigin = "";  // dejar que el navegador decida (evita fallos innecesarios)
    audio.src = url;
    audio.load();
  });
}

// Convierte enlaces compartidos a "direct download" cuando se puede
function normalizeAudioUrl(u){
  try{
    const url = new URL(u);

    // Google Drive
    if (url.hostname.includes("drive.google.com")) {
      // /file/d/FILE_ID/view  -> uc?export=download&id=FILE_ID
      const m = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = m ? m[1] : url.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }

    // Dropbox: www.dropbox.com -> dl.dropboxusercontent.com
    if (url.hostname.includes("dropbox.com")) {
      url.hostname = "dl.dropboxusercontent.com";
      url.searchParams.delete("dl");
      return url.toString();
    }

    // GitHub -> raw.githubusercontent.com
    if (url.hostname.includes("github.com")) {
      return url.toString().replace("github.com","raw.githubusercontent.com").replace("/blob/","/");
    }

    // OneDrive/SharePoint: fuerza descarga
    if (url.hostname.includes("1drv.ms") || url.hostname.includes("onedrive.live.com")) {
      url.searchParams.set("download","1");
      return url.toString();
    }

    return u;
  }catch{ return u; }
}

// --- Detección y normalización de YouTube ---
function isYouTubeUrl(u){
  try{
    const x = new URL(u);
    return /(^|\.)youtube\.com$/.test(x.hostname) || /(^|\.)youtu\.be$/.test(x.hostname);
  }catch{ return false; }
}
function getYouTubeId(u){
  try{
    const x = new URL(u);
    if (/youtu\.be$/.test(x.hostname)) {
      const seg = x.pathname.split("/").filter(Boolean);
      return seg[0] || null;
    }
    if (/youtube\.com$/.test(x.hostname)) {
      if (x.searchParams.get("v")) return x.searchParams.get("v");
      // formatos /embed/ID o /shorts/ID
      const m = x.pathname.match(/\/(embed|shorts)\/([^/?#]+)/);
      if (m) return m[2];
    }
    return null;
  }catch{ return null; }
}


// --- Carga del IFrame API de YouTube (una sola vez) ---
let __ytApiReady = null;
function ensureYouTubeAPI(){
  if (__ytApiReady) return __ytApiReady;
  __ytApiReady = new Promise((resolve)=>{
    if (window.YT && window.YT.Player) return resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = ()=> resolve();
  });
  return __ytApiReady;
}


// --- Estado del reproductor actual: 'audio' o 'yt' ---
let __musicProvider = "audio";
let __ytPlayer = null;

async function loadYouTubeIntoPlayer(videoId, loop=false){
  await ensureYouTubeAPI();
  // Contenedor offscreen si no existe
  let box = document.getElementById("ytPlayerContainer");
  if (!box) {
    box = document.createElement("div");
    box.id = "ytPlayerContainer";
    box.className = "yt-offscreen";
    // elemento donde se monta el player
    const playerDiv = document.createElement("div");
    playerDiv.id = "ytPlayer";
    box.appendChild(playerDiv);
    document.body.appendChild(box);
  }
  // Destruye anterior si había
  if (__ytPlayer && __ytPlayer.destroy) { try{ __ytPlayer.destroy(); }catch{} __ytPlayer=null; }

  __ytPlayer = new YT.Player("ytPlayer", {
    height: "1",
    width: "1",
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      loop: loop ? 1 : 0,
      playlist: loop ? videoId : undefined
    },
    events: {
      onReady: ()=>{},
      onStateChange: (ev)=>{
        // Cambia icono de play/pause
        const play = document.getElementById("musicPlay");
        if (!play) return;
        // 1 = playing, 2 = paused, 0 = ended
        if (ev.data === YT.PlayerState.PLAYING) play.innerHTML = '<i class="fas fa-pause"></i>';
        if (ev.data === YT.PlayerState.PAUSED || ev.data === YT.PlayerState.ENDED) play.innerHTML = '<i class="fas fa-play"></i>';
      }
    }
  });
  __musicProvider = "yt";
}


// --- Control unificado de Play/Pause/Volumen/Loop para audio o YouTube ---
async function musicPlayToggle(){
  const play = document.getElementById("musicPlay");
  const audio = document.getElementById("bgMusic");
  if (__musicProvider === "yt" && __ytPlayer) {
    const state = __ytPlayer.getPlayerState();
    if (state !== YT.PlayerState.PLAYING) { __ytPlayer.playVideo(); }
    else { __ytPlayer.pauseVideo(); }
    return;
  }
  // proveedor audio por defecto
  if (!audio.src){ showNotification("Sube una pista o coloca una URL", "warning"); return; }
  if (audio.paused){ await audio.play(); play.innerHTML = '<i class="fas fa-pause"></i>'; }
  else { audio.pause(); play.innerHTML = '<i class="fas fa-play"></i>'; }
}
function musicSetVolume(v){
  const audio = document.getElementById("bgMusic");
  if (__musicProvider === "yt" && __ytPlayer && typeof __ytPlayer.setVolume === "function") {
    __ytPlayer.setVolume(Math.round(v*100));
  } else {
    audio.volume = v;
  }
}
function musicSetLoop(on){
  const audio = document.getElementById("bgMusic");
  if (__musicProvider === "yt") {
    // No hay setter directo; recargamos con playerVars.loop si hace falta:
    try{
      const urlIn = document.getElementById("musicUrlInput");
      const id = urlIn && isYouTubeUrl(urlIn.value) ? getYouTubeId(urlIn.value) : null;
      if (id) loadYouTubeIntoPlayer(id, on);
    }catch{}
  } else {
    audio.loop = on;
  }
}




