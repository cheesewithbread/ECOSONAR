// Variables globales
let analysisInProgress = false
let currentImageFile = null

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

// Función principal de inicialización
function initializeApp() {
  setupNavigation()
  setupImageAnalyzer()
  setupAnimations()
  setupCharts()
  startRealTimeUpdates()
  setupScrollEffects()
}

// Configuración de navegación
function setupNavigation() {
  const navToggle = document.getElementById("navToggle")
  const navMenu = document.querySelector(".nav-menu")

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")
    })
  }

  // Cerrar menú al hacer clic en un enlace
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active")
    })
  })

  // Efecto de scroll en header
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".header")
    if (window.scrollY > 100) {
      header.style.background = "rgba(10, 15, 28, 0.95)"
    } else {
      header.style.background = "rgba(10, 15, 28, 0.9)"
    }
  })
}

// Configuración del analizador de imágenes
function setupImageAnalyzer() {
  const uploadArea = document.getElementById("uploadArea")
  const fileInput = document.getElementById("fileInput")
  const analysisResults = document.getElementById("analysisResults")

  if (!uploadArea || !fileInput) return

  // Eventos de drag and drop
  uploadArea.addEventListener("click", () => fileInput.click())
  uploadArea.addEventListener("dragover", handleDragOver)
  uploadArea.addEventListener("dragleave", handleDragLeave)
  uploadArea.addEventListener("drop", handleDrop)

  // Evento de selección de archivo
  fileInput.addEventListener("change", handleFileSelect)
}

function handleDragOver(e) {
  e.preventDefault()
  e.currentTarget.style.borderColor = "#0d9488"
  e.currentTarget.style.background = "rgba(13, 148, 136, 0.1)"
}

function handleDragLeave(e) {
  e.preventDefault()
  e.currentTarget.style.borderColor = "rgba(45, 90, 135, 0.3)"
  e.currentTarget.style.background = "transparent"
}

function handleDrop(e) {
  e.preventDefault()
  const files = e.dataTransfer.files
  if (files.length > 0) {
    processImageFile(files[0])
  }
  handleDragLeave(e)
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) {
    processImageFile(file)
  }
}

function processImageFile(file) {
  if (!file.type.startsWith("image/")) {
    showNotification("Por favor selecciona un archivo de imagen válido", "error")
    return
  }

  currentImageFile = file
  startImageAnalysis()
}

function startImageAnalysis() {
  if (analysisInProgress) return

  analysisInProgress = true
  const analysisResults = document.getElementById("analysisResults")
  const uploadArea = document.getElementById("uploadArea")

  // Mostrar resultados y ocultar área de carga
  uploadArea.style.display = "none"
  analysisResults.style.display = "block"

  // Iniciar animación de progreso
  animateProgress()

  // Simular análisis con datos realistas
  setTimeout(() => {
    displayAnalysisResults()
    analysisInProgress = false
  }, 3000)
}

function animateProgress() {
  const progressFill = document.getElementById("progressFill")
  let progress = 0

  const interval = setInterval(() => {
    progress += Math.random() * 15
    if (progress >= 100) {
      progress = 100
      clearInterval(interval)
    }
    progressFill.style.width = progress + "%"
  }, 200)
}

function displayAnalysisResults() {
  // Datos simulados del análisis
  const results = {
    species: Math.floor(Math.random() * 8) + 3,
    noiseLevel: ["Bajo", "Medio", "Alto"][Math.floor(Math.random() * 3)],
    waterQuality: ["Excelente", "Buena", "Regular"][Math.floor(Math.random() * 3)],
    biodiversity: ["Muy Alta", "Alta", "Media"][Math.floor(Math.random() * 3)],
  }

  const details = [
    "Delfín nariz de botella detectado en sector norte",
    "Ballena jorobada identificada por patrón vocal único",
    "Actividad de peces pelágicos en profundidad media",
    "Ruido antropogénico mínimo detectado",
    "Temperatura del agua: 18.5°C",
    "Salinidad dentro de parámetros normales",
  ]

  // Actualizar resultados en la interfaz
  document.getElementById("speciesCount").textContent = results.species
  document.getElementById("noiseLevel").textContent = results.noiseLevel
  document.getElementById("waterQuality").textContent = results.waterQuality
  document.getElementById("biodiversity").textContent = results.biodiversity

  // Actualizar lista de detalles
  const detailsList = document.getElementById("analysisDetailsList")
  detailsList.innerHTML = ""
  details.forEach((detail) => {
    const li = document.createElement("li")
    li.textContent = detail
    detailsList.appendChild(li)
  })

  showNotification("Análisis completado exitosamente", "success")
}

// Configuración de animaciones
function setupAnimations() {
  // Animaciones de entrada para elementos
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observar elementos para animaciones
  document.querySelectorAll(".glass-card, .stat-card, .benefit-card").forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(30px)"
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease"
    observer.observe(el)
  })
}

// Configuración de gráficos
function setupCharts() {
  setupAcousticChart()
  setupSpeciesChart()
}

