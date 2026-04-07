import pandas as pd
import numpy as np

def read_csv_file(file_path):
    data = pd.read_csv(file_path)  # use the argument, not a hardcoded string
    data["timestamp"] = pd.to_datetime(data["timestamp"])

    time = data["timestamp"].tolist()
    imu_upper_roll_deg = data["imu_upper_roll_deg"].tolist()
    imu_upper_pitch_deg= data["imu_upper_pitch_deg"].tolist()
    imu_upper_yaw_deg  = data["imu_upper_yaw_deg"].tolist()
    imu_lower_roll_deg = data["imu_lower_roll_deg"].tolist()
    imu_lower_pitch_deg= data["imu_lower_pitch_deg"].tolist()
    imu_lower_yaw_deg  = data["imu_lower_yaw_deg"].tolist()

    return time, imu_upper_roll_deg, imu_upper_pitch_deg, imu_upper_yaw_deg, \
           imu_lower_roll_deg, imu_lower_pitch_deg, imu_lower_yaw_deg


# Helper functions now accept data as a parameter instead of using globals
def upper_roll(imu_data):  
    return imu_data[1]
def upper_pitch(imu_data): 
    return imu_data[2]
def upper_yaw(imu_data):   
    return imu_data[3]
def lower_roll(imu_data):  
    return imu_data[4]
def lower_pitch(imu_data): 
    return imu_data[5]
def lower_yaw(imu_data):   
    return imu_data[6]


if __name__ == "__main__":
    file_path = 'dummy_spine_imu_angles_day.csv'
    imu_data = read_csv_file(file_path)

    time, u_roll, u_pitch, u_yaw, l_roll, l_pitch, l_yaw = imu_data

    print("Upper roll:", upper_roll(imu_data))
    print("First timestamp:", time[0])
    print("done")
# import pandas as pd
# import numpy as np
# import time as t 

# # columns  list
# # timestamp,
# # imu_upper_roll_deg,
# # imu_upper_pitch_deg,
# # imu_upper_yaw_deg,
# # imu_lower_roll_deg,
# # imu_lower_pitch_deg,
# # imu_lower_yaw_deg


# def read_csv_file(file):

#     #data = pd.read_csv('dummy_spine_imu_angles_day.csv') 
#     #reads the data straight from csv
#     #print(data.to_string())
#     # #this prints out all the data in the csv files into numpy arrays - but this is not ideal when trying to work with real time daat - so this is only good for testing 
#     # data["timestamp"] = pd.to_datetime(data["timestamp"])
#     # time = data["timestamp"].to_numpy()
#     # upper_roll = data["imu_upper_roll_deg"].to_numpy()
#     # upper_pitch = data["imu_upper_pitch_deg"].to_numpy()
#     # upper_yaw = data["imu_upper_yaw_deg"].to_numpy()
#     # lower_roll = data["imu_lower_roll_deg"].to_numpy()
#     # lower_pitch = data["imu_lower_pitch_deg"].to_numpy()
#     # lower_yaw = data["imu_lower_yaw_deg"].to_numpy ()
#     # #DONT USE ABOVE CODE IN END RESULT - this is only for testing purposes - we will need to read the data in real time and not all at once like this 
#     imu_upper_roll_deg = []
#     imu_upper_pitch_deg = []
#     imu_upper_yaw_deg = []
#     imu_lower_roll_deg  = []
#     imu_lower_pitch_deg = []
#     imu_lower_yaw_deg = []
#     time = []
#     row = -1
#     while True:
#         # read the csv file and update the imu data lists with the latest values
#         row = row + 1
#         data = pd.read_csv('dummy_spine_imu_angles_day.csv')
#         data["timestamp"] = pd.to_datetime(data["timestamp"])
#         if row < len(data): 
#             time.append(data["timestamp"].iloc[row])
#             imu_upper_roll_deg.append(data["imu_upper_roll_deg"].iloc[row])
#             imu_upper_pitch_deg.append(data["imu_upper_pitch_deg"].iloc[row])
#             imu_upper_yaw_deg.append(data["imu_upper_yaw_deg"].iloc[row])
#             imu_lower_roll_deg.append(data["imu_lower_roll_deg"].iloc[row])
#             imu_lower_pitch_deg.append(data["imu_lower_pitch_deg"].iloc[row])
#             imu_lower_yaw_deg.append(data["imu_lower_yaw_deg"].iloc[row])
#             print(time[row])
#         else:
#             print("data collection complete")
#             break
#     #iloc [used for purely integer-location based indexing to select specific rows and columns from a DataFrame. I] 
#     # so now we have collected the data in real time and stored it in its own lists
#     # we can now start working with the data

#     return time, imu_upper_roll_deg, imu_upper_pitch_deg, imu_upper_yaw_deg, imu_lower_roll_deg, imu_lower_pitch_deg, imu_lower_yaw_deg
# def upper_roll():
#     return imu_upper_roll_deg
# def upper_pitch():
#     return imu_upper_pitch_deg
# def upper_yaw():
#     return imu_upper_yaw_deg
# def lower_roll():
#     return imu_lower_roll_deg   
# def lower_pitch():
#     return imu_lower_pitch_deg
# def lower_yaw():
#     return imu_lower_yaw_deg



# #main function:
# if __name__ == "__main__":
#     file_path = 'dummy_spine_imu_angles_day.csv'
#     data = read_csv_file(file_path)
#     print(data)

#     print ("done")


# #old code im keeping for reference:

#     # Read the CSV file into a DataFrame
#     # df = pd.read_csv(file)
#     # df["timestamp"] = pd.to_datetime(df["timestamp"])
#     # imu = df.drop(columns=["timestamp"])