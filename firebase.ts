import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || config.projectId || 'glassy-index-0q6d2',
  appId: metaEnv.VITE_FIREBASE_APP_ID || config.appId || '1:562874802019:web:1302c7be812a419d297d56',
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || config.apiKey || 'AIzaSyBkRBbRr9xDjcVqHEd0pTi8qLXqaksEI0M',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain || 'glassy-index-0q6d2.firebaseapp.com',
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId || 'ai-studio-refundsanalytics-688ddaa9-bdc6-4c9a-89fd-72b842214cfe',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket || 'glassy-index-0q6d2.firebasestorage.app',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || '562874802019',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const db = dbId
  ? initializeFirestore(app, {}, dbId)
  : getFirestore(app);

export default db;
