# 📬 Task Notifications Enhancement

## Features Added

### 1. **Customizable Notification Timing**
- Choose when to receive notifications before task due time:
  - 5 minutes before (default)
  - 15 minutes before
  - 30 minutes before
  - 1 hour before
- Settings persist in browser localStorage
- Click any preset button when editing a task to change notification timing

### 2. **Time & Date Picker for Each Task**
The app now has:
- **DateTime Input**: Set precise due date and time for each task
- **Inline Editor**: Click "+ due time" or "✏ edit" button on any task to open the picker
- **Real-time Updates**: Due time badges update every second showing:
  - ✓ Completed (for done tasks)
  - ⚠ Overdue! (when past due)
  - ⏱ Countdown (when < configured notification time)
  - ⏰ Due date (normal state)

### 3. **Push Notification System**
The app sends browser notifications at two key moments:
- **Due Time Alert**: When task is due (time has passed)
- **Advance Warning**: X minutes before (based on your setting)

Notifications include:
- Task title and description
- Unique tag to prevent duplicate notifications
- Auto-dismiss after 7 seconds
- Visual notification badges with different styles

### 4. **Optional Sound Notifications**
- Toggle sound alerts with 🔊 button in the notification settings
- Plays a pleasant alert sound when notifications are triggered
- Can be enabled/disabled at any time

### 5. **Enhanced Inline Picker UI**
When you edit a task's due time, you'll see:
```
[DateTime Picker Input]
Notify me:
[5 min] [15 min] [30 min] [1 hour] [🔊]
[Save due time] [Clear due time]
```

## How to Use

### Setting a Due Time
1. Click "+ due time" on any task, or "✏ edit" if already has a due time
2. Pick your date and time from the datetime picker
3. (Optional) Click one of the preset buttons to set notification timing
4. (Optional) Enable sound notifications with 🔊 button
5. Click "Save due time"

### Updating Notification Settings
- Global default: 5 minutes before task is due
- Per-task: Click edit button and choose different preset times
- Your preference saves automatically

### Clearing Due Time
1. Click "✏ edit" on a task with due time
2. Click "Clear due time"

## Technical Details

### Storage
- Notification settings saved to `localStorage` under key `taskr_notif_settings`
- Settings persist across browser sessions
- Contains: `minutesBefore` (number) and `soundEnabled` (boolean)

### Notification Triggers
The app checks every second:
1. If task is overdue → sends "Task due now" notification
2. If task is within X minutes of due time → sends "Due soon" notification
3. Only sends once per notification type (uses `fired` Set to track)

### Sound
- Uses Web Audio API to generate simple alert tones
- 2 quick beeps (800Hz and 1000Hz)
- No external audio files needed
- Can be disabled without affecting notifications

## Browser Requirements
- Modern browser with Notification API support
- localStorage support for settings persistence
- Web Audio API for sound (optional)

## Accessibility
- All buttons labeled with title attributes
- Keyboard navigable (Tab, Enter, Escape)
- Toast messages provide feedback for all actions
- Dark mode friendly design
