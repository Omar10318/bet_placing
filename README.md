# bet placing
A skeleton for bet placing handlers

This module is a Skeleton for a Bet Placing handling system
It works either by launching a testing script or by interacting with an interface.

# Requirements
this module requires having a python3 (3.8) and node (>= v14) along with package managers pip and npm

# Setup
In order to use this module, you have to install some dependencies:

python3 -m pip install -r requirements.txt
npm install

# Usage
Whether  you are looking to test or interact with module, you should start by launching the API server and the workers :

python3 script_launch.py --instances [nb of worker instances to launch: default is 1]
this command uses the current command line to launch workers and opens a second to launch API server (only compatible with Ubuntu)

1- Interaction: you can interact with the module through a user interface by launching index.html in a web browser
2- Testing: If you wish to test the module, you can launch:
 node script_stress_test.js --sockets [nb of parallel sockets, default is 1] --messages [nb of parallel messages: default is 1] --count [nb of bets to place: default is 10]
 
# Comments
Here are some difficulties were encoutered to realise this project:

1- Handling async/await in python: By using redis module in python alongside cherrypy server engine, the module had to handle asynchronous execution of socket communication and also real time requests from workers. That is why I used the asyncio module.

2- Redis notification and queue execution: this part was tricky because redis gives handlers to notify subscribed clients of any change in queue bu without handling concurrency.

That means that if multiple consumers were subscribed to a queue/channel, they would all execute the same callbacks on the same message because they would receive the same notification.
The solution that I implemented uses the notification to only tell the consumers to be ready to read new keys in a queue while the actual handling of the (key, value) pair was done through a loop that looks for any messages posted in the queue.

3- The script launch compatibility between python and node was a bit of a headache before figuring out that I had to launch the API and workers separatly

4- The scalability difficulty: The major problem by the end was the parallel sending of messaging which resulted in the client (the stress tetsing script) to receive multiple message at once and there for struggle to parse the result.

