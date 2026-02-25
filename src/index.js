import express from 'express';
import { matchRouter } from './routes/matches.js';
import http from 'http'
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';

const app = express();
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0'

const server = http.createServer(app);


app.use(express.json());
app.use(securityMiddleware());
app.use('/matches',matchRouter)
app.get('/',(req,res)=>{
    return res.status(200).json({message:'Hi guys'})
})
const {broadcastMatchCreated} = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated
server.listen(PORT,HOST,()=>{
    const baseUrl = HOST === '0.0.0.0'?`http://localhost:${PORT}`:`http://${HOST}:${PORT}`
    console.log(`server is running at ${baseUrl}`)
    console.log(`Webscoket server is running at ${baseUrl.replace('http','ws')}/ws`)
})