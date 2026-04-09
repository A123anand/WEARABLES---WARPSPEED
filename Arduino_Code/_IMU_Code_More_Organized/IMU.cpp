#include "imu.h"

CalibData cal1;
CalibData cal2;

void writeMPU(uint8_t addr, uint8_t reg, uint8_t value) {
    Wire.beginTransmission(addr);
    Wire.write(reg);
    Wire.write(value);
    Wire.endTransmission();
}

void initMPU(uint8_t addr) {
    writeMPU(addr, PWR_MGMT_1, 0x01);   // Wake up, stable clock
    writeMPU(addr, ACCEL_CONFIG, 0x00); // ±2g
    writeMPU(addr, GYRO_CONFIG, 0x00);  // ±250 deg/s
    writeMPU(addr, DLPF_CONFIG, 0x03);  // 44Hz low-pass filter
    delay(100);
}

void readRawIMU(uint8_t addr,
                float &ax, float &ay, float &az,
                float &gx, float &gy, float &gz) {
    Wire.beginTransmission(addr);
    Wire.write(ACCEL_XOUT_H);
    Wire.endTransmission(false);
    Wire.requestFrom(addr, (uint8_t)6);
    int16_t rawAx = (Wire.read() << 8) | Wire.read();
    int16_t rawAy = (Wire.read() << 8) | Wire.read();
    int16_t rawAz = (Wire.read() << 8) | Wire.read();

    Wire.beginTransmission(addr);
    Wire.write(GYRO_XOUT_H);
    Wire.endTransmission(false);
    Wire.requestFrom(addr, (uint8_t)6);
    int16_t rawGx = (Wire.read() << 8) | Wire.read();
    int16_t rawGy = (Wire.read() << 8) | Wire.read();
    int16_t rawGz = (Wire.read() << 8) | Wire.read();

    ax = rawAx / ACCEL_SCALE;
    ay = rawAy / ACCEL_SCALE;
    az = rawAz / ACCEL_SCALE;
    gx = rawGx / GYRO_SCALE;
    gy = rawGy / GYRO_SCALE;
    gz = rawGz / GYRO_SCALE;
}

void calibrateIMU(uint8_t addr, CalibData &cal) {
    const int N = 500;
    double ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
    float tax, tay, taz, tgx, tgy, tgz;

    for (int i = 0; i < N; i++) {
        readRawIMU(addr, tax, tay, taz, tgx, tgy, tgz);
        ax += tax; ay += tay; az += taz;
        gx += tgx; gy += tgy; gz += tgz;
        delay(2);
    }

    cal.ax = ax / N;
    cal.ay = ay / N;
    cal.az = (az / N) - 1.0f;
    cal.gx = gx / N;
    cal.gy = gy / N;
    cal.gz = gz / N;
}