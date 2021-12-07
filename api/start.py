import traceback
import json
import os
import uuid
import asyncio
import websockets
import redis
import cherrypy
from threading import Thread

cherrypy.config.update({'server.socket_host': '0.0.0.0'})
cherrypy.config.update({'server.socket_port': int(os.environ.get('PORT', '3000'))})


socket_identifier_dico = {}


r = redis.Redis(host='localhost', port=6379, db=0)

async def process_incoming(websocket, path):
    while True:
        try:
            strLoad = await websocket.recv()
            print("Incoming {}".format(strLoad))
            load = json.loads(strLoad)
            if 'openingSocket' in load and load['openingSocket']:
                uid = str(uuid.uuid4())
                socket_identifier_dico[uid] = { 'socket_handler': websocket }
                await websocket.send(json.dumps({ 'uid': uid }))
            elif 'cid' in load:
                r.publish('msg_queue', 'Consume')
                for idx in range(load['count']):
                    val = load['cid'] + ':' + str(load['mid']) + ':' + str(idx + 1)
                    print('pushing', val)
                    r.rpush('msg_queue', val)
        except websockets.exceptions.ConnectionClosedOK:
            pass
        except Exception:
            traceback.print_exc()
            await websocket.close()
            break

async def return_status_to_client(params):
    cid = params['cid']
    mid = params['mid']
    idx = params['idx']
    if cid not in socket_identifier_dico:
        print('Unidentified processed element', cid, mid, idx)
        return
    socket_obj = socket_identifier_dico[cid]
    socket = socket_obj['socket_handler']
    if not socket or not socket.open:
        print('Socket is closed', cid, mid, idx)
        return
    await socket.send(json.dumps({
        'uid': cid,
        'command': 'processed',
        'result': { 'idx': idx },
        'mid': mid,
    }))

@cherrypy.expose
class processedElement():
  def __init__(self) -> None:
    super().__init__()

  @cherrypy.tools.json_out()
  @cherrypy.tools.json_in()
  def POST(self):
    cherrypy.response.headers['Access-Control-Allow-Headers'] = 'Content-Type,authorization,x-authorized-user'
    cherrypy.response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS, GET'
    cherrypy.response.headers['Acces-Control-Allow-Origin'] = "*"
    cherrypy.response.headers['Content-Type'] = 'application/json'
    params = cherrypy.request.json
    asyncio.run(return_status_to_client(params))
    cherrypy.response.status = 200
    return {}

def run_socket():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    start_server = websockets.serve(process_incoming, 'localhost', 8080)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

if __name__ == '__main__':
    conf = {
        '/': {
            'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
            'tools.sessions.on': True,
            'tools.response_headers.on': True,
            'tools.encode.on': True,
            'tools.response_headers.headers': [('Content-Type', '*/*'),
            ('Access-Control-Allow-Origin', '*')],
        }
    }

    try:
        thread = Thread(target=run_socket)
        thread.start()
        thread.join(0)

    except Exception:
        traceback.print_exc()

    cherrypy.tree.mount(processedElement(), '/processedElement', conf)
    cherrypy.engine.start()
    cherrypy.engine.block()
