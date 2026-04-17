// --- 1. BLYNK & NETWORK CREDENTIALS ---
#define BLYNK_TEMPLATE_ID "XXXXXX"
#define BLYNK_TEMPLATE_NAME "XXXX"
#define BLYNK_AUTH_TOKEN "XXXXX"
String GOOGLE_SCRIPT_URL ="https:URL";
//wify credentials
char ssid[] ="XXXXX";
char pass[] ="XXXXXX";
char auth[] = "XXXXXXXXX";
//double core declaration
TaskHandle_t SensorTask_Handle = NULL;
TaskHandle_t LoggingTask_Handle = NULL;
// --- 2. SYSTEM semaphore declaration  
SemaphoreHandle_t i2cMutex;
SemaphoreHandle_t spiMutex;
SemaphoreHandle_t dataMutex;
//other system constants
float speedBuffer[5] = { 0, 0, 0, 0, 0 };
int speedBufIdx = 0;
bool isWebActive = false; // Flag to pause sensors during IP access
const float ACCIDENT_THRESHOLD = 1.3;
const int BUFFER_SIZE = 150; // Increased to 150 (approx 3 seconds of pre-crash data)
const long BLYNK_SEND_INTERVAL = 1000L;
const long SYNC_INTERVAL = 30000L; 
const int BLYNK_TASK_TICK = 100;    
const char* PENDING_FILE = "/pending.txt";
// --- 3. HARDWARE CONFIGURATION ---
#define SD_CS 5
#define GPS_RX 16  
#define GPS_TX 17  
// --- 4. LIBRARY INITIALIZATION ---
#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <TinyGPS++.h>
#include <MPU9250_WE.h>
#include <SD.h>
#include <Wire.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

HardwareSerial neogps(2);
MPU9250_WE myMPU9250 = MPU9250_WE(0x68);
TinyGPSPlus gps;
WidgetTerminal EVENTSLOG(V11);
WebServer server(80);

// data structure which store sensor data
struct SensorData 
{
  double lat, lng;
  float speedKmph;
  float totalG, pitch, roll, fusedYaw;
  float forwardAcc;
  String timestamp;
} currentData;
// data structure which store latest data for pushing to sd when incident
struct BufferEntry
 {
  uint32_t logTime;
  float speed;
  float gForce;
  double lat;
  double lng;
  float pitch;    
  float roll;     
  float fusedYaw; 
 };
//Buffer and crash related variables
BufferEntry preCrashBuffer[BUFFER_SIZE]; 
int bufferIndex = 0; 
bool bufferFull = false;
bool crashPending = false;
bool crashActive = false;
// --- HARDWARE HEALTH TRACKERS ---
bool lastWifiState = false;
bool lastGpsState = false;
bool lastSdState = false;
bool lastMpuState = false;
// Dead Reckoning Variables
double drLat, drLng;
float drVelocityMS = 0;
float pMin = 90.0, pMax = -90.0;
float rMin = 180.0, rMax = -180.0;
bool isGPSValid = false;
// Prototypes
void readGPS();
void readIMU(float dt);
void performDeadReckoning(float dt);
void saveIncidentToSD();
void sendToBlynk();
void handleRoot();       
void handleDownload(); 
void uploadToGoogleSheets(); 
void checkSystemStatus();   

