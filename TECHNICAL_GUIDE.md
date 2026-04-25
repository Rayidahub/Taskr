# 💻 Technical Implementation Guide

## Files Modified

### 1. **app.js** - Main JavaScript Logic
Added notification settings management and enhanced functionality.

#### New State Variables:
```javascript
let notificationSettings = {
  enabled: true,
  minutesBefore: 5,        // 5, 15, 30, or 60 minutes
  soundEnabled: false      // Toggle for audio alerts
};
```

#### New Functions:

**`loadSettings()`**
- Loads notification settings from localStorage
- Called on app boot before initNotifications()
- Gracefully handles missing/invalid data

**`saveSettings()`**
- Saves notification settings to localStorage
- Called whenever settings change
- Uses key: `taskr_notif_settings`

**Enhanced `sendNotification()`**
- Added optional sound generation using Web Audio API
- Plays two quick beeps (800Hz and 1000Hz) when enabled
- No external audio files needed
- Duration: ~0.3 seconds per notification

**Enhanced `tick()`**
- Now uses `notificationSettings.minutesBefore` instead of hardcoded 61000ms
- Cleaner notification messages with actual minute counts
- Better handling of task completion state

**Enhanced `showInlinePicker()`**
- Added `notif-presets` section with 4 preset buttons
- Added sound toggle button (🔊)
- Shows active setting with visual highlight
- Event handlers for all preset buttons
- Automatic localStorage saving

#### Modified Boot Section:
```javascript
loadSettings();           // ← NEW: Load settings first
initNotifications();
fetchTasks().then(...);
setInterval(tick, 1000);
```

---

### 2. **style.css** - Styling
Added new CSS rules for notification presets UI.

#### New Classes:

**`.notif-presets`**
- Container for notification settings section
- Flex column layout with borders
- Fade-in animation

**`.notif-label`**
- Label text styling
- Purple color, uppercase, reduced font size

**`.preset-buttons`**
- Flexbox container for preset buttons
- Wrap support for responsive design

**`.preset-btn`**
- Individual preset button styling
- Hover: purple border + background
- Active state: glowing box-shadow + filled background
- Smooth transitions (0.15s)

**`.sound-toggle`**
- Custom checkbox styling with 🔊 emoji
- Flex container, square shape (36x32px)
- Hover state with purple tint
- Checkbox hidden (display: none)
- Animation on state change

**`@keyframes pulse-sound`**
- Animation for sound button when toggled
- Scale from 1.0 → 1.15 → 1.0
- 400ms duration

---

### 3. **index.html** - Markup
Minor update to the due time hint text.

**Updated:** Due hint text from "optional — leave blank to skip" 
**To:** "optional — set notification timing after adding"

---

## Data Flow Diagram

```
App Boot
   ↓
loadSettings() → Read from localStorage
   ↓
initNotifications() → Request browser permission
   ↓
User sets due date on task
   ↓
User clicks edit button
   ↓
showInlinePicker() → Display presets + sound toggle
   ↓
User clicks preset button (5/15/30/60 min)
   ↓
saveSettings() → Write to localStorage
   ↓
tick() runs every 1 second
   ↓
Check if task is within notificationSettings.minutesBefore
   ↓
If true → sendNotification() → Play sound if enabled
   ↓
Mark as fired in Set to prevent duplicates
```

---

## Notification Logic

### Trigger Points:

**1. Due Soon (Before Due Time)**
```javascript
const notifyMs = notificationSettings.minutesBefore * 60 * 1000;
if (st.diff > 0 && st.diff <= notifyMs && !fired.has(`warn-${id}`)) {
  // Send notification
  minLeft = Math.ceil(st.diff / 60000);
  // Message: "${minLeft} minute(s) remaining!"
}
```

**2. Due Now (Task is Overdue)**
```javascript
if (st.diff < 0 && !fired.has(`due-${id}`)) {
  // Send notification "Task due now!"
}
```

### Firing Prevention:
Uses a `Set` called `fired` to track which notifications have been sent:
- Keys: `due-${taskId}` and `warn-${taskId}`
- Cleared when: Task is reopened (`apiToggle`) or due time is changed (`apiSetDue`)
- Prevents duplicate notifications

---

## Sound Generation (Web Audio API)

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// Create two beeps:
// - Beep 1: 800Hz for 150ms
// - Beep 2: 1000Hz for 150ms (150ms after first)
// - Gain: 0.3 (not too loud)
// - Envelope: exponential ramp for natural decay
```

**Browser Compatibility:**
- Chrome/Edge: `AudioContext` ✅
- Firefox: `AudioContext` ✅
- Safari: `webkitAudioContext` ✅
- Mobile: Supported (may be muted by device settings)

---

## LocalStorage Schema

**Key:** `taskr_notif_settings`
**Format:** JSON object

```json
{
  "enabled": true,
  "minutesBefore": 15,
  "soundEnabled": true
}
```

**Fallback Values:** If localStorage is empty, uses default object:
```javascript
let notificationSettings = {
  enabled: true,
  minutesBefore: 5,
  soundEnabled: false
};
```

---

## Event Flow: User Clicks Preset Button

```
User clicks [15 min] button
   ↓
addEventListener('click') fires
   ↓
notificationSettings.minutesBefore = 15
   ↓
saveSettings() → localStorage.setItem()
   ↓
Visual feedback:
   - Remove 'active' class from all buttons
   - Add 'active' class to clicked button
   ↓
toast() shows: "📬 Will notify 15 min before due time"
   ↓
tick() now checks: st.diff <= (15 * 60 * 1000)
```

---

## Event Flow: Sound Toggle

```
User checks 🔊 checkbox
   ↓
addEventListener('change') fires
   ↓
notificationSettings.soundEnabled = true
   ↓
saveSettings() → localStorage.setItem()
   ↓
toast() shows: "🔊 Sound notifications enabled"
   ↓
Next sendNotification():
   - Creates AudioContext
   - Generates 2-beep tone sequence
   - Plays through device speakers
```

---

## API Integration

No changes to backend API required. All new features work on the frontend:
- ✅ Settings stored in browser localStorage (not server)
- ✅ Notifications triggered by client-side tick()
- ✅ Due times sent to server as ISO strings (existing)
- ✅ Backward compatible with existing /api/tasks

---

## Performance Considerations

1. **tick() runs every 1 second**
   - Small memory footprint
   - DOM queries only on tasks with due_at
   - Efficient Set lookup for fired notifications

2. **Audio generation**
   - Only occurs when notification sent + soundEnabled=true
   - Creates new AudioContext per notification (minimal)
   - Released immediately after (garbage collected)

3. **localStorage**
   - Single JSON object, < 100 bytes
   - Read once at boot
   - Write only on setting change

---

## Testing Checklist

- [ ] Create task with due time 1 minute from now
- [ ] Verify toast notification appears at due time
- [ ] Verify browser notification appears (if enabled)
- [ ] Click edit and select "30 min" preset
- [ ] Verify notification arrives 30 min before due time
- [ ] Toggle sound and verify beep on next notification
- [ ] Refresh page and verify settings persist
- [ ] Mark task done and verify notification no longer fires
- [ ] Reopen task and verify notification fires again
- [ ] Clear due time and verify notification stops

---

## Future Enhancements

- [ ] Per-task notification sound selection
- [ ] Recurring task support (daily, weekly, etc.)
- [ ] Task duration estimates
- [ ] Email notifications (requires backend)
- [ ] Snooze notifications (5 min / 10 min / 30 min)
- [ ] Custom notification message
- [ ] Multiple due dates per task
- [ ] Calendar view of due tasks
