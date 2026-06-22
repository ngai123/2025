#include <Wire.h>

// I2C Addresses for the Arduino slaves
#define LOCOMOTION_SLAVE_ADDR 0x08
#define SHOOTER_SLAVE_ADDR 0x09

void setup() {
  // Initialize I2C
  Wire.begin();

  // Initialize Serial for debugging
  Serial.begin(115200);
}

void loop() {
  // Example of sending a command
  // In a real scenario, this would come from PS4 controller input
  sendLocomotionCommand(0x01); // Send "Move Forward" command
  delay(2000);
  sendLocomotionCommand(0x00); // Send "Stop" command
  delay(1000);
  sendShooterCommand(0x01); // Send "Fire" command
  delay(5000); // Wait 5 seconds before repeating
}

void sendLocomotionCommand(byte command) {
  Wire.beginTransmission(LOCOMOTION_SLAVE_ADDR);
  Wire.write(command);
  Wire.endTransmission();
  Serial.print("Sent to Locomotion: ");
  Serial.println(command);
}

void sendShooterCommand(byte command) {
  Wire.beginTransmission(SHOOTER_SLAVE_ADDR);
  Wire.write(command);
  Wire.endTransmission();
  Serial.print("Sent to Shooter: ");
  Serial.println(command);
}