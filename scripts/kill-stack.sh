#!/usr/bin/env bash
# Kill all AURIXA-related processes (ports 3000, 3100, 3300, 8001-8008)
set -e
PORTS="3000 3100 3300 8001 8002 8003 8004 8005 8006 8007 8008"
for port in $PORTS; do
  pid=$(lsof -ti:$port 2>/dev/null) || true
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID $pid)"
    kill -9 $pid 2>/dev/null || true
  fi
done
# Wait for ports to be released
for i in 1 2 3 4 5; do
  busy=""
  for port in $PORTS; do
    lsof -ti:$port &>/dev/null && busy=1
  done
  [ -z "$busy" ] && break
  sleep 2
done
echo "Done. All AURIXA ports cleared."
