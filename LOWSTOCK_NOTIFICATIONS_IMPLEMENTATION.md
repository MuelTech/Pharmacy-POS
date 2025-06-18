# Low Stock Notifications Implementation

## Overview
This implementation adds login-based low stock notifications that appear as toast notifications in the top-right corner when staff or admin users log in to the system.

## Features Implemented

### 1. Trigger Conditions
- **Primary Trigger**: Activates when any product's stock falls below its reorder_level
- **Session Control**: Shows only once per login session to avoid spam
- **User Scope**: Available for both staff and admin users

### 2. Visual Design
- **Position**: Top-right corner of the screen
- **Style**: Non-intrusive toast/snackbar with red border for urgency
- **Animation**: Smooth slide-in from right with bounce effect
- **Auto-close**: Automatically disappears after 10 seconds
- **Manual close**: Users can dismiss manually with X button

### 3. Content Structure
- **Header**: Warning icon (⚠️) + "Low Stock Alert!" title
- **Message**: Count of low stock products
- **Product List**: Up to 3 products with stock details
- **Action Text**: Guidance to check inventory and reorder

## Technical Implementation

### Components Created

#### 1. `LowStockNotification.jsx`
**Location**: `frontend/src/components/LowStockNotification.jsx`

**Features**:
- Reusable notification component
- Animated entrance/exit
- Responsive design
- Auto-close functionality
- Product list display (max 3 items)

**Props**:
- `isVisible` (boolean): Controls notification visibility
- `onClose` (function): Callback for closing notification
- `lowStockCount` (number): Total count of low stock products
- `lowStockProducts` (array): Array of low stock product objects

#### 2. `LowStockNotification.css`
**Location**: `frontend/src/components/LowStockNotification.css`

**Features**:
- Fixed positioning with high z-index
- Red border with urgency styling
- Smooth animations with cubic-bezier transitions
- Responsive breakpoints for mobile devices
- Pulse animation for warning icon

### Custom Hook

#### `useLowStockNotification.js`
**Location**: `frontend/src/hooks/useLowStockNotification.js`

**Features**:
- Session management using sessionStorage
- "Show once per login" functionality
- Automatic low stock checking
- Integration with existing stock utility functions

**Returns**:
- `showNotification`: Boolean for notification visibility
- `closeNotification`: Function to close notification
- `lowStockProducts`: Array of low stock products
- `lowStockCount`: Count of low stock products
- `resetNotificationForNewSession`: Function to reset session

### Integration Points

#### 1. StaffDashboard Integration
**File**: `frontend/src/pages/staff/StaffDashboard.jsx`

**Changes**:
- Import notification hook and component
- Add notification state management
- Reset notification session on logout
- Render notification component

#### 2. AdminDashboard Integration
**File**: `frontend/src/pages/admin/AdminDashboard.jsx`

**Changes**:
- Import notification hook and component
- Add notification state management
- Reset notification session on logout
- Render notification component

## Session Management

### How "Once Per Login" Works

1. **Session ID Generation**: Unique session ID created on first hook use
2. **Notification Tracking**: Tracks if notification was shown for current session
3. **Storage**: Uses `sessionStorage` to persist during browser session
4. **Reset**: Clears tracking data on logout to enable notification for next login

### Storage Keys
- `lowStockNotificationShown`: Stores session ID when notification was shown
- `loginSessionId`: Current login session identifier

## Notification Logic Flow

```
User Login → Dashboard Load → Hook Initialization → Check Low Stock Products → 
Filter Products Below Reorder Level → Check Session Status → Show Notification (if not shown) → 
Mark as Shown → Auto-close After 10s
```

## Example Scenarios

### Scenario 1: First Login with Low Stock
1. User logs in to dashboard
2. System finds 3 products below reorder level
3. Notification appears: "3 products are running low on stock"
4. Shows list of products with stock details
5. Notification auto-closes after 10 seconds
6. Subsequent page refreshes don't show notification

### Scenario 2: No Low Stock Products
1. User logs in to dashboard
2. System checks all products
3. No products below reorder level found
4. No notification is shown

### Scenario 3: Logout and Re-login
1. User logs out (session reset)
2. User logs back in
3. If low stock products exist, notification shows again

## Visual Examples

### Notification Appearance
```
┌─────────────────────────────────────┐
│ ⚠️  Low Stock Alert!             × │
├─────────────────────────────────────┤
│ 3 products are running low on stock │
│                                     │
│ • Paracetamol 500mg                 │
│   Stock: 5 (Reorder: 10)           │
│ • Amoxicillin 250mg                 │
│   Stock: 3 (Reorder: 15)           │
│ • Ibuprofen 400mg                   │
│   Stock: 8 (Reorder: 20)           │
│                                     │
│ Please check inventory and reorder  │
│ soon.                               │
└─────────────────────────────────────┘
```

## Responsive Design

### Desktop (>768px)
- Fixed width: 350px
- Positioned: 20px from top-right

### Tablet (≤768px)
- Full width with margins: 10px left/right
- Adjusted padding and font sizes

### Mobile (≤480px)
- Full width with margins: 5px left/right
- Compact padding and smaller fonts

## Testing Instructions

### 1. Setup Test Scenario
1. Set reorder levels for products in Admin Inventory
2. Reduce product stock below reorder levels
3. Log out of the system

### 2. Test Notification Display
1. Log back in as staff or admin
2. Verify notification appears in top-right corner
3. Check notification content accuracy
4. Test manual close button
5. Wait for auto-close after 10 seconds

### 3. Test "Once Per Login" Feature
1. Refresh the page
2. Navigate between dashboard sections
3. Verify notification doesn't appear again
4. Log out and log back in
5. Verify notification appears again

### 4. Test No Low Stock Scenario
1. Increase all product stock above reorder levels
2. Log out and log back in
3. Verify no notification appears

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile browsers**: Responsive design support

## Performance Considerations

- **Lazy Loading**: Notification only loads when needed
- **Session Storage**: Lightweight storage for session tracking
- **Optimized Queries**: Uses existing product API endpoints
- **Minimal Re-renders**: Efficient React hooks implementation

## Future Enhancements

- Sound alerts for urgent low stock
- Email notifications integration
- Configurable auto-close timing
- Admin settings for notification preferences
- Bulk reorder functionality from notification 