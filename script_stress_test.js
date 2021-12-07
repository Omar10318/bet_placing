const WebSocket = require('ws');
var parseArgs = require('minimist');
const Q = require('q');
const apiURL = 'ws://localhost:8080';

var argv = parseArgs(process.argv.slice(2), { string: ['messages', 'sockets', 'count'] });

var receivedResponses = 0;
var startTime = new Date()
var messages = 1, sockets = 1, count = 10;
if (argv.messages && parseInt(argv.messages)) {
  messages = parseInt(argv.messages);
}
if (argv.sockets && parseInt(argv.sockets)) {
  sockets = parseInt(argv.sockets);
}
if (argv.count && parseInt(argv.count)) {
  count = parseInt(argv.count);
}

var totalCount = count * messages * sockets;

class WebSocketPool {
  constructor(socketNb) {
    this.socketNb = socketNb||1;
    this.sockets = [];
  };

  initSockets() {
    for (let i = 0; i < this.socketNb; i++) {
      const newSocket = new WebSocket(apiURL);
      const socketElem = { socket: newSocket };
      newSocket.onerror = function(err) {
        console.log('Error on socket', err);
      };
      newSocket.onclose = function() {
        console.log('Socket is closed');
      };
      newSocket.onmessage = function(event) {
        if (event && event.data) {
          const respData = JSON.parse(event.data);
          if (respData.uid) {
            socketElem.uid = respData.uid;
          }
          if (respData.command === 'processed') {
            receivedResponses++;
            console.log(receivedResponses, '/', totalCount);
            if (receivedResponses === totalCount) {
              var endTime = new Date()
              console.log(String((endTime.getTime() - startTime.getTime()) / 1000) + 's');
            }
          }
        }
      };
      newSocket.onopen = function() {
        this.send(JSON.stringify({ openingSocket: true }));
      };
      this.sockets.push(socketElem);
    }
  };

  async dispatchElements(elemCount, messageCount) {
    await this.sockets.reduce(async (accu, socket) => {
      await accu;
      for (let iter = 0; iter < messageCount; iter++) {
        await socket.socket.send(JSON.stringify({
          command: 'enqueue',
          count: elemCount,
          mid: iter + 1,
          cid: socket.uid
        }));
      }
    }, Q.resolve());
  };

}

const socketPool = new WebSocketPool(sockets);
new Promise(async (res, rej) => {
  socketPool.initSockets();
  await Q.delay(1000);
  await socketPool.dispatchElements(count, messages);
  res('done')
})
