#include <Wire.h>

// I2C Address for this Arduino
#define SLAVE_ADDRESS 0x08

// Motor Driver Pins (assuming two MDD10A drivers)
// Driver 1
#define MOTOR1_PWM 3
#define MOTOR1_DIR 4
#define MOTOR2_PWM 5
#define MOTOR2_DIR 6

// Driver 2
#define MOTOR3_PWM 9
#define MOTOR3_DIR 8
#define MOTOR4_PWM 10
#define MOTOR4_DIR 11

// Speed of the motors (0-255)
int motorSpeed = 200;

void setup() {
  // Initialize I2C communication
  Wire.begin(SLAVE_ADDRESS);
  Wire.onReceive(receiveEvent);

  // Initialize Motor Pins
  pinMode(MOTOR1_PWM, OUTPUT);
  pinMode(MOTOR1_DIR, OUTPUT);
  pinMode(MOTOR2_PWM, OUTPUT);
  pinMode(MOTOR2_DIR, OUTPUT);
  pinMode(MOTOR3_PWM, OUTPUT);
  pinMode(MOTOR3_DIR, OUTPUT);
  pinMode(MOTOR4_PWM, OUTPUT);
  pinMode(MOTOR4_DIR, OUTPUT);

  // Initialize Serial for debugging
  Serial.begin(9600);
}

void loop() {
  // The main loop can be used for any background tasks if needed
  delay(100);
}

// Function that executes whenever data is received from master
void receiveEvent(int howMany) {
  while (Wire.available()) {
    byte command = Wire.read(); // receive byte as a character
    Serial.print("Command Received: ");
    Serial.println(command);

    switch (command) {
      case 0x01: // Move Forward
        moveForward();
        break;
      case 0x02: // Move Backward
        moveBackward();
        break;
      case 0x03: // Strafe Left
        strafeLeft();
        break;
      case 0x04: // Strafe Right
        strafeRight();
        break;
      case 0x05: // Rotate Clockwise
        rotateClockwise();
        break;
      case 0x06: // Rotate Counter-Clockwise
        rotateCounterClockwise();
        break;
      case 0x00: // Stop
        stopMotors();
        break;
      default:
        // Optional: handle unknown commands
        stopMotors();
        break;
    }
  }
}

// --- Motor Control Functions ---

void moveForward() {
  // All motors forward
  digitalWrite(MOTOR1_DIR, HIGH);
  analogWrite(MOTOR1_PWM, motorSpeed);
  digitalWrite(MOTOR2_DIR, HIGH);
  analogWrite(MOTOR2_PWM, motorSpeed);
  digitalWrite(MOTOR3_DIR, HIGH);
  analogWrite(MOTOR3_PWM, motorSpeed);
  digitalWrite(MOTOR4_DIR, HIGH);
  analogWrite(MOTOR4_PWM, motorSpeed);
}

void moveBackward() {
  // All motors backward
  digitalWrite(MOTOR1_DIR, LOW);
  analogWrite(MOTOR1_PWM, motorSpeed);
  digitalWrite(MOTOR2_DIR, LOW);
  analogWrite(MOTOR2_PWM, motorSpeed);
  digitalWrite(MOTOR3_DIR, LOW);
  analogWrite(MOTOR3_PWM, motorSpeed);
  digitalWrite(MOTOR4_DIR, LOW);
  analogWrite(MOTOR4_PWM, motorSpeed);
}

void strafeLeft() {
  // Motors 1 & 4 backward, 2 & 3 forward
  digitalWrite(MOTOR1_DIR, LOW);
  analogWrite(MOTOR1_PWM, motorSpeed);
  digitalWrite(MOTOR2_DIR, HIGH);
  analogWrite(MOTOR2_PWM, motorSpeed);
  digitalWrite(MOTOR3_DIR, HIGH);
  analogWrite(MOTOR3_PWM, motorSpeed);
  digitalWrite(MOTOR4_DIR, LOW);
  analogWrite(MOTOR4_PWM, motorSpeed);
}

void strafeRight() {
  // Motors 1 & 4 forward, 2 & 3 backward
  digitalWrite(MOTOR1_DIR, HIGH);
  analogWrite(MOTOR1_PWM, motorSpeed);
  digitalWrite(MOTOR2_DIR, LOW);
  analogWrite(MOTOR2_PWM, motorSpeed);
  digitalWrite(MOTOR3_DIR, LOW);
  analogWrite(MOTOR3_PWM, motorSpeed);
  digitalWrite(MOTOR4_DIR, HIGH);
  analogWrite(MOTOR4_PWM, motorSpeed);
}

void rotateClockwise() {
  // Left motors forward, right motors backward
  digitalWrite(MOTOR1_DIR, HIGH);
  analogWrite(MOTOR1_PWM, motorSpeed);
  digitalWrite(MOTOR2_DIR, LOW);
  analogWrite(MOTOR2_PWM, motorSpeed);
  digitalWrite(MOTOR3_DIR, HIGH);
  analogWrite(MOTOR3_PWM, motorSpeed);
  digitalWrite(MOTOR4_DIR, LOW);
  analogWrite(MOTOR4_PWM, motorSpeed);
}

void rotateCounterClockwise() {
  // Left motors backward, right motors forward
  digitalWrite(MOTOR1_DIR, LOW);
  analogWrite(MOTOR1_PWM, motorSpeed);
  digitalWrite(MOTOR2_DIR, HIGH);
  analogWrite(MOTOR2_PWM, motorSpeed);
  digitalWrite(MOTOR3_DIR, LOW);
  analogWrite(MOTOR3_PWM, motorSpeed);
  digitalWrite(MOTOR4_DIR, HIGH);
  analogWrite(MOTOR4_PWM, motorSpeed);
}

void stopMotors() {
  // Stop all motors
  analogWrite(MOTOR1_PWM, 0);
  analogWrite(MOTOR2_PWM, 0);
  analogWrite(MOTOR3_PWM, 0);
  analogWrite(MOTOR4_PWM, 0);
}