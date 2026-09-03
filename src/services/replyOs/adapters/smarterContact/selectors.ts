/**
 * Unverified placeholders for Smarter Contact Messenger.
 * Must be confirmed against the real DOM before this poller is reliable.
 */
export const SMARTER_CONTACT_SELECTORS = {
  threadList: '[data-testid="thread-list"], .conversation-list, [class*="thread-list"]',
  threadItem: '[data-testid="thread-item"], .conversation-item, [class*="thread-item"]',
  unreadThread: '[data-unread="true"], .unread, [class*="unread"]',
  threadId: '[data-thread-id]',
  threadPhone: '[data-phone], .phone, [class*="phone"]',
  threadSnippet: '.snippet, [data-snippet], [class*="snippet"]',
  messageList: '[data-testid="message-list"], .message-list, [class*="message-list"]',
  messageItem: '[data-testid="message"], .message-item, [class*="message-item"]',
  messageId: '[data-message-id]',
  messageBody: '.message-body, [data-body], [class*="body"]',
  messageOutbound: '[data-outbound="true"], .outbound, [class*="outbound"]',
  messageTime: 'time, [data-sent-at], [datetime]',
} as const
