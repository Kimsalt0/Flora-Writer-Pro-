# Security Specification - Writer Pro

## Data Invariants
- A novel must have a title and a valid authorId matching the creator.
- Chapters, Ideas, and Plots must belong to a novel owned by the user.
- Timestamps must be server-generated.

## The Dirty Dozen Payloads (to be rejected)
1. **Identity Spoofing**: Creating a novel with someone else's `authorId`.
2. **Path Poisoning**: Injecting a 2KB string as a novel ID.
3. **Ghost Fields**: Adding `isVerified: true` to a novel document.
4. **Timestamp Fraud**: Setting a manual `createdAt` date in the past.
5. **Unauthorized Multi-Book List**: Querying all novels without filtering by `authorId`.
6. **Relational Break**: Creating a chapter for a novel I don't own.
7. **Type Poisoning**: Sending `order: "first"` instead of `order: 1` for a chapter.
8. **Size Attack**: Sending a 2MB string for a chapter title.
9. **Role Escalation**: Setting `role: "Admin"` for a character when only "Main", "Secondary", "Minor" are allowed.
10. **Immutable Field Update**: Changing `createdAt` after creation.
11. **Cross-User Update**: Editing someone else's novel.
12. **Orphaned Chapter**: Creating a chapter for a non-existent novel ID.

## Test Strategy
The tests in `firestore.rules.test.ts` will verify these rejections.