// --- CORE 1: HIGH SPEED SENSORS ---
void SensorTaskCode(void * pvParameters) 
{
  unsigned long lastLoopTime = millis();
  for (;;) 
  {
    if (isWebActive) {
      delay(500); // Give Core 0 total control of the hardware
      continue;   // Skip this loop iteration
    }
    unsigned long currentTime = millis();
    float dt = (currentTime - lastLoopTime) / 1000.0;
    if (dt <= 0 || dt > 0.5) dt = 0.01;
    lastLoopTime = currentTime;
      readGPS(); 
      readIMU(dt);
      performDeadReckoning(dt);
      if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(5))) 
      {// STORE RAW DATA 
      preCrashBuffer[bufferIndex].logTime = currentTime;
      preCrashBuffer[bufferIndex].speed = currentData.speedKmph; 
      preCrashBuffer[bufferIndex].gForce = currentData.totalG;
      preCrashBuffer[bufferIndex].lat = currentData.lat;
      preCrashBuffer[bufferIndex].lng = currentData.lng;
      preCrashBuffer[bufferIndex].pitch = currentData.pitch;       
      preCrashBuffer[bufferIndex].roll = currentData.roll;         
      preCrashBuffer[bufferIndex].fusedYaw = currentData.fusedYaw; 
      bufferIndex++;
      if (bufferIndex >= BUFFER_SIZE) 
      {
        bufferIndex = 0;
        bufferFull = true;
      }
      xSemaphoreGive(dataMutex);
      }
    if (currentData.totalG > ACCIDENT_THRESHOLD && !crashActive) 
    {
      crashActive = true;
      crashPending = true; 
      Blynk.virtualWrite(V2, crashActive ? 1 : 0); 
    }
     delay(BLYNK_TASK_TICK); 
  }
}

// --- CORE 0: CLOUD & SD LOGGING ---
void LoggingTaskCode(void * pvParameters) 
{
  unsigned long lastBlynkUpload = 0;
  for (;;)
   {
    if (WiFi.status() == WL_CONNECTED)
     {
      Blynk.run();
      server.handleClient();  
      unsigned long now = millis();
      if (now - lastBlynkUpload >= BLYNK_SEND_INTERVAL)
       {
      sendToBlynk();
      checkSystemStatus();
      lastBlynkUpload = now;
       }
     }
    if (crashPending)
     {
      saveIncidentToSD();
      crashPending = false;
     }
    delay(BLYNK_TASK_TICK); 
  }
}

void saveIncidentToSD()
    {
    String timestamp = (currentData.timestamp.length() > 0) ? currentData.timestamp : String(millis());
    String fileName = "/crash_" + timestamp + ".csv";
    // 1. LOCK THE SPI BUS (Hardware Protection)
    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(500)))
     {
        // 2. LOCK THE DATA (Memory Protection)
        if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(500))) 
        {
            File file = SD.open(fileName, FILE_WRITE);
            if (file) 
            {
                file.println("Millis,SpeedKPH,G-Force,Lat,Lng");
                int start = bufferFull ? bufferIndex : 0;
                int count = bufferFull ? BUFFER_SIZE : bufferIndex;
                for (int i = 0; i < count; i++)
                 {
                    int idx = (start + i) % BUFFER_SIZE;
                    file.printf("%u,%.2f,%.2f,%.6f,%.6f\n", 
                                preCrashBuffer[idx].logTime,
                                preCrashBuffer[idx].speed,
                                preCrashBuffer[idx].gForce,
                                preCrashBuffer[idx].lat,
                                preCrashBuffer[idx].lng,
                                preCrashBuffer[idx].pitch,     
                                preCrashBuffer[idx].roll,      
                                preCrashBuffer[idx].fusedYaw); 
                }
                file.close();
               Serial.println("Reliable Log Saved: " + fileName);
            }
            xSemaphoreGive(dataMutex); // Release Memory
        }
        xSemaphoreGive(spiMutex); // RELEASE SPI BUS
    }
    
    uploadToGoogleSheets();
    if (Blynk.connected()) {
        EVENTSLOG.println("----------------------------");
        EVENTSLOG.print("CRASH LOGGED. Access via: http://");
        EVENTSLOG.println(WiFi.localIP());
        EVENTSLOG.println("----------------------------");
    }
    delay(3000); 
    crashActive = false;
}

