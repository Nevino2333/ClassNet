#!/bin/bash
echo "========================================"
echo "  ClassNet System Starting..."
echo "========================================"
echo ""

echo "[1/3] Initializing database..."
cd "$(dirname "$0")/server"
mkdir -p database
node src/utils/init-db.js
echo ""

echo "[2/3] Starting backend server..."
node src/app.js &
SERVER_PID=$!
echo "   Backend server started on port 9000 (PID: $SERVER_PID)"
echo ""

echo "[3/3] Starting frontend dev server..."
cd "$(dirname "$0")/client"
npx vite --host &
CLIENT_PID=$!
echo "   Frontend dev server started on port 5001 (PID: $CLIENT_PID)"
echo ""

echo "========================================"
echo "  ClassNet System is running!"
echo "========================================"
echo ""
echo "  Frontend: http://localhost:5001"
echo "  Backend:  http://localhost:9000"
echo "  WebSocket: ws://localhost:10001"
echo ""
echo "  Default admin account:"
echo "    See ADMIN_USER_IDS and ADMIN_PASSWORD in server/.env"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM
wait
