# b is the bottom and a is the top
# best one - use this script!!!
import numpy as np
import serial
import time
import pandas as pd

ser = serial.Serial('COM4', 9600, timeout=1)
time.sleep(2)

def IMU(imu_1, imu_2):
    # convert to NumPy arrays
    imu_1_np = np.array(imu_1)
    imu_2_np = np.array(imu_2)
    m = min(imu_1_np.shape[0], imu_2_np.shape[0])

    angle_deg = np.zeros(m)

    for i in range(m):
        a1 = imu_1_np[i, :] / np.linalg.norm(imu_1_np[i, :])
        a2 = imu_2_np[i, :] / np.linalg.norm(imu_2_np[i, :])

        dot_product = np.dot(a1, a2)
        dot_product = max(min(dot_product, 1), -1)

        angle_deg[i] = np.degrees(np.arccos(dot_product))
    
    return angle_deg

def conversion(time_data, imu_1, imu_2):
    headers = ["time", "ax", "ay", "az", "bx", "by", "bz", "angle_deg"]
    df = pd.DataFrame(columns=headers)

    if len(time_data) == 0:
        return  # nothing to convert yet

    angles = IMU(imu_1, imu_2)

    for i in range(len(time_data)):
        t = time_data[i]
        ax, ay, az = imu_1[i]
        bx, by, bz = imu_2[i]
        angle = angles[i]
        df.loc[len(df)] = [t, ax, ay, az, bx, by, bz, angle]

    df.to_csv("imu_converted_data.csv", index=False)

# --- Main loop ---
if __name__ == "__main__":
    time_data = []
    imu_1 = []
    imu_2 = []

    headers = ["time", "ax", "ay", "az", "bx", "by", "bz"]
    df = pd.DataFrame(columns=headers)

    try:
        while True:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue
            print(f"Received: {line}")

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

            time_data.append(t)
            imu_1.append([ax, ay, az])
            imu_2.append([bx, by, bz])

            # Save raw CSV in real-time
            df.loc[len(df)] = [t, ax, ay, az, bx, by, bz]
            df.to_csv("imu_data.csv", index=False)
            

    except KeyboardInterrupt:
        print("Data collection stopped by user.")

    # After loop ends, save converted CSV
    conversion(time_data, imu_1, imu_2)
    print("Converted CSV saved: imu_converted_data.csv")