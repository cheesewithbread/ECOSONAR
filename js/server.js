// server/server.js — opcional para probar endpoints reales
import express from 'express';
import cors from 'cors';
import multer from 'multer';


const app = express();
app.use(cors());
const upload = multer();


app.post('/api/analyze-image', upload.single('file'), (req,res)=>{
// Aquí iría tu IA real
res.json({ speciesCount: 7, noiseLevel: 'Medio', waterQuality: 'Buena', biodiversity: 'Alta', details: ['Mock server OK'] });
});

app.get('/api/metrics/stream', (req,res)=>{
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
const id = setInterval(()=>{
const pkt = { species: 12+Math.floor(Math.random()*5), noiseDb: +(Math.random()*20+35).toFixed(1), temperature: +(Math.random()*4+16).toFixed(1), salinity: +(Math.random()*2+34).toFixed(1) };
res.write(`data: ${JSON.stringify(pkt)}\n\n`);
}, 5000);
req.on('close', ()=> clearInterval(id));
});


app.listen(3000, ()=> console.log('Mock API en http://localhost:3000'));