# Security Specification — Velvet & Brass Social Club

## 1. Data Invariants
1. **Identity & Ownership (`profiles/{userId}`)**:
   - A `PlayerProfile` document ID `{userId}` must strictly match `request.auth.uid` and `incoming().uid`.
   - No PII (`email`, `phone`, `address`) is stored in `PlayerProfile`.
   - `createdAt` and `uid` are immortal (immutable after creation).
   - `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
2. **Relational Sync (`profiles/{userId}/transactions/{txId}` & `profiles/{userId}/connections/{targetUserId}`)**:
   - Sub-collections require the parent `/profiles/{userId}` document to exist via `get()` and its `uid` to equal `request.auth.uid`.
   - `ChipTransaction` documents are append-only (`allow update, delete: if false;`).
3. **Multiplayer Rooms (`rooms/{roomId}`)**:
   - Created only by authenticated users where `incoming().hostId == request.auth.uid` and the host's `/profiles/{hostId}` exists.
   - Terminal State Locking: Once `resource.data.status == 'closed'`, no further updates are permitted.
4. **Invitations (`invitations/{inviteId}`)**:
   - Created only by `senderId == request.auth.uid` referencing an existing `/rooms/{roomId}` and `/profiles/{recipientId}`.
   - Only `recipientId` may update `status` to `'accepted'` or `'declined'` while `existing().status == 'pending'`. Terminal states `'accepted'` and `'declined'` are locked.

## 2. The "Dirty Dozen" Payloads (Designed to Break Identity, Integrity, and State)
1. **Identity Spoofing on Profile Create**: `{ "uid": "victim_uid", "displayName": "Hacker", ... }` by `attacker_uid` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on Profile Update**: `{ "chips": 999999, "isAdmin": true }` -> `PERMISSION_DENIED` (`hasOnly` rejects `isAdmin`).
3. **Value Poisoning on Profile Update**: `{ "displayName": "A".repeat(5000) }` -> `PERMISSION_DENIED` (`maxLength: 32` enforced by `isValidPlayerProfile`).
4. **Timestamp Forgery on Profile Create**: `{ "createdAt": "2020-01-01T00:00:00Z" }` -> `PERMISSION_DENIED` (`createdAt == request.time` required).
5. **Immortal Field Mutation on Profile Update**: `{ "uid": "new_uid", "createdAt": request.time }` -> `PERMISSION_DENIED`.
6. **Orphaned Transaction Write**: Creating `/profiles/{userId}/transactions/{txId}` when `/profiles/{userId}` does not exist -> `PERMISSION_DENIED`.
7. **Transaction Tampering**: Updating or deleting an existing `/profiles/{userId}/transactions/{txId}` -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Document ID with 200 characters or invalid symbols `$bad/id` -> `PERMISSION_DENIED` (`isValidId` guard).
9. **Terminal State Bypass on Room**: Updating `/rooms/{roomId}` after `status == 'closed'` -> `PERMISSION_DENIED`.
10. **Orphaned Room Creation**: Creating `/rooms/{roomId}` without a valid `/profiles/{hostId}` -> `PERMISSION_DENIED`.
11. **Unauthorized Invitation StatusHijack**: Sender attempting to mark their own invitation `'accepted'` on behalf of `recipientId` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping on Invitations**: Listing `/invitations` without filtering by `resource.data.recipientId == request.auth.uid` or `resource.data.senderId == request.auth.uid` -> `PERMISSION_DENIED`.