void readIMU(float dt) 
{
  if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(10)))
   {
    xyzFloat acc = myMPU9250.getGValues();
    xyzFloat gyr = myMPU9250.getGyrValues();
    xyzFloat mag = myMPU9250.getMagValues();
    xSemaphoreGive(i2cMutex); 

    // --- 1. PITCH: ACCELEROMETER ONLY ---
    // We calculate pitch directly from gravity. No gyro integration used.
    float newPitch = atan2(acc.y, acc.z) * 57.3;

   // 2. ROLL: FIXED WITH COMPLEMENTARY FILTER
    // Calculate what the Accelerometer thinks the Roll is (the "Anchor")
    float accRoll = atan2(-acc.x, acc.z) * 57.3; 
    
    // Combine them: 
    // newRoll = (98% of (Previous Roll + Gyro Change)) + (2% of Accelerometer Roll)
    float newRoll = (0.98 * (currentData.roll + gyr.x * dt)) + (0.02 * accRoll);

    // Update Min/Max using the NEW values
    if(newPitch < pMin) pMin = newPitch; 
    if(newPitch > pMax) pMax = newPitch;
    if(newRoll < rMin) rMin = newRoll;   
    if(newRoll > rMax) rMax = newRoll;

    // Store to currentData
    currentData.pitch = newPitch;
    currentData.roll = newRoll;

    // Calculate Gs
    float tG = sqrt(pow(acc.x, 2) + pow(acc.y, 2) + pow(acc.z, 2));
    currentData.totalG = (currentData.speedKmph == 0 && abs(tG - 1.0) < 0.2) ? 1.0 : tG;
    
    float magYaw = atan2(mag.y, mag.x) * 57.3;
    currentData.fusedYaw = (0.98 * (currentData.fusedYaw + gyr.z * dt)) + (0.02 * magYaw);
    currentData.forwardAcc = acc.y; 
  }
}

void performDeadReckoning(float dt)
 {
  float rawSpeed = 0;
  if (gps.location.isValid() && gps.location.age() < 2000)
   {
    drLat = gps.location.lat();
    drLng = gps.location.lng();
    rawSpeed = gps.speed.kmph();
    drVelocityMS = rawSpeed / 3.6; 
    isGPSValid = true;
   } 
  else 
  {
    isGPSValid = false;
    // DEADBAND: Ignore IMU acceleration noise below 0.05G
    float forwardAcc = currentData.forwardAcc;
    if (abs(forwardAcc) < 0.05) forwardAcc = 0; 
    drVelocityMS += (forwardAcc * 9.81) * dt;
    if (drVelocityMS < 0) drVelocityMS = 0; 
    drLat += (drVelocityMS * cos(currentData.fusedYaw / 57.3) * dt) / 111320.0;
    drLng += (drVelocityMS * sin(currentData.fusedYaw / 57.3) * dt) / (111320.0 * cos(drLat / 57.3));
    rawSpeed = drVelocityMS * 3.6;
  }
  // --- SMOOTHING LOGIC (From your working program) ---
  speedBuffer[speedBufIdx] = rawSpeed;
  speedBufIdx = (speedBufIdx + 1) % 5;
  float sum = 0;
  for (int i = 0; i < 5; i++) sum += speedBuffer[i];
  float averagedSpeed = sum / 5.0;
  // HARD ZEROING: If speed is less than 1.2km/h, show 0 to stop UI jitter
  currentData.speedKmph = (averagedSpeed < 1.2) ? 0 : averagedSpeed;
  currentData.lat = drLat;
  currentData.lng = drLng;
}

void sendToBlynk()
 {
  if (!Blynk.connected()) return;
   SensorData safeData; 
  // Copy data safely before sending it over Wi-Fi
  if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(10))) 
  {
    safeData = currentData;
    xSemaphoreGive(dataMutex);
  } 
  else {return; }
  Blynk.virtualWrite(V1, currentData.speedKmph);
  Blynk.virtualWrite(V3, currentData.totalG);
  Blynk.virtualWrite(V4, String(currentData.lat, 6)); 
  Blynk.virtualWrite(V5, String(currentData.lng, 6));
  Blynk.virtualWrite(V2, crashActive ? 1 : 0); 
  Blynk.virtualWrite(V12, currentData.pitch);
  Blynk.virtualWrite(V13, currentData.roll);
  Blynk.virtualWrite(V14, currentData.fusedYaw);
}

