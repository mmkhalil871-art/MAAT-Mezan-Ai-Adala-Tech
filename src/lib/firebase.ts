import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  getDocs, 
  limit,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocFromServer,
  where,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connection test as required by instructions
export async function testConnection() {
  try {
    // Attempt to fetch a non-existent document using getDocFromServer
    // This is purely to test if the client is online and config is correct.
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    } else {
      // It's fine if the document doesn't exist, we just want to see if we can reach the server.
      console.log("Firestore reachability test completed.");
    }
  }
}
testConnection();

const googleProvider = new GoogleAuthProvider();

// Error Handling Infrastructure
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  const serializedError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serializedError);
  throw new Error(serializedError);
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Enforce Personal Email Check centrally
    const personalDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com'];
    const emailDomain = user.email?.split('@')[1]?.toLowerCase();
    
    if (emailDomain && !personalDomains.includes(emailDomain)) {
      console.warn(`[Auth] Corporate/Non-personal domain detected: ${emailDomain}. Proceeding but logging.`);
    }

    // Log the login event with more details for the administrator
    const path = 'login_logs';
    try {
      await addDoc(collection(db, path), {
        email: user.email,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        authProvider: 'google.com',
        isPersonalEmail: emailDomain ? personalDomains.includes(emailDomain) : false
      });
    } catch (logError) {
      console.error('Failed to log login event:', logError);
    }
    
    return user;
  } catch (error) {
    // Re-throw if it's already a handled firestore error
    if (error instanceof Error && error.message.includes('{"error"')) {
      throw error; 
    }
    
    const err = error as { code?: string; message?: string };
    const errorCode = err.code || '';
    const errorMessage = err.message || '';
    
    // Check for popup blocked or closed
    if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
      console.log('[Auth] Login cancelled by user.');
      return null;
    }

    if (errorCode === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.', { cause: error });
    }

    if (errorCode === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.', { cause: error });
    }

    if (errorCode === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized in the Firebase Console. Please add your Netlify domain to the Authorized Domains list in the Firebase Console under Authentication > Settings.', { cause: error });
    }

    console.error('Login error detail:', { errorCode, errorMessage });
    throw error;
  }
};

export const logout = () => signOut(auth);

export interface LoginLog {
  id: string;
  email: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  userAgent: string;
  uid: string;
  displayName?: string;
  photoURL?: string;
  isPersonalEmail?: boolean;
}

export const getLoginLogs = async (): Promise<LoginLog[]> => {
  const path = 'login_logs';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>)
    } as LoginLog));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return []; // Never reached
  }
};

export interface LibraryItem {
  id: string;
  title: string;
  content: string;
  type: 'law' | 'regulation' | 'decree' | 'update' | 'url' | 'recommendation' | 'convention' | 'ministerial_decree' | 'circular' | 'procedure';
  uploadedBy: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  isPublic: boolean;
  fileName?: string;
  url?: string;
  relatedTo?: string[]; // IDs of other library items
}

export interface DepositionLog {
  id: string;
  itemId?: string;
  operation: 'create' | 'update' | 'delete' | 'detect';
  email: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  details: Record<string, unknown>;
}

export interface AdminRequest {
  id: string;
  userEmail: string;
  requestType: 'add_document' | 'other';
  message: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  status: 'pending' | 'viewed' | 'archived';
}

export interface ChatHistoryItem {
  id: string;
  userEmail: string;
  userMessage: string;
  aiResponse: string;
  timestamp: { seconds: number; nanoseconds: number } | null;
  workflow: string;
}

export const addToLibrary = async (item: Omit<LibraryItem, 'id' | 'timestamp'>) => {
  const libPath = 'library';
  const logPath = 'library_logs';
  try {
    const docRef = await addDoc(collection(db, libPath), {
      ...item,
      timestamp: serverTimestamp()
    });
    
    // Log the operation
    try {
      await addDoc(collection(db, logPath), {
        operation: 'create',
        itemId: docRef.id,
        email: auth.currentUser?.email || 'unknown',
        timestamp: serverTimestamp(),
        details: { title: item.title, type: item.type }
      });
    } catch (logErr) {
      console.error('Failed to log library operation:', logErr);
    }
    
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, libPath);
    throw error;
  }
};

