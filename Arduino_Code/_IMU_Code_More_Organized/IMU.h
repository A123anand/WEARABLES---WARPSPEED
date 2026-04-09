#pragma once
#include <Arduino.h>

extern const uint8_t IMU1_ADDR;
extern const uint8_t IMU2_ADDR;

struct CalibData {
  float ax, ay, az;
  float gx, gy, gz;
};

extern CalibData cal1, cal2;

void initMPU(uint8_t addr);
void readRawIMU(uint8_t addr,
                float &ax, float &ay, float &az,
                float &gx, float &gy, float &gz);
void calibrateIMU(uint8_t addr, CalibData &cal);