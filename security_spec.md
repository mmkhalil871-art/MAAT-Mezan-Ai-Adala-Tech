# Security Specification - MAAT Legal Assistant

## Data Invariants
1. **Library Items**: Every document must have a title, content, type, and an owner (uploadedBy). Documents marked as `isPublic: false` must only be accessible by the owner or an admin.
2. **Audit Trails**: Every library modification (create, update, delete) must be recorded in `library_logs`.
3. **Login Logs**: Every successful login from the app must be logged with the user's email, UID, and timestamp.
4. **Admins**: Only users listed in the `admins` collection or the bootstrap admin email (`m.mkhalil871@gmail.com`) can perform restricted administrative actions.

## The "Dirty Dozen" Payloads (Target: Rejection)

1. **Identity Spoofing**: Attempting to create a library item with an `uploadedBy` email other than the authenticated user's email.
2. **Schema Poisoning**: Attempting to inject a massive string (1MB+) into the `title` field of a library item.
3. **ID Injection**: Attempting to use a 2KB string containing non-alphanumeric characters as a document ID.
4. **State Shortcutting**: Attempting to update a library item's `timestamp` to a past or future date (must be `request.time`).
5. **PII Leak**: An unauthenticated user attempting to list `login_logs`.
6. **Admin Escalation**: A standard user attempting to write to the `admins` collection.
7. **Phantom Update**: Attempting to update the `uploadedBy` field of an existing library item.
8. **Incomplete Schema**: Attempting to create a library item missing the `content` field.
9. **Invalid Enum**: Attempting to create a library item with a `type` that is not in the allowed list (e.g., `type: "hack"`).
10. **Shadow Field**: Attempting to add an `isAdmin: true` field to a `login_log` document.
11. **Collaborator Bypass**: A user attempting to update a library item they didn't upload (and they aren't an admin).
12. **Log Erasure**: A standard user attempting to delete an entry from `library_logs`.

## The Test Runner (firestore.rules.test.ts)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

const ADMIN_EMAIL = 'm.mkhalil871@gmail.com';
const USER_EMAIL = 'user@example.com';
const OTHER_EMAIL = 'other@example.com';

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'maat-legal-security-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Helper: Get Firestore instance
  const getDb = (auth?: { uid: string; email: string; email_verified?: boolean }) => {
    return auth 
      ? testEnv.authenticatedContext(auth.uid, { email: auth.email, email_verified: auth.email_verified ?? true }).firestore()
      : testEnv.unauthenticatedContext().firestore();
  };

  it('Payload 1: Rejects Identity Spoofing (uploadedBy mismatch)', async () => {
    const db = getDb({ uid: 'user123', email: USER_EMAIL });
    const ref = doc(db, 'library/test-item');
    await assertFails(setDoc(ref, {
      title: 'Valid Title',
      content: 'Valid Content',
      type: 'law',
      uploadedBy: OTHER_EMAIL, // Spoofed
      timestamp: new Date(), // Simulating server timestamp (rules check request.time)
      isPublic: true
    }));
  });

  it('Payload 2: Rejects Schema Poisoning (Large Title)', async () => {
    const db = getDb({ uid: 'user123', email: USER_EMAIL });
    const ref = doc(db, 'library/test-item');
    await assertFails(setDoc(ref, {
      title: 'A'.repeat(1001), 
      content: 'Valid Content',
      type: 'law',
      uploadedBy: USER_EMAIL,
      timestamp: new Date(),
      isPublic: true
    }));
  });

  it('Payload 5: Rejects PII Leak (Unauthenticated list login_logs)', async () => {
    const db = getDb();
    const ref = collection(db, 'login_logs');
    await assertFails(getDocs(ref));
  });

  it('Payload 11: Rejects Collaborator Bypass (Update non-owned item)', async () => {
    // Setup: admin creates an item
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'library/shared-item'), {
        title: 'Admin Title',
        content: 'Original',
        type: 'law',
        uploadedBy: ADMIN_EMAIL,
        timestamp: new Date(),
        isPublic: true
      });
    });

    const db = getDb({ uid: 'user123', email: USER_EMAIL });
    const ref = doc(db, 'library/shared-item');
    await assertFails(updateDoc(ref, { content: 'Hacked' }));
  });
});
```
