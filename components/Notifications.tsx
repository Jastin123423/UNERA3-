// In your main component (e.g., Header.tsx)
const Header = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const currentUser = useCurrentUser(); // Your auth hook

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            const data = await notificationService.getUserNotifications(currentUser.id);
            setNotifications(data);
        };
        fetchNotifications();
    }, [currentUser.id]);

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        markNotificationAsRead(notification.id);
        
        // Navigate to relevant page
        if (notification.type === 'post' && notification.postId) {
            navigate(`/post/${notification.postId}`);
        }
        setShowNotifications(false);
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead(currentUser.id);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <header>
            {/* Notification bell */}
            <button onClick={() => setShowNotifications(!showNotifications)}>
                <i className="fas fa-bell"></i>
                {notifications.filter(n => !n.read && n.senderId !== currentUser.id).length > 0 && (
                    <span className="notification-badge">
                        {notifications.filter(n => !n.read && n.senderId !== currentUser.id).length}
                    </span>
                )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowNotifications(false)}
                    />
                    
                    {/* Dropdown */}
                    <NotificationDropdown
                        notifications={notifications}
                        users={[]} // Pass users data
                        currentUserId={currentUser.id}
                        onNotificationClick={handleNotificationClick}
                        onMarkAllRead={handleMarkAllRead}
                        onNotificationClose={() => setShowNotifications(false)}
                    />
                </>
            )}
        </header>
    );
};