function setupAcousticChart() {
  const canvas = document.getElementById("acousticChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const width = canvas.width
  const height = canvas.height

  // Limpiar canvas
  ctx.clearRect(0, 0, width, height)

  // Configurar estilos
  ctx.strokeStyle = "#0d9488"
  ctx.lineWidth = 2
  ctx.fillStyle = "rgba(13, 148, 136, 0.1)"

  // Generar datos simulados
  const dataPoints = 24
  const data = []
  for (let i = 0; i < dataPoints; i++) {
    data.push(Math.random() * 80 + 20)
  }

  // Dibujar gráfico
  ctx.beginPath()
  ctx.moveTo(0, height - (data[0] / 100) * height)

  for (let i = 1; i < dataPoints; i++) {
    const x = (i / (dataPoints - 1)) * width
    const y = height - (data[i] / 100) * height
    ctx.lineTo(x, y)
  }

  ctx.stroke()

  // Rellenar área bajo la curva
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
}

function setupSpeciesChart() {
  const canvas = document.getElementById("speciesChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = Math.min(centerX, centerY) - 20

  // Datos de especies
  const species = [
    { name: "Delfines", value: 35, color: "#0d9488" },
    { name: "Ballenas", value: 25, color: "#06b6d4" },
    { name: "Peces", value: 30, color: "#3b82f6" },
    { name: "Otros", value: 10, color: "#6366f1" },
  ]

  let currentAngle = -Math.PI / 2

  species.forEach((item) => {
    const sliceAngle = (item.value / 100) * 2 * Math.PI

    // Dibujar sector
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
    ctx.closePath()
    ctx.fillStyle = item.color
    ctx.fill()

    // Dibujar borde
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 2
    ctx.stroke()

    currentAngle += sliceAngle
  })
}

// Actualizaciones en tiempo real
function startRealTimeUpdates() {
  // Actualizar estadísticas cada 5 segundos
  setInterval(updateRealTimeStats, 5000)

  // Actualizar gráficos cada 30 segundos
  setInterval(() => {
    setupAcousticChart()
    setupSpeciesChart()
  }, 30000)
}

function updateRealTimeStats() {
  // Simular cambios en las estadísticas
  const activeSpecies = document.getElementById("activeSpecies")
  const noiseDb = document.getElementById("noiseDb")
  const temperature = document.getElementById("temperature")
  const salinity = document.getElementById("salinity")

  if (activeSpecies) {
    const newValue = Math.floor(Math.random() * 5) + 10
    activeSpecies.textContent = newValue
  }

  if (noiseDb) {
    const newValue = (Math.random() * 20 + 35).toFixed(1)
    noiseDb.textContent = newValue + " dB"
  }

  if (temperature) {
    const newValue = (Math.random() * 4 + 16).toFixed(1)
    temperature.textContent = newValue + "°C"
  }

  if (salinity) {
    const newValue = (Math.random() * 2 + 34).toFixed(1)
    salinity.textContent = newValue + " PSU"
  }
}

// Efectos de scroll
function setupScrollEffects() {
  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset
    const parallax = document.querySelector(".hero-visual")

    if (parallax) {
      const speed = scrolled * 0.5
      parallax.style.transform = `translateY(${speed}px)`
    }
  })
}

// Funciones de utilidad
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)
  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }
}

function showNotification(message, type = "info") {
  // Crear elemento de notificación
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message

  // Estilos de la notificación
  Object.assign(notification.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "15px 20px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "500",
    zIndex: "10000",
    transform: "translateX(100%)",
    transition: "transform 0.3s ease",
    maxWidth: "300px",
  })

  // Colores según el tipo
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  }

  notification.style.background = colors[type] || colors.info

  // Agregar al DOM
  document.body.appendChild(notification)

  // Animar entrada
  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  // Remover después de 4 segundos
  setTimeout(() => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 4000)
}

// Event listeners para botones
document.addEventListener("click", (e) => {
  // Botones de herramientas de análisis
  if (e.target.classList.contains("btn-tool")) {
    const toolName = e.target.closest(".tool-card").querySelector("h3").textContent
    showNotification(`Iniciando ${toolName}...`, "info")
  }

  // Botones de exportación
  if (e.target.classList.contains("btn-export")) {
    const exportType = e.target.closest(".export-card").querySelector("h3").textContent
    showNotification(`Generando ${exportType}...`, "info")

    // Simular descarga después de 2 segundos
    setTimeout(() => {
      showNotification(`${exportType} generado exitosamente`, "success")
    }, 2000)
  }
})

// Funciones para controles de configuración
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("slider")) {
    // Actualizar valor del slider en tiempo real
    const value = e.target.value
    const label = e.target.previousElementSibling
    if (label && label.tagName === "LABEL") {
      const baseText = label.textContent.split(":")[0]
      label.textContent = `${baseText}: ${value} Hz`
    }
  }
})

// Manejo de errores globales
window.addEventListener("error", (e) => {
  console.error("Error en ECOSONAR:", e.error)
  showNotification("Ha ocurrido un error. Por favor, recarga la página.", "error")
})

// Función para resetear el analizador
function resetAnalyzer() {
  const uploadArea = document.getElementById("uploadArea")
  const analysisResults = document.getElementById("analysisResults")
  const fileInput = document.getElementById("fileInput")

  if (uploadArea && analysisResults && fileInput) {
    uploadArea.style.display = "block"
    analysisResults.style.display = "none"
    fileInput.value = ""
    currentImageFile = null
    analysisInProgress = false
  }
}

// Agregar botón de reset al analizador
document.addEventListener("DOMContentLoaded", () => {
  const analysisResults = document.getElementById("analysisResults")
  if (analysisResults) {
    const resetButton = document.createElement("button")
    resetButton.textContent = "Analizar Nueva Imagen"
    resetButton.className = "btn-primary"
    resetButton.style.marginTop = "20px"
    resetButton.onclick = resetAnalyzer
    analysisResults.appendChild(resetButton)
  }
})

// Optimización de rendimiento
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Aplicar debounce a eventos de scroll
const debouncedScrollHandler = debounce(() => {
  setupScrollEffects()
}, 16) // ~60fps

window.addEventListener("scroll", debouncedScrollHandler)
