import os
import subprocess
import sys

worker_instances = 1
API_LAUNCH_COMMAND = 'python3 api/start.py'
WORKER_LAUNCH_COMMAND = '. ~/.nvm/nvm.sh && nvm use v14 && node worker/index.js --instances'

if len(sys.argv[1:]) == 0:
	print('Argument instances not specified, taking value 1 as default')
for i, args in enumerate(sys.argv[1:]):
  if '--instances' == args and i+1 < len(sys.argv[1:]):
    try:
      worker_instances = int(sys.argv[1:][i+1])
      break
    except Exception:
      print('instances must be specified with Integer value')
  else:
    print('unhandled arg', args)

subprocess.call(['gnome-terminal', '-e', API_LAUNCH_COMMAND])

os.system(WORKER_LAUNCH_COMMAND + ' ' + str(worker_instances))

