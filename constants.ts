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

// Comprehensive List of Locations with Flags (Focus on World + Africa)
export const LOCATIONS_DATA: LocationData[] = [
    { name: "Arusha, Tanzania", flag: "🇹🇿" },
    { name: "Dar es Salaam, Tanzania", flag: "🇹🇿" },
    { name: "Dodoma, Tanzania", flag: "🇹🇿" },
    { name: "Zanzibar, Tanzania", flag: "🇹🇿" },
    { name: "Mwanza, Tanzania", flag: "🇹🇿" },
    { name: "Mbeya, Tanzania", flag: "🇹🇿" },
    { name: "Nairobi, Kenya", flag: "🇰🇪" },
    { name: "Mombasa, Kenya", flag: "🇰🇪" },
    { name: "Kampala, Uganda", flag: "🇺🇬" },
    { name: "Kigali, Rwanda", flag: "🇷🇼" },
    { name: "Lagos, Nigeria", flag: "🇳🇬" },
    { name: "Abuja, Nigeria", flag: "🇳🇬" },
    { name: "Accra, Ghana", flag: "🇬🇭" },
    { name: "Johannesburg, South Africa", flag: "🇿🇦" },
    { name: "Cape Town, South Africa", flag: "🇿🇦" },
    { name: "Cairo, Egypt", flag: "🇪🇬" },
    { name: "Addis Ababa, Ethiopia", flag: "🇪🇹" },
    { name: "London, United Kingdom", flag: "🇬🇧" },
    { name: "New York, USA", flag: "🇺🇸" },
    { name: "Los Angeles, USA", flag: "🇺🇸" },
    { name: "Paris, France", flag: "🇫🇷" },
    { name: "Berlin, Germany", flag: "🇩🇪" },
    { name: "Tokyo, Japan", flag: "🇯🇵" },
    { name: "Dubai, UAE", flag: "🇦🇪" },
    { name: "Beijing, China", flag: "🇨🇳" },
    { name: "Sydney, Australia", flag: "🇦🇺" },
    { name: "Toronto, Canada", flag: "🇨🇦" },
    { name: "Mumbai, India", flag: "🇮🇳" },
    { name: "New Delhi, India", flag: "🇮🇳" },
    { name: "Rio de Janeiro, Brazil", flag: "🇧🇷" },
    { name: "Moscow, Russia", flag: "🇷🇺" },
    { name: "Kinshasa, DRC", flag: "🇨🇩" },
    { name: "Luanda, Angola", flag: "🇦🇴" },
    { name: "Maputo, Mozambique", flag: "🇲🇿" },
    { name: "Lusaka, Zambia", flag: "🇿🇲" },
    { name: "Harare, Zimbabwe", flag: "🇿🇼" },
];

export const COUNTRIES = LOCATIONS_DATA.map(l => l.name); // Legacy support

export const MARKETPLACE_CATEGORIES = [
    { id: 'all', name: 'All Products' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'books', name: 'Books' },
    { id: 'services', name: 'Services' },
    { id: 'real_estate', name: 'Real Estate' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'clothing', name: 'Clothing' },
    { id: 'sports', name: 'Sports & Fitness' },
    { id: 'home_garden', name: 'Home & Garden' },
    { id: 'business', name: 'Business & Industrial' }
];

export const BRAND_CATEGORIES = [
    'Business', 'Personal Blog', 'Product/Service', 'Art', 'Musician/Band', 'Shopping & Retail', 'Health/Beauty', 'Technology Company', 'Local Business', 'Education'
];

