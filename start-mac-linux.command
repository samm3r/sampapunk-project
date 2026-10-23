#!/bin/sh
# Starts a tiny local server so the soundtrack loads with full quality, then opens the game.
cd "$(dirname "$0")"
PORT=8000
( sleep 1; (open "http://localhost:$PORT" || xdg-open "http://localhost:$PORT") >/dev/null 2>&1 ) &
python3 -m http.server $PORT || python -m SimpleHTTPServer $PORT
