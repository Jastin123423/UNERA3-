
export interface User {
    id: number;
    name: string;
    username?: string; // Add username for URL routing (@username)
    firstName?: string;
    lastName?: string;
    profileImage: string;
    coverImage?: string;
    bio?: string;
    work?: string;
    education?: string;
    location?: string;
    website?: string;
    isOnline: boolean;
    followers: number[];
    following: number[];
    email?: string;
    password?: string;
    birthDate?: string;
    gender?: string;
    nationality?: string;
    isVerified?: boolean;
    role?: 'admin' | 'moderator' | 'user';
    isMusician?: boolean; 
    isRestricted?: boolean;
    restrictedUntil?: number; 
    phone?: string;
    joinedDate?: string; 
    interests?: string[]; 
    status?: 'active' | 'suspended' | 'deleted'; // For SEO and content handling
}

export interface Brand {
    id: number;
    name: string;
    description: string;
    category: string;
    profileImage: string;
    coverImage: string;
    adminId: number;
    followers: number[];
    location: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    isVerified?: boolean;
    createdDate: number;
}

export interface Comment {
    id: number;
    userId: number;
    text: string;
    timestamp: string;
    likes: number;
    hasLiked?: boolean; 
    attachment?: {
        type: 'image' | 'gif' | 'file';
        url: string;
        fileName?: string;
    };
    stickerUrl?: string; 
    replies?: CommentReply[];
    rating?: number;
    userName?: string;
    userAvatar?: string;
    date?: number; 
    comment?: string; 
}

export interface CommentReply {
    id: number;
    userId: number;
    userName?: string; 
    reply: string;
    date: number; 
    likes: number; 
    hasLiked?: boolean;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface Reaction {
    userId: number;
    type: ReactionType;
}

export interface LinkPreview {
    url: string;
    title: string;
    description: string;
    image: string;
    domain: string;
}

export interface Post {
    id: number;
    authorId: number;
    content?: string;
    image?: string;
    video?: string;
    timestamp: string; 
    createdAt?: number; 
    reactions: Reaction[]; 
    comments: Comment[];
    shares: number;
    views?: number; 
    category?: string; 
    tags?: string[];
    type: 'text' | 'image' | 'video' | 'event' | 'product' | 'audio';
    visibility: 'Public' | 'Friends' | 'Only Me';
    location?: string;
    feeling?: string;
    taggedUsers?: number[];
    eventId?: number; 
    event?: Event; 
    productId?: number; 
    product?: Product; 
    audioTrack?: AudioTrack;
    background?: string;
    sharedPostId?: number;
    linkPreview?: LinkPreview;
    groupId?: string;
    groupName?: string;
    brandId?: number;
    brandName?: string;
    status?: 'active' | 'deleted'; // For SEO and content handling
}

export interface Story {
    id: number;
    userId: number;
    image?: string; // Image is now optional for text stories
    user?: User;
    createdAt: number; 
    
    // New professional features
    type?: 'text' | 'image';
    text?: string;
    background?: string;
    music?: {
        url: string;
        title: string;
        artist: string;
        cover?: string;
    };
    reactions?: {
        userId: number;
    }[];
    replies?: {
        userId: number;
        text: string;
        timestamp: number;
    }[];
}


export interface Reel {
    id: number;
    userId: number;
    videoUrl: string;
    caption: string;
    songName: string;
    createdAt: number;
    effectName?: string;
    reactions: Reaction[]; 
    comments: Comment[];
    shares: number;
    isCompressed?: boolean; 
}

export interface Notification {
    id: number;
    userId: number;
    senderId: number;
    type: 'like' | 'comment' | 'follow' | 'share' | 'birthday' | 'reaction' | 'event' | 'system' | 'mention';
    content: string;
    postId?: number;
    reelId?: number;
    timestamp: number;
    read: boolean;
}

export interface Message {
    id: number;
    senderId: number;
    receiverId: number;
    text: string;
    timestamp: number;
    productId?: number;
    productTitle?: string;
    stickerUrl?: string; 
}

export interface SearchResult {
    user: User;
    score: number;
}

export interface Event {
    id: number;
    organizerId: number;
    title: string;
    description: string;
    date: string; 
    time: string;
    location: string;
    image: string;
    attendees: number[]; 
    interestedIds: number[]; 
}

export interface LocationData {
    name: string;
    flag: string;
}

export interface Product {
    id: number;
    title: string;
    category: string;
    description: string;
    country: string;
    address: string;
    mainPrice: number;
    discountPrice?: number | null;
    quantity: number;
    phoneNumber: string;
    images: string[];
    sellerId: number;
    sellerName: string;
    sellerAvatar: string;
    date: number;
    status: 'active' | 'sold' | 'inactive';
    shareId: string;
    views: number;
    ratings: number[];
    comments: Comment[];
}

export interface GroupPost {
    id: number;
    authorId: number;
    content: string;
    image?: string;
    video?: string;
    background?: string;
    reactions: Reaction[];
    comments: Comment[];
    shares: number;
    timestamp: number;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    type: 'public' | 'private';
    image: string;
    coverImage: string;
    adminId: number;
    members: number[]; 
    posts: GroupPost[];
    createdDate: number;
    events?: Event[];
    memberPostingAllowed?: boolean;
}

export interface Stats {
    plays: number;
    downloads: number;
    shares: number;
    likes: number;
    reelsUse: number;
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    album: string;
    cover: string;
    duration: string; 
    audioUrl: string; 
    stats: Stats;
    isLocal?: boolean;
    uploaderId?: number;
}

export interface Album {
    id: string;
    title: string;
    artist: string;
    cover: string;
    year: string;
    songs: string[]; 
}

export interface Podcast {
    id: string;
    title: string;
    host: string;
    cover: string;
    description: string;
    category: string;
    followers: number;
}

export interface Episode {
    id: string;
    podcastId: string;
    title: string;
    description: string;
    date: string;
    duration: string;
    audioUrl: string;
    thumbnail: string;
    stats: Stats;
    uploaderId?: number;
    host?: string;
}

export interface AudioTrack {
    id: string;
    url: string;
    title: string;
    artist: string; 
    cover: string;
    type: 'music' | 'podcast';
    uploaderId?: number;
    isVerified?: boolean;
}
