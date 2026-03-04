#include <Wire.h> 
 
// 1. DEFINE BOTH ADDRESSES 
const int MPU1_addr = 0x68; // Sensor 1 (AD0 disconnected) 
const int MPU2_addr = 0x69; // Sensor 2 (AD0 wired to 3.3V) 

int minVal = 265; 
int maxVal = 402; 

double offsetX1 = 0, offsetY1 = 0, offsetZ1 = 0; 
double offsetX2 = 0, offsetY2 = 0, offsetZ2 = 0; 

void setup() { 

Wire.begin(); 

Serial.begin(9600); 

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

// Serial.println("Both sensors awake."); 
// Serial.println("Keep the sensors perfectly still in your 'perfect posture' position!"); 

delay(3000); // Give the user 3 seconds to get ready 

// --- NEW: Call the calibration function for both sensors --- 
calibrateSensorAngles(MPU1_addr, "Spine (0x68)"); 
calibrateSensorAngles(MPU2_addr, "Shoulder(0x69)"); 

//Serial.println("Calibration complete! Starting live tracking..."); 
delay(1000); 
} 

 

// --- NEW: THE CALIBRATION FUNCTION --- 
void calibrateSensorAngles(int address, String sensorName) { 

// Serial.print("Calibrating ");  
Serial.print(sensorName);  
//Serial.println(" for 5 seconds..."); 

long readingCount = 0; 
double sumX = 0, sumY = 0, sumZ = 0; 

// Note the time the calibration started 
unsigned long startTime = millis(); 

 

// Run this loop until 5 seconds have passed 
while (millis() - startTime < 5000) { 

int16_t AcX, AcY, AcZ;  

Wire.beginTransmission(address); 
Wire.write(0x3B);  

Wire.endTransmission(false); 
Wire.requestFrom(address, 6, true);  

 

AcX = Wire.read() << 8 | Wire.read(); 
AcY = Wire.read() << 8 | Wire.read(); 
AcZ = Wire.read() << 8 | Wire.read(); 

 

int xAng = map(AcX, minVal, maxVal, -90, 90); 
int yAng = map(AcY, minVal, maxVal, -90, 90); 
int zAng = map(AcZ, minVal, maxVal, -90, 90); 

 

double tempX = RAD_TO_DEG * (atan2(-yAng, -zAng) - PI/2); 
double tempY = RAD_TO_DEG * (atan2(-xAng, -zAng) - PI/2); 
double tempZ = RAD_TO_DEG * (atan2(-yAng, -xAng) - PI/2); 

 

// Add the readings to our running totals 

sumX += tempX; 
sumY += tempY; 
sumZ += tempZ; 

readingCount++; 

 

delay(10); // Small delay so we don't overwhelm the I2C bus 

} 

 

// Calculate the average by dividing the sum by the number of readings 

if (address == MPU1_addr) { 

offsetX1 = sumX / readingCount; 
offsetY1 = sumY / readingCount; 
offsetZ1 = sumZ / readingCount; 

} else if (address == MPU2_addr) { 

offsetX2 = sumX / readingCount; 
offsetY2 = sumY / readingCount; 
offsetZ2 = sumZ / readingCount; 

} 

} 

 

// 4. THE LIVE READING FUNCTION 

void readSensorAngles(int address, String sensorName) { 

int16_t AcX, AcY, AcZ;  

double x, y, z; 

Wire.beginTransmission(address); 
Wire.write(0x3B);  
Wire.endTransmission(false); 
Wire.requestFrom(address, 6, true);  

AcX = Wire.read() << 8 | Wire.read(); 
AcY = Wire.read() << 8 | Wire.read(); 
AcZ = Wire.read() << 8 | Wire.read(); 

int xAng = map(AcX, minVal, maxVal, -90, 90); 
int yAng = map(AcY, minVal, maxVal, -90, 90); 
int zAng = map(AcZ, minVal, maxVal, -90, 90); 

// Calculate raw angles 
x = RAD_TO_DEG * (atan2(-yAng, -zAng) - PI/2); 
y = RAD_TO_DEG * (atan2(-xAng, -zAng) - PI/2); 
z = RAD_TO_DEG * (atan2(-yAng, -xAng) - PI/2); 

// --- NEW: Subtract the calibration offsets to get our "Zero" --- 
if (address == MPU1_addr) { 
x -= offsetX1; 
y -= offsetY1; 
z -= offsetZ1; 

} 
else if (address == MPU2_addr) { 
x -= offsetX2; 
y -= offsetY2; 
z -= offsetZ2; 

} 

Serial.print(x); Serial.print(","); 
Serial.print(y); Serial.print(","); 
Serial.println(z);  

} 

 

void loop() { 

readSensorAngles(MPU1_addr, "Spine (0x68)"); 
readSensorAngles(MPU2_addr, "Shoulder(0x69)"); 

//Serial.println("-----------------------------------------"); 

delay(400);  

} 

