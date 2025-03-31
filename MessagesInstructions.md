# Messages Page Implementation Guide

## Categories in Messages
The Messages page consists of two main categories:
- **Direct Messages**
- **Group Chats**

A blue underline should be used to indicate the currently active category.

---
## Direct Messages (DM)
### Features Already Implemented:
- Suggested users at the top.
- Existing direct message lists.

### Features to Implement:
#### 1. Chat Header
- Display the username of the person we are chatting with.
- Add an **information icon** on the header.
- Clicking the information icon should open a **right-side panel** displaying chat details:
  - Username
  - When the conversation started
  - Other important information (if available)
  - **Block** and **Report** buttons
  - **View Profile** button (Routes to the user's profile page)
  - **Delete All Messages** option (Deletes messages from ONE SIDE only)
  - **Ensure proper route implementations** for all actions.

---
## Group Chats (GC)
### Features to Implement:
#### 1. Navigation & UI
- Group chat section should not display suggested users.
- A **dedicated button** should be added within the **group chat tab** for creating a new group.

#### 2. Group Info Panel
- Clicking **group profile picture, group name, or info icon** should open a **right-side panel**.
- This panel should display **group information and settings**.
- If the user is an **admin**, they should be able to:
  - **Promote a member to admin**
  - **Edit group description**
  - **Edit group name**
  - **Upload a group profile picture** (Use `editprofile.tsx` implementation)
  - **Remove the group profile picture**
    - Ensure that removing/changing the picture deletes it from `backend/uploads/group-images/`.
  - **Remove a member from the group**

#### 3. Admin Actions & Messages
- When an admin takes action, a system message should be displayed in the chat:
  - `{User} was removed from the group.`
  - `{User} was promoted to admin.`
  - `{User} was added to the group.`

#### 4. Group Chat Deletion & Leaving
- **Leave Group Option**: Members can leave the group chat.
- **Delete All Messages**: Clears messages from the user's side only.
- **End Group Chat (For Admins Only)**: Stops updating the chat for all members.
- When a user is **removed from the group**:
  - The chat should appear **discolored**.
  - The last message should display: `You were removed from the group.`
  - They should not receive further updates.
  - They should only be able to leave the chat.

---
## Component Structure for Better Code Organization
To maintain clean and reusable code, the following components should be created separately:

### 1. `CreateGroupButton.tsx`
- A button placed within the group chat tab for creating a new group.
- Triggers the **Group Making Interface** modal when clicked.

### 2. `GroupMakingInterface.tsx`
- A centered modal allowing users to create a group.
- Contains:
  - **Group Name Input Field** (Required)
  - **Group Description Input Field** (Optional)
  - **User Selection List** (Max 8 users, searchable)
- Ensure enough space to comfortably add users and configure settings.

### 3. `ChatInfoPanel.tsx`
- A reusable right-side panel component for displaying chat details.
- Should be **adaptable** for both **Direct Messages** and **Group Chats**.
  - In **DM**, it displays user info and chat options.
  - In **Group Chat**, it displays group settings and admin options.

---
## Important Notes:
- **Maintain visual consistency** with existing color schemes and designs.
- Check the **existing database and routes** before implementing any changes.
- **Ensure proper toast notifications** for all user actions (colored feedback for success/failure).
- **Properly link all actions to routes and database** without unnecessary modifications.

