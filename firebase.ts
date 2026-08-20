import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(config) : getApp();

// Use the designated Firestore Database ID if configured
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? initializeFirestore(app, {}, config.firestoreDatabaseId)
  : getFirestore(app);

export default db;
