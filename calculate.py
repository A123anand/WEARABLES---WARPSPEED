import Reading_imu_practice as imu_reader
import numpy as np
import time as t
import pandas as pd

def calculate_velocity(imu_data):
    # Extracting the relevant data from the imu_data
    #the data from the csv file is stored in a tuple, so we need to access each element of the tuple to get the data we need
    # a tuple is values stored in a variable as an ordered list with commas
    time, upper_roll, upper_pitch, upper_yaw, lower_roll, lower_pitch, lower_yaw = imu_data
    time        = imu_data[0]
    upper_roll  = imu_data[1]
    upper_pitch = imu_data[2]
    upper_yaw   = imu_data[3]
    lower_roll  = imu_data[4]
    lower_pitch = imu_data[5]
    lower_yaw   = imu_data[6]
    x = 0
    while x < len(time):
        # time difference in seconds between this row and the previous
        x=+1
        dt = (time[x] - time[x - 1]).total_seconds()
        if dt != 0:  # avoid division by zero
            upper_roll.append((upper_roll[x]   - upper_roll[x-1])  / dt)
            upper_pitch.append((upper_pitch[x] - upper_pitch[x-1]) / dt)
            upper_yaw.append((upper_yaw[x]     - upper_yaw[x-1])   / dt)
            lower_roll.append((lower_roll[x]   - lower_roll[x-1])  / dt)
            lower_pitch.append((lower_pitch[x] - lower_pitch[x-1]) / dt)
            lower_yaw.append((lower_yaw[x]     - lower_yaw[x-1])   / dt)

    # Calculate the time differences between consecutive timestamps
    #time_diffs


    # Calculate the angular velocity for each IMU reading
   
    return upper_roll, upper_pitch, upper_yaw, lower_roll, lower_pitch, lower_yaw

