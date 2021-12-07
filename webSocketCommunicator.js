'use strict';

const SOCKETNUMBER = 1;
const apiURL = 'ws://localhost:8080';
var receivedResponses = 0;
var socketPool;
var startTime;
var countToSend;

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
      newSocket.onopen = function() {
        console.log('Socket is Open!');
      };
      newSocket.onmessage = function(event) {
        if (event && event.data) {
          const respData = JSON.parse(event.data);
          if (respData.uid) {
            socketElem.uid = respData.uid;
          }
          if (respData.command === 'processed') {
            receivedResponses++;
            updateElementsNb(receivedResponses);
            if (receivedResponses === countToSend) {
              updateProcessingTime(new Date());
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

  dispatchElements(elemCount, messageCount) {
    this.sockets.forEach(socket => {
      for (let iter = 0; iter < messageCount; iter++) {
        socket.socket.send(JSON.stringify({
          command: 'enqueue',
          count: elemCount,
          mid: iter + 1,
          cid: socket.uid
        }));
      }
    });
  };

}

function updateElementsNb(progress) {
  const divElementsNb = document.getElementById('elemntsNb');
  divElementsNb.innerHTML = 'Number of elements: ' + String(progress) + '/' + String(countToSend);
}

function updateProcessingTime(endTime) {
  const divProcessTime = document.getElementById('processingTime');
  let timeDiffInSec = 'processing';
  if (endTime) {
    timeDiffInSec = String((endTime.getTime() - startTime.getTime()) / 1000) + 's';
  }
  divProcessTime.innerHTML = 'Time to process: ' + timeDiffInSec;
}

function sendElementsToAPI() {
  const input = document.getElementById('countInput');
  countToSend = parseInt(input.value);
  startTime = new Date();
  receivedResponses = 0;
  updateElementsNb(0, countToSend);
  updateProcessingTime();
  socketPool.dispatchElements(countToSend, 1);
}

function initUIListeners() {
  const button = document.getElementById('sendToAPI');
  button.addEventListener('click', sendElementsToAPI);
}

function main() {
  initUIListeners();
  socketPool = new WebSocketPool(SOCKETNUMBER);
  socketPool.initSockets();
}

window.onload = main;

