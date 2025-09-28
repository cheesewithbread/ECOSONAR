// js/export.js — CSV/PDF y stub de DB. Expone window.ECOSONAR.exports
(function(){
const ECOSONAR = (window.ECOSONAR = window.ECOSONAR || {});
const exportsNS = (ECOSONAR.exports = {});


exportsNS.exportCSV = function(asExcel){
const rows = collectRows();
const csv = rows.map(r=>r.map(s=>`"${String(s).replaceAll('"','""')}"`).join(',')).join('\n');
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = asExcel? `ecosonar_datos_${dateStamp()}.csv` : `ecosonar.csv`;
a.click();
};

exportsNS.exportPDF = async function(){
try {
await ensureJsPDF();
const { jsPDF } = window.jspdf;
const doc = new jsPDF();
const rows = collectRows();
doc.setFontSize(16); doc.text('ECOSONAR – Informe', 14, 18);
doc.setFontSize(10); let y = 26;
rows.forEach(r=>{ doc.text(r.join(' '), 14, y); y += 6; if (y > 280) { doc.addPage(); y = 20; } });
doc.save(`ecosonar_informe_${dateStamp()}.pdf`);
} catch {
// Fallback: ventana de impresión con HTML básico
const w = window.open('', '_blank');
w.document.write('<h1>ECOSONAR – Informe</h1>' + tableHTML(collectRows()));
w.document.close(); w.focus(); w.print(); w.close();
}
};


exportsNS.configureAPI = function(){
alert('Configura tus endpoints en js/api.js → CONFIG.ENDPOINTS');
};


function collectRows(){
const rows = [];
rows.push(['Fecha', new Date().toLocaleString()]);
// Resumen análisis actual
const ids = ['speciesCount','noiseLevel','waterQuality','biodiversity'];
ids.forEach(id=>{ const el = document.getElementById(id); if (el) rows.push([id, el.textContent]); });
// Métricas en vivo
const live = ['activeSpecies','noiseDb','temperature','salinity'];
live.forEach(id=>{ const el = document.getElementById(id); if (el) rows.push([id, el.textContent]); });
return rows;
}



function dateStamp(){ const d = new Date(); return d.toISOString().replace(/[:.]/g,'-'); }


function tableHTML(rows){
return '<table border="1" cellspacing="0" cellpadding="4">' + rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('') + '</table>';
}


function ensureJsPDF(){
return new Promise((resolve, reject)=>{
if (window.jspdf?.jsPDF) return resolve();
const s = document.createElement('script');
s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
s.onload = ()=> resolve();
s.onerror = ()=> reject(new Error('No se pudo cargar jsPDF'));
document.head.appendChild(s);
});
}
})();