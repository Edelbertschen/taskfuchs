# Taskfuchs Multi-User Collaboration Concept

## Executive Summary

This document outlines the concept for adding team collaboration features to Taskfuchs. The goal is to enable small teams (up to 5 people) to work together on projects while maintaining individual workspaces for personal task management.

**Key Principle**: Projects become shared spaces, while Planner and Pins remain personal views.

---

## 1. Core Concept

### 1.1 Separation of Concerns

| Area | Scope | Description |
|------|-------|-------------|
| **Projects** | Team | Shared workspace where team members collaborate on tasks |
| **Planner** | Individual | Personal day-based task view (only shows own tasks) |
| **Pins** | Individual | Personal pinned tasks (each user can pin independently) |
| **Inbox** | Individual | Personal task inbox |

### 1.2 Key Features Overview

1. **Project Membership** - Users can be assigned to projects
2. **Task Assignment** - Tasks within projects can be assigned to team members
3. **Comments & Mentions** - Discussion threads on tasks with @mention support
4. **Notifications** - In-app alerts for assignments, mentions, and deadlines
5. **Filtering** - View all tasks or filter by assignee in projects

---

## 2. Constraints & Scope

### 2.1 What This IS

- Web App only (Microsoft Login required)
- Small teams (max 5 members per project)
- Self-hosted solution (we control the backend)
- Real-time collaboration (online only)
- In-app notifications

### 2.2 What This IS NOT

- No PWA collaboration (PWA stays offline/local)
- No email notifications
- No offline sync for team features
- No complex role hierarchies (just owner/member)
- No external integrations for notifications

---

## 3. User Roles & Permissions

### 3.1 Project Roles

| Role | Description |
|------|-------------|
| **Owner** | The user who created the project. Full control. Cannot leave (must delete or transfer). |
| **Member** | Invited team member. Can create, edit, and complete tasks. Cannot delete project. |

### 3.2 Permission Matrix

| Action | Owner | Member |
|--------|-------|--------|
| View project & tasks | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Edit any task | ✅ | ✅ |
| Complete any task | ✅ | ✅ |
| Delete own tasks | ✅ | ✅ |
| Delete others' tasks | ✅ | ❌ |
| Assign tasks | ✅ | ✅ |
| Add comments | ✅ | ✅ |
| Add/remove members | ✅ | ❌ |
| Edit project settings | ✅ | ❌ |
| Delete project | ✅ | ❌ |
| Leave project | ❌ | ✅ |

---

## 4. Feature Specifications

### 4.1 Project Membership

#### Adding Members
- Project owner opens project settings/context menu
- Selects "Manage Members" or "Add Member"
- Searches for users by name or email (must have Taskfuchs account)
- Assigns user to project
- User receives notification about being added

#### Removing Members
- Only owner can remove members
- Removed user loses access immediately
- Tasks assigned to removed user stay in project (reassign or mark unassigned)

#### Leaving a Project
- Members can leave voluntarily
- Owner cannot leave (must transfer ownership or delete project)
- When leaving, assigned tasks become unassigned

#### Visual Indicators
- Project header shows member avatars (small circles)
- Tooltip on hover shows member names
- Member count badge on project in sidebar

### 4.2 Task Assignment

#### Assigning Tasks
- In TaskModal: Dropdown to select assignee from project members
- Option: "Unassigned" (default for new tasks)
- Quick-assign via context menu on TaskCard

#### Visual Display
- TaskCard shows assignee avatar (small, bottom-right corner)
- Unassigned tasks show no avatar or generic icon
- Assigned tasks in "my" filter include tasks assigned to current user

#### Assignment Notifications
- When a task is assigned to someone, they receive a notification
- Notification includes: Task title, assigner name, project name

### 4.3 Comments & Mentions

#### Comment System
- Comments section in TaskModal (below description)
- Chronological list, newest at bottom
- Markdown support for formatting
- Each comment shows: Author avatar, name, timestamp, content

#### @Mentions
- Type `@` to trigger user autocomplete
- Shows project members only
- Mentioned users receive notification
- Mentioned names are highlighted/linked in comment

#### Comment Actions
- Edit own comments (within 24h or always - TBD)
- Delete own comments
- Owner can delete any comment

### 4.4 Notifications

#### Notification Types

| Type | Trigger | Message Example |
|------|---------|-----------------|
| `project_invite` | Added to project | "Max added you to project 'Website Redesign'" |
| `assignment` | Task assigned | "Lisa assigned you to 'Fix login bug'" |
| `mention` | @mentioned in comment | "Tom mentioned you in 'API Documentation'" |
| `comment` | Comment on assigned task | "Sarah commented on 'Review PR #42'" |
| `deadline` | Task deadline approaching | "Deadline tomorrow: 'Submit report'" |

