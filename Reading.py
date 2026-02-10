import pandas as pd
import numpy as np
import dummy_spine_imu_angles_day.csv as dummy_data

def read_csv_file(file):

    # Read the CSV file into a DataFrame
    df = pd.read_csv(file)
    
    # Convert the DataFrame to a NumPy array
    data_array = df.to_numpy()
    
    return data_array

#main function:
if __name__ == "__main__":
    # Example usage
    file_path = 'dummy_spine_imu_angles_day.csv'
    data = read_csv_file(file_path)
