#pragma once

#include <Arduino.h>
#include <math.h>

struct MadgwickFilter {
    float q0, q1, q2, q3;
    float beta;
    float sampleFreq;

    void begin(float freq, float b = 0.033f);

    void updateIMU(float gx, float gy, float gz,
                   float ax, float ay, float az);

    float getPitch() const;
    float getRoll() const;
};

extern MadgwickFilter filter1;
extern MadgwickFilter filter2;

float angleBetweenOrientations(MadgwickFilter &f1, MadgwickFilter &f2);