void readGPS()
 {
  while (neogps.available() > 0) 
  {
    gps.encode(neogps.read());
  }
  if (gps.time.isValid()) 
  {
    char buf[10];
    sprintf(buf, "%02d%02d%02d", gps.time.hour(), gps.time.minute(), gps.time.second());
    currentData.timestamp = String(buf);
  }
}
void handleRoot() 
{
  isWebActive = true; // PAUSE SENSORS
  
  if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000))) 
  {
    String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>";
    html += "<h2>Vehicle Crash Logs</h2><ul>";
    
    File root = SD.open("/");
    File file = root.openNextFile();
    while(file)
    {
      String fileName = file.name();
      if (fileName.endsWith(".csv")) 
      {
        html += "<li><a href=\"/download?file=/" + fileName + "\">" + fileName + "</a></li><br>";
      }
      file = root.openNextFile();
    }
    html += "</ul></body></html>";
    server.send(200, "text/html", html);
    xSemaphoreGive(spiMutex);
  } 
  else {
    server.send(503, "text/plain", "SD Card Busy. Refreshing...");
  }

  isWebActive = false; // RESUME SENSORS
}

void handleDownload()
{
  if (server.hasArg("file"))
  {
    isWebActive = true; // PAUSE SENSORS
    String path = server.arg("file");

    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(5000))) 
    {
      if (SD.exists(path)) 
      {
        File downloadFile = SD.open(path, FILE_READ);
        // CHANGE: "text/plain" lets you view the data in Chrome without downloading
        server.sendHeader("Content-Type", "text/plain"); 
        server.streamFile(downloadFile, "text/plain");
        downloadFile.close();
      }
      xSemaphoreGive(spiMutex);
    }
    isWebActive = false; // RESUME SENSORS
  }
}

void uploadToGoogleSheets() 
{
  if (WiFi.status() == WL_CONNECTED) 
   {
    Serial.println("Uploading crash data to Google Sheets...");
    // 1. Setup Secure Connection (Google requires HTTPS)
    WiFiClientSecure client;
    client.setInsecure(); // Bypass complex certificate checks for IoT
    HTTPClient http;
    http.begin(client, GOOGLE_SCRIPT_URL);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS); // <--- ADD THIS CRITICAL LINE!
    http.addHeader("Content-Type", "application/json");
    // 2. Build the Data Payload (Array of Arrays)
    // We lock the data mutex so the buffer doesn't change while we read it
    String payload = "[";
    if (xSemaphoreTake(dataMutex, pdMS_TO_TICKS(500))) 
     {
      int start = bufferFull ? bufferIndex : 0;
      int count = bufferFull ? BUFFER_SIZE : bufferIndex;
      for (int i = 0; i < count; i++) 
       {
        int idx = (start + i) % BUFFER_SIZE;
        // Format: ["Time", Speed, GForce, Lat, Lng, Pitch, Roll, Yaw]
        payload += "[\"" + String(preCrashBuffer[idx].logTime) + "\",";
        payload += String(preCrashBuffer[idx].speed, 2) + ",";
        payload += String(preCrashBuffer[idx].gForce, 2) + ",";
        payload += String(preCrashBuffer[idx].lat, 6) + ",";
        payload += String(preCrashBuffer[idx].lng, 6) + ",";
        payload += String(preCrashBuffer[idx].pitch, 2) + ",";    
        payload += String(preCrashBuffer[idx].roll, 2) + ",";     
        payload += String(preCrashBuffer[idx].fusedYaw, 2) + "]";
        if (i < count - 1) payload += ","; // Add comma between rows
       }
      xSemaphoreGive(dataMutex); 
     }
    payload += "]";
    // 3. Send to Google
    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0)
      {
      Serial.println("Google Sheets Upload Success! Code: " + String(httpResponseCode));
      if (Blynk.connected()) 
       {
        EVENTSLOG.println("CSV Data successfully pushed to Google Cloud.");
       }
      }  
      else 
      {
      Serial.println("Google Sheets Upload Failed. Error: " + http.errorToString(httpResponseCode));
      }
    http.end();
   } 
  else 
  {
    Serial.println("Wi-Fi offline. Cannot upload to Google Sheets right now.");
  }
}

