/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getDatabase } from './src/database/database';
import { runMigrations } from './src/database/migrations';
import { seedDatabase } from './src/database/seed';

// Khởi tạo DB một lần ở entry point (không phải trong App.tsx) để không kéo
// native module SQLite vào cây render mà __tests__/App.test.tsx render qua Jest.
const db = getDatabase();
runMigrations(db);
if (__DEV__) {
  seedDatabase(db);
}

AppRegistry.registerComponent(appName, () => App);
