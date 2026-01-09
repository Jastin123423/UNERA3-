import { User, Post, Story, Reel, LocationData, Event, Group, Song, Album, Podcast, Episode, Brand, Reaction } from './types';

// Facebook-style relative time formatter (same as in App.tsx and Feed.tsx)
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const diffInSeconds = Math.floor(diff / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks}w`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months}mo`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `${years}y`;
    }
};

// ... (rest of your imports and other constants remain the same) ...

export const INITIAL_USERS: User[] = [
    {
        id: 0,
        name: 'UNERA',
        firstName: 'UNERA',
        lastName: 'Admin',
        profileImage: 'https://ui-avatars.com/api/?name=UNERA&background=1877F2&color=fff',
        coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Official Admin Account of UNERA Social.',
        location: 'Global',
        isOnline: true,
        followers: [1, 2, 3, 4, 5, 6], 
        following: [],
        email: 'chapchaputz@gmail.com',
        password: '52775277',
        isVerified: true,
        role: 'admin',
        joinedDate: '2023-01-01',
        interests: ['community', 'news']
    },
    { 
        id: 1, 
        name: 'Sarah Chen', 
        firstName: 'Sarah',
        lastName: 'Chen',
        profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Software Engineer @ TechCorp | Travel Enthusiast ✈️',
        work: 'Software Engineer at TechCorp',
        education: 'Studied Computer Science at Stanford University',
        location: 'San Francisco, California',
        isOnline: true,
        followers: [2, 3, 0],
        following: [0],
        email: 'habariforum@gmail.com',
        password: '527700',
        birthDate: '1994-09-24',
        gender: 'Female',
        nationality: 'Tanzania',
        isVerified: true,
        role: 'user',
        isMusician: true, // Marked as Musician for testing
        joinedDate: '2024-05-15',
        interests: ['tech', 'travel', 'coding']
    },
    { 
        id: 2, 
        name: 'David Kim', 
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        coverImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Photographer | Visual Storyteller 📸',
        work: 'Freelance Photographer',
        location: 'New York, USA',
        isOnline: true,
        followers: [1, 5, 6, 0],
        following: [0],
        nationality: 'United States',
        isVerified: true,
        role: 'user',
        joinedDate: '2025-01-10', // New User
        interests: ['photography', 'art', 'design']
    },
    { 
        id: 3, 
        name: 'Maria Rodriguez', 
        profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Digital Artist & Designer',
        work: 'Designer at CreativeStudio',
        education: 'Studied Design at RISD',
        location: 'Madrid, Spain',
        isOnline: false,
        followers: [1, 4, 0],
        following: [0],
        nationality: 'Spain',
        role: 'user',
        joinedDate: '2023-11-20',
        interests: ['art', 'design', 'fashion']
    },
    { 
        id: 4, 
        name: 'James Wilson', 
        profileImage: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        coverImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Nature Lover 🌲 | Hiking | Adventure',
        location: 'Denver, Colorado',
        isOnline: true,
        followers: [3, 5, 0],
        following: [0],
        nationality: 'United States',
        role: 'user',
        joinedDate: '2024-08-01',
        interests: ['nature', 'hiking', 'travel']
    },
    { 
        id: 5, 
        name: 'Emma Wilson', 
        profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        coverImage: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Foodie 🍕 | Lifestyle Blogger',
        work: 'Content Creator',
        isOnline: true,
        followers: [2, 4, 0],
        following: [0],
        nationality: 'Canada',
        isVerified: true,
        role: 'user',
        joinedDate: '2025-02-01', // New User
        interests: ['food', 'lifestyle', 'cooking']
    },
    { 
        id: 6, 
        name: 'Michael Brown', 
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        coverImage: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: 'Tech Enthusiast 📱',
        location: 'Austin, Texas',
        isOnline: false,
        followers: [2, 0],
        following: [0],
        nationality: 'United States',
        role: 'user',
        joinedDate: '2024-01-15',
        interests: ['tech', 'gaming']
    },
];

