# Backend Board Creation and Invite Link Implementation

## Backend Tasks
- [x] Review canvas schema (roomId, creator fields available)
- [x] Review createBoard endpoint (returns Canvas with roomId and creator)
- [x] Confirm backend API ready for invite link generation

## Frontend Implementation Guide
To implement invite link generation in frontend:

1. Update createBoard function to call backend API:
   ```typescript
   async function createBoard(name: string, creator: string): Promise<{roomId: string, creator: string}> {
     const res = await fetch(`${BASE_URL}/create`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ roomId: uuid(), name, creator }),
     });
     if (!res.ok) throw new Error(`createBoard failed: ${res.status}`);
     return res.json();
   }
   ```

2. Generate invite link in NewBoardModal:
   ```typescript
   const inviteUrl = boardId && creatorId
     ? `${window.location.origin}/invite?boardId=${boardId}&userId=${creatorId}`
     : "";
   ```

3. Update NewBoardModal to accept creatorId prop and show invite link

## Testing
- [ ] Test board creation via backend API
- [ ] Test invite link generation and copying
- [ ] Test invite link functionality (if implemented)