export const MARKETPLACE_COUNTRIES = [
    { code: "all", name: "All Countries", currency: "", symbol: "", flag: "🌍" },
    { code: "TZ", name: "Tanzania", currency: "TZS", symbol: "TSh", flag: "🇹🇿" },
    { code: "KE", name: "Kenya", currency: "KES", symbol: "KSh", flag: "🇰🇪" },
    { code: "UG", name: "Uganda", currency: "UGX", symbol: "USh", flag: "🇺🇬" },
    { code: "NG", name: "Nigeria", currency: "NGN", symbol: "₦", flag: "🇳🇬" },
    { code: "ZA", name: "South Africa", currency: "ZAR", symbol: "R", flag: "🇿🇦" },
    { code: "ET", name: "Ethiopia", currency: "ETB", symbol: "Br", flag: "🇪🇹" },
    { code: "EG", name: "Egypt", currency: "EGP", symbol: "E£", flag: "🇪🇬" },
    { code: "GH", name: "Ghana", currency: "GHS", symbol: "GH₵", flag: "🇬🇭" },
    { code: "US", name: "United States", currency: "USD", symbol: "$", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧" },
    { code: "CN", name: "China", currency: "CNY", symbol: "¥", flag: "🇨🇳" },
    { code: "IN", name: "India", currency: "INR", symbol: "₹", flag: "🇮🇳" },
    { code: "AE", name: "UAE", currency: "AED", symbol: "AED", flag: "🇦🇪" }
];

export const REACTION_ICONS: Record<string, string> = {
    like: "👍",
    love: "❤️",
    haha: "😆",
    wow: "😮",
    sad: "😢",
    angry: "😡"
};

export const REACTION_COLORS: Record<string, string> = {
    like: "#1877F2",
    love: "#F3425F",
    haha: "#F7B928",
    wow: "#F7B928",
    sad: "#F7B928",
    angry: "#E41E3F"
};

// --- STICKERS DATA ---
// Using Pusheen and other cute gifs as placeholders for stickers
const stickerBase = [
    "https://media.giphy.com/media/l41Fj8afUOMY8vQc/giphy.gif",
    "https://media.giphy.com/media/10UeedrT5MIfPG/giphy.gif",
    "https://media.giphy.com/media/Wj7lNjMNDxSmc/giphy.gif",
    "https://media.giphy.com/media/26uf9MHun4QN24TEQ/giphy.gif",
    "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1ZnAzcHg2bXp1ZnAzcHg2bXp1ZnAzcHg2JmVwPXYxX2dpZnNfdHJlbmRpbmcmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif",
    "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif",
    "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif",
    "https://media.giphy.com/media/xT0xezQGU5xTFrJMA8/giphy.gif",
    "https://media.giphy.com/media/l0HlCqV35hdEg2GMU/giphy.gif",
    "https://media.giphy.com/media/l2JdZOq7j6H0hQ1i0/giphy.gif",
    "https://media.giphy.com/media/3o7TKDkDbIDJieo1sk/giphy.gif",
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif",
    "https://media.giphy.com/media/l41Yh18f5TDiOKi0o/giphy.gif",
    "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif"
];

// Replicate to simulate > 100 stickers
const generateStickers = (count: number) => {
    return Array.from({ length: count }).map((_, i) => stickerBase[i % stickerBase.length]);
};

export const STICKER_PACKS = {
    "All": generateStickers(30),
    "Happy": generateStickers(20),
    "Love": generateStickers(20),
    "Sad": generateStickers(15),
    "Celebration": generateStickers(15),
    "Angry": generateStickers(15),
    "Animals": generateStickers(25),
    "Funny": generateStickers(20)
};

export const EMOJI_LIST = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", 
    "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕",
    "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰",
    "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤",
    "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👺", "🤡", "💩", "👻", "💀",
    "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👉", "👇", "☝️", "✋", "🤚", "🖐️",
    "🖖", "👋", "🤙", "💪", "🦾", "🖕", "✍️", "🙏", "🦶", "🦵", "🦿", "💄", "💋", "👄", "🦷", "👅", "👂", "🦻", "👃", "👣", "👁️",
    "👀", "🧠", "🫀", "🫁", "🦴", "👤", "👥", "🗣️", "🫂"
];

const generateGifs = (category: string, count: number) => {
    const bases = [
        "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXp1ZnAzcHg2bXp1ZnAzcHg2bXp1ZnAzcHg2JmVwPXYxX2dpZnNfdHJlbmRpbmcmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif",
        "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif",
        "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif",
        "https://media.giphy.com/media/xT0xezQGU5xTFrJMA8/giphy.gif",
        "https://media.giphy.com/media/l0HlCqV35hdEg2GMU/giphy.gif",
        "https://media.giphy.com/media/l2JdZOq7j6H0hQ1i0/giphy.gif",
        "https://media.giphy.com/media/3o7TKDkDbIDJieo1sk/giphy.gif",
        "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
        "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif",
        "https://media.giphy.com/media/l41Yh18f5TDiOKi0o/giphy.gif",
        "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif", 
        "https://media.giphy.com/media/l0HlO3BJ8LALPW4sE/giphy.gif",
        "https://media.giphy.com/media/3o6Zt6ML6JmbCr3jzi/giphy.gif",
        "https://media.giphy.com/media/l0MYxVgD9EL1A3E1W/giphy.gif",
        "https://media.giphy.com/media/l2Jhtq2aG5cQZ40hy/giphy.gif",
        "https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif",
        "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif",
        "https://media.giphy.com/media/l0MYyDa8S9ghzJhWx/giphy.gif",
        "https://media.giphy.com/media/3o7TKNcbfKa8f2ZYYM/giphy.gif",
        "https://media.giphy.com/media/d2lcHJTG5TSCnT0I/giphy.gif",
        "https://media.giphy.com/media/7SF5scGB2AFrgsXP63/giphy.gif",
        "https://media.giphy.com/media/l0HlI1EyB8BVEHpDy/giphy.gif",
        "https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif",
        "https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif",
        "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
        "https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif",
        "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
        "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
        "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif",
        "https://media.giphy.com/media/l0ExkEkBl7x2UjWGS/giphy.gif",
        "https://media.giphy.com/media/3o7TKrEzvJbsTEKHUh/giphy.gif",
        "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
        "https://media.giphy.com/media/3o6ZtaO9BZHcOjmEyn/giphy.gif",
        "https://media.giphy.com/media/l2Jhtq2aG5cQZ40hy/giphy.gif"
    ];
    return Array.from({ length: count }).map((_, i) => bases[i % bases.length]);
};