// FIXED: Added missing properties and formattedTime
export const INITIAL_POSTS: Post[] = [
    {
        id: 1,
        authorId: 1,
        content: "Just spent the weekend hiking in the Rockies. The views were absolutely breathtaking! 🏔️✨ #Nature #Hiking #WeekendVibes",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
        timestamp: Date.now() - 7200000, // 2 hours ago
        formattedTime: formatRelativeTime(Date.now() - 7200000),
        createdAt: Date.now() - 7200000,
        reactions: [{ userId: 2, type: 'love' as const }, { userId: 4, type: 'like' as const }],
        comments: [
            { 
                id: 1, 
                userId: 2, 
                text: "Wow, looks amazing!", 
                timestamp: Date.now() - 3600000,
                formattedTime: formatRelativeTime(Date.now() - 3600000),
                likes: 2,
                hasLiked: false,
                authorName: 'David Kim',
                authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
            },
            { 
                id: 2, 
                userId: 3, 
                text: "I need to go there!", 
                timestamp: Date.now() - 1800000,
                formattedTime: formatRelativeTime(Date.now() - 1800000),
                likes: 0,
                hasLiked: false,
                authorName: 'Maria Rodriguez',
                authorImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
            }
        ],
        shares: 12,
        type: 'image',
        visibility: 'Public',
        views: 1250,
        category: 'travel',
        tags: ['Nature', 'Hiking', 'WeekendVibes']
    },
    {
        id: 2,
        authorId: 4,
        content: "Excited to announce that I've just started a new position as Senior Frontend Engineer! 🚀💻 It's been a long journey but hard work pays off. #Career #TechLife",
        timestamp: Date.now() - 18000000, // 5 hours ago
        formattedTime: formatRelativeTime(Date.now() - 18000000),
        createdAt: Date.now() - 18000000,
        reactions: [{ userId: 1, type: 'like' as const }, { userId: 3, type: 'wow' as const }],
        comments: [],
        shares: 4,
        type: 'text',
        visibility: 'Public',
        views: 890,
        category: 'tech',
        tags: ['Career', 'TechLife']
    },
    {
        id: 3,
        authorId: 5,
        content: "Sunday brunch with the best crew! 🥞☕ #Foodie #Sunday",
        image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
        timestamp: Date.now() - 28800000, // 8 hours ago
        formattedTime: formatRelativeTime(Date.now() - 28800000),
        createdAt: Date.now() - 28800000,
        reactions: [{ userId: 1, type: 'love' as const }],
        comments: [],
        shares: 1,
        type: 'image',
        visibility: 'Friends',
        views: 450,
        category: 'food',
        tags: ['Foodie', 'Sunday']
    },
    {
        id: 4,
        authorId: 2,
        content: "Check out this amazing sunset from yesterday! #Sunset #Nature",
        video: "https://assets.mixkit.co/videos/preview/mixkit-sun-setting-over-the-ocean-1250-large.mp4",
        timestamp: Date.now() - 86400000, // 1 day ago
        formattedTime: formatRelativeTime(Date.now() - 86400000),
        createdAt: Date.now() - 86400000,
        reactions: [{ userId: 1, type: 'like' as const }],
        comments: [],
        shares: 23,
        type: 'video',
        visibility: 'Public',
        views: 5200,
        category: 'nature',
        tags: ['Sunset', 'Nature']
    },
    // New posts to test ranking
    {
        id: 5,
        authorId: 2, // New User (David Kim)
        content: "Just joined UNERA! Excited to share my photography journey here. 📸",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
        timestamp: Date.now() - 600000, // 10 minutes ago
        formattedTime: formatRelativeTime(Date.now() - 600000),
        createdAt: Date.now() - 600000,
        reactions: [],
        comments: [],
        shares: 0,
        type: 'image',
        visibility: 'Public',
        views: 50,
        category: 'photography',
        tags: ['NewHere', 'Photography']
    }
];

// FIXED: Add formattedTime to stories
export const INITIAL_STORIES: Story[] = [
    { 
        id: 1, 
        userId: 1, 
        image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        createdAt: Date.now(),
        formattedTime: formatRelativeTime(Date.now())
    },
    { 
        id: 2, 
        userId: 2, 
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        createdAt: Date.now(),
        formattedTime: formatRelativeTime(Date.now())
    },
    { 
        id: 3, 
        userId: 3, 
        image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        createdAt: Date.now(),
        formattedTime: formatRelativeTime(Date.now())
    },
    { 
        id: 4, 
        userId: 4, 
        image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', 
        createdAt: Date.now(),
        formattedTime: formatRelativeTime(Date.now())
    },
];

// FIXED: Add missing properties to reels
export const INITIAL_REELS: Reel[] = [
    { 
        id: 101, 
        userId: 2, 
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-mother-with-her-little-daughter-decorating-a-christmas-tree-39745-large.mp4", 
        caption: "Christmas vibes! 🎄✨", 
        songName: "Jingle Bell Rock", 
        createdAt: Date.now() - 3600000, // 1 hour ago
        formattedTime: formatRelativeTime(Date.now() - 3600000),
        reactions: [{ userId: 1, type: 'love' as const }, { userId: 3, type: 'like' as const }],
        comments: [], 
        shares: 2,
        isCompressed: false,
        views: 1500
    },
    { 
        id: 102, 
        userId: 5, 
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4", 
        caption: "City lights at night 🌃", 
        songName: "Blinding Lights - The Weeknd", 
        effectName: "Neon Glow",
        createdAt: Date.now() - 10800000, // 3 hours ago
        formattedTime: formatRelativeTime(Date.now() - 10800000),
        reactions: [{ userId: 1, type: 'wow' as const }],
        comments: [], 
        shares: 8,
        isCompressed: true,
        views: 3200
    },
    { 
        id: 103, 
        userId: 4, 
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4", 
        caption: "Nature is amazing 🌻", 
        songName: "Here Comes The Sun", 
        createdAt: Date.now() - 90000000, // ~1 day ago
        formattedTime: formatRelativeTime(Date.now() - 90000000),
        reactions: [{ userId: 2, type: 'like' as const }],
        comments: [], 
        shares: 0,
        isCompressed: false,
        views: 850
    },
];

