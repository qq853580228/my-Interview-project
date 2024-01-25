const { WebSocketServer } = require('ws');

const wsServer = new WebSocketServer({ port: 3000 });

const list = new Set();

wsServer.on('connection', curWs => {
  console.info('connected');

  // 这边要把连接的ws添加到list，需要有缓存机制，否则服务器压力大
  list.add(curWs);
  curWs.on('message', msg => {
    list.forEach(ws => {
      if (ws !== curWs) {
        ws.send(msg.toString());
      }
    })
  })

})