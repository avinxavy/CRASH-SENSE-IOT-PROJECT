# Crash Sense: ESP32 Telemetry & Black Box
*Crash Sense* is a dual-core ESP32 system designed for real-time vehicle tracking and accident logging. It features a "Black Box" memory buffer that captures high-frequency telemetry data immediately before and after an impact.
### 🛠️ Features
 * *Dual-Core Processing*: High-speed sensor fusion on Core 1; Cloud/SD tasks on Core 0.
 * *Pre-Crash Buffer*: Stores 150 samples (~3s) of rolling telemetry (Speed, G-Force, Tilt).
 * *Auto-Logging: Triggers local SD (.csv) and Google Sheets uploads when G-Force exceeds **1.3g*.
 * *Dead Reckoning*: Estimates position using IMU data if GPS signal is lost (tunnels/parking).
 * *Remote Dashboard: Real-time monitoring via **Blynk IoT*.
 * *Web Retrieval*: On-board web server allows wireless log downloads via browser.
### 🔌 Hardware
 * *MCU*: ESP32 (Dual Core)
 * *IMU*: MPU9250 (Accel/Gyro/Mag)
 * *GPS*: Neo-6M
 * *Storage*: MicroSD Module
### 🚀 Setup
 1. *WiFi/Blynk*: Update ssid, pass, and auth token.
 2. *Google Sheets*: Insert your Apps Script URL in GOOGLE_SCRIPT_URL.
 3. *Wiring*:
   * I2C (MPU): GPIO 21/22
   * SPI (SD): GPIO 5/18/19/23
   * GPS: GPIO 16/17 (Serial2)
### 📊 System Status
The system monitors itself in real-time. Check the *Blynk Terminal* for:
 * ✅ GPS Lock/Dead Reckoning status
 * ✅ SD Card mounting
 * ✅ MPU9250 hardware health
 * ✅ WiFi connection logs
