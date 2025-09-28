
# ECOSONAR 🐬📡

**Solución integral para el monitoreo y análisis de datos acústicos marinos**

> **ECOSONAR** permite **subir** de imágenes de sonar, procesarlas con técnicas de visión por computador en el navegador y generar métricas como especies/objetos detectados, nivel de ruido, calidad del agua y biodiversidad. Incluye **monitoreo en vivo**, **gráficos** y  **alertas con sonido** .

<br><br>

## 🧭 Contenido

-   [Características](#-caracter%C3%ADsticas)
    
-   [Demo Rápida](#-demo-r%C3%A1pida)
    
-   [Arquitectura](#-arquitectura)
    
-   [Estructura del Proyecto](#-estructura-del-proyecto)
    
-   [Instalación y Uso](#-instalaci%C3%B3n-y-uso)
    
-   [Configuración](#-configuraci%C3%B3n)
    
-   [Flujo de Análisis de Imágenes](#-flujo-de-an%C3%A1lisis-de-im%C3%A1genes)
    
-   [Monitoreo en Tiempo Real](#-monitoreo-en-tiempo-real)
    
-   [Música Ambiente (archivo, URL, YouTube)](#-m%C3%BAsica-ambiente-archivo-url-youtube)
    
-   [Notas sobre CORS / Seguridad del Navegador](#-notas-sobre-cors--seguridad-del-navegador)
    
-   [Resolución de Problemas](#-resoluci%C3%B3n-de-problemas)
    
-   [Roadmap](#-roadmap)
    
-   [Licencia](#-licencia)
    

<br><br>

## ✨ Características

-   **Análisis de imágenes en el navegador** (sin backend requerido):
    
    -   Conversión a **escala de grises**
        
    -   **Sobel** promedio (proxy de ruido/alta frecuencia)
        
    -   **Umbral adaptativo** (media + 0.7·σ)
        
    -   **Componentes conectados** (detección de blobs) → _Especies/objetos detectados_
        
-   **Resultados en UI**: especies, nivel de ruido (Bajo/Medio/Alto), calidad del agua (Excelente/Buena/Regular), biodiversidad (Media/Alta/Muy Alta), lista de detalles.
    
-   **Progreso visual** del análisis + **beep** al finalizar.
    
-   **Entrada por archivo** y **URL** (para imágenes) _(si el servidor permite CORS)_.
    
-   **Monitoreo en tiempo real (mock)**: tarjetas y gráficos refrescando periódicamente.
    
-   **Reproductor de música**:
    
    -   **Archivo local**
        
    -   **URL directa** (mp3/ogg/wav)
        
    -   **YouTube** mediante **IFrame Player API** (controlado con los mismos botones).
        
-   **UI cuidada**: glassmorphism, accesibilidad básica, selects/inputs visibles en modo oscuro, sliders estilizados.
    

<br><br>

## ⚡ Demo Rápida

    
1.  En **Analizador de Imágenes**:
    
    -   Sube una imagen  de imagen.
        
    -   Observa la barra de progreso y los resultados dinámicos.
        
2.  En **Música Ambiente**:
    
    -   Carga un archivo, pega una URL de audio **o** pega un enlace de **YouTube**.
        
    -   Play/Pause, volumen y loop funcionan igual para audio y YouTube.
        

<br><br>

## 🗂 Estructura del Proyecto

`/ (raíz)
├─ index.html
├─ css/
│  └─ style.css # estilos (inputs/selects/slider tunning + UI) └─ js/
   └─ script.js # lógica principal (análisis, UI, música, YouTube)` 

> Mantén **un solo** `script.js`. Si tienes scripts antiguos que añaden listeners extra al área de subida, elimínalos para evitar que el selector de archivos se abra varias veces.

<br><br>


## ⚙️ Configuración

En la sección **Configuración Inicial**:

-   **Frecuencias**: sliders para mínimo/máximo (Hz).
    
-   **Ubicación**: lat/lng + océano (contextual).
    
-   **Monitoreo**: duración por sesión e intervalo entre sesiones.
    

<br><br>

## 🔬 Flujo de Análisis de Imágenes

1.  **Carga** de la imagen (archivo/URL) → canvas interno (máx. 512px, mantiene aspecto).
    
2.  **Preprocesado**:
    
    -   Gris, media y desviación estándar.
        
3.  **Sobel promedio** → estimación de **ruido**.
    
4.  **Umbral adaptativo** → imagen binaria.
    
5.  **Componentes conectados** (umbral de área relativo) → **especies/objetos**.
    
6.  **Heurísticas** legibles para **nivel de ruido**, **calidad de agua** y **biodiversidad**.
    
7.  **Pintado de resultados** + **beep**.
    


<br><br>

## 📈 Monitoreo en Tiempo Real

-   Tarjetas de **Especies activas**, **Ruido (dB)**, **Temperatura** y **Salinidad** refrescan cada **5s** (mock).
    
-   Gráficos “Actividad 24h” y “Distribución de Especies” se regeneran cada **30s**.
    

> Puedes conectar datos reales (WebSocket/SSE) sustituyendo el mock.

<br><br>

## 🎵 Música Ambiente (archivo, URL, YouTube)

-   **Archivo**: botón _Elegir pista_.
    
-   **URL de audio**: pega un `mp3/ogg/wav` y pulsa _Usar URL_.
    
-   **YouTube**: pega cualquier `youtube.com` o `youtu.be` → el reproductor conmuta a **YouTube IFrame** “oculto” y controla play/pause/volumen/loop con los mismos botones.
    

**Controles:**  
Play/Pause ▸ Volumen ▸ Loop ▸ Atajo: pegar URL directamente sobre la tarjeta del player.

> Autoplay está sujeto a políticas del navegador (normalmente necesita interacción del usuario).

<br>

## 🧪 Resolución de Problemas

| Síntoma | Causa probable | Cómo solucionarlo |
|---|---|---|
| El **selector de archivos** se abre más de una vez | Listeners duplicados en `uploadArea`/`fileInput` de scripts viejos | Mantén **un solo** `js/script.js`. La versión actual **clona** los nodos para limpiar listeners previos. Quita cualquier script extra que vuelva a enlazar eventos. |
| Tras subir **diferentes imágenes**, los resultados **no cambian** | Aún se usaba lógica **simulada** | Asegúrate de estar usando el `script.js` **real** (análisis por canvas). Borra funciones de demo antiguas como `displayAnalysisResults()` con datos hardcodeados. |
| **No se analizó la imagen por URL** | El host de la imagen **no permite CORS** (canvas bloqueado) | Usa **archivo local** o un host con `Access-Control-Allow-Origin` abierto. Alternativamente, descarga y sirve la imagen desde tu propio dominio con CORS habilitado. |
| **“Mixed content”** al reproducir audio por URL | Sitio en **HTTPS** pero audio en **HTTP** | Cambia a una **URL HTTPS** o sube la pista como archivo local. |
| La **URL de audio** no suena y muestra error genérico | La URL no apunta a un **archivo** de audio (HTML/redirect/302 a visor) | Usa enlaces **directos** (Dropbox/GDrive/GitHub raw). Ver sección *Normalización de URLs de audio*. |
| Enlace de **YouTube** no suena | `<audio>` no reproduce streams de YouTube | Pega la URL de YouTube: el reproductor conmuta al **IFrame Player API** (controlado por los mismos botones). |
| YouTube **no reproduce** hasta tocar *Play* | Políticas de **autoplay** del navegador | Interactúa una vez (Play). Luego queda bajo control del player. |
| Los **select/option** se ven mal en tema oscuro | Estilos nativos del navegador | Asegúrate de tener el bloque de estilos de **select**/**option** del `style.css` actualizado (fondo oscuro, color de texto y flecha SVG). |
| El **progreso** se queda “atascado” en 98% | Es normal: animación controlada + análisis real termina al 100% | Si no llega a 100%, revisa la consola (F12) por errores de imagen/canvas. |
| **Bajo rendimiento** con imágenes muy grandes | Canvas reescalado aún es costoso en equipos modestos | Se limita a **512 px** por lado. Si persiste, reduce a 384 px o prueba en otro navegador/dispositivo. |
---
<br>

### 👋 Créditos

-   UI y desarrollo: **ECOSONAR** (prototipo educativo).
-    Julyed
