// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  
  // Zvýšenie celkového timeoutu pre testy, aby sa zmestilo 30 sekúnd čakania na dáta.
  timeout: 60000, 
  expect: {
    timeout: 5000
  },

  // Generovanie HTML reportu, ktorý sa otvorí po každom spustení
  reporter: 'html', 

  use: {
    // URL, na ktorej beží Váš Juice Shop kontajner
    baseURL: 'http://localhost:3000',

    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});