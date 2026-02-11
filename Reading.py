import pandas as pd
import numpy as np

# coloumns list
# timestamp,
# imu_upper_roll_deg,
# imu_upper_pitch_deg,
# imu_upper_yaw_deg,
# imu_lower_roll_deg,
# imu_lower_pitch_deg,
# imu_lower_yaw_deg


def read_csv_file(file):

    # Read the CSV file into a DataFrame
    # df = pd.read_csv(file)
    # df["timestamp"] = pd.to_datetime(df["timestamp"])
    # imu = df.drop(columns=["timestamp"])
    data = pd.read_csv('dummy_spine_imu_angles_day.csv')
    #print(data.to_string())
    data["timestamp"] = pd.to_datetime(data["timestamp"])
    time = data["timestamp"].to_numpy()
    upper_roll = data["imu_upper_roll_deg"].to_numpy
    upper_pitch = data["imu_upper_pitch_deg"].to_numpy
    upper_yaw = data["imu_upper_yaw_deg"].to_numpy
    lower_roll = data["imu_lower_roll_deg"].to_numpy
    lower_pitch = data["imu_lower_pitch_deg"].to_numpy
    lower_yaw = data["imu_lower_yaw_deg"].to_numpy 
    #.to_numpy makes them into numpy arrays which is easier to work with

    return time, upper_roll, upper_pitch, upper_yaw, lower_roll, lower_pitch, lower_yaw

    

#main function:
if __name__ == "__main__":
    file_path = 'dummy_spine_imu_angles_day.csv'
    data = read_csv_file(file_path)
    print(data)