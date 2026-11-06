/**
 * Firestore Security Rules Verification Specification
 * Verifies that all Dirty Dozen payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  authUid: string | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Profile Create',
    collectionPath: '/profiles/victim_uid',
    operation: 'create',
    authUid: 'attacker_uid',
    payload: { uid: 'victim_uid', displayName: 'Spoofer' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Profile Update',
    collectionPath: '/profiles/user_1',
    operation: 'update',
    authUid: 'user_1',
    payload: { chips: 50000, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Value Poisoning on Profile Update (Oversized displayName)',
    collectionPath: '/profiles/user_1',
    operation: 'update',
    authUid: 'user_1',
    payload: { displayName: 'X'.repeat(1024) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Timestamp Forgery on Profile Create',
    collectionPath: '/profiles/user_1',
    operation: 'create',
    authUid: 'user_1',
    payload: { uid: 'user_1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Immortal Field Mutation on Profile Update',
    collectionPath: '/profiles/user_1',
    operation: 'update',
    authUid: 'user_1',
    payload: { uid: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Transaction Write without Parent Profile',
    collectionPath: '/profiles/non_existent_user/transactions/tx_1',
    operation: 'create',
    authUid: 'non_existent_user',
    payload: { uid: 'non_existent_user', amount: 500 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Transaction History Tampering (Update)',
    collectionPath: '/profiles/user_1/transactions/tx_1',
    operation: 'update',
    authUid: 'user_1',
    payload: { amount: 999999 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'ID Poisoning Attack with Oversized ID',
    collectionPath: `/profiles/${'a'.repeat(200)}`,
    operation: 'create',
    authUid: 'a'.repeat(200),
    payload: { uid: 'a'.repeat(200) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Bypass on Closed Room',
    collectionPath: '/rooms/room_closed_1',
    operation: 'update',
    authUid: 'host_1',
    payload: { status: 'open' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned Room Creation without Host Profile',
    collectionPath: '/rooms/room_1',
    operation: 'create',
    authUid: 'ghost_host',
    payload: { hostId: 'ghost_host', name: 'Ghost Table' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Invitation Status Hijack by Sender',
    collectionPath: '/invitations/inv_1',
    operation: 'update',
    authUid: 'sender_1',
    payload: { status: 'accepted' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthenticated List Scraping on Invitations',
    collectionPath: '/invitations',
    operation: 'list',
    authUid: null,
    expectedResult: 'PERMISSION_DENIED',
  },
];
