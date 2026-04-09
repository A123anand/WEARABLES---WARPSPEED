// ================================================================
// COSGC Posture Tracking Shirt
// 2x MPU6050 + ESP32 + Quaternion Filter + BLE
//
// Wiring:
// Both IMUs share SDA, SCL, VCC, GND
// IMU 1 (upper back): AD0 → GND  → I2C address 0x68
// IMU 2 (lower back): AD0 → 3.3V → I2C address 0x69
// Baud Rate = 115200 for real-time monitoring
// ================================================================

#include <Wire.h>
#include <math.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── I2C Addresses ───────────────────────────────────────────────
#define IMU1_ADDR 0x68
#define IMU2_ADDR 0x69

// ── MPU6050 Registers ───────────────────────────────────────────
#define PWR_MGMT_1   0x6B
#define ACCEL_CONFIG 0x1C
#define GYRO_CONFIG  0x1B
#define ACCEL_XOUT_H 0x3B
#define GYRO_XOUT_H  0x43
#define DLPF_CONFIG  0x1A

// ── Scaling ─────────────────────────────────────────────────────
#define ACCEL_SCALE 16384.0f    // ±2g → 16384 LSB/g
#define GYRO_SCALE  131.0f      // ±250 deg/s → 131 LSB/deg/s

// ── Sample Rate ─────────────────────────────────────────────────
#define SAMPLE_RATE_HZ    100
#define SAMPLE_INTERVAL_US 10000

// ── Warmup ──────────────────────────────────────────────────────
#define WARMUP_SAMPLES 300      // ~3 seconds at 100Hz

// ── BLE UUIDs (Nordic UART style) ───────────────────────────────
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// ── BLE Globals ─────────────────────────────────────────────────
BLEServer*        pServer          = nullptr;
BLECharacteristic* pTxCharacteristic = nullptr;
bool deviceConnected   = false;
bool oldDeviceConnected = false;

// ================================================================
// Madgwick Filter (fixed dt = 1/sampleFreq)
// ================================================================

struct MadgwickFilter {
  float q0, q1, q2, q3;   // quaternion
  float beta;             // filter gain
  float sampleFreq;

  void begin(float freq, float b = 0.033f) {
    sampleFreq = freq;
    beta       = b;
    q0 = 1.0f; q1 = 0.0f; q2 = 0.0f; q3 = 0.0f;
  }

  // gx/gy/gz in deg/s, ax/ay/az in g
  void updateIMU(float gx, float gy, float gz,
                 float ax, float ay, float az) {

    // Convert gyro to rad/s
    gx *= (PI / 180.0f);
    gy *= (PI / 180.0f);
    gz *= (PI / 180.0f);

    float recipNorm;
    float s0, s1, s2, s3;
    float qDot1, qDot2, qDot3, qDot4;
    float _2q0, _2q1, _2q2, _2q3;
    float _4q0, _4q1, _4q2;
    float _8q1, _8q2;
    float q0q0, q1q1, q2q2, q3q3;

    // Rate of change from gyroscope
    qDot1 = 0.5f * (-q1 * gx - q2 * gy - q3 * gz);
    qDot2 = 0.5f * ( q0 * gx + q2 * gz - q3 * gy);
    qDot3 = 0.5f * ( q0 * gy - q1 * gz + q3 * gx);
    qDot4 = 0.5f * ( q0 * gz + q1 * gy - q2 * gx);

    // Apply accelerometer correction only if reading is valid
    if (!((ax == 0.0f) && (ay == 0.0f) && (az == 0.0f))) {

      // Normalise accelerometer
      recipNorm = 1.0f / sqrtf(ax * ax + ay * ay + az * az);
      ax *= recipNorm;
      ay *= recipNorm;
      az *= recipNorm;

      _2q0 = 2.0f * q0; _2q1 = 2.0f * q1;
      _2q2 = 2.0f * q2; _2q3 = 2.0f * q3;
      _4q0 = 4.0f * q0; _4q1 = 4.0f * q1; _4q2 = 4.0f * q2;
      _8q1 = 8.0f * q1; _8q2 = 8.0f * q2;
      q0q0 = q0 * q0; q1q1 = q1 * q1; q2q2 = q2 * q2; q3q3 = q3 * q3;

      // Gradient descent corrective step
      s0 = _4q0 * q2q2 + _2q2 * ax + _4q0 * q1q1 - _2q1 * ay;
      s1 = _4q1 * q3q3 - _2q3 * ax + 4.0f * q0q0 * q1 - _2q0 * ay
         - _4q1 + _8q1 * q1q1 + _8q1 * q2q2 + _4q1 * az;
      s2 = 4.0f * q0q0 * q2 + _2q0 * ax + _4q2 * q3q3 - _2q3 * ay
         - _4q2 + _8q2 * q1q1 + _8q2 * q2q2 + _4q2 * az;
      s3 = 4.0f * q1q1 * q3 - _2q1 * ax + 4.0f * q2q2 * q3 - _2q2 * ay;

      // Normalise step
      recipNorm = 1.0f / sqrtf(s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3);
      s0 *= recipNorm; s1 *= recipNorm;
      s2 *= recipNorm; s3 *= recipNorm;

      // Apply feedback to rate of change
      qDot1 -= beta * s0;
      qDot2 -= beta * s1;
      qDot3 -= beta * s2;
      qDot4 -= beta * s3;
    }

    // Integrate with fixed dt
    float dt = 1.0f / sampleFreq;
    q0 += qDot1 * dt;
    q1 += qDot2 * dt;
    q2 += qDot3 * dt;
    q3 += qDot4 * dt;

    // Normalise quaternion
    recipNorm = 1.0f / sqrtf(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
    q0 *= recipNorm; q1 *= recipNorm; q2 *= recipNorm; q3 *= recipNorm;
  }

  float getPitch() const {
    return asinf(2.0f * (q0 * q2 - q3 * q1)) * (180.0f / PI);
  }

  float getRoll() const {
    return atan2f(q0 * q1 + q2 * q3,
                  0.5f - q1 * q1 - q2 * q2) * (180.0f / PI);
  }
};

// ── Two filter instances, one per IMU ───────────────────────────
MadgwickFilter filter1, filter2;

// ================================================================
// Calibration
// ================================================================

struct CalibData {
  float ax, ay, az;
  float gx, gy, gz;
};

CalibData cal1, cal2;

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
  // Read accelerometer
  Wire.beginTransmission(addr);
  Wire.write(ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom(addr, (uint8_t)6);
  int16_t rawAx = (Wire.read() << 8) | Wire.read();
  int16_t rawAy = (Wire.read() << 8) | Wire.read();
  int16_t rawAz = (Wire.read() << 8) | Wire.read();

  // Read gyro
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
  cal.az = (az / N) - 1.0f;  // Keep same behavior as your working code
  cal.gx = gx / N;
  cal.gy = gy / N;
  cal.gz = gz / N;
}

// ================================================================
// Angle Between Two Quaternion Orientations
// ================================================================

float angleBetweenOrientations(MadgwickFilter &f1, MadgwickFilter &f2) {
  float dot = f1.q0 * f2.q0 + f1.q1 * f2.q1 +
              f1.q2 * f2.q2 + f1.q3 * f2.q3;
  dot = constrain(dot, -1.0f, 1.0f);
  return 2.0f * acosf(fabsf(dot)) * (180.0f / PI);
}

// ================================================================
// BLE Callbacks
// ================================================================

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("BLE client disconnected");
  }
};

class MyRXCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String rxValue = pCharacteristic->getValue();
    if (rxValue.length() > 0) {
      Serial.print("BLE RX: ");
      Serial.println(rxValue);
    }
  }
};

// ================================================================
// Setup / Loop State
// ================================================================

unsigned long lastSampleTime = 0;
unsigned long lastBLETime    = 0;
int           sampleCount    = 0;
bool          isWarmedUp     = false;

// ================================================================
// Setup
// ================================================================

void setup() {
  Serial.begin(115200);
  Wire.begin();
  Wire.setClock(400000);

  // BLE init
  BLEDevice::init("PostureShirt");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic* pRxCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new MyRXCallbacks());

  pService->start();
  pServer->getAdvertising()->start();

  Serial.println("BLE advertising started: PostureShirt");
  Serial.println("Initializing IMUs...");
  initMPU(IMU1_ADDR);
  initMPU(IMU2_ADDR);

  filter1.begin(SAMPLE_RATE_HZ, 0.033f);
  filter2.begin(SAMPLE_RATE_HZ, 0.033f);

  Serial.println("Stand still and straight for 2 seconds...");
  delay(2000);
  calibrateIMU(IMU1_ADDR, cal1);
  calibrateIMU(IMU2_ADDR, cal2);
  Serial.println("Calibration done. Warming up...");
}

// ================================================================
// Main Loop
// ================================================================

void loop() {
  unsigned long now = micros();
  if ((now - lastSampleTime) < SAMPLE_INTERVAL_US) return;
  lastSampleTime = now;

  float ax1, ay1, az1, gx1, gy1, gz1;
  float ax2, ay2, az2, gx2, gy2, gz2;

  readRawIMU(IMU1_ADDR, ax1, ay1, az1, gx1, gy1, gz1);
  readRawIMU(IMU2_ADDR, ax2, ay2, az2, gx2, gy2, gz2);

  // Apply calibration offsets
  ax1 -= cal1.ax; ay1 -= cal1.ay; az1 -= cal1.az;
  gx1 -= cal1.gx; gy1 -= cal1.gy; gz1 -= cal1.gz;
  ax2 -= cal2.ax; ay2 -= cal2.ay; az2 -= cal2.az;
  gx2 -= cal2.gx; gy2 -= cal2.gy; gz2 -= cal2.gz;

  // Madgwick updates with fixed dt = 1 / SAMPLE_RATE_HZ
  filter1.updateIMU(gx1, gy1, gz1, ax1, ay1, az1);
  filter2.updateIMU(gx2, gy2, gz2, ax2, ay2, az2);

  sampleCount++;

  if (!isWarmedUp) {
    if (sampleCount >= WARMUP_SAMPLES) {
      isWarmedUp = true;
      Serial.println("Ready — tracking posture.");
    }
    return;
  }

  float backAngle = angleBetweenOrientations(filter1, filter2);

  const char* posture;
  if (backAngle < 10)      posture = "GOOD - Straight";
  else if (backAngle < 20) posture = "MILD - Slight bend";
  else if (backAngle < 35) posture = "POOR - Slouching";
  else                     posture = "BAD - Severe bend";

  // Serial debug (every loop or throttle if you want)
  Serial.print("Angle:");
  Serial.print(backAngle, 2);
  Serial.print(" Status:");
  Serial.println(posture);

  // BLE JSON output once per second
  if (millis() - lastBLETime >= 1000) {
    lastBLETime = millis();
    unsigned long t_ms = millis();

    String payload = String("{\"t_ms\":") + String(t_ms) +
                     ",\"angle\":" + String(backAngle, 2) +
                     ",\"status\":\"" + posture + "\"}";

    Serial.println(payload);

    if (deviceConnected) {
      pTxCharacteristic->setValue(payload.c_str());
      pTxCharacteristic->notify();
    }
  }

  // Handle reconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(200);
    pServer->startAdvertising();
    Serial.println("BLE advertising restarted");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}