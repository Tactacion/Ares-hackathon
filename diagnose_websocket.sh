#!/bin/bash

# ARES WebSocket Diagnostic Tool
# Comprehensive diagnostics for WebSocket connectivity issues

echo "🔍 ARES WebSocket Diagnostic Tool"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check Backend Server
echo -e "${BLUE}1. Checking Backend Server...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend HTTP endpoint is accessible${NC}"
    HEALTH=$(curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null)
    echo "$HEALTH"
else
    echo -e "${RED}❌ Backend HTTP endpoint is NOT accessible${NC}"
    echo -e "${YELLOW}   Backend may not be running. Start it with:${NC}"
    echo -e "${YELLOW}   cd backend && ./venv/bin/python main.py${NC}"
    exit 1
fi
echo ""

# 2. Check Backend Process
echo -e "${BLUE}2. Checking Backend Process...${NC}"
BACKEND_PID=$(lsof -ti :8000 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    echo -e "${GREEN}✅ Backend process is running (PID: $BACKEND_PID)${NC}"
    ps -p $BACKEND_PID -o pid,comm,args | grep -v PID
else
    echo -e "${RED}❌ No process listening on port 8000${NC}"
    exit 1
fi
echo ""

# 3. Test WebSocket with Python
echo -e "${BLUE}3. Testing WebSocket Connection...${NC}"
cat << 'EOF' > /tmp/test_ws_ares.py
import asyncio
import websockets
import json

async def test():
    try:
        print("🔌 Connecting to ws://localhost:8000/ws...")
        async with websockets.connect('ws://localhost:8000/ws') as ws:
            print("✅ WebSocket connected successfully!")

            # Wait for first message
            print("📨 Waiting for data...")
            msg = await asyncio.wait_for(ws.recv(), timeout=10)

            # Parse and display
            data = json.loads(msg)
            print(f"✅ Received message type: {data.get('type')}")

            if data.get('type') == 'sector_update':
                sector = data.get('data', {})
                print(f"   - Aircraft count: {sector.get('aircraft_count', 0)}")
                print(f"   - Active alerts: {len(sector.get('active_alerts', []))}")
                print(f"   - Timestamp: {sector.get('timestamp', 'N/A')}")

            return True

    except asyncio.TimeoutError:
        print("❌ Timeout waiting for WebSocket message")
        print("   Backend may not be sending data")
        return False
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

result = asyncio.run(test())
exit(0 if result else 1)
EOF

if python3 /tmp/test_ws_ares.py; then
    echo -e "${GREEN}✅ WebSocket is working correctly!${NC}"
else
    echo -e "${RED}❌ WebSocket connection test failed${NC}"
    echo -e "${YELLOW}   This indicates a backend WebSocket issue${NC}"
fi
echo ""

# 4. Check Frontend Server
echo -e "${BLUE}4. Checking Frontend Server...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend server is accessible${NC}"

    # Check if it's actually the Vite dev server
    RESPONSE=$(curl -s http://localhost:5173)
    if echo "$RESPONSE" | grep -q "ARES"; then
        echo -e "${GREEN}✅ ARES frontend is loaded${NC}"
    else
        echo -e "${YELLOW}⚠️  Response doesn't look like ARES frontend${NC}"
    fi
else
    echo -e "${RED}❌ Frontend server is NOT accessible${NC}"
    echo -e "${YELLOW}   Start it with: cd frontend && npm run dev${NC}"
fi
echo ""

# 5. Check for Browser Console Errors
echo -e "${BLUE}5. Common WebSocket Issues & Fixes...${NC}"
echo ""
echo -e "${YELLOW}If you're seeing WebSocket errors in the browser:${NC}"
echo ""
echo "   1. Check Browser Console (F12)"
echo "      - Look for specific error messages"
echo "      - Check Network tab for WebSocket connection"
echo ""
echo "   2. Verify Backend Logs"
echo "      - Should see 'Client connected' messages"
echo "      - No errors in the update loop"
echo ""
echo "   3. Common Fixes:"
echo "      a) Restart backend:"
echo "         pkill -f 'python.*main.py' && cd backend && ./venv/bin/python main.py"
echo ""
echo "      b) Clear browser cache and reload (Cmd+Shift+R)"
echo ""
echo "      c) Check firewall/proxy settings"
echo ""
echo "      d) Verify no other service on port 8000:"
echo "         lsof -i :8000"
echo ""

# 6. Live Monitoring
echo -e "${BLUE}6. Live Connection Monitor (5 seconds)...${NC}"
echo -e "${YELLOW}   Monitoring WebSocket traffic...${NC}"

cat << 'EOF' > /tmp/monitor_ws_ares.py
import asyncio
import websockets
import json

async def monitor():
    try:
        async with websockets.connect('ws://localhost:8000/ws') as ws:
            print("🎧 Listening for WebSocket messages...")

            for i in range(3):  # Listen for 3 messages
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                data = json.loads(msg)

                if data.get('type') == 'sector_update':
                    sector = data.get('data', {})
                    aircraft_count = sector.get('aircraft_count', 0)
                    alerts_count = len(sector.get('active_alerts', []))
                    print(f"   [{i+1}] Aircraft: {aircraft_count}, Alerts: {alerts_count}")

            print("\n✅ WebSocket is actively streaming data!")
            return True

    except Exception as e:
        print(f"\n❌ Monitoring failed: {e}")
        return False

asyncio.run(monitor())
EOF

python3 /tmp/monitor_ws_ares.py
echo ""

# 7. Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 DIAGNOSTIC SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Backend Health: http://localhost:8000/health"
echo "Frontend URL:   http://localhost:5173"
echo "WebSocket URL:  ws://localhost:8000/ws"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open http://localhost:5173 in your browser"
echo "2. Open Developer Console (F12)"
echo "3. Look for WebSocket connection logs"
echo "4. Check the Network tab > WS filter"
echo ""
echo "If issues persist, check:"
echo "  - Browser console for specific error messages"
echo "  - Backend terminal for connection attempts"
echo "  - Frontend terminal for build errors"
echo ""
echo -e "${GREEN}For more help, see: MAPBOX_INTEGRATION_STATUS.md${NC}"
echo ""

# Cleanup
rm -f /tmp/test_ws_ares.py /tmp/monitor_ws_ares.py
