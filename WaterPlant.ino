#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <HTTPClient.h>
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

//sma settings
const int numReadings = 10;
int readings[numReadings];
int readIndex = 0;
long total = 0;
int averageMoisture = 0;



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

#include <HTTPClient.h>

void sendToSupabase(int soil, float temp, float hum) {

  HTTPClient http;

  http.begin("https://jhhheqqydngfmoohocbk.supabase.co/rest/v1/plant_readings");

  http.addHeader("apikey", "sb_publishable_CdM_yyxbH40KqegkB1P29w_D1dzjJQn");
  http.addHeader("Authorization", "Bearer sb_publishable_CdM_yyxbH40KqegkB1P29w_D1dzjJQn");
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"soil_moisture\":" + String(soil) + ",";
  json += "\"temperature\":" + String(temp) + ",";
  json += "\"humidity\":" + String(hum);
  json += "}";

  int code = http.POST(json);

  Serial.print("Supabase response: ");
  Serial.println(code);

  http.end();
}

void setup() {

  Serial.begin(115200);

  Wire.begin(21, 22);
  analogReadResolution(12);

  dht.begin();

  //initialising SMA array
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

  //cloud
  initProperties();
  ArduinoCloud.begin(ArduinoIoTPreferredConnection);

  setDebugMessageLevel(2);
  ArduinoCloud.printDebugInfo();
}

//loop
void loop() {

  ArduinoCloud.update();

  //soil moisture sma -----
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
  // end of sma calculation codes--------------


  humidity = dht.readHumidity();
  temperature = dht.readTemperature();

  sendToSupabase(soilMoisture, temperature, humidity);

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

  delay(60000);
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