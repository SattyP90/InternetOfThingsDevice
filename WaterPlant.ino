#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include "thingProperties.h"

//screen
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

//sensors
#define SOIL_PIN 34
#define DHTPIN 4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

//wifi
char password[64];

// ===== SMA SETTINGS =====
const int numReadings = 10;

int readings[numReadings];
int readIndex = 0;

long total = 0;
int averageMoisture = 0;
// ========================


//wifi and password
void readPassword() {

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);

  display.setCursor(0, 20);
  display.print("Waiting for WiFi");

  display.setCursor(0, 35);
  display.print("password...");

  display.display();

  Serial.println();
  Serial.print("Enter WiFi password for VMup: ");

  while (Serial.available() == 0) {
    delay(10);
  }

  String line = Serial.readStringUntil('\n');
  line.trim();

  strcpy(password, line.c_str());

  Serial.println("Password received...");
}

//wifi set up
void connectWiFi() {

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);

  readPassword();

  WiFi.begin(SSID, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void setup() {

  Serial.begin(115200);

  Wire.begin(21, 22);
  analogReadResolution(12);

  dht.begin();

  //initialize SMA array
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED failed");
    while (true);
  }

  display.clearDisplay();
  display.display();

  //wifi first
  connectWiFi();

  //Cloud
  initProperties();
  ArduinoCloud.begin(ArduinoIoTPreferredConnection);

  setDebugMessageLevel(2);
  ArduinoCloud.printDebugInfo();
}

//loop
void loop() {

  ArduinoCloud.update();

  // ===== SOIL MOISTURE SMA =====

  //raw sensor reading
  int rawMoisture = analogRead(SOIL_PIN);

  //remove oldest reading
  total = total - readings[readIndex];

  //store new reading
  readings[readIndex] = rawMoisture;

  //add new reading
  total = total + readings[readIndex];

  //move to next array position
  readIndex++;

  if (readIndex >= numReadings) {
    readIndex = 0;
  }

  //calculate average
  averageMoisture = total / numReadings;

  //use smoothed value
  soilMoisture = averageMoisture;

  // ==============================

  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  //serial plotter output
  Serial.print("Raw:");
  Serial.print(rawMoisture);

  Serial.print(",SMA:");
  Serial.println(soilMoisture);

  //display
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);

  display.setCursor(0, 0);
  display.print("Soil: ");
  display.print(soilMoisture);

  display.setCursor(0, 20);
  display.print("Temp: ");
  display.print(temperature);
  display.print(" C");

  display.setCursor(0, 40);
  display.print("Hum: ");
  display.print(humidity);
  display.print(" %");

  display.setCursor(0, 55);

  if (WiFi.status() == WL_CONNECTED) {
    display.print("WiFi: OK");
  } else {
    display.print("WiFi: OFF");
  }

  display.display();

  delay(2000);
}

void onOledMessageChange() {

  Serial.println("OLED message updated from cloud:");

  Serial.println(oledMessage);

  // Show on OLED
  display.clearDisplay();

  display.setTextSize(1);

  display.setTextColor(WHITE);

  display.setCursor(0, 20);

  display.print(oledMessage);

  display.display();
}