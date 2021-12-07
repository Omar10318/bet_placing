const redis = require('redis');
const request = require('request');
const Q       = require('q');
var parseArgs = require('minimist');

var argv = parseArgs(process.argv.slice(2), { string: ['instances'] });
let consumers = 1;

if (argv.instances && parseInt(argv.instances)) {
  consumers = argv.instances;
}

async function handleMessage(message) {
  const timeToWait = Math.floor(Math.random() * (500 - 300) + 300);
  const splitted = message.split(':');
  let cid = splitted[0], mid = splitted[1], idx = splitted[2];
  await Q.delay(timeToWait);
  await request.post({
    url: 'http://localhost:3000/processedElement',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      command: 'processed',
      idx,
      cid,
      mid
    })
  }, function (err, httpResponse, body) {
    if (err) {
      console.log('Unexpected error', err);
    } else if (httpResponse.statusCode !== 200) {
      console.log('API call did not succeed', body);
    }
  });
}

async function startConsumingLoop(client) {
  let msg = await client.rPop('msg_queue');
  while (msg && msg.split(':').length === 3) {
    await handleMessage(msg);
    msg = await client.rPop('msg_queue');
  }
  console.log('loop done')
}

async function consumeQueue() {
  const client = await redis.createClient({ url: 'redis://localhost:6379/0' });
  client.on('error', err => console.log('Unexpected error', err));
  await client.connect();
  const subscriber = client.duplicate();
  await subscriber.connect();
  await subscriber.subscribe('msg_queue', async () => {
    for (let i = 0; i < consumers; i++) {
      startConsumingLoop(client);
    }
  });
}

Promise.resolve(console.log('Starting', consumers, 'workers')).then(async () => {
  await consumeQueue();
});