void checkSystemStatus() 
{
  if (!Blynk.connected()) return; // Can't send alerts if offline!
  // 1. Check Wi-Fi
  bool currentWifi = (WiFi.status() == WL_CONNECTED);
  if (currentWifi != lastWifiState) 
  {
    EVENTSLOG.println(currentWifi ? "SYS: Wi-Fi Connected" : "SYS: Wi-Fi Disconnected");
    lastWifiState = currentWifi;
  }
  // 2. Check GPS
  bool currentGps = isGPSValid; // Uses your existing dead reckoning variable
  if (currentGps != lastGpsState) 
  {
    EVENTSLOG.println(currentGps ? "SYS: GPS 3D Fix Locked" : "SYS: GPS Lost (Dead Reckoning Active)");
    lastGpsState = currentGps;
  }
  // 3. Check SD Card safely
  bool currentSd = false;
  if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(100))) 
  {
    currentSd = (SD.cardType() != CARD_NONE); // Checks if physically inserted
    xSemaphoreGive(spiMutex);
  }
  if (currentSd != lastSdState) 
  {
    EVENTSLOG.println(currentSd ? "SYS: SD Card Mounted" : "SYS: SD Card Missing/Error!");
    lastSdState = currentSd;
  }
  // 4. Check MPU safely (Ping the physical sensor)
  bool currentMpu = false;
  if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(10)))
   {
    Wire.beginTransmission(0x68);
    currentMpu = (Wire.endTransmission() == 0); // 0 means the sensor responded
    xSemaphoreGive(i2cMutex);
   }
  if (currentMpu != lastMpuState) 
    {
    EVENTSLOG.println(currentMpu ? "SYS: MPU Sensor Online" : "SYS: MPU Sensor Offline/Wiring Error!");
    lastMpuState = currentMpu;
    }
}

void setup() 
{
  Serial.begin(115200);
  delay(1000); // Give the system a second to stabilize power
  
  Wire.begin(); 
  dataMutex = xSemaphoreCreateMutex();
  spiMutex = xSemaphoreCreateMutex(); 
  i2cMutex = xSemaphoreCreateMutex();

  // --- 1. SENSOR INITIALIZATION ---
  // We check these FIRST before the power-hungry Wi-Fi turns on
  if (!myMPU9250.init()) {
    Serial.println("!!! MPU9250 NOT FOUND - Check SDA/SCL Pins !!!");
  } else {
    Serial.println("MPU9250 Online");
    myMPU9250.setGyrDLPF(MPU9250_DLPF_6);
    myMPU9250.setAccDLPF(MPU9250_DLPF_6);
    myMPU9250.autoOffsets();
  }

  if (!SD.begin(SD_CS)) {
    Serial.println("!!! SD CARD FAIL - Check Format (FAT32) !!!");
  } else {
    Serial.println("SD Card Ready");
  }

  neogps.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // --- 2. WI-FI & IP CONNECTION ---
  Serial.print("Connecting to: ");
  Serial.println(ssid);
  WiFi.begin(ssid, pass); 

  // Forced wait: This stops the code until Wi-Fi is actually ready
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) { 
    delay(500);
    Serial.print(".");
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n--- WI-FI CONNECTED ---");
    Serial.print("IP ADDRESS FOR CHROME: http://");
    Serial.println(WiFi.localIP()); // This will no longer be 0.0.0.0
  } else {
    Serial.println("\n--- WI-FI FAILED (Blynk will try in background) ---");
  }

  // --- 3. BLYNK & SERVER ---
  Blynk.config(auth);
  // We don't use Blynk.connect() with a timeout here; 
  // let it run in the background task instead.

  server.on("/", HTTP_GET, handleRoot);
  server.on("/download", HTTP_GET, handleDownload);
  server.begin();

  // --- 4. START MULTI-CORE TASKS ---
  xTaskCreatePinnedToCore(SensorTaskCode, "SensorTask", 10000, NULL, 1, &SensorTask_Handle, 1);
  xTaskCreatePinnedToCore(LoggingTaskCode, "LoggingTask", 10000, NULL, 1, &LoggingTask_Handle, 0);
}

void loop()
 {// nothing in loop
}
