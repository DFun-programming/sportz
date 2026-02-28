import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";
const matchSubscribers = new Map();
const MAX_SUBSCRIPTIONS_PER_SOCKET = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


function subscribe(matchId,socket){
    if(!matchSubscribers.has(matchId)){
        matchSubscribers.set(matchId,new Set());
    } 
    
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId,socket){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers) return;
    subscribers.delete(socket);
    if(subscribers.size === 0){
        matchSubscribers.delete(matchId);
    } 
}
function cleanupSubscriptions(socket){
    for(const matchId of socket.subscriptions){
        unsubscribe(matchId,socket)
    }
}
function broadcastToMatch(matchId,payload){
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers || subscribers.size === 0) return;
    const message = JSON.stringify(payload);
    for(const client of subscribers){
        if(client.readyState === WebSocket.OPEN){
            client.send(message)
        }
    }
}
function handleMessage(socket,data){
    let message;
    try {
        message = JSON.parse(data.toString());
        
    } catch (error) {
        sendJson(socket,{type:'error',message:'Invalid JSON'})
    }
    if(message?.type === 'subscribe' && message.matchId){
        if (!UUID_RE.test(message.matchId)) {
            sendJson(socket, { type: 'error', message: 'Invalid matchId' });
            return;
        }
        if (socket.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
            sendJson(socket, { type: 'error', message: 'Subscription limit reached' });
            return;
        }
        subscribe(message.matchId,socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket,{type:'subscribed',matchId:message.matchId});
        return;
    }
    if(message?.type === 'unsubscribe'&& message.matchId){
        unsubscribe(message.matchId,socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket,{type:'unsubscribed',matchId:message.matchId});
        return;
    }
}

function sendJson(socket,payload){
    if(socket.readyState !== WebSocket.OPEN ) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss,payload){
    for(const client of wss.clients){
        if(client.readyState !== WebSocket.OPEN ) continue;
        client.send(JSON.stringify(payload));
    }
}

export function attachWebSocketServer(server){
    const wss = new WebSocketServer({
        server,
        path:'/ws',
        maxPayload: 1024 * 1024, 
    })

    wss.on('connection',async (socket,req)=>{
        if(wsArcjet){
            try{
                const decision = await wsArcjet.protect(req);
                if(decision.isDenied()){
                    const code = decision.reason.isRateLimit()?1013 : 1008;
                    const reason = decision.reason.isRateLimit()?'Rate Limit Exceeded' : 'Access Denied';
                    socket.close(code,reason)
                    return;
                }
            } catch(e){
                console.error('WS Connection error',e);
                socket.close(1011,'Server Security Error')
            }
        }
        socket.isAlive = true;
        socket.on('pong',()=>{
            socket.isAlive = true;
        })

        socket.subscriptions = new Set();
        sendJson(socket,{type:'welcome'});

        socket.on('message',(data)=>{
            handleMessage(socket,data)
        })
        socket.on('error',()=>{
            socket.terminate();
        })

        socket.on('close',()=>{
            cleanupSubscriptions(socket);
        })
    })

    const interval = setInterval(()=>{
        wss.clients.forEach((ws)=>{
            if(ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    },30000);

    wss.on('close',()=>clearInterval(interval))

    function broadcastMatchCreated(match){
        broadcast(wss,{type:'match_created',data:match})
    }

    function broadcastCommentry(matchId,comment){
        broadcastToMatch(matchId,{type:'commentary', data:comment});
    }

    return {broadcastMatchCreated,broadcastCommentry }
}