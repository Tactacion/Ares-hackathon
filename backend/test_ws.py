import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8000/ws') as ws:
            print("✅ WebSocket connected!")
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            print(f"📨 Received: {msg[:100]}...")
    except Exception as e:
        print(f"❌ Error: {e}")

asyncio.run(test())
