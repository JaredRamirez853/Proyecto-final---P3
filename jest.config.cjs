/** Configuración de Jest para ejecutar las pruebas TypeScript del proyecto. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js"],
  testPathIgnorePatterns: ["/node_modules/"],
  clearMocks: true
};
