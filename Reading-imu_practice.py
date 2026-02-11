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

    data = pd.read_csv('dummy_spine_imu_angles_day.csv')
    #print(data.to_string())
    #this prints out all the data in the csv files into numpy arrays - but this is not ideal when trying to work with real time daat - so this is only good for testing 
    data["timestamp"] = pd.to_datetime(data["timestamp"])
    time = data["timestamp"].to_numpy()
    upper_roll = data["imu_upper_roll_deg"].to_numpy()
    upper_pitch = data["imu_upper_pitch_deg"].to_numpy()
    upper_yaw = data["imu_upper_yaw_deg"].to_numpy()
    lower_roll = data["imu_lower_roll_deg"].to_numpy()
    lower_pitch = data["imu_lower_pitch_deg"].to_numpy()
    lower_yaw = data["imu_lower_yaw_deg"].to_numpy ()
    #DONT USE ABOVE CODE IN END RESULT - this is only for testing purposes - we will need to read the data in real time and not all at once like this 
    # imu_upper_roll_deg,
    # imu_upper_pitch_deg,
    # imu_upper_yaw_deg,
    # imu_lower_roll_deg,
    # imu_lower_pitch_deg,
    # imu_lower_yaw_deg

    return time, upper_roll, upper_pitch, upper_yaw, lower_roll, lower_pitch, lower_yaw

    

#main function:
if __name__ == "__main__":
    file_path = 'dummy_spine_imu_angles_day.csv'
    data = read_csv_file(file_path)
    print(data)



#old code im keeping for reference:

    # Read the CSV file into a DataFrame
    # df = pd.read_csv(file)
    # df["timestamp"] = pd.to_datetime(df["timestamp"])
    # imu = df.drop(columns=["timestamp"])