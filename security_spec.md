# Security Specification for VE Commercial Vehicles EWO Manager

## 1. Data Invariants
- An EWO must be created by an approved Production user.
- A Maintenance user can only update an EWO if they have acknowledged it or are the first to resolve it.
- An EWO status can only progress: `Open` -> `Acknowledged` -> `Resolved` -> `Closed`.
- Only Admin users can approve new users.
- Users cannot change their own roles or approval status.
- Sensitive spare parts data (stock) should be protected but visible to relevant roles.
- `totalDowntime` is calculated upon resolution or closure and should be validated.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Self-Approval**: A pending user trying to set `status: "approved"` on their own doc.
2. **Role Escalation**: A Production user trying to change their role to `Admin`.
3. **EWO Hijack**: A Maintenance user trying to resolve an EWO that was already resolved by another.
4. **Invalid Status Jump**: Transitioning from `Open` directly to `Closed` without `Resolved`.
5. **Orphaned Consumption**: Logging spare consumption with a non-existent `materialId`.
6. **Shadow Fields**: Adding `isSuperAdmin: true` to a user profile.
7. **Client Timestamp Spoofing**: Setting `startTime` to a future date or a fake string.
8. **Unauthorized Deletion**: A user trying to delete an EWO record (should be disabled or restricted to Admin).
9. **Spam IDs**: Injecting a 2KB string as a document ID for an EWO.
10. **PII Leakage**: A standard user attempting to list all user emails they shouldn't see.
11. **Negative Stock**: Updating spare part stock to `-50`.
12. **Double Resolution**: Resolving an already `Closed` EWO.

## 3. Test Runner Concept
The tests will ensure `PERMISSION_DENIED` for all above scenarios.
(Implementation follows in `firestore.rules`)