#### Notification UI
- Bell icon in header with unread count badge
- Dropdown shows recent notifications
- Click notification → navigate to task/project
- Mark as read on click or "Mark all read" button
- No email notifications (in-app only)

#### Deadline Reminders
- Daily job checks for approaching deadlines
- Notifies ALL project members (not just assignee)
- Configurable: 1 day before, on deadline day

### 4.5 Filtering in Projects

#### New Filter Options
- Add "Assignee" filter to CompactFilterBar (in Projects view only)
- Options: "All", "Mine", "Unassigned", or specific team member

#### "My Tasks" Quick Filter
- Prominent toggle or button: "Show only my tasks"
- Filters across all columns in project
- Persisted per-project in user preferences

---

## 5. Data Model Changes

### 5.1 New Database Tables

#### ProjectMember
Links users to projects with roles.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| projectId | string | FK to Column (project) |
| userId | string | FK to User |
| role | enum | "owner" or "member" |
| addedBy | string | FK to User who invited |
| addedAt | datetime | Timestamp |

#### TaskComment
Stores comments on tasks.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| taskId | string | FK to Task |
| authorId | string | FK to User |
| content | string | Markdown content |
| mentions | string[] | Array of mentioned User IDs |
| createdAt | datetime | Timestamp |
| editedAt | datetime? | Last edit timestamp |

#### Notification
Stores user notifications.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| userId | string | FK to User (recipient) |
| type | enum | Notification type |
| referenceType | enum | "task", "project", "comment" |
| referenceId | string | ID of referenced entity |
| triggeredBy | string | FK to User who caused it |
| message | string | Display message |
| read | boolean | Read status |
| createdAt | datetime | Timestamp |

### 5.2 Modified Tables

#### Task (add fields)
| Field | Type | Description |
|-------|------|-------------|
| assigneeId | string? | FK to User |
| assignedAt | datetime? | When assigned |
| assignedBy | string? | FK to User who assigned |

#### Column (add fields)
| Field | Type | Description |
|-------|------|-------------|
| ownerId | string? | FK to User (for projects only) |

---

## 6. API Endpoints

### 6.1 Project Members

```
GET    /api/projects/:id/members     → List project members
POST   /api/projects/:id/members     → Add member to project
DELETE /api/projects/:id/members/:userId → Remove member
```

### 6.2 Task Assignment

```
PATCH  /api/tasks/:id/assignee       → Assign/unassign task
       Body: { assigneeId: string | null }
```

### 6.3 Comments

```
GET    /api/tasks/:id/comments       → List task comments
POST   /api/tasks/:id/comments       → Add comment
PATCH  /api/comments/:id             → Edit comment
DELETE /api/comments/:id             → Delete comment
```

### 6.4 Notifications

```
GET    /api/notifications            → List user's notifications
PATCH  /api/notifications/:id/read   → Mark as read
POST   /api/notifications/read-all   → Mark all as read
DELETE /api/notifications/:id        → Delete notification
```

### 6.5 User Search

```
GET    /api/users/search?q=...       → Search users for member picker
```

---

## 7. Frontend Components

### 7.1 New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `UserAvatar` | Common | Small avatar circle with tooltip |
| `UserPicker` | Common | Dropdown to select user (assignment, member add) |
| `ProjectMembersPanel` | Projects | Modal/panel to manage project members |
| `CommentSection` | TaskModal | List of comments with input |
| `CommentItem` | TaskModal | Single comment display |
| `MentionInput` | Common | Textarea with @mention autocomplete |
| `NotificationBell` | Header | Bell icon with dropdown |
| `NotificationItem` | Header | Single notification in dropdown |
| `AssigneeFilter` | CompactFilterBar | Dropdown to filter by assignee |

### 7.2 Modified Components

| Component | Changes |
|-----------|---------|
| `TaskCard` | Add assignee avatar display |
| `TaskModal` | Add assignee picker, comments section |
| `ProjectKanbanBoard` | Add member avatars in header, member management |
| `CompactFilterBar` | Add assignee filter (in Projects only) |
| `Header` | Add NotificationBell |

---

## 8. Conflict Handling

### 8.1 Strategy: Optimistic Locking

Since multiple users can edit the same task:

1. Each task has `updatedAt` timestamp
2. When saving, include `expectedUpdatedAt` in request
3. Server checks if task was modified since
4. If conflict: Return 409 Conflict with current task state
5. Client shows merge dialog: "This task was modified. Review changes?"

### 8.2 Merge Dialog Options

- **Keep mine**: Overwrite with local changes
- **Keep theirs**: Discard local, reload their version
- **View diff**: Show side-by-side comparison (optional, phase 2)

### 8.3 Real-Time Updates (Optional Enhancement)

For better UX, consider WebSocket-based live updates:
- When task is updated, push to all project members
- Show "Task was updated" toast
- Auto-refresh task list