export const getLibraryItems = async (): Promise<LibraryItem[]> => {
  const path = 'library';
  try {
    const user = auth.currentUser;
    console.log('[Library] Fetching items. User:', user?.email);
    
    let snapshot;
    try {
      // Attempt query with orderBy (requires single-field or composite index)
      if (!user) {
        // Guest: only public
        const q = query(collection(db, path), where('isPublic', '==', true), orderBy('timestamp', 'desc'));
        snapshot = await getDocs(q);
      } else {
        // Signed in user: attempt to get all (works for admins)
        const q = query(collection(db, path), orderBy('timestamp', 'desc'));
        snapshot = await getDocs(q);
      }
    } catch {
      console.warn('[Library] Query with orderBy failed (possibly missing index). Falling back to client-side sorting.');
      // Fallback: Fetch everything without orderBy to be index-agnostic
      if (!user) {
        const q = query(collection(db, path), where('isPublic', '==', true));
        snapshot = await getDocs(q);
      } else {
        try {
          const q = query(collection(db, path));
          snapshot = await getDocs(q);
        } catch {
          // If blanket query fails for non-admin, try public + own
          const publicQ = query(collection(db, path), where('isPublic', '==', true));
          const ownQ = query(collection(db, path), where('uploadedBy', '==', user.email));
          const [publicSnap, ownSnap] = await Promise.all([getDocs(publicQ), getDocs(ownQ)]);
          
          const itemsMap = new Map<string, LibraryItem>();
          const processDocs = (snap: QuerySnapshot<DocumentData>) => snap.docs.forEach((doc) => {
            const data = doc.data();
            itemsMap.set(doc.id, { id: doc.id, ...data } as LibraryItem);
          });
          processDocs(publicSnap);
          processDocs(ownSnap);
          
          return Array.from(itemsMap.values()).sort((a, b) => {
            const timeA = (a.timestamp as { seconds: number })?.seconds || (a.timestamp as { seconds?: number })?.seconds || 0;
            const timeB = (b.timestamp as { seconds: number })?.seconds || (b.timestamp as { seconds?: number })?.seconds || 0;
            return timeB - timeA;
          });
        }
      }
    }

    if (!snapshot) {
      console.warn('[Library] Snapshot is undefined after fallback attempts.');
      return [];
    }

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>)
    } as LibraryItem));

    // Client-side sort fallback if needed (or just to be safe)
    return items.sort((a, b) => {
      const timeA = (a.timestamp as { seconds: number })?.seconds || (a.timestamp as { seconds?: number })?.seconds || 0;
      const timeB = (b.timestamp as { seconds: number })?.seconds || (b.timestamp as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('[Library] Final fetch failure:', error);
    // If it's a permission error, we might want to return empty list instead of crashing UI
    const rawError = String(error);
    if (rawError.includes('permission-denied') || rawError.includes('Missing or insufficient permissions')) {
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getDepositionLogs = async (): Promise<DepositionLog[]> => {
  const path = 'library_logs';
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    // Try blanket query for all logs (works for admins)
    try {
      const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>)
      } as DepositionLog));
    } catch {
      // Fallback for non-admins: only their own logs
      console.warn('Admin log query failed, falling back to personal logs.');
      const q = query(collection(db, path), where('email', '==', user.email), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>)
      } as DepositionLog));
    }
  } catch (error) {
    console.warn('Failed to fetch deposition logs:', error);
    return [];
  }
};

export const updateLibraryItem = async (id: string, updates: Partial<LibraryItem>) => {
  const path = `library/${id}`;
  try {
    const itemRef = doc(db, 'library', id);
    // IMPORTANT: Security rules require timestamp to match request.time
    await updateDoc(itemRef, {
      ...updates,
      timestamp: serverTimestamp()
    });
    
    // Log the operation
    try {
      await addDoc(collection(db, 'library_logs'), {
        operation: 'update',
        itemId: id,
        email: auth.currentUser?.email || 'unknown',
        timestamp: serverTimestamp(),
        details: updates
      });
    } catch (logErr) {
      console.error('Failed to log library update:', logErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const logOperation = async (operation: DepositionLog['operation'], details: Record<string, unknown>) => {
  const path = 'library_logs';
  try {
    await addDoc(collection(db, path), {
      operation,
      email: auth.currentUser?.email || 'unknown',
      timestamp: serverTimestamp(),
      details
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteLibraryItem = async (id: string) => {
  const path = `library/${id}`;
  const itemRef = doc(db, 'library', id);
  
  // Try to get data for logging
  let itemTitle = 'Unknown Document';
  try {
    const docSnap = await getDoc(itemRef);
    if (docSnap.exists()) {
      itemTitle = docSnap.data().title || itemTitle;
    }
  } catch (e) {
    console.warn('Could not fetch item metadata before deletion', e);
  }

  try {
    await deleteDoc(itemRef);
    await logOperation('delete', { title: itemTitle, itemId: id });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteDepositionLog = async (id: string) => {
  const path = `library_logs/${id}`;
  try {
    const logRef = doc(db, 'library_logs', id);
    await deleteDoc(logRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const createAdminRequest = async (request: Omit<AdminRequest, 'id' | 'timestamp' | 'status'>) => {
  const path = 'admin_requests';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...request,
      status: 'pending',
      timestamp: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const getAdminRequests = async (): Promise<AdminRequest[]> => {
  const path = 'admin_requests';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(200));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>)
    } as AdminRequest));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const updateAdminRequestStatus = async (id: string, status: AdminRequest['status']) => {
  const path = `admin_requests/${id}`;
  try {
    const docRef = doc(db, 'admin_requests', id);
    await updateDoc(docRef, { 
      status,
      // Note: firestore.rules requires isValidAdminRequest which includes timestamp == request.time
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteAdminRequest = async (id: string) => {
  const path = `admin_requests/${id}`;
  try {
    const docRef = doc(db, 'admin_requests', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveChatHistory = async (history: Omit<ChatHistoryItem, 'id' | 'timestamp'>) => {
  const path = 'chat_history';
  try {
    await addDoc(collection(db, path), {
      ...history,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getChatHistory = async (): Promise<ChatHistoryItem[]> => {
  const path = 'chat_history';
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    const q = query(
      collection(db, path), 
      where('userEmail', '==', user.email), 
      orderBy('timestamp', 'desc'), 
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>)
    } as ChatHistoryItem));
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
};

export const deleteChatHistory = async (id: string) => {
  const path = `chat_history/${id}`;
  try {
    const docRef = doc(db, 'chat_history', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
