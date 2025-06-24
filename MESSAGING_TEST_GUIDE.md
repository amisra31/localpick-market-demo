# Real-Time Messaging System Test Guide

## Overview
The messaging system has been enhanced with WebSocket support for real-time communication between customers and merchants. This guide helps test all messaging features.

## Features Implemented

### ✅ Real-Time Communication
- **WebSocket Server**: Located at `/ws` endpoint
- **Auto-reconnection**: Handles connection drops gracefully
- **Message Broadcasting**: Instant delivery to all participants in a chat
- **Connection Status**: Visual indicators for live/offline status

### ✅ Message Persistence
- **Database Storage**: All messages stored in `direct_messages` table
- **Chat History**: Complete conversation history loaded on chat open
- **Message IDs**: Unique identifiers prevent duplicates
- **Timestamps**: Accurate message timing with timezone support

### ✅ User Identity & Session Control
- **Authentication**: Only authenticated users can access chat
- **Role-Based Access**: Customer and merchant specific interfaces
- **User Display**: Clear sender identification in chat UI
- **Guest Support**: Guest users can initiate conversations

### ✅ Real-Time Features
- **Instant Message Delivery**: No page refresh needed
- **Auto-scroll**: Automatically scrolls to latest messages
- **Live Status**: Connection indicators show real-time status
- **Notifications**: Toast notifications for new messages

## Testing Instructions

### Prerequisites
1. **Start the server**: `npm run dev` or `npm start`
2. **Verify WebSocket**: Check console for "WebSocket server initialized" message
3. **Open browser dev tools**: Monitor WebSocket connections in Network tab

### Test Scenario 1: Customer-Merchant Chat
1. **Customer Login**:
   - Login as customer: `customer@demo.com` / `demo123`
   - Navigate to any product page
   - Click "Chat with Merchant" button

2. **Merchant Login** (in another browser/tab):
   - Login as merchant: `merchant@demo.com` / `demo123`
   - Go to Shop Owner Dashboard
   - Open "Customer Messages" section

3. **Real-Time Messaging Test**:
   - Customer sends message: "Hello, I'm interested in this product"
   - Verify merchant receives message instantly (no refresh needed)
   - Merchant replies: "Hi! How can I help you?"
   - Verify customer sees reply immediately
   - Check connection status shows "Live" on both sides

### Test Scenario 2: Message Persistence
1. **Send Messages**: Exchange several messages between customer and merchant
2. **Close Chat**: Customer closes chat dialog
3. **Reopen Chat**: Customer reopens chat dialog
4. **Verify History**: All previous messages should be displayed
5. **Refresh Page**: Reload browser page
6. **Check Persistence**: Message history remains intact

### Test Scenario 3: Multiple Customers
1. **Customer A**: Login and start chat with merchant
2. **Customer B**: Login as different customer and start chat with same merchant
3. **Merchant View**: Merchant should see both conversations in conversation list
4. **Isolated Chats**: Messages from Customer A should not appear in Customer B's chat
5. **Switching**: Merchant can switch between conversations

### Test Scenario 4: Connection Resilience
1. **Start Chat**: Begin conversation between customer and merchant
2. **Network Interruption**: Simulate network loss (disable WiFi briefly)
3. **Connection Status**: Status should change to "Offline"
4. **Auto-Reconnect**: Connection should restore automatically when network returns
5. **Message Sync**: Any pending messages should be delivered

### Test Scenario 5: Guest User Chat
1. **No Login**: Access product page without logging in
2. **Start Chat**: Click "Chat with Merchant"
3. **Guest Messaging**: Send message as guest user
4. **Merchant Response**: Merchant should receive and can reply to guest
5. **Guest Identity**: Guest should be identified appropriately in merchant interface

## Expected WebSocket Events

### Connection Events
- `connection_established`: Confirms WebSocket connection
- `auth_success`: User authentication confirmed
- `chat_joined`: Successfully joined chat session

### Message Events
- `message_received`: New message broadcast to participants
- `user_joined`: User joined chat session
- `user_left`: User left chat session
- `message_read_receipt`: Message read confirmation

### Error Events
- `error`: WebSocket or message errors

## Verification Checklist

### ✅ Basic Functionality
- [ ] Customer can send messages
- [ ] Merchant can send messages
- [ ] Messages appear instantly on both sides
- [ ] Message history loads correctly
- [ ] Connection status indicators work

### ✅ Real-Time Features
- [ ] No page refresh needed for new messages
- [ ] Auto-scroll to latest message
- [ ] Toast notifications for new messages
- [ ] WebSocket connection auto-reconnects

### ✅ Data Persistence
- [ ] Messages persist after chat close/reopen
- [ ] Messages persist after page refresh
- [ ] Complete conversation history available
- [ ] No duplicate messages

### ✅ User Experience
- [ ] Clear sender identification
- [ ] Responsive chat interface
- [ ] Loading states for messages
- [ ] Error handling for failed messages

### ✅ Security & Access
- [ ] Only authenticated users can chat
- [ ] Users only see their own conversations
- [ ] Guest users handled appropriately
- [ ] No cross-conversation message leakage

## Browser Developer Tools Verification

### WebSocket Connection
1. Open **Network tab** in dev tools
2. Filter by **WS** (WebSocket)
3. Verify WebSocket connection to `/ws`
4. Monitor message flow in WebSocket frames

### Console Logs
Look for these log messages:
- "WebSocket connected"
- "WebSocket authentication successful"
- "Successfully joined chat"
- "Received message from [clientId]"

### Database Verification
Check `direct_messages` table in SQLite database:
```sql
SELECT * FROM direct_messages ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Common Issues
1. **No WebSocket Connection**: Check server startup logs for WebSocket initialization
2. **Messages Not Appearing**: Verify WebSocket connection in Network tab
3. **Duplicate Messages**: Check for multiple WebSocket connections
4. **Connection Drops**: Normal for development; should auto-reconnect

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debug', 'websocket,chat');
```

## Performance Notes
- WebSocket connections are automatically cleaned up on disconnect
- Message history is loaded efficiently on chat open
- Real-time updates reduce server polling load
- Connection heartbeat maintains stable connections

## Production Considerations
- WebSocket server scales with HTTP server
- Message database can handle high volume
- Auto-reconnection handles network issues
- Connection monitoring provides reliability metrics