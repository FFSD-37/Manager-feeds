# Manager User Management System - Implementation Guide

## Overview
This comprehensive user management system allows managers to view, monitor, and take actions on users (Normal, Kids, and Channels). The system provides detailed user profiles, post management, report tracking, and moderation capabilities.

## Architecture

### Backend Enhancements (Manager Server)

#### New Endpoints Added to `/routes/moderation.js`

1. **Get User Details**
   - **Endpoint**: `GET /moderation/user/:username`
   - **Purpose**: Retrieves comprehensive user profile information
   - **Returns**:
     ```json
     {
       "user": {
         "username": "john_doe",
         "fullName": "John Doe",
         "email": "john@example.com",
         "phone": "+1234567890",
         "type": "Normal|Kids|Channel",
         "bio": "User bio...",
         "followers": [...],
         "followings": [...],
         "profilePicture": "url",
         "isPremium": true/false,
         "coins": 100,
         "$
": "Public|Private",
         "followersCount": 50,
         "followingsCount": 100
       }
     }
     ```

2. **Get User Posts**
   - **Endpoint**: `GET /moderation/user/:username/posts`
   - **Purpose**: Retrieves all posts by a specific user (up to 50 latest)
   - **Returns**:
     ```json
     {
       "posts": [
         {
           "_id": "mongo_id",
           "id": "post_id",
           "type": "Reels|Img",
           "content": "Post content...",
           "url": "media_url",
           "likes": 10,
           "dislikes": 2,
           "isArchived": false,
           "warnings": 0,
           "createdAt": "ISO_DATE"
         }
       ],
       "count": 5
     }
     ```

3. **Get User Reports**
   - **Endpoint**: `GET /moderation/user/:username/reports`
   - **Purpose**: Get both reports against and made by a user
   - **Returns**:
     ```json
     {
       "reportedByUser": [...],
       "reportsAgainstUser": [...]
     }
     ```

4. **Warn User**
   - **Endpoint**: `POST /moderation/user/:username/warn`
   - **Body**:
     ```json
     {
       "reason": "Reason for warning"
     }
     ```
   - **Action**: Creates a manager action log entry

5. **Ban User**
   - **Endpoint**: `POST /moderation/user/:username/ban`
   - **Body**:
     ```json
     {
       "reason": "Reason for banning",
       "duration": "optional_duration"
     }
     ```
   - **Action**: Sets `isBanned` flag on user (requires migration to add this field)

### Frontend Components (Manager Client)

#### State Management
```javascript
// User Detail Management
const [selectedUser, setSelectedUser] = useState(null);
const [userDetailOverlayOpen, setUserDetailOverlayOpen] = useState(false);
const [userPosts, setUserPosts] = useState([]);
const [userReports, setUserReports] = useState({ reportedByUser: [], reportsAgainstUser: [] });
const [userDetailTab, setUserDetailTab] = useState("profile");
const [userWarnReason, setUserWarnReason] = useState("");
const [userBanReason, setUserBanReason] = useState("");
const [searchQuery, setSearchQuery] = useState("");
```

#### Key Functions

**openUserDetails(user)**
- Fetches user's posts and reports
- Opens detailed user overlay
- Populates all user information

**closeUserDetailsOverlay()**
- Closes overlay and resets state
- Clears temporary form data

**handleWarnUser()**
- Sends warning to backend
- Creates manager action log
- Updates UI with confirmation

**handleBanUser()**
- Bans user account
- Reloads user list
- Logs action for audit trail

**handleRemoveUserPost(post)**
- Confirms user action
- Archives post with reason
- Updates posts list

**filteredUsers**
- Real-time search across username, email, and full name
- Memoized for performance

## UI Features

### Users Tab Enhanced Interface

#### Search Bar
- Real-time search by username, email, or name
- Shows count of filtered results
- Responsive design

#### User Cards
- Avatar with initial letter
- Username and email display
- User type badge (Normal/Kids/Channel)
- Followers count
- Premium status indicator
- Click to open detailed profile

#### User Detail Overlay

**Profile Tab**
- Complete user information in detail grid
- Followers / Following counts
- Account status (Premium, visibility)
- User bio section
- Joined date, gender, phone

**Posts Tab**
- List of all user posts
- Post type indicator (Reels/Images)
- Post date
- Content preview
- Like and comment counts
- Media preview (image/video)
- Remove post button for moderation

