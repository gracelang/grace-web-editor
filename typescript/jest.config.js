export default {
    "roots": [
      "<rootDir>/src"
    ],
    "testMatch": [
      "**/*\.test\.(ts|tsx|js)",
      "**/toposort.test.ts",
      "*\.test\.(ts|tsx|js)",
      "?(*.)+(spec|test).+(ts|tsx|js)"
    ],
    "transform": {
        "^.+\\.(ts|tsx)$": "ts-jest"
    },
    testEnvironment: "jest-environment-node",
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}