This is optional for MVP but recommended for polish.

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Extend Prisma schema (ProjectMember, ownerId on Column)
- [ ] Auto-set ownerId when creating projects
- [ ] API: Project members CRUD
- [ ] UI: ProjectMembersPanel (add/remove members)
- [ ] UI: Member avatars in project header
- [ ] Access control middleware (check project membership)

### Phase 2: Task Assignment (Week 2-3)
- [ ] Extend Task model (assigneeId, assignedAt, assignedBy)
- [ ] API: Task assignment endpoint
- [ ] UI: UserPicker component
- [ ] UI: Assignee picker in TaskModal
- [ ] UI: Assignee avatar on TaskCard
- [ ] UI: AssigneeFilter in CompactFilterBar
- [ ] "My Tasks" filter logic

### Phase 3: Comments & Mentions (Week 3-4)
- [ ] Create TaskComment model
- [ ] API: Comments CRUD
- [ ] MentionParser service (extract @mentions from text)
- [ ] UI: CommentSection in TaskModal
- [ ] UI: MentionInput with autocomplete
- [ ] Comment edit/delete functionality

### Phase 4: Notifications (Week 4-5)
- [ ] Create Notification model
- [ ] NotificationService (create notifications on events)
- [ ] API: Notifications endpoints
- [ ] UI: NotificationBell in header
- [ ] UI: NotificationItem display
- [ ] Mark as read functionality
- [ ] Deadline reminder job (daily cron)

### Phase 5: Polish & Edge Cases (Week 5-6)
- [ ] Conflict detection and merge dialog
- [ ] Error handling for removed members
- [ ] Loading states for all new features
- [ ] Mobile responsiveness
- [ ] Performance optimization (pagination, caching)
- [ ] Testing all permission combinations

---

## 10. Edge Cases & Considerations

### 10.1 User Removal Scenarios

| Scenario | Behavior |
|----------|----------|
| Member leaves project | Their assigned tasks become "unassigned" |
| Member is removed | Same as above |
| Owner deletes account | Transfer ownership required before deletion |
| Assigned user deletes account | Task becomes unassigned |

### 10.2 Data Visibility

- Users can only see projects they're members of
- Task list APIs must filter by project membership
- Comments are visible to all project members
- Notifications are private to recipient

### 10.3 Personal Views Integration

- **Planner**: Shows tasks where `assigneeId === currentUser.id` (from any project)
- **Pins**: Users can pin any task they have access to (personal pin state)
- **Today view**: Shows assigned tasks due today
- **Inbox**: Remains personal (no shared inbox)

---

## 11. Security Considerations

### 11.1 Access Control Checklist

- [ ] All project endpoints check membership
- [ ] Task CRUD checks project membership via task.projectId
- [ ] Comment CRUD checks project membership via task
- [ ] Only owner can modify project settings/members
- [ ] User search excludes sensitive info (just id, name, avatar)

### 11.2 Data Isolation

- API responses must not leak other users' personal data
- Notifications only sent to intended recipients
- No cross-project data access

---

## 12. Future Considerations (Out of Scope)

These are NOT part of this implementation but may be considered later:

- [ ] Email notifications
- [ ] Mobile push notifications
- [ ] PWA team sync (offline support)
- [ ] Multiple project owners
- [ ] Guest/viewer role (read-only)
- [ ] Project templates
- [ ] Activity log/audit trail
- [ ] File attachments
- [ ] Task dependencies between team members
- [ ] Workload view (who has how many tasks)

---

## 13. Success Metrics

How do we know this feature is successful?

1. **Adoption**: X% of users create team projects within 30 days
2. **Engagement**: Average comments per task in team projects
3. **Retention**: Team project users have higher retention
4. **Performance**: API response times remain under 200ms

---

## Appendix A: Existing Tech Stack

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL |
| ORM | Prisma 6.1 |
| Backend | Hono (Node.js) |
| Auth | Microsoft OAuth (existing) |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| State | React Context |
| i18n | react-i18next |

---

## Appendix B: Related Files

Key files to understand before starting:

| File | Purpose |
|------|---------|
| `server/prisma/schema.prisma` | Database schema |
| `server/src/routes/*.ts` | API endpoints |
| `src/context/AppContext.tsx` | Frontend state management |
| `src/components/Kanban/ProjectKanbanBoard.tsx` | Project view |
| `src/components/Tasks/TaskModal.tsx` | Task editing modal |
| `src/components/Tasks/TaskCard.tsx` | Task display card |
| `src/components/Common/CompactFilterBar.tsx` | Filter UI |
| `src/components/Layout/Header.tsx` | App header |

---

*Document Version: 1.0*  
*Created: January 2026*  
*Author: AI Assistant with Human Review*