**Reports Tab**
- Two-way reporting system
  - "Reports Against This User" - complaints filed against them
  - "Reports Made By This User" - complaints they filed
- Report reason and status
- Reporter information
- Timestamp

**Actions Tab**
- **Warn User Section**
  - Text area for warning reason
  - Issue Warning button
  - Creates audit log entry
  
- **Ban User Section** (with danger styling)
  - Red-themed UI to indicate severity
  - Text area for ban reason
  - Ban User button
  - Sends to backend to flag account

## Access Control

### Manager Type Restrictions
```javascript
// User Manager can only access:
- Normal users
- Users (not Kids)

// Kids Manager can only access:
- Kids accounts

// Channel Manager can only access:
- Channels
```

All endpoints validate manager type against user type to prevent unauthorized access.

## CSS Styling

### New CSS Classes
- `.users-management` - Main container
- `.search-bar` - Search input section
- `.user-card` - Individual user card
- `.user-detail-overlay` - Detail view popup
- `.user-detail-tabs` - Tab navigation
- `.detail-grid` - User info grid layout
- `.posts-list` - Posts container
- `.post-item` - Individual post item
- `.reports-section` - Reports container
- `.action-section` - Action forms section

### Design Tokens Used
- Color scheme: Modern dark theme with blue accent
- Spacing: Consistent 8px/12px/16px grid
- Typography: DM Sans (body), DM Mono (code)
- Shadows and elevation: Multi-level shadows for depth
- Transitions: 150ms cubic-bezier for smooth animations

## Database Migrations Needed

To fully support all features, add this field to User schema:

```javascript
// In models/user_schema.js
{
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  bannedAt: {
    type: Date,
    default: null
  }
}
```

## Usage Flow

### Basic User Management
1. Go to Users tab (or "Kids Accounts" if Kids Manager)
2. Search for user by username, email, or name
3. Click on user card to open detailed profile
4. Choose tab to view different information:
   - **Profile**: See all user details
   - **Posts**: Review and remove inappropriate content
   - **Reports**: Check complaint history
   - **Actions**: Issue warnings or bans

### Typical Moderation Scenario
1. Manager receives report about a user
2. Opens user detail overlay
3. Reviews all posts in "Posts" tab
4. Checks "Reports" tab to see complaint history
5. If necessary, removes specific posts
6. Can issue warning or ban via "Actions" tab
7. System logs all actions for audit trail

## Performance Optimizations

1. **Memoization**: `filteredUsers` uses `useMemo` to prevent unnecessary re-filters
2. **Lazy Loading**: User details only fetched when overlay is opened
3. **Parallel Requests**: Posts and reports loaded simultaneously with `Promise.all()`
4. **Pagination**: Posts limited to 50 latest (can be adjusted)
5. **Efficient Search**: Client-side filtering for instant feedback

## Security Considerations

1. **Manager Type Validation**: All endpoints check manager permissions
2. **Authentication**: All requests include credentials
3. **Authorization**: Users can only access their assigned user type scope
4. **Audit Logging**: All actions (warn, ban, remove post) logged with manager info
5. **Confirmation Dialogs**: Delete actions require user confirmation

## Error Handling

- API errors displayed in banner message
- User-friendly error messages
- Disabled buttons during loading
- Try-catch blocks for all async operations
- Proper error propagation to UI

## Future Enhancements

1. **Soft Deletes**: Implement proper user account deletion (soft delete)
2. **Bulk Actions**: Select multiple users for batch operations
3. **Advanced Filters**: Filter users by premium status, join date, etc.
4. **Analytics**: Charts showing user growth, report trends
5. **Export**: CSV export of user lists and reports
6. **Webhooks**: Notify other systems of user actions
7. **Rate Limiting**: Prevent action spam
8. **Approval Workflow**: Create app-wide policies for actions

## Testing

### Manual Testing Checklist
- [ ] Search functionality filters correctly
- [ ] User card click opens overlay
- [ ] All tabs load appropriate data
- [ ] Posts can be removed
- [ ] Warn user saves with reason
- [ ] Ban user updates state
- [ ] Mobile responsive design works
- [ ] Permission levels enforced
- [ ] Error states handled gracefully

## Support

For issues or questions about this implementation, refer to:
- Backend: `/Manager-feeds/manager-server/routes/moderation.js`
- Frontend: `/Manager-feeds/manager-client/src/App.jsx`
- Styles: `/Manager-feeds/manager-client/src/App.css`
