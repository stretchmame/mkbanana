import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Firebase Auth is initialized but we don't force sign-in here to avoid errors
// if specific providers (like anonymous) are not enabled in the console.
// The current leaderboard rules allow public access for this arcade-style game.

export interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  timestamp: any;
}

export const saveHighScore = async (name: string, score: number) => {
  try {
    await addDoc(collection(db, 'leaderboard'), {
      name,
      score,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving high score:", error);
    throw error;
  }
};

export const getTopScores = (callback: (scores: LeaderboardEntry[]) => void) => {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy('score', 'desc'),
    limit(5)
  );

  return onSnapshot(q, (snapshot) => {
    const scores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LeaderboardEntry));
    callback(scores);
  }, (error) => {
    console.error("Error fetching leaderboard:", error);
  });
};
