#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

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
#define SSID "VMup"

char password[64];

//read password from serial monitor
void readPassword() {

  // Show message on OLED
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

  Serial.println("\nPassword received...");
}

//connecting wifi 
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

//set up
void setup() {

  Serial.begin(115200);

  Wire.begin(21, 22);
  analogReadResolution(12);

  dht.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED failed");
    while (true);
  }

  display.clearDisplay();
  display.display();

  connectWiFi();
}

//loop
void loop() {

  int soilValue = analogRead(SOIL_PIN);
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);

  display.setCursor(0, 0);
  display.print("Soil: ");
  display.print(soilValue);

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