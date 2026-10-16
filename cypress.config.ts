import { defineConfig } from 'cypress';

// El servidor de pruebas lo levanta `npm run e2e` (start-server-and-test) en el puerto 5174,
// con la API apuntando a /api (mismo origen, así cy.intercept evita CORS) y sin tocar el backend real.
export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:5174',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 900,
    video: false,
    defaultCommandTimeout: 8000,
    retries: 0,
    setupNodeEvents(on) {
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
