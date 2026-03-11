# b is the bottom and a is the top
# most current !!!!
import numpy as np
import serial
import time
import pandas as pd
import os

ser = serial.Serial('COM7', 9600, timeout=1)
time.sleep(2)

def IMU_single(a_vec, b_vec):
    """Compute angle between two 3D vectors in degrees"""
    a = np.array(a_vec)
    b = np.array(b_vec)
    a /= np.linalg.norm(a)
    b /= np.linalg.norm(b)
    dot = np.dot(a, b)
    dot = max(min(dot, 1), -1)
    return np.degrees(np.arccos(dot))

# --- Main loop ---
if __name__ == "__main__":
    raw_file = "imu_data.csv"
    conv_file = "imu_converted_data.csv"

    raw_headers = ["time","ax","ay","az","bx","by","bz"]
    conv_headers = raw_headers + ["angle_deg"]

    # create CSVs with headers if they don't exist
    if not os.path.exists(raw_file):
        pd.DataFrame(columns=raw_headers).to_csv(raw_file, index=False)
    if not os.path.exists(conv_file):
        pd.DataFrame(columns=conv_headers).to_csv(conv_file, index=False)

    try:
        while True:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue

            parts = line.split(',')
            try:
                values = [float(v) for v in parts if v]
            except ValueError:
                continue
            if len(values) < 7:
                continue

            t = values[0]
            ax, ay, az = values[1:4]
            bx, by, bz = values[4:7]

            # --- raw CSV ---
            df_raw = pd.DataFrame([[t, ax, ay, az, bx, by, bz]], columns=raw_headers)
            df_raw.to_csv(raw_file, mode='a', index=False, header=not os.path.exists(raw_file))

            # --- converted CSV ---
            angle = IMU_single([ax, ay, az], [bx, by, bz])
            df_conv = pd.DataFrame([[t, ax, ay, az, bx, by, bz, angle]], columns=conv_headers)
            df_conv.to_csv(conv_file, mode='a', index=False, header=not os.path.exists(conv_file))

            print(f"t={t}, angle={angle:.2f} deg")

    except KeyboardInterrupt:
        print("\nData collection stopped by user.")
        print(f"Final CSV files: {raw_file}, {conv_file}")