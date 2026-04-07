// Outputs to terminal in CSV format, first 3 values = spine IMU vector, second 3 values = shoulder IMU vector.
// You can think of the output vector as the direction of gravity assuming the user isnt moving.

#include <Wire.h>  //included in arduino
#include "BluetoothSerial.h" //bluetooth serial library by Henry Abrahamsen
BluetoothSerial SerialBT;


// 1. DEFINE BOTH ADDRESSES 
//Spine IMU: SDA→21, SCL→22, AD0→GND → address 0x68 → “back”.
//Shoulder IMU: SDA→21, SCL→22, AD0→3.3 V → address 0x69 → “shoulder”.
const int MPU1_addr = 0x68; // Sensor 1 (AD0 disconnected) 
const int MPU2_addr = 0x69; // Sensor 2 (AD0 wired to 3.3V) 

int minVal = 265; 
int maxVal = 402; 

double offsetX1 = 0, offsetY1 = 0, offsetZ1 = 0; 
double offsetX2 = 0, offsetY2 = 0, offsetZ2 = 0; 

void setup() { 

    Wire.begin(); 

    Serial.begin(9600); 
    SerialBT.begin("ESP32_IMU");  // BT Device Name


    // WAKE UP SENSOR 1 
    Wire.beginTransmission(MPU1_addr); 
    Wire.write(0x6B);  
    Wire.write(0);  
    Wire.endTransmission(true); 

    // WAKE UP SENSOR 2 
    Wire.beginTransmission(MPU2_addr); 
    Wire.write(0x6B); 
    Wire.write(0); 
    Wire.endTransmission(true); 

    delay(3000); // Give the user 3 seconds to get ready 
} 

// 4. THE LIVE READING FUNCTION 
void readSensorAngles(
    int address,
    int16_t &outAcX,
    int16_t &outAcY,
    int16_t &outAcZ
) {
    int16_t AcX, AcY, AcZ;

    Wire.beginTransmission(address);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    Wire.requestFrom(address, 6, true);

    AcX = Wire.read() << 8 | Wire.read();
    AcY = Wire.read() << 8 | Wire.read();
    AcZ = Wire.read() << 8 | Wire.read();

    // Save raw values for caller
    outAcX = AcX;
    outAcY = AcY;
    outAcZ = AcZ;
} 

void loop() { 

    int16_t spineAcX, spineAcY, spineAcZ;
    int16_t shoulderAcX, shoulderAcY, shoulderAcZ;

    // Read Spine IMU (0x68)
    readSensorAngles(MPU1_addr, spineAcX, spineAcY, spineAcZ);

    // Read Shoulder IMU (0x69)
    readSensorAngles(MPU2_addr, shoulderAcX, shoulderAcY, shoulderAcZ);

    // Send raw accelerometer vectors for both IMUs in one CSV line:
    // To USB Serial (Can Remove once we confirm Bluetooth is working)
    Serial.print(esp_timer_get_time()); Serial.print(",");
    Serial.print(spineAcX);   Serial.print(",");
    Serial.print(spineAcY);   Serial.print(",");
    Serial.print(spineAcZ);   Serial.print(",");
    Serial.print(shoulderAcX); Serial.print(",");
    Serial.print(shoulderAcY); Serial.print(",");
    Serial.println(shoulderAcZ);

    // To Bluetooth Serial (for laptop logging)
    SerialBT.print(esp_timer_get_time()); SerialBT.print(",");
    SerialBT.print(spineAcX);    SerialBT.print(",");
    SerialBT.print(spineAcY);    SerialBT.print(",");
    SerialBT.print(spineAcZ);    SerialBT.print(",");
    SerialBT.print(shoulderAcX); SerialBT.print(",");
    SerialBT.print(shoulderAcY); SerialBT.print(",");
    SerialBT.println(shoulderAcZ);

    delay(400);
}