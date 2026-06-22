#include <Wire.h>

// I2C Address for this Arduino
#define SLAVE_ADDRESS 0x09

// Solenoid Valve connected to a relay on pin 7
#define SOLENOID_PIN 7

void setup() {
  // Initialize I2C communication
  Wire.begin(SLAVE_ADDRESS);
  Wire.onReceive(receiveEvent);

  // Initialize Solenoid Pin
  pinMode(SOLENOID_PIN, OUTPUT);
  digitalWrite(SOLENOID_PIN, LOW); // Ensure it's off initially

  // Initialize Serial for debugging
  Serial.begin(9600);
}

void loop() {
  // Main loop is not used for this slave
  delay(100);
}

// Function that executes whenever data is received from master
void receiveEvent(int howMany) {
  while (Wire.available()) {
    byte command = Wire.read(); // receive byte as a character
    Serial.print("Command Received: ");
    Serial.println(command);

    if (command == 0x01) { // Fire command
      shoot();
    }
  }
}

void shoot() {
  Serial.println("Firing!");
  digitalWrite(SOLENOID_PIN, HIGH); // Open the valve
  delay(500); // Keep it open for 500ms (adjust as needed)
  digitalWrite(SOLENOID_PIN, LOW);  // Close the valve
  Serial.println("Finished Firing.");
}