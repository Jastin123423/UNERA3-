import React from 'react';
import { Notification, User } from '../types';

interface NotificationDropdownProps {
    notifications: Notification[];
    users: User[];
    currentUserId: string; // Current logged-in user ID
    onNotificationClick: (n: Notification) => void;
    onMarkAllRead: () => void;
    onNotificationClose?: () => void; // Optional close handler
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
    notifications, 
    users, 
    currentUserId, 
    onNotificationClick, 
    onMarkAllRead,
    onNotificationClose
}) => {
    
    // Filter out self-generated notifications (backend should handle this, but double-check here)
    const filteredNotifications = notifications.filter(notif => 
        notif.senderId !== currentUserId
    );
    
    // For debugging: show self-notifications differently if needed
    const showSelfNotifications = false; // Set to true for debugging
    const displayNotifications = showSelfNotifications 
        ? notifications 
        : filteredNotifications;

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': 
                return (
                    <div className="w-7 h-7 bg-[#1877F2] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-thumbs-up text-white text-xs"></i>
                    </div>
                );
            case 'comment': 
                return (
                    <div className="w-7 h-7 bg-[#45BD62] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-comment-alt text-white text-xs"></i>
                    </div>
                );
            case 'follow': 
                return (
                    <div className="w-7 h-7 bg-[#1877F2] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-user-plus text-white text-xs"></i>
                    </div>
                );
            case 'birthday': 
                return (
                    <div className="w-7 h-7 bg-[#FAB400] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-birthday-cake text-white text-xs"></i>
                    </div>
                );
            case 'share': 
                return (
                    <div className="w-7 h-7 bg-[#1877F2] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-share text-white text-xs"></i>
                    </div>
                );
            case 'post': 
                return (
                    <div className="w-7 h-7 bg-[#E4A11B] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-newspaper text-white text-xs"></i>
                    </div>
                );
            default: 
                return (
                    <div className="w-7 h-7 bg-[#3A3B3C] rounded-full flex items-center justify-center border-2 border-[#242526]">
                        <i className="fas fa-bell text-white text-xs"></i>
                    </div>
                );
        }
    };

    const getTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
        if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
        return `${Math.floor(seconds / 2592000)}mo`;
    };

    const handleNotificationClick = (notif: Notification) => {
        // Don't process clicks on self-notifications
        if (notif.senderId === currentUserId) return;
        onNotificationClick(notif);
    };

    const getNotificationContent = (notification: Notification, senderName: string) => {
        // Customize content based on type if needed
        if (notification.type === 'post' && notification.content.includes('posted')) {
            return `${senderName} posted something new`;
        }
        return notification.content;
    };

    const isSelfNotification = (senderId: string) => {
        return senderId === currentUserId;
    };

    return (
        <div className="absolute top-12 right-0 w-[360px] bg-[#242526] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-[#3E4042] z-50 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-[#3E4042]">
                <h3 className="text-[20px] font-bold text-[#E4E6EB]">Notifications</h3>
                <button 
                    onClick={onNotificationClose}
                    className="text-[#B0B3B8] hover:text-[#E4E6EB] p-1 rounded-full hover:bg-[#3A3B3C]"
                    aria-label="Close notifications"
                >
                    <i className="fas fa-times text-lg"></i>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-3 border-b border-[#3E4042]">
                <div className="flex gap-2 overflow-x-auto">
                    <span className="bg-[#263951] text-[#2D88FF] px-3 py-1.5 rounded-full text-[15px] font-semibold cursor-pointer whitespace-nowrap">
                        All
                    </span>
                    <span className="hover:bg-[#3A3B3C] px-3 py-1.5 rounded-full text-[15px] font-semibold cursor-pointer text-[#E4E6EB] whitespace-nowrap">
                        Unread
                    </span>
                    <span 
                        className="hover:bg-[#3A3B3C] px-3 py-1.5 rounded-full text-[15px] font-semibold cursor-pointer text-[#E4E6EB] whitespace-nowrap"
                        onClick={onMarkAllRead}
                    >
                        Mark all read
                    </span>
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-2">
                {displayNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-[#3A3B3C] flex items-center justify-center mb-4">
                            <i className="fas fa-bell-slash text-[#B0B3B8] text-2xl"></i>
                        </div>
                        <p className="text-[#E4E6EB] text-lg font-semibold mb-2">No notifications</p>
                        <p className="text-[#B0B3B8] text-sm">When you get notifications, they'll show up here</p>
                    </div>
                ) : (
                    displayNotifications.map(notif => {
                        const sender = users.find(u => u.id === notif.senderId);
                        if (!sender) return null;

                        const isSelf = isSelfNotification(notif.senderId);
                        const notificationContent = getNotificationContent(notif, sender.name);

                        return (
                            <div 
                                key={notif.id} 
                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                    isSelf 
                                        ? 'bg-[#1C1E21] opacity-60 cursor-not-allowed' 
                                        : notif.read 
                                            ? 'hover:bg-[#3A3B3C]' 
                                            : 'bg-[#263951] hover:bg-[#2A3F5A]'
                                }`}
                                onClick={() => !isSelf && handleNotificationClick(notif)}
                            >
                                {/* Avatar with Icon */}
                                <div className="relative flex-shrink-0">
                                    <img 
                                        src={sender.profileImage} 
                                        alt={sender.name} 
                                        className="w-14 h-14 rounded-full object-cover border-2 border-[#3A3B3C]"
                                    />
                                    <div className="absolute -bottom-1 -right-1">
                                        {getIcon(notif.type)}
                                    </div>
                                    {isSelf && (
                                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center">
                                            <i className="fas fa-user text-white text-xs"></i>
                                        </div>
                                    )}
                                </div>

                                {/* Notification Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[15px] leading-snug text-[#E4E6EB]">
                                                <span className="font-bold">{sender.name}</span> {notificationContent}
                                            </p>
                                            <span className={`text-[13px] font-semibold ${
                                                isSelf 
                                                    ? 'text-[#65676B]' 
                                                    : notif.read 
                                                        ? 'text-[#B0B3B8]' 
                                                        : 'text-[#2D88FF]'
                                            }`}>
                                                {getTimeAgo(notif.timestamp)}
                                            </span>
                                        </div>
                                        {!notif.read && !isSelf && (
                                            <div className="w-2 h-2 bg-[#2D88FF] rounded-full mt-2 ml-2 flex-shrink-0"></div>
                                        )}
                                    </div>
                                    
                                    {/* Show self notification indicator */}
                                    {isSelf && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <i className="fas fa-info-circle text-[#B0B3B8] text-xs"></i>
                                            <span className="text-[11px] text-[#B0B3B8] italic">
                                                Your own action
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#3E4042]">
                <button 
                    className="w-full py-2.5 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] font-semibold rounded-lg transition-colors duration-200"
                    onClick={() => {
                        console.log("See all notifications clicked");
                    }}
                >
                    See all notifications
                </button>
                <div className="mt-3 text-center">
                    <span className="text-xs text-[#B0B3B8]">
                        {displayNotifications.length} notification{displayNotifications.length !== 1 ? 's' : ''}
                        {showSelfNotifications && notifications.length !== displayNotifications.length && (
                            <span className="text-[#F02849] ml-1">
                                ({notifications.length - displayNotifications.length} hidden self-notifications)
                            </span>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};
