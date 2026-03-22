# b is the bottom and a is the top

import numpy as np
import serial
import time
import csv
import pandas as pd

ser = serial.Serial('COM7', 9600, timeout=1)

time.sleep(2)
def IMU(imu_1, imu_2):
    # number of comparable rows
    imu_1_np = np.array(imu_1)
    imu_2_np = np.array(imu_2)
    m = min(imu_1.shape[0], imu_2.shape[0])

    angle_deg = np.zeros(m)

    for i in range(m):
        a1 = imu_1[i, :] / np.linalg.norm(imu_1[i, :])
        a2 = imu_2[i, :] / np.linalg.norm(imu_2[i, :])

        dot_product = np.dot(a1, a2)

        # numerical safety
        dot_product = max(min(dot_product, 1), -1)

        angle_deg[i] = np.degrees(np.arccos(dot_product))
   #print(IMU(imu_1, imu_2))
    # convert to numpy when needed
    
    return angle_deg


def conversion(time_data, imu_1, imu_2):
    headers = ["time", "ax", "ay", "az", "bx", "by", "bz", "angle_deg"]
    df = pd.DataFrame(columns=headers)

    angles = IMU(imu_1, imu_2)  # returns array same length as imu lists

    for i in range(len(time_data)):
        t = time_data[i]
        ax, ay, az = imu_1[i]
        bx, by, bz = imu_2[i]
        angle = angles[i]

        # make sure row matches 8 columns
        df.loc[len(df)] = [t, ax, ay, az, bx, by, bz, angle]

    df.to_csv("imu_converted_data.csv", index=False)
    print("Converted CSV saved: imu_converted_data.csv")
        





if __name__ == "__main__":
    
    time_data = []
    imu_1 = []
    imu_2 = []

    filename = "imu_data.csv"
    headers = ["time", "ax", "ay", "az", "bx", "by", "bz"]
    df = pd.DataFrame(columns=headers)

# Write headers if file doesn't exist yet
    
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

        # ensure we received the expected data
        if len(values) < 7:
            continue

        t = values[0]
        ax, ay, az = values[1:4]
        bx, by, bz = values[4:7]

        time_data.append(t)
        imu_1.append([ax, ay, az])
        imu_2.append([bx, by, bz])
        
        # inside loop:
        df.loc[len(df)] = [t, ax, ay, az, bx, by, bz]

        # save to CSV with headers
        df.to_csv("imu_data.csv", index=False)
        conversion(time_data, imu_1, imu_2)

        
        # with open("imu_data.csv", "a", newline="") as f:
        #     writer = csv.writer(f)
        #     # write row: t, ax, ay, az, bx, by, bz
        #     writer.writerow([t, ax, ay, az, bx, by, bz])
   #conversion(imu_1, imu_2)