export const GIF_CATEGORIES = {
    "Trending": generateGifs("Trending", 40),
    "Happy": generateGifs("Happy", 30),
    "Sad": generateGifs("Sad", 30),
    "Celebration": generateGifs("Celebration", 25),
    "Love": generateGifs("Love", 25),
    "Angry": generateGifs("Angry", 20),
    "Confused": generateGifs("Confused", 20),
    "Excited": generateGifs("Excited", 20),
    "Applause": generateGifs("Applause", 15),
    "Animals": generateGifs("Animals", 25),
    "Dance": generateGifs("Dance", 20),
    "Food": generateGifs("Food", 20)
};

export const MOCK_GIFS = Object.values(GIF_CATEGORIES).flat();

// --- MUSIC DATA ---
export const MOCK_SONGS: Song[] = [
    { id: 's1', title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', duration: '4:03', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', uploaderId: 1, stats: { plays: 1500000, downloads: 5000, shares: 2000, likes: 45000, reelsUse: 120 } },
    { id: 's2', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', duration: '3:20', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', uploaderId: 2, stats: { plays: 3200000, downloads: 12000, shares: 8000, likes: 120000, reelsUse: 500 } },
    { id: 's3', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', duration: '3:23', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', uploaderId: 3, stats: { plays: 2800000, downloads: 9000, shares: 6000, likes: 95000, reelsUse: 300 } },
    { id: 's4', title: 'Peaches', artist: 'Justin Bieber', album: 'Justice', cover: 'https://images.unsplash.com/photo-1459749411177-8c4750bb0e5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', duration: '3:18', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', uploaderId: 1, stats: { plays: 1900000, downloads: 4000, shares: 1500, likes: 62000, reelsUse: 100 } },
    { id: 's5', title: 'Save Your Tears', artist: 'The Weeknd', album: 'After Hours', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', duration: '3:35', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', uploaderId: 2, stats: { plays: 2500000, downloads: 8000, shares: 4500, likes: 88000, reelsUse: 250 } },
];

export const MOCK_ALBUMS: Album[] = [
    { id: 'a1', title: 'After Hours', artist: 'The Weeknd', year: '2020', cover: 'https://images.unsplash.com/photo-1619983081563-430f63602796?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', songs: ['s2', 's5'] },
    { id: 'a2', title: 'Future Nostalgia', artist: 'Dua Lipa', year: '2020', cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', songs: ['s3'] },
    { id: 'a3', title: 'Justice', artist: 'Justin Bieber', year: '2021', cover: 'https://images.unsplash.com/photo-1459749411177-8c4750bb0e5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', songs: ['s4'] },
];

// --- PODCAST DATA ---
export const MOCK_PODCASTS: Podcast[] = [
    { id: 'p1', title: 'The Daily Tech', host: 'Tech Insider', category: 'Technology', followers: 12000, description: 'Daily news from the tech world.', cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80' },
    { id: 'p2', title: 'Mindset Mentor', host: 'Rob Dial', category: 'Education', followers: 45000, description: 'Design the life you want to live.', cover: 'https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80' },
    { id: 'p3', title: 'Business Wars', host: 'Wondery', category: 'Business', followers: 30000, description: 'The stories behind the biggest business rivalries.', cover: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80' },
];

export const MOCK_EPISODES: Episode[] = [
    { id: 'e1', podcastId: 'p1', title: 'AI Revolution: What is Next?', description: 'We discuss the future of Artificial Intelligence and its impact.', date: '2 days ago', duration: '24:15', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', uploaderId: 1, stats: { plays: 1000, downloads: 100, shares: 50, likes: 200, reelsUse: 0 } },
    { id: 'e2', podcastId: 'p2', title: 'Stop Procrastinating Now', description: 'Practical tips to get things done effectively.', date: '1 week ago', duration: '18:30', thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', uploaderId: 2, stats: { plays: 5000, downloads: 800, shares: 300, likes: 1200, reelsUse: 10 } },
    { id: 'e3', podcastId: 'p3', title: 'Netflix vs Blockbuster', description: 'The battle for home entertainment dominance.', date: '3 days ago', duration: '45:00', thumbnail: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', uploaderId: 3, stats: { plays: 3200, downloads: 400, shares: 150, likes: 800, reelsUse: 5 } },
];

// Define all initial data as empty arrays
export const INITIAL_USERS: User[] = [];
export const INITIAL_GROUPS: Group[] = [];
export const INITIAL_BRANDS: Brand[] = [];
export const INITIAL_EVENTS: Event[] = [];

// Keep these as empty arrays to prevent pre-loading fake data
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_STORIES: Story[] = [];
export const INITIAL_REELS: Reel[] = [];

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
