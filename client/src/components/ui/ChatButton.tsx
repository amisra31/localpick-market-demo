import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatThreads } from "@/hooks/useChatThreads";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  /**
   * Button size variant
   * @default "default"
   */
  size?: "default" | "sm" | "lg" | "icon";
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to show the "Chat" text label
   * @default true
   */
  showLabel?: boolean;
  
  /**
   * Whether to show unread count badge
   * @default true
   */
  showUnreadBadge?: boolean;
  
  /**
   * Button variant
   * @default "outline"
   */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

/**
 * Reusable ChatButton component with consistent routing and unread count functionality
 * 
 * Features:
 * - Consistent /chat routing across all pages
 * - Real-time unread message count display
 * - Responsive design with mobile-friendly layout
 * - Automatic authentication check
 * - Edge case handling (no auth, no unread messages)
 * - Customizable appearance and behavior
 */
export const ChatButton = ({
  size = "default",
  className,
  showLabel = true,
  showUnreadBadge = true,
  variant = "outline"
}: ChatButtonProps) => {
  const { isAuthenticated } = useAuth();
  const { getTotalUnreadCount } = useChatThreads();

  // Don't render if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const unreadCount = getTotalUnreadCount();
  const hasUnreadMessages = showUnreadBadge && unreadCount > 0;

  return (
    <Link to="/chat">
      <Button 
        variant={variant} 
        size={size} 
        className={cn(
          "gap-2 hover:bg-blue-50 transition-colors relative",
          className
        )}
      >
        <MessageSquare className="w-4 h-4" />
        
        {/* Chat label - responsive visibility */}
        {showLabel && (
          <span className="hidden sm:inline">Chat</span>
        )}
        
        {/* Unread count badge */}
        {hasUnreadMessages && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 min-w-[20px] text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  );
};

/**
 * Compact ChatButton variant for headers and navigation bars
 */
export const CompactChatButton = (props: Omit<ChatButtonProps, 'size'>) => (
  <ChatButton {...props} size="sm" />
);

/**
 * Icon-only ChatButton variant for mobile or minimal layouts
 */
export const IconChatButton = (props: Omit<ChatButtonProps, 'size' | 'showLabel'>) => (
  <ChatButton {...props} size="icon" showLabel={false} />
);