# Messaging System Debug Guide

## 🔧 Quick Fixes Applied

### WebSocket Connection Issues
1. **Fixed server startup**: Corrected HTTP server initialization to properly support WebSocket
2. **Enhanced error handling**: Added try-catch blocks around WebSocket initialization
3. **Better connection logging**: Added detailed connection status logging

### Message Delivery Issues
1. **Added merchant API endpoint**: `/api/messages/shop/:shopId` for merchant message loading
2. **Fixed message broadcast**: Removed local state updates, now relies on WebSocket broadcast
3. **Corrected API calls**: Updated merchant interface to use proper shop-specific endpoint

### UI Improvements
1. **Connection status indicators**: Added Live/Offline badges for both customer and merchant
2. **Better error messages**: Enhanced WebSocket error handling with user feedback
3. **Debug logging**: Added comprehensive console logging for troubleshooting

## 🧪 Testing Steps

### 1. Check WebSocket Connection
**Open browser console and look for these logs:**
```
✅ "Attempting WebSocket connection..."
✅ "Connecting to WebSocket: ws://localhost:3001/ws"
✅ "WebSocket connected"
✅ "WebSocket authentication successful"
```

**If you see errors:**
- Check that server shows "WebSocket server initialized on port 3001"
- Verify no firewall is blocking WebSocket connections
- Try refreshing the page

### 2. Test Customer-Merchant Messaging
1. **Customer side**: 
   - Login as `customer@demo.com` / `demo123`
   - Go to any product page
   - Click "Chat with Merchant"
   - Look for green "Live" badge
   - Send message: "Hello from customer"

2. **Merchant side** (new browser tab):
   - Login as `merchant@demo.com` / `demo123`
   - Go to Shop Owner Dashboard
   - Click "Customer Messages"
   - Look for green "Live" badge
   - You should see customer's message instantly
   - Reply: "Hello from merchant"

3. **Customer should receive reply instantly**

### 3. Debug Console Commands
**To enable debug mode, run in browser console:**
```javascript
localStorage.setItem('debug', 'websocket,chat');
```

**To check WebSocket connection status:**
```javascript
// Should show WebSocket connection in Network tab (filter by WS)
```

## 🐛 Common Issues & Solutions

### "Connection Error" Red Tile
**Cause**: WebSocket server not running or connection failed
**Solution**: 
1. Restart server: `npm run dev`
2. Check console for "WebSocket server initialized"
3. Verify port 3001 is not blocked

### Messages Not Appearing
**Cause**: API endpoint mismatch or WebSocket not broadcasting
**Solution**:
1. Check Network tab for API calls to `/api/messages`
2. Look for WebSocket frames in Network tab
3. Verify user authentication in console

### Duplicate Messages
**Cause**: Both local state and WebSocket adding messages
**Solution**: This should be fixed in latest version - only WebSocket updates state

### Authentication Issues
**Cause**: User not properly authenticated with WebSocket
**Solution**:
1. Check for "WebSocket authentication successful" in console
2. Verify user is logged in before opening chat
3. Try logging out and back in

## 🔍 Expected Behavior

### Customer Experience
- ✅ Can open chat from any product page
- ✅ Sees "Live" connection status
- ✅ Messages send instantly without page refresh
- ✅ Receives merchant replies immediately
- ✅ Chat history persists across page reloads

### Merchant Experience  
- ✅ Sees list of customer conversations
- ✅ Can switch between different customers
- ✅ Receives new messages with toast notifications
- ✅ Can reply and see messages appear instantly
- ✅ Connection status shows "Live" when WebSocket connected

### Real-time Features
- ✅ No page refresh needed for new messages
- ✅ Auto-scroll to latest message
- ✅ Toast notifications for new messages
- ✅ Proper message ordering with timestamps
- ✅ Message persistence in database

## 📊 Performance Checks

### WebSocket Health
- Connection should establish within 2 seconds
- Auto-reconnect should work if connection drops
- No memory leaks from multiple connections

### Message Delivery
- Messages should appear instantly (< 1 second)
- No duplicate messages
- Proper conversation isolation

### Database Operations
- Messages persist across browser refresh
- Complete conversation history loads
- No data loss during real-time updates

## 🚀 Success Indicators

When everything is working correctly, you should see:

1. **Green "Live" badges** on both customer and merchant interfaces
2. **Instant message delivery** without page refresh
3. **Toast notifications** for new messages
4. **Proper conversation threading** in merchant interface
5. **Message persistence** after page reload
6. **No duplicate messages** in conversation
7. **Clear console logs** showing WebSocket lifecycle events

If all these indicators are present, the messaging system is fully functional!