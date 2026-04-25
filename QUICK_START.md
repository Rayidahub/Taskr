# 🚀 Quick Start Guide - Task Notifications

## What's New?

### ✨ Feature 1: Time & Date Picker for Tasks
Each task can now have a specific due date and time.

**How to use:**
1. Click the **"+ due time"** button that appears when you hover over a task
2. A datetime picker appears at the bottom of the task card
3. Select your preferred date and time
4. Click **"Save due time"**

### 🔔 Feature 2: Customizable Notifications
Get notified BEFORE your task is due!

**How to use:**
1. Click the edit (✏) button on a task with a due time
2. You'll see notification preset buttons: **[5 min] [15 min] [30 min] [1 hour]**
3. Click your preferred time to receive the notification
4. The selected button will highlight in purple ✨
5. Click **"Save due time"** when done

**Example:** If you set a task due at 2:00 PM and select "15 min", you'll get a notification at 1:45 PM

### 🔊 Feature 3: Optional Sound Alerts
Add audio notifications to your alerts!

**How to use:**
1. Click the edit (✏) button on any task with a due time
2. Click the **🔊** button to toggle sound on/off
3. When enabled, you'll hear a pleasant alert sound with notifications
4. Your preference saves automatically

### ⏰ Feature 4: Real-time Due Status
Task due times are shown with live updates:

- **✓ Completed** - Task is done
- **⚠ Overdue!** - Task is past due (red badge pulses)
- **⏱ 5m 23s left** - Less than your notification time remaining
- **⏰ Due 25 Apr, 14:00** - Normal due time display

## Visual Layout

### When Editing a Task Due Time:

```
┌─────────────────────────────────────┐
│ Task title                          │
├─────────────────────────────────────┤
│ [DateTime Picker: ▼]                │
│                                     │
│ Notify me:                          │
│ [5 min] [15 min] [30 min] [1 hour] 🔊 │
│                                     │
│ [Save due time]  [Clear due time]   │
└─────────────────────────────────────┘
```

## Timeline Example

**Scenario:** Task due at 2:00 PM with "15 min" notification

```
1:45 PM → 🔔 Notification received "Due soon: Your Task"
          🔊 Alert sound plays (if enabled)
          
2:00 PM → 🔔 Notification received "Task due now: Your Task"
          ⚠️ Badge shows "Overdue!" (red pulsing badge)
          
After   → Task shows ⚠ Overdue! badge until you mark it done
```

## Settings Saved Automatically

Your notification preferences are saved to your browser and persist across sessions:
- ✅ Current notification timing (5/15/30 min or 1 hour)
- ✅ Sound enabled/disabled status
- ✅ All task due dates and times (server-side)

## Tips & Tricks

1. **Change notification timing anytime** - Click edit and select a different preset
2. **Test notifications** - Set a due time for 1 minute from now and watch for alerts
3. **Sound only when needed** - Toggle 🔊 only when you want audio alerts
4. **Bulk assign due times** - Edit one task at a time (no bulk edit yet)
5. **Clear due times** - Click "Clear due time" to remove due dates completely

## Troubleshooting

### Not getting notifications?
- ✅ Make sure you allowed notifications when the banner appeared
- ✅ Check browser notification settings for this website
- ✅ Ensure task is not marked as done

### Sound not working?
- ✅ Check browser audio/volume settings
- ✅ Ensure 🔊 button is enabled in task editor
- ✅ Try clicking "Save due time" to trigger refresh

### Due time not saving?
- ✅ Ensure you clicked "Save due time" button
- ✅ Check browser console for errors (F12)
- ✅ Verify server is running (Go backend)

## Browser Support

- ✅ Chrome/Edge 50+
- ✅ Firefox 48+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note:** Notifications may be disabled on mobile in certain scenarios. Desktop browsers are recommended for best notification experience.