// FIXED: Add missing properties to events
export const INITIAL_EVENTS: Event[] = [
    {
        id: 1,
        organizerId: 1,
        title: "Tech Meetup Arusha",
        description: "Networking for developers and tech enthusiasts in Arusha.",
        date: new Date(Date.now() + 86400000 * 2).toISOString(),
        time: "10:00 AM",
        location: "Arusha, Tanzania",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        attendees: [1, 2, 3],
        interestedIds: [4, 5],
        createdAt: Date.now() - 86400000,
        formattedTime: formatRelativeTime(Date.now() - 86400000)
    },
    {
        id: 2,
        organizerId: 5,
        title: "Food Festival",
        description: "Taste the best local dishes!",
        date: new Date(Date.now() + 86400000 * 5).toISOString(),
        time: "12:00 PM",
        location: "Zanzibar, Tanzania",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        attendees: [1, 5],
        interestedIds: [2, 3],
        createdAt: Date.now() - 172800000,
        formattedTime: formatRelativeTime(Date.now() - 172800000)
    }
];

// FIXED: Add formattedTime to group posts
export const INITIAL_GROUPS: Group[] = [
    {
        id: 'g1',
        name: 'Tech Enthusiasts',
        description: 'A community for tech lovers to discuss latest trends, gadgets, and coding.',
        type: 'public',
        image: 'https://ui-avatars.com/api/?name=Tech+Enthusiasts&background=1877F2&color=fff',
        coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        adminId: 1,
        members: [1, 2, 5],
        posts: [
            { 
                id: 201, 
                authorId: 1, 
                content: "Looking for recommendations for a new mechanical keyboard! ⌨️", 
                timestamp: Date.now() - 3600000,
                formattedTime: formatRelativeTime(Date.now() - 3600000),
                reactions: [{userId: 2, type: 'like' as const}], 
                comments: [], 
                shares: 0 
            },
            { 
                id: 202, 
                authorId: 5, 
                content: "Has anyone tried the new M3 MacBooks yet? Performance is crazy!", 
                timestamp: Date.now() - 7200000,
                formattedTime: formatRelativeTime(Date.now() - 7200000),
                reactions: [{userId: 1, type: 'love' as const}, {userId: 2, type: 'like' as const}], 
                comments: [], 
                shares: 1 
            }
        ],
        createdDate: Date.now() - 10000000
    },
    {
        id: 'g2',
        name: 'Photography Lovers',
        description: 'Share your best shots and get feedback from fellow photographers.',
        type: 'public',
        image: 'https://ui-avatars.com/api/?name=Photo+Lovers&background=F3425F&color=fff',
        coverImage: 'https://images.unsplash.com/photo-1452587925703-74955992012b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        adminId: 2,
        members: [2, 3, 4],
        posts: [
            { 
                id: 301, 
                authorId: 2, 
                content: "Golden hour in NYC is just different. 🌇", 
                image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80", 
                timestamp: Date.now() - 14400000,
                formattedTime: formatRelativeTime(Date.now() - 14400000),
                reactions: [{userId: 3, type: 'wow' as const}, {userId: 4, type: 'love' as const}], 
                comments: [], 
                shares: 2 
            }
        ],
        createdDate: Date.now() - 5000000
    }
];

// FIXED: Add followers array and createdDate to brands
export const INITIAL_BRANDS: Brand[] = [
    {
        id: 10001,
        name: 'Universe Official',
        description: 'The official brand page for Universe Social Network.',
        category: 'Technology Company',
        profileImage: 'https://ui-avatars.com/api/?name=Universe&background=1877F2&color=fff',
        coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        adminId: 0, 
        followers: [1, 2, 3, 4],
        location: 'Silicon Valley, USA',
        isVerified: true,
        createdAt: Date.now() - 50000000,
        posts: []
    },
    {
        id: 10002,
        name: 'Creative Hub',
        description: 'A place for digital creators to showcase their work.',
        category: 'Art',
        profileImage: 'https://ui-avatars.com/api/?name=Creative+Hub&background=F3425F&color=fff',
        coverImage: 'https://images.unsplash.com/photo-1452587925703-74955992012b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        adminId: 3, 
        followers: [1, 2, 5],
        location: 'Madrid, Spain',
        isVerified: false,
        createdAt: Date.now() - 30000000,
        posts: []
    }
];

export const TRANSLATIONS: Record<string, any> = {
    en: {
        tagline: "Connect with friends and the world around you on UNERA.",
        login_btn: "Log In",
        home: "Home",
        friends: "Friends",
        create_post_title: "Create Post",
        watch: "Watch"
    },
    sw: {
        tagline: "Ungana na marafiki...",
        home: "Nyumbani",
        create_post_title: "Unda Posti",
        watch: "Tazama"
    }
};
