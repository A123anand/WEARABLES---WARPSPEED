import numpy as np
import serial

ser = serial.Serial('COM3', 115200)

time_data = []
imu_1 = []
imu_2 = []

while True:

    line = ser.readline().decode().strip()
    values = [float(v) for v in line.split(',')]

    t = values[0]
    ax, ay, az = values[1:4]
    bx, by, bz = values[4:7]

    time_data.append(t)
    imu_1.append([ax, ay, az])
    imu_2.append([bx, by, bz])

    # convert to numpy when needed
    imu_1_np = np.array(imu_1)
    imu_2_np = np.array(imu_2)



def IMU(imu_1, imu_2):
    # number of comparable rows
    m = min(imu_1.shape[0], imu_2.shape[0])
    
    angle_deg = np.zeros(m)

    for i in range(m):
        a1 = imu_1[i, :] / np.linalg.norm(imu_1[i, :])
        a2 = imu_2[i, :] / np.linalg.norm(imu_2[i, :])

        dot_product = np.dot(a1, a2)

        # numerical safety
        dot_product = max(min(dot_product, 1), -1)

        angle_deg[i] = np.degrees(np.arccos(dot_product))

    return angle_deg
