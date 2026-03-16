#this connects our code to a server so that we can recive the values from any laptop as long as we have a bluetooth connection to the esp 32
 
import asyncio
import json
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

csv_path = Path("imu_data.csv")
intervals = 0.5 ## how often the csv is checked

connected_clients: list[WebSocket] = []
last_row = 0

async def broadcast(message: str):
    dead = []
    for client in connected_clients:
        try:
            await client.send_text(message)
        except Exception:
            dead.append(client)
    for c in dead:
        connected_clients.remove(c)
 
 
async def watch_csv():
    global last_row_count
    print(f"Watching {CSV_PATH.resolve()} ...")
 
    while True:
        await asyncio.sleep(POLL_INTERVAL)
 
        if not CSV_PATH.exists():
            continue
 
        try:
            df = pd.read_csv(CSV_PATH)
        except Exception:
            continue  # file mid-write, retry next tick
 
        if len(df) <= last_row_count:
            continue  # no new rows yet
 
        new_rows = df.iloc[last_row_count:]
        last_row_count = len(df)
 
        for _, row in new_rows.iterrows():
            payload = {
                "type": "data",
                "data": {
                    "time":      float(row["time"]),
                    "ax": float(row["ax"]),
                    "ay": float(row["ay"]),
                    "az": float(row["az"]),
                    "bx": float(row["bx"]),
                    "by": float(row["by"]),
                    "bz": float(row["bz"]),
                    "angle_deg": float(row["angle_deg"])
                }
            }
            await broadcast(json.dumps(payload))
            print(f"Sent row {last_row_count}  —  angle: {row['angle_deg']:.2f}°")
@app.on_event("startup")
async def startup():
    asyncio.create_task(watch_csv())
 
 
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"Browser connected. Clients: {len(connected_clients)}")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"Browser disconnected. Clients: {len(connected_clients)}")
 
 
@app.get("/")
def root():
    return {"status": "Warpspeed server running", "clients": len(connected_clients)}