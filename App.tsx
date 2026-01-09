import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Login, Register, ForgotPassword } from './components/Auth';
import { Header, Sidebar, RightSidebar, MenuOverlay } from './components/Layout';
import { CreatePost, Post, CommentsSheet, ShareSheet, CreatePostModal, SuggestedProductsWidget } from './components/Feed';
import { StoryReel, StoryViewer, CreateStoryModal } from './components/Story';
import { UserProfile } from './components/UserProfile';
import { MarketplacePage, ProductDetailModal } from './components/Marketplace';
import { ReelsFeed, CreateReelModal } from './components/Reels';
import { ChatWindow } from './components/Chat';
import { ImageViewer } from './components/Common';
import { EventsPage, BirthdaysPage, SuggestedProfilesPage, SettingsPage, MemoriesPage } from './components/MenuPages';
import { HelpSupportPage } from './components/HelpSupport';
import { CreateEventModal } from './components/Events';
import { BrandsPage } from './components/Brands';
import { MusicSystem, GlobalAudioPlayer, MusicFeedPost } from './components/MusicSystem'; 
import { GroupsPage } from './components/Groups';
import { ToolsPage } from './components/Tools';
import { PrivacyPolicyPage } from './components/PrivacyPolicy';
import { TermsOfServicePage } from './components/TermsOfService';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Brand, Song, Episode } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_BRANDS, MOCK_SONGS, MOCK_EPISODES } from './constants';
import { rankFeed } from './utils/ranking';

// ========== UTILITY FUNCTIONS ==========
const getPath = () => {
    if (typeof window !== 'undefined') {
        return window.location.pathname;
    }
    return '/';
};

const parsePath = (path: string, users: User[]) => {
    if (path.startsWith('/@')) {
        const username = path.substring(2);
        const user = users.find(u => u.username === username || u.id.toString() === username);
        return { view: 'profile', username, userId: user?.id };
    }
    if (path.startsWith('/post/')) {
        return { view: 'single_post', postId: parseInt(path.substring(6), 10) };
    }
    
    // Main menu routes
    if (path === '/marketplace') return { view: 'marketplace' };
    if (path === '/reels') return { view: 'reels' };
    if (path === '/groups') return { view: 'groups' };
    if (path === '/brands') return { view: 'brands' };
    if (path === '/events') return { view: 'events' };
    if (path === '/birthdays') return { view: 'birthdays' };
    if (path === '/profiles') return { view: 'suggested_profiles' };
    if (path === '/suggested') return { view: 'suggested_profiles' };
    if (path === '/memories') return { view: 'memories' };
    if (path === '/music') return { view: 'music' };
    if (path === '/tools') return { view: 'tools' };
    
    // Bottom menu routes
    if (path === '/help') return { view: 'help_support' };
    if (path === '/settings') return { view: 'settings' };
    if (path === '/privacy') return { view: 'privacy_policy' };
    if (path === '/terms') return { view: 'terms_of_service' };
    if (path === '/login') return { view: 'login' };
    if (path === '/register') return { view: 'login' };
    
    return { view: 'home' };
};

// Enhanced Facebook-style relative time formatter with precise calculations
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    // If timestamp is in the future or invalid, return fallback
    if (diff < 0 || !timestamp) return 'Just now';
    
    const diffInSeconds = Math.floor(diff / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInSeconds < 60) {
        return diffInSeconds < 10 ? 'Just now' : `${diffInSeconds}s`;
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d`;
    } else if (diffInDays < 30) {
        return `${diffInWeeks}w`;
    } else if (diffInDays < 365) {
        return `${diffInMonths}mo`;
    } else {
        return `${diffInYears}y`;
    }
};

// Helper function to get song for post
const getSongForPost = (post: PostType, songs: Song[], episodes: Episode[]) => {
    if (!post.audioTrack) return null;
    
    // Check songs array first
    const song = songs.find(s => s.id === post.audioTrack?.id);
    if (song) {
        return {
            ...song,
            type: post.type === 'podcast' ? 'podcast' : 'music',
            plays: song.plays || post.audioTrack.plays || 0,
            likes: song.likes || post.audioTrack.likes || 0,
            shares: song.shares || post.audioTrack.shares || 0,
            comments: song.comments || 0,
            stats: {
                plays: song.plays || post.audioTrack.plays || 0,
                likes: song.likes || post.audioTrack.likes || 0,
                shares: song.shares || post.audioTrack.shares || 0,
                comments: song.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
    }
    
    // Check episodes array
    const episode = episodes.find(e => e.id === post.audioTrack?.id);
    if (episode) {
        return {
            id: episode.id,
            title: episode.title,
            artist: episode.host || 'Podcast Host',
            cover: episode.thumbnail || episode.cover,
            audioUrl: episode.audioUrl,
            duration: episode.duration,
            uploaderId: episode.uploaderId,
            type: 'podcast',
            plays: episode.plays || post.audioTrack.plays || 0,
            likes: episode.likes || post.audioTrack.likes || 0,
            shares: episode.shares || post.audioTrack.shares || 0,
            comments: episode.comments || 0,
            description: episode.description,
            stats: {
                plays: episode.plays || post.audioTrack.plays || 0,
                likes: episode.likes || post.audioTrack.likes || 0,
                shares: episode.shares || post.audioTrack.shares || 0,
                comments: episode.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
    }
    
    // Create song object from audioTrack if not found in arrays
    return {
        id: post.audioTrack.id,
        title: post.audioTrack.title,
        artist: post.audioTrack.artist,
        cover: post.audioTrack.cover || '/default-cover.jpg',
        audioUrl: post.audioTrack.url,
        duration: post.audioTrack.duration,
        uploaderId: post.audioTrack.uploaderId,
        type: post.type === 'podcast' ? 'podcast' : 'music',
        plays: post.audioTrack.plays || 0,
        likes: post.audioTrack.likes || 0,
        shares: post.audioTrack.shares || 0,
        comments: 0,
        stats: {
            plays: post.audioTrack.plays || 0,
            likes: post.audioTrack.likes || 0,
            shares: post.audioTrack.shares || 0,
            comments: 0,
            downloads: 0,
            reelsUse: 0
        }
    };
};

// Helper function to get author (user or brand) for a post
const getAuthorForPost = (post: PostType, users: User[], brands: Brand[]) => {
    // First check if it's a brand post
    if (post.brandId) {
        const brand = brands.find(b => b.id === post.brandId);
        if (brand) {
            return {
                ...brand,
                type: 'brand' as const,
                name: brand.name,
                profileImage: brand.profileImage,
                isVerified: brand.isVerified,
                id: brand.id,
                followers: brand.followers || []
            };
        }
    }
    
    // Check if authorId matches a brand
    const brandByAuthorId = brands.find(b => b.id === post.authorId);
    if (brandByAuthorId) {
        return {
            ...brandByAuthorId,
            type: 'brand' as const,
            name: brandByAuthorId.name,
            profileImage: brandByAuthorId.profileImage,
            isVerified: brandByAuthorId.isVerified,
            id: brandByAuthorId.id,
            followers: brandByAuthorId.followers || []
        };
    }
    
    // Otherwise it's a user post
    const user = users.find(u => u.id === post.authorId);
    if (user) {
        return {
            ...user,
            type: 'user' as const
        };
    }
    
    return null;
};

// Notification utility functions
const notificationExists = (notifications: Notification[], userId: number, senderId: number, type: string, postId?: number): boolean => {
    const recentTime = Date.now() - 300000; // 5 minutes
    return notifications.some(notif => 
        notif.userId === userId &&
        notif.senderId === senderId &&
        notif.type === type &&
        (postId ? notif.postId === postId : true) &&
        notif.timestamp > recentTime
    );
};

const createNotification = (
    userId: number,
    senderId: number,
    type: string,
    content: string,
    extraData?: {
        postId?: number;
        commentId?: number;
        reactionType?: ReactionType;
        groupId?: string;
        brandId?: number;
        eventId?: number;
        productId?: number;
        storyId?: number;
        reelId?: number;
        songId?: string;
        episodeId?: string;
        metadata?: any;
    }
): Notification => {
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        userId,
        senderId,
        type: type as any,
        content,
        timestamp: Date.now(),
        read: false,
        ...extraData,
    };
};

// Suggested User Interface
interface SuggestedUser {
    id: number;
    name: string;
    username?: string;
    profileImage: string;
    mutualFriends: number;
    bio?: string;
    location?: string;
    education?: string;
    work?: string;
    viewed: boolean;
}

// People You May Know Component - Professional Version
const PeopleYouMayKnow: React.FC<{
    suggestedUsers: SuggestedUser[];
    onViewProfile: (userId: number) => void;
    onRemove: (userId: number) => void;
    key?: string;
}> = ({ suggestedUsers, onViewProfile, onRemove, key }) => {
    const { t } = useLanguage();
    
    if (suggestedUsers.length === 0) return null;
    
    return (
        <div className="bg-[#242526] rounded-xl p-4 mb-6 border border-[#3E4042] shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#1877F2] to-[#00B0FF] rounded-full flex items-center justify-center mr-3 shadow-md">
                        <i className="fas fa-user-plus text-white text-sm"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">People You May Know</h2>
                        <p className="text-[#B0B3B8] text-xs mt-0.5">Based on your profile and connections</p>
                    </div>
                </div>
                {suggestedUsers.length > 5 && (
                    <button className="text-[#1877F2] text-sm font-medium hover:bg-[#3A3B3C] px-3 py-1.5 rounded-lg transition-colors">
                        See All
                    </button>
                )}
            </div>
            
            <div className="relative">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {suggestedUsers.slice(0, 6).map((user) => (
                        <div 
                            key={`${key}-${user.id}`} 
                            className="flex-shrink-0 w-44 bg-[#3A3B3C] rounded-xl overflow-hidden border border-[#4E4F50] hover:border-[#1877F2]/50 transition-all duration-300 hover:shadow-lg group"
                        >
                            {/* User Card */}
                            <div className="p-3">
                                {/* Profile Image */}
                                <div className="flex justify-center mb-3 relative">
                                    <div className="relative">
                                        <img 
                                            src={user.profileImage} 
                                            alt={user.name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-[#4E4F50] group-hover:border-[#1877F2] transition-colors"
                                        />
                                        {user.mutualFriends > 0 && (
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1877F2] rounded-full flex items-center justify-center shadow-md">
                                                <span className="text-white text-xs font-bold">
                                                    {user.mutualFriends > 9 ? '9+' : user.mutualFriends}
                                                </span>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => onRemove(user.id)}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-[#242526] rounded-full flex items-center justify-center text-[#B0B3B8] hover:text-white hover:bg-[#3A3B3C] transition-colors shadow-md border border-[#3E4042]"
                                            title="Remove suggestion"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                
                                {/* User Info */}
                                <div className="text-center">
                                    <h3 className="font-semibold text-white text-sm truncate mb-1">{user.name}</h3>
                                    
                                    {user.mutualFriends > 0 && (
                                        <p className="text-[#B0B3B8] text-xs mb-2">
                                            {user.mutualFriends} mutual connection{user.mutualFriends !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                    
                                    {/* Compact Details */}
                                    <div className="space-y-1 mb-3">
                                        {user.work && (
                                            <div className="flex items-center justify-center text-[#B0B3B8] text-xs">
                                                <i className="fas fa-briefcase mr-1 text-[10px]"></i>
                                                <span className="truncate">{user.work}</span>
                                            </div>
                                        )}
                                        {user.location && (
                                            <div className="flex items-center justify-center text-[#B0B3B8] text-xs">
                                                <i className="fas fa-map-marker-alt mr-1 text-[10px]"></i>
                                                <span className="truncate">{user.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* View Profile Button - Professional Blue */}
                                    <button
                                        onClick={() => onViewProfile(user.id)}
                                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-2 rounded-lg transition-colors text-sm shadow-sm hover:shadow-md"
                                    >
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Scroll Indicator */}
                <div className="flex justify-center space-x-1 mt-3">
                    {suggestedUsers.slice(0, 3).map((_, index) => (
                        <div 
                            key={index} 
                            className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-[#1877F2]' : 'bg-[#4E4F50]'}`}
                        />
                    ))}
                </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-[#3E4042]">
                <p className="text-[#B0B3B8] text-xs text-center">
                    Suggestions update based on new connections and activity
                </p>
            </div>
        </div>
    );
};

// Groups You May Like Component - Professional Version
const GroupsYouMayLike: React.FC<{
    suggestedGroups: Group[];
    currentUser: User | null;
    onViewGroup: (groupId: string) => void;
    onJoinGroup: (groupId: string) => void;
    onRemove: (groupId: string) => void;
    key?: string;
}> = ({ suggestedGroups, currentUser, onViewGroup, onJoinGroup, onRemove, key }) => {
    const { t } = useLanguage();
    
    if (suggestedGroups.length === 0) return null;
    
    return (
        <div className="bg-[#242526] rounded-xl p-4 mb-6 border border-[#3E4042] shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#45BD62] to-[#2ABBA7] rounded-full flex items-center justify-center mr-3 shadow-md">
                        <i className="fas fa-users text-white text-sm"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Groups You May Like</h2>
                        <p className="text-[#B0B3B8] text-xs mt-0.5">Based on your interests and connections</p>
                    </div>
                </div>
                {suggestedGroups.length > 5 && (
                    <button className="text-[#45BD62] text-sm font-medium hover:bg-[#3A3B3C] px-3 py-1.5 rounded-lg transition-colors">
                        See All
                    </button>
                )}
            </div>
            
            <div className="relative">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {suggestedGroups.slice(0, 6).map((group) => (
                        <div 
                            key={`${key}-${group.id}`} 
                            className="flex-shrink-0 w-64 bg-[#3A3B3C] rounded-xl overflow-hidden border border-[#4E4F50] hover:border-[#45BD62]/50 transition-all duration-300 hover:shadow-lg group"
                        >
                            {/* Group Card */}
                            <div className="h-32 relative">
                                <img 
                                    src={group.coverImage} 
                                    alt={group.name}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-bold uppercase">
                                    {group.type}
                                </div>
                                <button 
                                    onClick={() => onRemove(group.id)}
                                    className="absolute top-2 left-2 w-6 h-6 bg-[#242526] rounded-full flex items-center justify-center text-[#B0B3B8] hover:text-white hover:bg-[#3A3B3C] transition-colors shadow-md border border-[#3E4042]"
                                    title="Remove suggestion"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="p-3">
                                {/* Group Profile Image and Info */}
                                <div className="flex items-start gap-3 mb-3 -mt-8 relative">
                                    <img 
                                        src={group.image} 
                                        alt={group.name}
                                        className="w-16 h-16 rounded-xl border-4 border-[#242526] object-cover bg-[#242526] shadow-md group-hover:border-[#45BD62] transition-colors"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 
                                            className="font-bold text-white text-sm truncate mb-1 cursor-pointer hover:text-[#45BD62] transition-colors"
                                            onClick={() => onViewGroup(group.id)}
                                        >
                                            {group.name}
                                        </h3>
                                        <p className="text-[#B0B3B8] text-xs truncate mb-2">{group.description}</p>
                                        <div className="flex items-center text-[#B0B3B8] text-xs">
                                            <i className="fas fa-users mr-1 text-[10px]"></i>
                                            <span>{group.members.length} members</span>
                                            <span className="mx-1">•</span>
                                            <i className="fas fa-comments mr-1 text-[10px]"></i>
                                            <span>{group.posts?.length || 0} posts</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* View Group Button */}
                                <button
                                    onClick={() => onViewGroup(group.id)}
                                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-2 rounded-lg transition-colors text-sm shadow-sm hover:shadow-md"
                                >
                                    View Group
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Scroll Indicator */}
                <div className="flex justify-center space-x-1 mt-3">
                    {suggestedGroups.slice(0, 3).map((_, index) => (
                        <div 
                            key={index} 
                            className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-[#45BD62]' : 'bg-[#4E4F50]'}`}
                        />
                    ))}
                </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-[#3E4042]">
                <p className="text-[#B0B3B8] text-xs text-center">
                    Discover communities that match your interests
                </p>
            </div>
        </div>
    );
};

// Brand Recommendations Component
const BrandRecommendations: React.FC<{
    brands: Brand[];
    currentUser: User | null;
    onViewBrand: (brandId: number) => void;
    onRemove: (brandId: number) => void;
    key?: string;
}> = ({ brands, currentUser, onViewBrand, onRemove, key }) => {
    if (brands.length === 0) return null;
    
    const recommendedBrands = brands.slice(0, 4);
    
    return (
        <div className="bg-[#242526] rounded-xl p-4 mb-6 border border-[#3E4042] shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#F7B928] to-[#FF6B6B] rounded-full flex items-center justify-center mr-3 shadow-md">
                        <i className="fas fa-briefcase text-white text-sm"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Recommended Pages</h2>
                        <p className="text-[#B0B3B8] text-xs mt-0.5">Brands and pages you might like</p>
                    </div>
                </div>
                <button className="text-[#F7B928] text-sm font-medium hover:bg-[#3A3B3C] px-3 py-1.5 rounded-lg transition-colors">
                    See All
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedBrands.map((brand) => (
                    <div 
                        key={`${key}-${brand.id}`}
                        className="bg-[#3A3B3C] rounded-xl overflow-hidden border border-[#4E4F50] hover:border-[#F7B928]/50 transition-all duration-300 hover:shadow-lg group"
                    >
                        <div className="p-3">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative">
                                    <img 
                                        src={brand.profileImage} 
                                        alt={brand.name}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-[#4E4042] group-hover:border-[#F7B928] transition-colors"
                                    />
                                    {brand.isVerified && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1877F2] rounded-full flex items-center justify-center shadow-md">
                                            <i className="fas fa-check text-white text-[10px]"></i>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => onRemove(brand.id)}
                                        className="absolute -top-1 -left-1 w-5 h-5 bg-[#242526] rounded-full flex items-center justify-center text-[#B0B3B8] hover:text-white hover:bg-[#3A3B3C] transition-colors shadow-md border border-[#3E4042]"
                                        title="Remove suggestion"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-white text-sm truncate">{brand.name}</h3>
                                    <p className="text-[#B0B3B8] text-xs truncate">{brand.category}</p>
                                    <p className="text-[#B0B3B8] text-xs">
                                        {brand.followers?.length || 0} followers • {brand.location}
                                    </p>
                                </div>
                            </div>
                            
                            <p className="text-[#B0B3B8] text-sm line-clamp-2 mb-3 text-xs">
                                {brand.description || 'No description available'}
                            </p>
                            
                            <button
                                onClick={() => onViewBrand(brand.id)}
                                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-2 rounded-lg transition-colors text-sm shadow-sm hover:shadow-md"
                            >
                                View Brand
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-[#3E4042]">
                <p className="text-[#B0B3B8] text-xs text-center">
                    Discover brands and creators relevant to your interests
                </p>
            </div>
        </div>
    );
};

// Sign Up Call-to-Action Component for Guests
const GuestSignUpCTA: React.FC<{
    onSignUp: () => void;
    title?: string;
    description?: string;
}> = ({ onSignUp, title = "Join UNERA", description = "Sign up to connect with friends and share your thoughts." }) => {
    return (
        <div className="bg-[#242526] rounded-xl p-4 mb-6 border border-[#3E4042] shadow-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#1877F2] to-[#00B0FF] flex items-center justify-center mr-3">
                        <i className="fas fa-user-plus text-white"></i>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold">{title}</h3>
                        <p className="text-[#B0B3B8] text-sm">{description}</p>
                    </div>
                </div>
                <button 
                    onClick={onSignUp}
                    className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                    Sign Up
                </button>
            </div>
        </div>
    );
};

// Guest View Create Post Component
const GuestCreatePost: React.FC<{
    onSignUp: () => void;
}> = ({ onSignUp }) => {
    return (
        <div className="bg-[#242526] rounded-xl p-4 mb-6 border border-[#3E4042] shadow-lg">
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#1877F2] to-[#00B0FF] flex items-center justify-center mr-3">
                    <i className="fas fa-user-plus text-white"></i>
                </div>
                <div 
                    className="flex-1 bg-[#3A3B3C] rounded-full px-4 py-3 cursor-pointer hover:bg-[#4E4F50] transition-colors"
                    onClick={onSignUp}
                >
                    <p className="text-[#B0B3B8]">What's on your mind? Sign up to share...</p>
                </div>
            </div>
        </div>
    );
};

// ========== MAIN APP COMPONENT ==========
export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const [users, setUsers] = useState<User[]>(initialData?.users || INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(() => {
        // Ensure all posts have formattedTime on initial load
        const initialPosts = initialData?.posts || INITIAL_POSTS;
        return initialPosts.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
    });
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES.map(s => ({...s, createdAt: Date.now(), user: (initialData?.users || INITIAL_USERS).find((u: User) => u.id === s.userId)}))); 
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
    
    // Initialize songs and episodes with proper stats
    const [songs, setSongs] = useState<Song[]>(MOCK_SONGS.map(song => ({
        ...song,
        plays: song.plays || 0,
        likes: song.likes || 0,
        shares: song.shares || 0,
        comments: song.comments || 0,
        stats: song.stats || {
            plays: song.plays || 0,
            likes: song.likes || 0,
            shares: song.shares || 0,
            comments: song.comments || 0,
            downloads: 0,
            reelsUse: 0
        }
    })));
    
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES.map(episode => ({
        ...episode,
        plays: episode.plays || 0,
        likes: episode.likes || 0,
        shares: episode.shares || 0,
        comments: episode.comments || 0,
        stats: episode.stats || {
            plays: episode.plays || 0,
            likes: episode.likes || 0,
            shares: episode.shares || 0,
            comments: episode.comments || 0,
            downloads: 0,
            reelsUse: 0
        }
    })));
    
    // People You May Know state
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>(() => {
        const availableUsers = INITIAL_USERS.slice(1).map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            profileImage: user.profileImage,
            mutualFriends: Math.floor(Math.random() * 20) + 1,
            bio: user.bio || '',
            location: user.location || '',
            education: user.education || '',
            work: user.work || '',
            viewed: false
        }));
        
        return availableUsers.filter(user => 
            user.profileImage && 
            (user.work || user.location || user.mutualFriends > 0)
        ).slice(0, 8);
    });
    
    // Groups You May Like state
    const [suggestedGroups, setSuggestedGroups] = useState<Group[]>(() => {
        return INITIAL_GROUPS.filter(group => 
            group.image && 
            group.description &&
            group.members.length > 0
        ).slice(0, 6);
    });
    
    // State to track which rotation set we're on
    const [suggestionRotation, setSuggestionRotation] = useState<number>(0);
    const [groupRotation, setGroupRotation] = useState<number>(0);
    const [brandRotation, setBrandRotation] = useState<number>(0);
    
    const [currentUser, setCurrentUser] = useState<User | null>(initialData?.currentUser || null);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    
    // ========== ENHANCED MESSAGING STATES ==========
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            senderId: 2,
            receiverId: 1,
            content: 'Hey there! How are you?',
            timestamp: Date.now() - 3600000,
            status: 'read' as const,
            formattedTime: formatRelativeTime(Date.now() - 3600000)
        },
        {
            id: '2',
            senderId: 1,
            receiverId: 2,
            content: 'I\'m good! Just working on the project.',
            timestamp: Date.now() - 1800000,
            status: 'read' as const,
            formattedTime: formatRelativeTime(Date.now() - 1800000)
        },
        {
            id: '3',
            senderId: 2,
            receiverId: 1,
            content: 'Awesome! Can you share the latest updates?',
            timestamp: Date.now() - 900000,
            status: 'delivered' as const,
            formattedTime: formatRelativeTime(Date.now() - 900000),
            attachments: [{
                id: 'att1',
                type: 'document' as const,
                url: 'https://example.com/document.pdf',
                name: 'Project_Updates.pdf',
                size: '2.5 MB'
            }]
        },
        {
            id: '4',
            senderId: 3,
            receiverId: 1,
            content: 'Check out this funny meme! 😂',
            timestamp: Date.now() - 600000,
            status: 'read' as const,
            formattedTime: formatRelativeTime(Date.now() - 600000),
            gifUrl: 'https://media.giphy.com/media/3o7abAHdYvZdBNnGZq/giphy.gif'
        },
        {
            id: '5',
            senderId: 1,
            receiverId: 3,
            content: 'Haha that\'s hilarious! 😂',
            timestamp: Date.now() - 300000,
            status: 'read' as const,
            formattedTime: formatRelativeTime(Date.now() - 300000)
        },
        {
            id: '6',
            senderId: 2,
            receiverId: 1,
            content: 'Meeting starts in 15 minutes!',
            timestamp: Date.now() - 120000,
            status: 'delivered' as const,
            formattedTime: formatRelativeTime(Date.now() - 120000)
        }
    ]);
    
    // Track unread message counts for each user
    const [unreadMessageCounts, setUnreadMessageCounts] = useState<Record<number, number>>(() => {
        const counts: Record<number, number> = {};
        // Initialize with sample unread counts
        counts[1] = 3; // Current user (id: 1) has 3 unread messages
        return counts;
    });
    
    // Track recent conversations
    const [recentConversations, setRecentConversations] = useState<Array<{
        userId: number;
        userName: string;
        userImage: string;
        lastMessage: string;
        timestamp: number;
        unread: boolean;
    }>>(() => {
        // Get recent conversations from messages
        const conversations = new Map<number, {
            userId: number;
            userName: string;
            userImage: string;
            lastMessage: string;
            timestamp: number;
            unread: boolean;
        }>();
        
        // Process messages to build conversation list
        messages.forEach(msg => {
            const otherUserId = msg.senderId === 1 ? msg.receiverId : msg.senderId;
            const user = INITIAL_USERS.find(u => u.id === otherUserId);
            if (user) {
                const existing = conversations.get(otherUserId);
                if (!existing || msg.timestamp > existing.timestamp) {
                    conversations.set(otherUserId, {
                        userId: otherUserId,
                        userName: user.name,
                        userImage: user.profileImage,
                        lastMessage: msg.content || 'Sent an attachment',
                        timestamp: msg.timestamp,
                        unread: msg.status === 'delivered' && msg.receiverId === 1
                    });
                }
            }
        });
        
        return Array.from(conversations.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);
    });
    
    // User online status tracking
    const [userStatus, setUserStatus] = useState<Record<number, { isOnline: boolean; lastSeen: string; typing: boolean }>>(() => {
        const statuses: Record<number, { isOnline: boolean; lastSeen: string; typing: boolean }> = {};
        users.forEach(user => {
            // Random online status for demo
            const isOnline = Math.random() > 0.5;
            statuses[user.id] = {
                isOnline,
                lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
                typing: false
            };
        });
        return statuses;
    });
    
    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    
    // Update parsedPath to include users dependency
    const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
    
    // ========== CRITICAL FIX: Initialize view state properly for guests ==========
    const [view, setView] = useState(() => {
        // For guests, default to 'home' to see content (like Facebook)
        // Only show login view if explicitly on login path or no current user AND no initial data
        if (initialData?.view) {
            return initialData.view;
        }
        
        // If guest is at root path, show them content, not login
        if (parsedPath.view === 'home' || path === '/') {
            return 'home';
        }
        
        return parsedPath.view;
    });
    
    const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : parsedPath.view);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(initialData?.selectedUserId || parsedPath.userId || null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
    const [initialGroupIdToView, setInitialGroupIdToView] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    // Group-specific states
    const [activeGroupComments, setActiveGroupComments] = useState<{groupId: string, postId: number} | null>(null);
    const [activeGroupShare, setActiveGroupShare] = useState<{groupId: string, postId: number} | null>(null);
    
    // Reel modal state
    const [showCreateReelModal, setShowCreateReelModal] = useState(false);
    
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [likedTracks, setLikedTracks] = useState<string[]>([]);
    const [playHistory, setPlayHistory] = useState<{trackId: string, timestamp: number, duration: number}[]>([]);

    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeSharePostId, setActiveSharePostId] = useState<number | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([
        // Initial notifications for testing
        {
            id: 1,
            userId: 1,
            senderId: 2,
            type: 'follow',
            content: 'started following you.',
            timestamp: Date.now() - 3600000,
            read: false
        },
        {
            id: 2,
            userId: 1,
            senderId: 3,
            type: 'like',
            content: 'liked your post.',
            postId: 1,
            timestamp: Date.now() - 1800000,
            read: false
        },
        {
            id: 3,
            userId: 1,
            senderId: 4,
            type: 'comment',
            content: 'commented on your post.',
            postId: 1,
            timestamp: Date.now() - 900000,
            read: true
        }
    ]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(initialData?.activeSinglePostId || parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    // ========== MESSAGE-RELATED COMPUTED VALUES ==========
    // Calculate unread message count for current user
    const currentUserUnreadCount = useMemo(() => {
        if (!currentUser) return 0;
        return unreadMessageCounts[currentUser.id] || 0;
    }, [currentUser, unreadMessageCounts]);
    
    // Get recent conversations for current user
    const currentUserRecentConversations = useMemo(() => {
        if (!currentUser) return [];
        
        // Filter conversations to only include those involving current user
        return recentConversations.filter(conv => 
            messages.some(msg => 
                (msg.senderId === currentUser.id && msg.receiverId === conv.userId) ||
                (msg.receiverId === currentUser.id && msg.senderId === conv.userId)
            )
        ).slice(0, 3); // Show only 3 most recent
    }, [currentUser, recentConversations, messages]);

    // Function to get intelligent suggestions based on current user
    const getIntelligentSuggestions = useCallback((currentUser: User | null, allUsers: User[], rotationIndex: number = 0): SuggestedUser[] => {
        if (!currentUser) return [];
        
        // Filter out current user and already viewed/removed users
        const viewedIds = JSON.parse(localStorage.getItem('universeViewedProfiles') || '[]');
        const removedIds = JSON.parse(localStorage.getItem('universeRemovedSuggestions') || '[]');
        const alreadyFollowed = currentUser.following || [];
        
        const availableUsers = allUsers.filter(user => 
            user.id !== currentUser.id &&
            !viewedIds.includes(user.id) &&
            !removedIds.includes(user.id) &&
            !alreadyFollowed.includes(user.id)
        );
        
        // Sort by mutual connections, then by profile completeness
        const allSuggestions = availableUsers.map(user => {
            // Calculate mutual friends (users who follow both current user and this user)
            const mutualCount = allUsers.filter(u => 
                u.following.includes(currentUser.id) && 
                u.following.includes(user.id)
            ).length;
            
            // Calculate profile completeness score
            let completenessScore = 0;
            if (user.profileImage && user.profileImage !== '/default-avatar.png') completenessScore += 20;
            if (user.coverImage) completenessScore += 10;
            if (user.bio) completenessScore += 15;
            if (user.work) completenessScore += 15;
            if (user.education) completenessScore += 15;
            if (user.location) completenessScore += 10;
            if (user.website) completenessScore += 10;
            if (user.isVerified) completenessScore += 5;
            
            return {
                id: user.id,
                name: user.name,
                username: user.username,
                profileImage: user.profileImage,
                mutualFriends: mutualCount || Math.floor(Math.random() * 15) + 1,
                bio: user.bio || '',
                location: user.location || '',
                education: user.education || '',
                work: user.work || '',
                viewed: false,
                _completeness: completenessScore,
                _mutual: mutualCount,
                _random: Math.random()
            };
        })
        .filter(user => user.profileImage && (user.work || user.location || user.mutualFriends > 0))
        .sort((a, b) => {
            if (b._mutual !== a._mutual) return b._mutual - a._mutual;
            return b._completeness - a._completeness;
        })
        .map(({ _completeness, _mutual, _random, ...user }) => user);
        
        // Apply rotation to show different users each time
        const rotationSize = 8;
        const totalRotations = Math.ceil(allSuggestions.length / rotationSize);
        const currentRotation = rotationIndex % totalRotations;
        const startIndex = currentRotation * rotationSize;
        
        return allSuggestions.slice(startIndex, startIndex + rotationSize);
    }, []);

    // Function to get intelligent group suggestions based on current user
    const getIntelligentGroupSuggestions = useCallback((currentUser: User | null, allGroups: Group[], rotationIndex: number = 0): Group[] => {
        if (!currentUser) return [];
        
        // Filter out groups the user is already a member of or has removed
        const removedGroupIds = JSON.parse(localStorage.getItem('universeRemovedGroupSuggestions') || '[]');
        const alreadyMember = allGroups.filter(g => g.members.includes(currentUser.id)).map(g => g.id);
        
        const availableGroups = allGroups.filter(group => 
            !group.members.includes(currentUser.id) &&
            !removedGroupIds.includes(group.id) &&
            !alreadyMember.includes(group.id)
        );
        
        // Score groups based on various factors
        const scoredGroups = availableGroups.map(group => {
            let score = 0;
            
            // 1. Popularity score (more members = higher score)
            score += Math.min(group.members.length * 0.5, 25);
            
            // 2. Activity score (more posts = higher score)
            score += Math.min((group.posts?.length || 0) * 0.3, 20);
            
            // 3. Completion score (has image, description, etc.)
            if (group.image && group.image !== '/default-group.png') score += 15;
            if (group.coverImage) score += 10;
            if (group.description && group.description.length > 20) score += 15;
            
            // 4. Friends in group score
            const friendsInGroup = group.members.filter(memberId => 
                currentUser.following.includes(memberId)
            ).length;
            score += friendsInGroup * 10;
            
            // 5. Type preference (public groups get a small boost)
            if (group.type === 'public') score += 5;
            
            // 6. Random factor for variety
            score += Math.random() * 10;
            
            return {
                ...group,
                _score: score,
                _friendsInGroup: friendsInGroup
            };
        })
        .filter(group => group.image && group.description)
        .sort((a, b) => {
            // Primary sort by score
            if (b._score !== a._score) return b._score - a._score;
            // Secondary sort by friends in group
            return b._friendsInGroup - a._friendsInGroup;
        })
        .map(({ _score, _friendsInGroup, ...group }) => group);
        
        // Apply rotation
        const rotationSize = 6;
        const totalRotations = Math.ceil(scoredGroups.length / rotationSize);
        const currentRotation = rotationIndex % totalRotations;
        const startIndex = currentRotation * rotationSize;
        
        return scoredGroups.slice(startIndex, startIndex + rotationSize);
    }, []);

    // Function to get intelligent brand recommendations
    const getIntelligentBrandRecommendations = useCallback((currentUser: User | null, allBrands: Brand[], rotationIndex: number = 0): Brand[] => {
        if (!currentUser) return [];
        
        const removedBrandIds = JSON.parse(localStorage.getItem('universeRemovedBrandRecommendations') || '[]');
        const alreadyFollowed = currentUser.following || [];
        
        const availableBrands = allBrands.filter(brand => 
            !brand.followers.includes(currentUser.id) &&
            !removedBrandIds.includes(brand.id) &&
            !alreadyFollowed.includes(brand.id)
        );
        
        const scoredBrands = availableBrands.map(brand => {
            let score = 0;
            
            score += Math.min(brand.followers.length * 0.5, 30);
            if (brand.isVerified) score += 20;
            if (brand.profileImage && brand.profileImage !== '/default-avatar.png') score += 10;
            if (brand.coverImage) score += 10;
            if (brand.description && brand.description.length > 20) score += 15;
            if (brand.website) score += 10;
            if (brand.contactEmail || brand.contactPhone) score += 10;
            
            score += Math.random() * 15;
            
            return {
                ...brand,
                _score: score
            };
        })
        .filter(brand => brand.profileImage && brand.description)
        .sort((a, b) => b._score - a._score)
        .map(({ _score, ...brand }) => brand);
        
        const rotationSize = 4;
        const totalRotations = Math.ceil(scoredBrands.length / rotationSize);
        const currentRotation = rotationIndex % totalRotations;
        const startIndex = currentRotation * rotationSize;
        
        return scoredBrands.slice(startIndex, startIndex + rotationSize);
    }, []);

    // Update suggestions when users or currentUser changes
    useEffect(() => {
        if (currentUser && users.length > 0) {
            const intelligentSuggestions = getIntelligentSuggestions(currentUser, users, suggestionRotation);
            setSuggestedUsers(intelligentSuggestions);
        }
    }, [currentUser, users, getIntelligentSuggestions, suggestionRotation]);

    // Update group suggestions when groups or currentUser changes
    useEffect(() => {
        if (currentUser && groups.length > 0) {
            const intelligentGroupSuggestions = getIntelligentGroupSuggestions(currentUser, groups, groupRotation);
            setSuggestedGroups(intelligentGroupSuggestions);
        }
    }, [currentUser, groups, getIntelligentGroupSuggestions, groupRotation]);

    // Enhanced ranked posts with brand boost using the unified rankFeed function
    const rankedPosts = useMemo(() => {
        // Ensure all posts have formattedTime
        const processedPosts = posts.map(post => ({
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        }));
        
        // Create product posts with proper product data
        const productPosts: PostType[] = products.map(p => ({ 
            id: p.id + 100000, 
            authorId: p.sellerId, 
            content: `Just listed a new item: ${p.title}`, 
            timestamp: p.date,
            formattedTime: formatRelativeTime(p.date),
            createdAt: p.date, 
            reactions: p.ratings?.map(r => ({ userId: r.userId, type: 'like' as ReactionType })) || [], 
            comments: p.comments?.map(c => ({
                id: Date.now() + Math.random(),
                userId: c.userId,
                text: c.text,
                timestamp: c.timestamp,
                formattedTime: formatRelativeTime(c.timestamp),
                likes: 0,
                authorName: c.authorName,
                authorImage: c.authorImage
            })) || [],
            shares: 0, 
            views: p.views, 
            type: 'product' as const, 
            visibility: 'Public' as const, 
            product: p, 
            productId: p.id 
        }));
        const reelPosts: PostType[] = reels.map(reel => ({ 
            id: reel.id + 200000, 
            authorId: reel.userId, 
            content: reel.caption, 
            video: reel.videoUrl, 
            timestamp: reel.createdAt,
            formattedTime: formatRelativeTime(reel.createdAt),
            createdAt: reel.createdAt, 
            reactions: reel.reactions, 
            comments: reel.comments, 
            shares: reel.shares, 
            views: (reel.reactions.length * 10) + (reel.shares * 5) + (reel.comments.length * 3), 
            type: 'video' as const, 
            visibility: 'Public' as const
        }));
        
        // Combine all posts including brand posts
        const allContent = [...processedPosts, ...productPosts, ...reelPosts];
        
        // Use the unified rankFeed function that now accepts brands
        return rankFeed(allContent, currentUser, users, brands);
    }, [posts, reels, products, currentUser, users, brands]);

    // ========== FIXED NOTIFICATION MANAGEMENT FUNCTIONS ==========
    const handleCreateNotification = useCallback((
        userId: number,
        senderId: number,
        type: string,
        content: string,
        extraData?: any
    ) => {
        // CRITICAL FIX: Prevent self-notifications
        if (userId === senderId) {
            console.log(`[Notification] Prevented self-notification: ${senderId} -> ${userId} (${type})`);
            return;
        }
        
        if (notificationExists(notifications, userId, senderId, type, extraData?.postId)) {
            return;
        }
        
        const newNotification = createNotification(userId, senderId, type, content, extraData);
        setNotifications(prev => [newNotification, ...prev]);
        
        // Optional: Play notification sound
        if (typeof Audio !== 'undefined' && currentUser?.id === userId) {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        }
    }, [notifications, currentUser?.id]);

    const handleMarkNotificationRead = (notificationId: number) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );
    };

    const handleMarkAllNotificationsRead = () => {
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, read: true }))
        );
    };

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        handleMarkNotificationRead(notification.id);
        
        // Handle navigation based on notification type
        if (notification.postId) {
            setActiveSinglePostId(notification.postId);
            setView('single_post');
        } else if (notification.groupId) {
            setInitialGroupIdToView(notification.groupId);
            setView('groups');
            setActiveTab('groups');
        } else if (notification.brandId) {
            setActiveBrandId(notification.brandId);
            setView('brands');
            setActiveTab('brands');
        } else if (notification.senderId) {
            if (!currentUser) {
                setView('login');
                return;
            }
            setSelectedUserId(notification.senderId);
            setView('profile');
            setActiveTab('profile');
        }
    };
    // ========== END NOTIFICATION MANAGEMENT FUNCTIONS ==========

    // Handle People You May Know actions
    const handleViewProfile = (userId: number) => {
        // Mark the user as viewed and remove from suggestions
        setSuggestedUsers(prev => prev.filter(user => user.id !== userId));
        
        // Store in localStorage to prevent showing again
        if (isClient) {
            const viewedProfiles = JSON.parse(localStorage.getItem('universeViewedProfiles') || '[]');
            localStorage.setItem('universeViewedProfiles', JSON.stringify([...viewedProfiles, userId]));
        }
        
        // Navigate to profile
        setSelectedUserId(userId);
        setView('profile');
        setActiveTab('profile');
    };

    const handleRemoveSuggestedUser = (userId: number) => {
        // Remove from suggestions
        setSuggestedUsers(prev => prev.filter(user => user.id !== userId));
        
        // Store in localStorage to prevent showing again
        if (isClient) {
            const removedSuggestions = JSON.parse(localStorage.getItem('universeRemovedSuggestions') || '[]');
            localStorage.setItem('universeRemovedSuggestions', JSON.stringify([...removedSuggestions, userId]));
        }
        
        // Rotate to next set of suggestions
        setSuggestionRotation(prev => prev + 1);
    };

    // Handle Groups You May Like actions
    const handleViewGroup = (groupId: string) => {
        // Navigate to group
        setInitialGroupIdToView(groupId);
        setView('groups');
        setActiveTab('groups');
    };

    const handleRemoveSuggestedGroup = (groupId: string) => {
        // Remove from suggestions
        setSuggestedGroups(prev => prev.filter(group => group.id !== groupId));
        
        // Store in localStorage to prevent showing again
        if (isClient) {
            const removedGroupSuggestions = JSON.parse(localStorage.getItem('universeRemovedGroupSuggestions') || '[]');
            localStorage.setItem('universeRemovedGroupSuggestions', JSON.stringify([...removedGroupSuggestions, groupId]));
        }
        
        // Rotate to next set of group suggestions
        setGroupRotation(prev => prev + 1);
    };

    // Handle Brand Recommendations actions
    const handleViewBrand = (brandId: number) => {
        setActiveBrandId(brandId);
        setView('brands');
        setActiveTab('brands');
    };

    const handleRemoveBrandRecommendation = (brandId: number) => {
        if (isClient) {
            const removedBrands = JSON.parse(localStorage.getItem('universeRemovedBrandRecommendations') || '[]');
            localStorage.setItem('universeRemovedBrandRecommendations', JSON.stringify([...removedBrands, brandId]));
        }
        
        setBrandRotation(prev => prev + 1);
    };

    // ========== CRITICAL FIX: Load data for guests ==========
    useEffect(() => {
        if (isClient) {
            console.log('Loading data for guest/user...');
            
            // Load data for guests too - essential for content visibility
            const storedUsers = localStorage.getItem('universeUsers');
            const storedPosts = localStorage.getItem('universePosts');
            const storedStories = localStorage.getItem('universeStories');
            const storedProducts = localStorage.getItem('marketplaceProducts');
            
            // Always load posts and users, even for guests
            if (storedUsers) {
                try {
                    setUsers(JSON.parse(storedUsers));
                } catch (e) {
                    console.error('Error parsing stored users:', e);
                }
            }
            
            if (storedPosts) {
                try {
                    const parsedPosts = JSON.parse(storedPosts);
                    const postsWithFormattedTime = parsedPosts.map((post: PostType) => ({
                        ...post,
                        formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                    }));
                    setPosts(postsWithFormattedTime);
                } catch (e) {
                    console.error('Error parsing stored posts:', e);
                }
            }
            
            if (storedStories) {
                try {
                    setStories(JSON.parse(storedStories));
                } catch (e) {
                    console.error('Error parsing stored stories:', e);
                }
            }
            
            if (storedProducts) {
                try {
                    const parsedProducts = JSON.parse(storedProducts);
                    setProducts(parsedProducts);
                } catch (e) {
                    console.error('Error parsing stored products:', e);
                }
            }
            
            // Load other data...
            const storedSongs = localStorage.getItem('universeSongs');
            const storedEpisodes = localStorage.getItem('universeEpisodes');
            const storedLikedTracks = localStorage.getItem('universeLikedTracks');
            const storedBrands = localStorage.getItem('universeBrands');
            const storedGroups = localStorage.getItem('universeGroups');
            const storedNotifications = localStorage.getItem('universeNotifications');
            const storedMessages = localStorage.getItem('universeMessages');
            const storedUserStatus = localStorage.getItem('universeUserStatus');
            
            if (storedSongs) setSongs(JSON.parse(storedSongs));
            if (storedEpisodes) setEpisodes(JSON.parse(storedEpisodes));
            if (storedLikedTracks) setLikedTracks(JSON.parse(storedLikedTracks));
            if (storedBrands) setBrands(JSON.parse(storedBrands));
            if (storedGroups) setGroups(JSON.parse(storedGroups));
            if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
            if (storedMessages) setMessages(JSON.parse(storedMessages));
            if (storedUserStatus) setUserStatus(JSON.parse(storedUserStatus));
            
            // Only set currentUser if they were previously logged in
            const storedUser = localStorage.getItem('universeCurrentUser');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    const freshUser = (storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS).find((u: User) => u.id === user.id);
                    if (freshUser) {
                        setCurrentUser(freshUser);
                        // If user was logged in, ensure view is home
                        if (view === 'login') {
                            setView('home');
                            setActiveTab('home');
                        }
                    }
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                }
            }
            
            // ========== CRITICAL FIX: Ensure guests see content ==========
            if (!storedUser && view === 'login' && path === '/') {
                // Guest at root path should see content, not login
                setView('home');
                setActiveTab('home');
            }
        }
        
        // Set loading to false after data is loaded
        setTimeout(() => setIsLoading(false), 800);
    }, [isClient, view, path]);

    // Save People You May Know and Groups data to localStorage
    useEffect(() => {
        if (isClient && !isLoading) {
            localStorage.setItem('universeCurrentUser', JSON.stringify(currentUser));
            localStorage.setItem('universeUsers', JSON.stringify(users));
            localStorage.setItem('universeSongs', JSON.stringify(songs));
            localStorage.setItem('universeEpisodes', JSON.stringify(episodes));
            localStorage.setItem('universeLikedTracks', JSON.stringify(likedTracks));
            localStorage.setItem('marketplaceProducts', JSON.stringify(products));
            localStorage.setItem('universeBrands', JSON.stringify(brands));
            localStorage.setItem('universePosts', JSON.stringify(posts));
            localStorage.setItem('universeGroups', JSON.stringify(groups));
            localStorage.setItem('universeNotifications', JSON.stringify(notifications));
            localStorage.setItem('universeMessages', JSON.stringify(messages));
            localStorage.setItem('universeUserStatus', JSON.stringify(userStatus));
        }
    }, [currentUser, users, songs, episodes, likedTracks, products, brands, posts, groups, notifications, messages, userStatus, isClient, isLoading]);

    // ========== DEBUG USEFFECTS ==========
    // Add this useEffect to debug posts state changes
    useEffect(() => {
        console.log('📊 [APP] Posts state updated:', {
            totalPosts: posts.length,
            recentPosts: posts.slice(0, 3).map(p => ({
                id: p.id,
                authorId: p.authorId,
                reactions: p.reactions.length,
                comments: p.comments.length
            }))
        });
    }, [posts]);

    // Debug when UserProfile should re-render
    useEffect(() => {
        if (view === 'profile' && selectedUserId) {
            console.log('👤 [APP] UserProfile should render for user:', {
                userId: selectedUserId,
                userPostsCount: posts.filter(p => p.authorId === selectedUserId).length,
                currentUser: currentUser?.id
            });
        }
    }, [view, selectedUserId, posts, currentUser]);

    const handleLogin = (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            console.log('[DEBUG] Login successful for user:', user.id);
            setCurrentUser(user);
            setView('home');
            setActiveTab('home');
            setLoginError('');
            setShowRegister(false);
            setShowForgotPassword(false);
            if (isClient) window.history.pushState({}, '', '/');
        } else {
            console.log('[DEBUG] Login failed for email:', email);
            setLoginError('Invalid email or password');
            // Stay on login page, don't redirect
        }
    };

    const handleRegister = (newUser: Partial<User>) => {
        const id = Math.max(...users.map(u => u.id)) + 1;
        const user: User = { 
            ...newUser, 
            id, 
            role: 'user', 
            followers: [], 
            following: [], 
            joinedDate: new Date().toISOString() 
        } as User;
        
        console.log('[DEBUG] Registration successful for user:', user.id);
        setUsers([...users, user]);
        setCurrentUser(user);
        setShowRegister(false);
        setShowForgotPassword(false);
        setView('home');
        setActiveTab('home');
        
        if (isClient) window.history.pushState({}, '', '/');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            window.history.pushState({}, '', '/');
        }
        // Keep guests on home page to see content
        setView('home');
        setActiveTab('home');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    const handleTagClick = (tag: string) => {
        setActiveTag(tag.replace('#', ''));
        setView('tag_feed');
    };

    // ========== FIXED: Enhanced handleNavigate function ==========
    const handleNavigate = useCallback((targetView: string) => {
        console.log('[DEBUG] handleNavigate called:', { 
            targetView, 
            currentUser: currentUser?.id,
            currentView: view 
        });
        
        // SPECIAL CASE: If target is login/register and user is already on login, stay there
        if ((targetView === 'login' || targetView === 'register') && view === 'login') {
            console.log('[DEBUG] Already on login page, staying put');
            return;
        }
        
        // Check if login is required for this view
        const requiresLogin = [
            'profile', 'create_event', 'create_post', 'create_story', 
            'create_reel', 'marketplace_create', 'messages', 'settings'
        ].includes(targetView);
        
        if (requiresLogin && !currentUser) {
            console.log('[DEBUG] Login required for view:', targetView);
            setView('login');
            setActiveTab('login');
            
            // Update URL if needed
            if (isClient) {
                window.history.pushState({}, '', '/login');
            }
            return;
        }
        
        // Handle navigation based on target view
        if (targetView === 'login' || targetView === 'register') {
            // Show login screen without redirecting
            console.log('[DEBUG] Showing login/register screen');
            setView('login');
            setActiveTab('login');
            setShowRegister(targetView === 'register');
            setShowForgotPassword(false);
            setLoginError('');
            
            if (isClient) {
                window.history.pushState({}, '', '/login');
            }
            return;
        }
        
        // Clear temporary states
        setActiveTag(null);
        setActiveReelId(null);
        setActiveBrandId(null);
        setInitialGroupIdToView(null);
        setActiveGroupComments(null);
        setActiveGroupShare(null);

        // Update URL for the target view
        if (isClient) {
            const pathMap: { [key: string]: string } = {
                home: '/',
                marketplace: '/marketplace',
                reels: '/reels',
                groups: '/groups',
                brands: '/brands',
                events: '/events',
                birthdays: '/birthdays',
                profiles: '/profiles',
                suggested_profiles: '/suggested',
                memories: '/memories',
                music: '/music',
                tools: '/tools',
                help_support: '/help',
                settings: '/settings',
                privacy_policy: '/privacy',
                terms_of_service: '/terms',
                profile: currentUser ? `/@${currentUser.username || currentUser.id}` : '/login',
                create_event: '/create-event',
                brand_view: '/brands',
                login: '/login',
                register: '/register'
            };
            window.history.pushState({}, '', pathMap[targetView] || '/');
        }

        // Handle post-specific navigation
        if (targetView.startsWith('post-')) {
            const postId = parseInt(targetView.split('-')[1]);
            setActiveSinglePostId(postId);
            setView('single_post');
            setActiveTab('single_post');
            return;
        }

        // Handle all other views
        switch(targetView) {
            case 'home':
                setView('home');
                setActiveTab('home');
                break;
            case 'marketplace':
                setView('marketplace');
                setActiveTab('marketplace');
                break;
            case 'reels':
                setView('reels');
                setActiveTab('reels');
                break;
            case 'groups':
                setView('groups');
                setActiveTab('groups');
                break;
            case 'brands':
                setView('brands');
                setActiveTab('brands');
                break;
            case 'events':
                setView('events');
                setActiveTab('events');
                break;
            case 'birthdays':
                setView('birthdays');
                setActiveTab('birthdays');
                break;
            case 'profiles':
            case 'suggested_profiles':
                setView('suggested_profiles');
                setActiveTab('suggested');
                break;
            case 'memories':
                setView('memories');
                setActiveTab('memories');
                break;
            case 'music':
                setView('music');
                setActiveTab('music');
                break;
            case 'tools':
                setView('tools');
                setActiveTab('tools');
                break;
            case 'help_support':
                setView('help_support');
                setActiveTab('help');
                break;
            case 'settings':
                setView('settings');
                setActiveTab('settings');
                break;
            case 'privacy_policy':
                setView('privacy_policy');
                setActiveTab('privacy');
                break;
            case 'terms_of_service':
                setView('terms_of_service');
                setActiveTab('terms');
                break;
            case 'profile':
                if (currentUser) {
                    setSelectedUserId(currentUser.id);
                    setView('profile');
                    setActiveTab('profile');
                } else {
                    setView('login');
                    setActiveTab('login');
                }
                break;
            case 'create_event':
                if (currentUser) {
                    setShowCreateEventModal(true);
                } else {
                    setView('login');
                    setActiveTab('login');
                }
                break;
            case 'brand_view':
                setView('brands');
                setActiveTab('brands');
                break;
            default:
                setView(targetView);
                setActiveTab(targetView);
        }
    }, [currentUser, view, isClient, setSelectedUserId, setActiveTab]);
    
    // ========== ENHANCED MESSAGING FUNCTIONS WITH UNREAD COUNT TRACKING ==========
    const handleSendMessage = (text: string, attachments?: any[], gifUrl?: string, emoji?: string) => {
        console.log('[DEBUG] handleSendMessage called:', { 
            text, 
            currentUserId: currentUser?.id, 
            activeChatUserId: activeChatUser?.id,
            hasGif: !!gifUrl,
            hasEmoji: !!emoji,
            hasAttachments: attachments?.length || 0
        });
        
        if (!currentUser || !activeChatUser) {
            console.log('[DEBUG] No current user or active chat user');
            return;
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        
        // Create message object with proper structure
        const newMessage: Message = {
            id: `msg-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
            senderId: currentUser.id,
            receiverId: activeChatUser.id,
            content: text || '', // Ensure content is always a string
            timestamp,
            formattedTime,
            status: 'sending' as const,
            ...(gifUrl && { gifUrl }),
            ...(emoji && { reaction: emoji }),
            ...(attachments && attachments.length > 0 && { attachments: attachments })
        };
        
        console.log('[DEBUG] Created new message:', newMessage);
        
        // Add message to messages list
        setMessages(prev => {
            const updatedMessages = [newMessage, ...prev];
            console.log('[DEBUG] Updated messages count:', updatedMessages.length);
            return updatedMessages;
        });
        
        // Update recent conversations
        setRecentConversations(prev => {
            const updatedConversations = prev.filter(conv => conv.userId !== activeChatUser.id);
            return [{
                userId: activeChatUser.id,
                userName: activeChatUser.name,
                userImage: activeChatUser.profileImage,
                lastMessage: text || (gifUrl ? 'Sent a GIF' : (emoji ? `Reacted with ${emoji}` : 'Sent an attachment')),
                timestamp,
                unread: false // Not unread for sender
            }, ...updatedConversations].slice(0, 5);
        });
        
        // Update user typing status
        handleTyping(currentUser.id, false);
        
        // Simulate sending and update status
        setTimeout(() => {
            setMessages(prev => prev.map(msg => 
                msg.id === newMessage.id 
                    ? { ...msg, status: 'sent' as const }
                    : msg
            ));
            
            // Increment unread count for recipient
            setUnreadMessageCounts(prev => ({
                ...prev,
                [activeChatUser.id]: (prev[activeChatUser.id] || 0) + 1
            }));
            
            // Simulate delivery after 1 second
            setTimeout(() => {
                setMessages(prev => prev.map(msg => 
                    msg.id === newMessage.id 
                        ? { ...msg, status: 'delivered' as const }
                        : msg
                ));
                
                // Simulate read after 2 seconds (if recipient is online)
                setTimeout(() => {
                    const recipientStatus = getUserStatus(activeChatUser.id);
                    if (recipientStatus.isOnline) {
                        setMessages(prev => prev.map(msg => 
                            msg.id === newMessage.id 
                                ? { ...msg, status: 'read' as const }
                                : msg
                        ));
                    }
                }, 2000);
            }, 1000);
        }, 500);
        
        // Send notification to recipient (prevent self-notification)
        if (activeChatUser.id !== currentUser.id) {
            const notificationContent = gifUrl 
                ? 'sent you a GIF' 
                : emoji 
                    ? `reacted with ${emoji}`
                    : `sent you a message: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
            
            handleCreateNotification(
                activeChatUser.id,
                currentUser.id,
                'message',
                notificationContent,
                { 
                    metadata: { 
                        type: 'message',
                        messageId: newMessage.id,
                        isGif: !!gifUrl,
                        hasEmoji: !!emoji
                    } 
                }
            );
        }
        
        console.log('[DEBUG] Message sent successfully');
    };
    
    const handleDeleteMessage = (messageId: string) => {
        console.log('[DEBUG] Deleting message:', messageId);
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };
    
    const handleReactToMessage = (messageId: string, reaction: string) => {
        console.log('[DEBUG] Reacting to message:', { messageId, reaction });
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, reaction }
                : msg
        ));
    };
    
    // ========== FIXED: Enhanced handleTyping function ==========
    const handleTyping = (userId: number, isTyping: boolean) => {
        console.log('[DEBUG] Typing status:', { userId, isTyping });
        
        setUserStatus(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                typing: isTyping,
                lastSeen: new Date().toISOString()
            }
        }));
        
        // Clear typing status after 3 seconds
        if (isTyping) {
            if (window['typingTimeout']) {
                clearTimeout(window['typingTimeout']);
            }
            
            window['typingTimeout'] = setTimeout(() => {
                console.log('[DEBUG] Clearing typing status for user:', userId);
                setUserStatus(prev => ({
                    ...prev,
                    [userId]: {
                        ...prev[userId],
                        typing: false
                    }
                }));
            }, 3000);
        }
    };
    
    // ========== FIXED: Enhanced handleMarkAsRead function ==========
    const handleMarkAsRead = (messageId: string) => {
        console.log('[DEBUG] Marking message as read:', messageId);
        
        setMessages(prev => prev.map(msg => 
            msg.id === messageId 
                ? { ...msg, status: 'read' as const }
                : msg
        ));
        
        // Update unread counts
        const message = messages.find(msg => msg.id === messageId);
        if (message && currentUser && message.receiverId === currentUser.id) {
            const senderId = message.senderId;
            setUnreadMessageCounts(prev => ({
                ...prev,
                [currentUser.id]: Math.max(0, (prev[currentUser.id] || 0) - 1)
            }));
            
            // Update recent conversations
            setRecentConversations(prev => prev.map(conv => 
                conv.userId === senderId 
                    ? { ...conv, unread: false }
                    : conv
            ));
        }
    };
    
    // ========== FIXED: Enhanced getUserStatus function ==========
    const getUserStatus = (userId: number) => {
        const status = userStatus[userId] || { 
            isOnline: false, 
            lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            typing: false 
        };
        
        // Format last seen time
        const lastSeenDate = new Date(status.lastSeen);
        const now = new Date();
        const diffMs = now.getTime() - lastSeenDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        let formattedLastSeen = status.isOnline 
            ? 'Online' 
            : diffMins < 1 
                ? 'Just now' 
                : diffMins < 60 
                    ? `${diffMins}m ago` 
                    : diffMins < 1440 
                        ? `${Math.floor(diffMins / 60)}h ago` 
                        : `${Math.floor(diffMins / 1440)}d ago`;
        
        return {
            ...status,
            formattedLastSeen
        };
    };
    
    // ========== MESSAGE ICON FUNCTIONALITY ==========
    const handleOpenMessages = () => {
        // This could open a full messages page or a modal
        // For now, we'll show an alert and log to console
        console.log('[DEBUG] Opening messages interface');
        alert('Messages interface would open here. In a full implementation, this would show all conversations.');
        
        // You could also set a state to show a messages modal/page
        // setShowMessagesPage(true);
    };
    
    // Function to handle message icon click in UserProfile
    const handleMessageIconClick = (userId: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const user = users.find(u => u.id === userId);
        if (user) {
            setActiveChatUser(user);
            console.log('[DEBUG] Opening chat with user:', user.name);
        }
    };
    
    // ========== FIXED LIKE AND REACT FUNCTIONS ==========
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const currentUserId = currentUser.id;
    
        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);
    
        // Send follow notification if not already following AND not following yourself
        if (!isCurrentlyFollowing && userIdToToggle !== currentUserId) {
            handleCreateNotification(
                userIdToToggle,
                currentUserId,
                'follow',
                'started following you.',
                {}
            );
        }

        const newUsers = users.map(user => {
            if (user.id === currentUserId) {
                let updatedFollowing, updatedFollowers;
    
                if (isCurrentlyFollowing) {
                    updatedFollowing = user.following.filter(id => id !== userIdToToggle);
                    updatedFollowers = user.followers.filter(id => id !== userIdToToggle);
                } else {
                    updatedFollowing = [...user.following, userIdToToggle];
                    updatedFollowers = [...user.followers, userIdToToggle];
                }
                
                const updatedUser = { 
                    ...user, 
                    following: updatedFollowing,
                    followers: updatedFollowers
                };
    
                setCurrentUser(updatedUser);
                return updatedUser;
            }
    
            if (user.id === userIdToToggle) {
                let updatedFollowers, updatedFollowing;
    
                if (isCurrentlyFollowing) {
                    updatedFollowers = user.followers.filter(id => id !== currentUserId);
                    updatedFollowing = user.following.filter(id => id !== currentUserId);
                } else {
                    updatedFollowers = [...user.followers, currentUserId];
                    updatedFollowing = [...user.following, currentUserId];
                }
                return { 
                    ...user,
                    followers: updatedFollowers,
                    following: updatedFollowing
                };
            }
    
            return user;
        });
    
        setUsers(newUsers);
    };

    // ========== CRITICAL FIX: Enhanced handleReact function ==========
    const handleReact = useCallback((itemId: number, type: ReactionType) => {
        console.log('🎯 [REACT] handleReact called:', { 
            itemId, 
            type, 
            currentUserId: currentUser?.id,
            currentUserName: currentUser?.name
        });
        
        if (!currentUser) {
            console.log('[DEBUG] No current user, showing login');
            handleNavigate('login');
            return { success: false, error: 'Login required' };
        }
        
        // Check if it's a product post (ID > 100000)
        if (itemId > 100000) {
            console.log('[DEBUG] Product post detected, calling handleLikeProduct');
            const productId = itemId - 100000;
            handleLikeProduct(productId);
            return { success: true };
        }
        
        // Use functional update to ensure we get latest state
        setPosts(prev => {
            return prev.map(post => {
                if (post.id === itemId) {
                    const existingReaction = post.reactions.find(r => r.userId === currentUser.id);
                    
                    let newReactions = [...post.reactions];
                    
                    if (existingReaction) {
                        // User already has a reaction
                        if (existingReaction.type === type) {
                            // Remove reaction if same type clicked
                            newReactions = newReactions.filter(r => r.userId !== currentUser.id);
                            console.log('🔽 [REACT] Removed reaction for post:', post.id);
                        } else {
                            // Update reaction type
                            newReactions = newReactions.map(r => 
                                r.userId === currentUser.id ? { ...r, type } : r
                            );
                            console.log('🔄 [REACT] Updated reaction type to:', type, 'for post:', post.id);
                        }
                    } else {
                        // Add new reaction
                        newReactions.push({ userId: currentUser.id, type });
                        console.log('➕ [REACT] Added new reaction:', type, 'for post:', post.id);
                        
                        // Send notification to post author (prevent self-notification)
                        if (post.authorId !== currentUser.id) {
                            console.log('[DEBUG] Sending notification to author:', post.authorId);
                            const content = type === 'like' 
                                ? 'liked your post.' 
                                : `reacted with ${type} to your post.`;
                            
                            handleCreateNotification(
                                post.authorId,
                                currentUser.id,
                                `like_${type === 'like' ? 'post' : 'reaction'}`,
                                content,
                                { postId: itemId, reactionType: type }
                            );
                        } else {
                            console.log('[DEBUG] Self-reaction, skipping notification');
                        }
                    }
                    
                    // Return updated post with NEW array reference
                    return { 
                        ...post, 
                        reactions: newReactions, // This is a new array
                        formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                    };
                }
                return post;
            });
        });
        
        return { success: true };
    }, [currentUser, handleCreateNotification, handleLikeProduct, handleNavigate]);

    // ========== CRITICAL FIX: Enhanced handleComment function ==========
    const handleComment = useCallback((itemId: number, text: string, attachment?: any, parentId?: number) => {
        console.log('💬 [COMMENT] handleComment called:', { 
            itemId, 
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            currentUserId: currentUser?.id,
            currentUserName: currentUser?.name
        });
        
        if (!currentUser) {
            console.log('[DEBUG] No current user, showing login');
            handleNavigate('login');
            return { success: false, error: 'Login required' };
        }
        
        if (!text.trim() && !attachment) {
            console.log('[DEBUG] Empty comment');
            return { success: false, error: 'Comment cannot be empty' };
        }
        
        // Check if it's a product post (ID > 100000)
        if (itemId > 100000) {
            console.log('[DEBUG] Product post detected, calling handleCommentOnProduct');
            const productId = itemId - 100000;
            handleCommentOnProduct(productId, text);
            return { success: true, commentId: Date.now() };
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newComment: Comment = { 
            id: timestamp, 
            userId: currentUser.id, 
            text, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            likes: 0, 
            attachment,
            authorName: currentUser.name,
            authorImage: currentUser.profileImage,
            parentId
        };
        
        console.log('➕ [COMMENT] Adding comment:', {
            postId: itemId,
            commentId: newComment.id,
            commentTextPreview: text.substring(0, 30)
        });
        
        // Use functional update
        setPosts(prev => {
            return prev.map(p => {
                if (p.id === itemId) {
                    const updatedComments = [...p.comments, newComment];
                    console.log('📈 [COMMENT] Updated comments for post', p.id, ':', updatedComments.length);
                    
                    // Send notification to post author
                    if (p.authorId !== currentUser.id) {
                        console.log('[DEBUG] Sending comment notification to author:', p.authorId);
                        handleCreateNotification(
                            p.authorId,
                            currentUser.id,
                            'comment_post',
                            'commented on your post.',
                            { postId: itemId, commentId: newComment.id }
                        );
                    } else {
                        console.log('[DEBUG] Self-comment, skipping notification');
                    }
                    
                    // Return with NEW array reference
                    return { 
                        ...p, 
                        comments: updatedComments, // This is a new array
                        formattedTime: p.formattedTime || formatRelativeTime(p.timestamp || p.createdAt || Date.now())
                    };
                }
                return p;
            });
        });

        // Update comment count for music/podcast posts
        const post = posts.find(p => p.id === itemId);
        if (post && (post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
            const song = getSongForPost(post, songs, episodes);
            if (song) {
                handleTrackComment(song.id);
            }
        }
        
        // Close comments sheet if it's open
        if (activeCommentsPostId === itemId) {
            console.log('[DEBUG] Closing comments sheet for post:', itemId);
            setActiveCommentsPostId(null);
        }
        
        console.log('✅ [COMMENT] Comment added successfully to post:', itemId);
        return { success: true, commentId: newComment.id };
    }, [currentUser, posts, songs, episodes, activeCommentsPostId, handleCommentOnProduct, handleCreateNotification, handleTrackComment, handleNavigate]);

    // FIXED: Prevent self-notifications for reel reactions
    const handleReelReact = (reelId: number, type: ReactionType | undefined) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        setReels(prev => prev.map(reel => {
            if (reel.id === reelId) {
                const existing = reel.reactions.find(r => r.userId === currentUser!.id);
                let newReactions = [...reel.reactions];
                if (type === undefined || (existing && existing.type === type)) {
                    newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                } else if (existing) {
                    newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type: type! } : r);
                } else {
                    newReactions.push({ userId: currentUser!.id, type: type! });
                    
                    // Send notification to reel owner (prevent self-notification)
                    if (reel.userId !== currentUser.id) {
                        const content = type === 'like' 
                            ? 'liked your reel.' 
                            : `reacted with ${type} to your reel.`;
                        
                        handleCreateNotification(
                            reel.userId,
                            currentUser.id,
                            'like_reel',
                            content,
                            { reelId }
                        );
                    }
                }
                return { ...reel, reactions: newReactions };
            }
            return reel;
        }));
    };

    const handleCreatePost = (
        text: string, 
        files: File[] | null, 
        type: any, 
        visibility: any, 
        location?: string, 
        feeling?: string, 
        taggedUsers?: number[], 
        background?: string, 
        linkPreview?: LinkPreview
    ) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        // Handle multiple images
        let images: string[] = [];
        let video: string | undefined = undefined;
        
        if (files && files.length > 0) {
            if (type === 'video' && files.length === 1) {
                video = URL.createObjectURL(files[0]);
            } else if (type === 'image' || type === 'multimage') {
                images = files.map(file => URL.createObjectURL(file));
            }
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newPost: PostType = { 
            id: timestamp, 
            authorId: currentUser.id, 
            content: text, 
            images: images.length > 0 ? images : undefined,
            video: video,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: 0, 
            type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (images.length > 0 ? 'image' : 'text')),
            visibility, 
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview 
        };
        setPosts([newPost, ...posts]);
        
        // Enhanced notification logic for tagged users with self-notification prevention
        if (taggedUsers && taggedUsers.length > 0) {
            taggedUsers.forEach(userId => {
                if (userId !== currentUser.id) {
                    handleCreateNotification(
                        userId,
                        currentUser.id,
                        'tag_post',
                        'tagged you in a post.',
                        { postId: newPost.id }
                    );
                }
            });
        }
        
        // Handle mentions in post content with self-notification prevention
        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const mentions = [...text.matchAll(mentionRegex)];
        if (mentions.length > 0) {
            const mentionedUserIds = new Set<number>();
            mentions.forEach(match => {
                const userName = match[1];
                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                if (user && user.id !== currentUser.id && !taggedUsers?.includes(user.id)) {
                    mentionedUserIds.add(user.id);
                    
                    handleCreateNotification(
                        user.id,
                        currentUser.id,
                        'mention_post',
                        'mentioned you in a post.',
                        { postId: newPost.id }
                    );
                }
            });
        }
    };

    // PROFESSIONAL BRAND MANAGEMENT FUNCTIONS WITH SELF-NOTIFICATION PREVENTION
    const handleCreateBrand = (brandData: Partial<Brand>) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const newBrand: Brand = {
            id: Date.now(),
            name: brandData.name || 'New Brand',
            category: brandData.category || 'Business',
            description: brandData.description || '',
            location: brandData.location || '',
            website: brandData.website || '',
            contactEmail: brandData.contactEmail || '',
            contactPhone: brandData.contactPhone || '',
            adminId: currentUser.id,
            followers: [currentUser.id],
            isVerified: false,
            posts: [],
            createdAt: Date.now(),
            profileImage: brandData.profileImage || `https://ui-avatars.com/api/?name=${brandData.name || 'Brand'}&background=random&size=150`,
            coverImage: brandData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80'
        };
        
        setBrands(prev => [newBrand, ...prev]);
        
        // Also add the brand to user's following list
        if (currentUser) {
            setCurrentUser(prev => prev ? {
                ...prev,
                following: [...prev.following, newBrand.id]
            } : prev);
            
            setUsers(prev => prev.map(user => 
                user.id === currentUser.id 
                    ? { ...user, following: [...user.following, newBrand.id] }
                    : user
            ));
        }
        
        alert("Brand page created successfully! You are now following this page.");
    };

    // FIXED: Prevent self-notifications in brand posts
    const handlePostAsBrand = (
        brandId: number, 
        content: any
    ) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        // Destructure all parameters
        const { 
            text, 
            files, 
            type, 
            visibility, 
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview 
        } = content;
        
        // Verify the current user is admin of this brand
        const brand = brands.find(b => b.id === brandId);
        if (!brand) {
            alert("Brand not found.");
            return;
        }
        
        if (brand.adminId !== currentUser.id && !isAdmin) {
            alert("You don't have permission to post as this brand.");
            return;
        }
        
        // Handle multiple images
        let images: string[] = [];
        let video: string | undefined = undefined;
        
        if (files && files.length > 0) {
            if (type === 'video' && files.length === 1) {
                video = URL.createObjectURL(files[0]);
            } else if (type === 'image' || type === 'multimage') {
                images = files.map(file => URL.createObjectURL(file));
            }
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newPost: PostType = { 
            id: timestamp,
            authorId: brandId,
            content: text,
            images: images.length > 0 ? images : undefined,
            video: video,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp,
            reactions: [], 
            comments: [], 
            shares: 0,
            views: 0,
            type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (images.length > 0 ? 'image' : 'text')),
            visibility: visibility as any,
            location, 
            feeling, 
            taggedUsers, 
            background, 
            linkPreview,
            brandId: brandId
        };
        
        console.log("Creating brand post with multiple images:", newPost);
        
        // Add to main posts array
        setPosts(prev => [newPost, ...prev]);
        
        // Update brand's posts array
        setBrands(prev => prev.map(b => 
            b.id === brandId 
                ? { ...b, posts: [...(b.posts || []), timestamp] }
                : b
        ));
        
        // Notify brand followers (excluding the current user to prevent self-notification)
        brand.followers.forEach(followerId => {
            if (followerId !== currentUser.id) {
                handleCreateNotification(
                    followerId,
                    currentUser.id,
                    'brand_post',
                    `${brand.name} posted: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                    { brandId, postId: timestamp }
                );
            }
        });
        
        // Enhanced notification logic for tagged users in brand posts with self-notification prevention
        if (taggedUsers && taggedUsers.length > 0) {
            taggedUsers.forEach(userId => {
                if (userId !== currentUser.id) {
                    handleCreateNotification(
                        userId,
                        currentUser.id,
                        'tag_post',
                        `${brand.name} tagged you in a post.`,
                        { postId: timestamp, brandId }
                    );
                }
            });
        }
        
        alert("Brand post published successfully!");
        return newPost;
    };

    const handleFollowBrand = (brandId: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setBrands(prev => prev.map(b => {
            if (b.id === brandId) {
                const isFollowing = b.followers.includes(currentUser!.id);
                const updatedFollowers = isFollowing 
                    ? b.followers.filter(id => id !== currentUser!.id) 
                    : [...b.followers, currentUser!.id];
                
                // Send notification to brand admin if following (prevent self-notification)
                if (!isFollowing && b.adminId !== currentUser.id) {
                    handleCreateNotification(
                        b.adminId,
                        currentUser.id,
                        'brand_follow',
                        `followed your brand ${b.name}.`,
                        { brandId }
                    );
                }
                
                // Update user's following list as well
                if (currentUser) {
                    const updatedFollowing = isFollowing
                        ? currentUser.following.filter(id => id !== brandId)
                        : [...currentUser.following, brandId];
                    
                    setCurrentUser(prev => prev ? { ...prev, following: updatedFollowing } : prev);
                    
                    setUsers(prev => prev.map(user => 
                        user.id === currentUser.id 
                            ? { ...user, following: updatedFollowing }
                            : user
                    ));
                }
                
                return { 
                    ...b, 
                    followers: updatedFollowers
                };
            }
            return b;
        }));
    };

    const handleUpdateBrand = (brandId: number, updates: Partial<Brand>) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const brand = brands.find(b => b.id === brandId);
        if (!brand) {
            alert("Brand not found.");
            return;
        }
        
        if (brand.adminId !== currentUser.id && !isAdmin) {
            alert("You don't have permission to update this brand.");
            return;
        }
        
        setBrands(prev => prev.map(b => 
            b.id === brandId ? { ...b, ...updates } : b
        ));
        
        alert("Brand updated successfully!");
    };

    const handleDeleteBrand = (brandId: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const brand = brands.find(b => b.id === brandId);
        if (!brand) {
            alert("Brand not found.");
            return;
        }
        
        if (brand.adminId !== currentUser.id && !isAdmin) {
            alert("You don't have permission to delete this brand.");
            return;
        }
        
        if (window.confirm(`Are you sure you want to delete "${brand.name}"? This will also delete all brand posts.`)) {
            // Remove brand
            setBrands(prev => prev.filter(b => b.id !== brandId));
            
            // Remove brand posts
            setPosts(prev => prev.filter(p => p.brandId !== brandId && p.authorId !== brandId));
            
            // Remove brand from users' following lists
            setUsers(prev => prev.map(user => ({
                ...user,
                following: user.following.filter(id => id !== brandId)
            })));
            
            alert("Brand deleted successfully!");
        }
    };

    const handleUpdateBrandImage = (brandId: number, type: 'cover' | 'profile', file: File) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const brand = brands.find(b => b.id === brandId);
        if (!brand) {
            alert("Brand not found.");
            return;
        }
        
        if (brand.adminId !== currentUser.id && !isAdmin) {
            alert("You don't have permission to update this brand's image.");
            return;
        }
        
        const url = URL.createObjectURL(file);
        setBrands(prev => prev.map(b => 
            b.id === brandId 
                ? (type === 'cover' 
                    ? { ...b, coverImage: url } 
                    : { ...b, profileImage: url })
                : b
        ));
        
        alert("Brand image updated successfully!");
    };

    const handleVerifyBrand = (brandId: number) => {
        if (!isAdmin) {
            alert("Only admins can verify brands.");
            return;
        }
        
        setBrands(prev => prev.map(b => 
            b.id === brandId ? { ...b, isVerified: !b.isVerified } : b
        ));
        
        const brand = brands.find(b => b.id === brandId);
        if (brand) {
            const action = brand.isVerified ? "unverified" : "verified";
            alert(`Brand ${action} successfully!`);
        }
    };

    const handleDeletePost = (postId: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const post = posts.find(p => p.id === postId);
        if (!post) {
            alert("Post not found.");
            return;
        }
        
        // Check permissions
        const canDelete = isAdmin || post.authorId === currentUser.id;
        if (!canDelete) {
            // For brand posts, check if user is brand admin
            if (post.brandId) {
                const brand = brands.find(b => b.id === post.brandId);
                if (brand && brand.adminId === currentUser.id) {
                    // Brand admin can delete brand posts
                } else {
                    alert("You can only delete your own posts.");
                    return;
                }
            } else if (post.groupId) {
                const group = groups.find(g => g.id === post.groupId);
                if (group && group.adminId === currentUser.id) {
                    // Group admin can delete group posts
                } else {
                    alert("You can only delete your own posts.");
                    return;
                }
            } else {
                alert("You can only delete your own posts.");
                return;
            }
        }
        
        if (window.confirm("Are you sure you want to delete this post?")) {
            // Remove from main posts
            setPosts(prev => prev.filter(p => p.id !== postId));
            
            // Remove from brand posts if applicable
            if (post.brandId) {
                setBrands(prev => prev.map(brand => ({
                    ...brand,
                    posts: brand.id === post.brandId 
                        ? (brand.posts || []).filter(id => id !== postId)
                        : (brand.posts || [])
                })));
            }
            
            // Also remove from group posts if applicable
            if (post.groupId) {
                setGroups(prev => prev.map(group => ({
                    ...group,
                    posts: group.id === post.groupId 
                        ? group.posts.filter(p => p.id !== postId)
                        : group.posts
                })));
            }
            
            alert("Post deleted successfully!");
        }
    };

    const handleCreateProduct = (productData: Partial<Product>) => {
        console.log("Creating product with data:", productData);
        
        if (!currentUser) {
            handleNavigate('login');
            return;
        }

        // Generate a shareId
        const generateShareId = () => {
            return 'prod_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        };

        // Create a complete product object
        const newProduct: Product = {
            id: Date.now(),
            title: productData.title || 'Untitled',
            description: productData.description || '',
            category: productData.category || 'other',
            mainPrice: productData.mainPrice || 0,
            discountPrice: productData.discountPrice || null,
            quantity: productData.quantity || 1,
            images: productData.images || [],
            address: productData.address || '',
            country: productData.country || 'US',
            phoneNumber: productData.phoneNumber || '',
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            sellerAvatar: currentUser.profileImage || 'https://via.placeholder.com/150',
            status: 'active',
            views: 0,
            ratings: [],
            comments: [],
            date: Date.now(),
            shareId: generateShareId(),
        };

        console.log("New product created:", newProduct);
        
        // Update products state
        setProducts(prev => [...prev, newProduct]);
        
        // Notify followers about new product (excluding self)
        const followers = currentUser.followers || [];
        followers.forEach(followerId => {
            if (followerId !== currentUser.id) {
                handleCreateNotification(
                    followerId,
                    currentUser.id,
                    'product_post',
                    `listed a new product: "${newProduct.title}"`,
                    { productId: newProduct.id }
                );
            }
        });
        
        alert("Product listed successfully!");
        
        return newProduct;
    };

    // ========== FIXED PRODUCT INTERACTION FUNCTIONS ==========
    // ENHANCED: Handle product likes from homepage feeds
    const handleLikeProduct = (productId: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setProducts(prev => prev.map(product => {
            if (product.id === productId) {
                const ratings = product.ratings || [];
                const existingRating = ratings.find(r => r.userId === currentUser.id);
                
                if (existingRating) {
                    // Unlike if already liked
                    return {
                        ...product,
                        ratings: ratings.filter(r => r.userId !== currentUser.id)
                    };
                } else {
                    // Like the product
                    const newRating = {
                        userId: currentUser.id,
                        rating: 5, // Like counts as 5-star rating
                        comment: '',
                        timestamp: Date.now()
                    };
                    
                    // Notify product seller (prevent self-notification)
                    if (product.sellerId !== currentUser.id) {
                        handleCreateNotification(
                            product.sellerId,
                            currentUser.id,
                            'product_like',
                            `liked your product: "${product.title}"`,
                            { productId }
                        );
                    }
                    
                    return {
                        ...product,
                        ratings: [...ratings, newRating]
                    };
                }
            }
            return product;
        }));
    };

    // ENHANCED: Handle product comments from homepage feeds
    const handleCommentOnProduct = (productId: number, text: string) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setProducts(prev => prev.map(product => {
            if (product.id === productId) {
                const comments = product.comments || [];
                const newComment = {
                    userId: currentUser.id,
                    text,
                    timestamp: Date.now(),
                    authorName: currentUser.name,
                    authorImage: currentUser.profileImage
                };
                
                // Notify product seller (prevent self-notification)
                if (product.sellerId !== currentUser.id) {
                    handleCreateNotification(
                        product.sellerId,
                        currentUser.id,
                        'product_comment',
                        `commented on your product: "${product.title}"`,
                        { productId }
                    );
                }
                
                return {
                    ...product,
                    comments: [...comments, newComment]
                };
            }
            return product;
        }));
    };

    const handleCreateStory = (storyData: Partial<Story>) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const timestamp = Date.now();
        const newStory: Story = { 
            id: timestamp, 
            userId: currentUser.id, 
            user: currentUser, 
            ...storyData, 
            createdAt: timestamp 
        } as Story;
        setStories(prev => [newStory, ...prev]);
        setShowCreateStoryModal(false);
    };

    const handleCreateReel = (videoFile: File, caption: string, song?: Song | { name: string, url: string }, effectName?: string) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const timestamp = Date.now();
        const newReel: Reel = { 
            id: timestamp, 
            userId: currentUser.id, 
            videoUrl: URL.createObjectURL(videoFile), 
            caption, 
            songName: song ? (song as Song).title || (song as {name: string}).name : 'Original Audio', 
            effectName: effectName, 
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0 
        };
        setReels(prev => [newReel, ...prev]);
        setShowCreateReelModal(false);
    };

    const handleLikeStory = (storyId: number) => {
        if (!currentUser) { 
            handleNavigate('login');
            return; 
        }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const reactions = s.reactions || [];
                const existingLike = reactions.find(r => r.userId === currentUser!.id);
                if (existingLike) {
                    return { ...s, reactions: reactions.filter(r => r.userId !== currentUser!.id) };
                } else {
                    // Send notification to story owner (prevent self-notification)
                    if (s.userId !== currentUser.id) {
                        handleCreateNotification(
                            s.userId,
                            currentUser.id,
                            'like_story',
                            'liked your story.',
                            { storyId }
                        );
                    }
                    return { ...s, reactions: [...reactions, { userId: currentUser!.id }] };
                }
            }
            return s;
        }));
    };
    
    const handleReplyStory = (storyId: number, text: string) => {
        if (!currentUser) { 
            handleNavigate('login');
            return; 
        }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const replies = s.replies || [];
                const newReply = { userId: currentUser!.id, text, timestamp: Date.now() };
                
                // Send notification to story owner (prevent self-notification)
                if (s.userId !== currentUser.id) {
                    handleCreateNotification(
                        s.userId,
                        currentUser.id,
                        'comment_story',
                        'replied to your story.',
                        { storyId }
                    );
                }
                
                return { ...s, replies: [...replies, newReply] };
            }
            return s;
        }));
    };

    const handleCreateEvent = (eventData: Partial<Event>) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newEvent: Event = { 
            ...eventData, 
            id: timestamp, 
            attendees: [currentUser.id], 
            interestedIds: [] 
        } as Event;
        setEvents(prev => [newEvent, ...prev]);
        const eventPost: PostType = { 
            id: timestamp + 1, 
            authorId: currentUser.id, 
            content: `is hosting a new event: ${newEvent.title}`, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            type: 'event', 
            visibility: 'Public', 
            event: newEvent, 
            eventId: newEvent.id 
        };
        setPosts(prev => [eventPost, ...prev]);
    };

    const handleJoinEvent = (eventId: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        setEvents(prev => prev.map(ev => {
            if (ev.id === eventId) {
                const isAttending = ev.attendees.includes(currentUser!.id);
                const isInterested = ev.interestedIds?.includes(currentUser!.id);
                if (isAttending) return ev;
                if (isInterested) {
                    return { ...ev, interestedIds: ev.interestedIds!.filter(id => id !== currentUser!.id), attendees: [...ev.attendees, currentUser!.id] };
                }
                
                // Send notification to event organizer (prevent self-notification)
                if (ev.organizerId !== currentUser.id) {
                    handleCreateNotification(
                        ev.organizerId,
                        currentUser.id,
                        'event_interest',
                        'is interested in your event.',
                        { eventId }
                    );
                }
                
                return { ...ev, interestedIds: [...(ev.interestedIds || []), currentUser!.id] };
            }
            return ev;
        }));
    };

    // FIXED: Prevent self-notifications for shares - UPDATED to handle product posts
    const handleShare = (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        console.log('[DEBUG] handleShare called:', { postId, targetType, targetId, currentUserId: currentUser?.id });
        
        if (!currentUser) {
            console.log('[DEBUG] No current user, showing login');
            handleNavigate('login');
            return;
        }
        
        // Check if it's a product post (ID > 100000)
        if (postId > 100000) {
            console.log('[DEBUG] Product post detected');
            const productId = postId - 100000;
            const product = products.find(p => p.id === productId);
            if (!product) return;
            
            // Handle product share
            if (targetType === 'profile') {
                const timestamp = Date.now();
                const formattedTime = formatRelativeTime(timestamp);
                const newPost: PostType = { 
                    id: timestamp, 
                    authorId: currentUser.id, 
                    content: extraCaption ? `${extraCaption}\n\nShared product: ${product.title}` : `Shared product: ${product.title}`, 
                    timestamp: timestamp,
                    formattedTime: formattedTime,
                    createdAt: timestamp, 
                    reactions: [], 
                    comments: [], 
                    shares: 0, 
                    views: 0, 
                    type: 'product' as const, 
                    visibility: 'Public' as const, 
                    product: product, 
                    productId: productId,
                    sharedPostId: postId
                };
                setPosts([newPost, ...posts]);
                
                // Send notification to product seller
                if (product.sellerId !== currentUser.id) {
                    handleCreateNotification(
                        product.sellerId,
                        currentUser.id,
                        'product_share',
                        `shared your product: "${product.title}"`,
                        { productId }
                    );
                }
                
                alert("Product shared to your feed!");
            }
            return;
        }
        
        const sourcePost = posts.find(p => p.id === postId);
        if (!sourcePost) return;
        
        // Send notification to original post author (prevent self-sharing notifications)
        if (sourcePost.authorId !== currentUser.id) {
            handleCreateNotification(
                sourcePost.authorId,
                currentUser.id,
                'share_post',
                'shared your post.',
                { postId: postId }
            );
        }
        
        // Check if it's a music/podcast post and update share count
        if (sourcePost.type === 'music' || sourcePost.type === 'podcast') {
            if (sourcePost.audioTrack) {
                const song = getSongForPost(sourcePost, songs, episodes);
                if (song) {
                    handleTrackShare(song.id);
                }
            }
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newSharedPost: PostType = { 
            ...sourcePost, 
            id: timestamp, 
            authorId: currentUser.id, 
            content: extraCaption ? `${extraCaption}\n\n${sourcePost.content || ''}` : sourcePost.content, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            sharedPostId: sourcePost.id 
        };
        
        if (targetType === 'profile') setPosts([newSharedPost, ...posts]);
        else if (targetType === 'brand' && targetId) {
            setPosts([{ ...newSharedPost, brandId: Number(targetId) }, ...posts]);
        }
        
        // Update original post share count
        setPosts(prev => prev.map(post => 
            post.id === postId 
                ? { ...post, shares: (post.shares || 0) + 1 }
                : post
        ));
        
        setActiveSharePostId(null);
        alert("Shared successfully!");
    };

    const handleFeedPost = (data: any) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newPost: PostType = { 
            id: timestamp, 
            authorId: currentUser.id, 
            content: data.content, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            views: 0, 
            type: data.type || 'text', 
            visibility: 'Public', 
            audioTrack: data.audioTrack 
        };
        setPosts([newPost, ...posts]);
    };

    // Handle adding songs from upload - ENHANCED to ensure complete audioTrack data
    const handleAddSong = (song: Song) => {
        console.log("Adding new song to library:", song);
        const newSong = {
            ...song,
            plays: song.plays || 0,
            likes: song.likes || 0,
            shares: song.shares || 0,
            comments: song.comments || 0,
            uploadDate: song.uploadDate || new Date().toISOString(),
            stats: song.stats || {
                plays: song.plays || 0,
                likes: song.likes || 0,
                shares: song.shares || 0,
                comments: song.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
        
        setSongs(prev => {
            const exists = prev.find(s => s.id === song.id);
            if (exists) {
                return prev.map(s => s.id === song.id ? newSong : s);
            }
            return [newSong, ...prev];
        });
        
        // Also create a feed post for the new upload
        if (currentUser) {
            const timestamp = Date.now();
            const formattedTime = formatRelativeTime(timestamp);
            const audioTrack: AudioTrack = {
                id: song.id,
                title: song.title,
                artist: song.artist,
                duration: typeof song.duration === 'string' ? 
                    parseInt(song.duration.split(':')[0]) * 60 + parseInt(song.duration.split(':')[1]) || 180 : 
                    song.duration || 180,
                url: song.audioUrl || '',
                uploaderId: song.uploaderId || currentUser.id,
                cover: song.cover || '/default-cover.jpg',
                type: 'music',
                isVerified: true,
                plays: song.plays || 0,
                likes: song.likes || 0,
                shares: song.shares || 0
            };
            
            const newPost: PostType = {
                id: timestamp,
                authorId: currentUser.id,
                content: `🎵 Just released new music: "${song.title}" by ${song.artist}`,
                timestamp: timestamp,
                formattedTime: formattedTime,
                createdAt: timestamp,
                reactions: [],
                comments: [],
                shares: 0,
                views: 0,
                type: 'music',
                visibility: 'Public',
                audioTrack: audioTrack
            };
            
            setPosts(prev => [newPost, ...prev]);
            
            // Notify followers about new music (excluding self)
            const followers = currentUser.followers || [];
            followers.forEach(followerId => {
                if (followerId !== currentUser.id) {
                    handleCreateNotification(
                        followerId,
                        currentUser.id,
                        'music_post',
                        `released new music: "${song.title}"`,
                        { songId: song.id }
                    );
                }
            });
        }
    };

    // Handle adding episodes from upload - ENHANCED to ensure complete audioTrack data
    const handleAddEpisode = (episode: Episode) => {
        console.log("Adding new episode to library:", episode);
        const newEpisode = {
            ...episode,
            plays: episode.plays || 0,
            likes: episode.likes || 0,
            shares: episode.shares || 0,
            comments: episode.comments || 0,
            uploadDate: episode.uploadDate || new Date().toISOString(),
            stats: episode.stats || {
                plays: episode.plays || 0,
                likes: episode.likes || 0,
                shares: episode.shares || 0,
                comments: episode.comments || 0,
                downloads: 0,
                reelsUse: 0
            }
        };
        
        setEpisodes(prev => {
            const exists = prev.find(e => e.id === episode.id);
            if (exists) {
                return prev.map(e => e.id === episode.id ? newEpisode : e);
            }
            return [newEpisode, ...prev];
        });
        
        // Also create a feed post for the new upload
        if (currentUser) {
            const timestamp = Date.now();
            const formattedTime = formatRelativeTime(timestamp);
            const audioTrack: AudioTrack = {
                id: episode.id,
                title: episode.title,
                artist: episode.host || 'Podcast Host',
                duration: typeof episode.duration === 'string' ?
                    parseInt(episode.duration.split(':')[0]) * 60 + parseInt(episode.duration.split(':')[1]) || 1800 :
                    episode.duration || 1800,
                url: episode.audioUrl || '',
                uploaderId: episode.uploaderId || currentUser.id,
                cover: episode.thumbnail || episode.cover || '/default-cover.jpg',
                type: 'podcast',
                isVerified: true,
                plays: episode.plays || 0,
                likes: episode.likes || 0,
                shares: episode.shares || 0
            };
            
            const newPost: PostType = {
                id: timestamp,
                authorId: currentUser.id,
                content: `🎙️ New podcast episode: "${episode.title}" with ${episode.host || 'Podcast Host'}`,
                timestamp: timestamp,
                formattedTime: formattedTime,
                createdAt: timestamp,
                reactions: [],
                comments: [],
                shares: 0,
                views: 0,
                type: 'podcast',
                visibility: 'Public',
                audioTrack: audioTrack
            };
            
            setPosts(prev => [newPost, ...prev]);
        }
    };

    const handleUploadToFeed = (song: Song) => {
        console.log("Uploading to feed:", song);
        handleAddSong(song);
    };

    // Enhanced handlePlayTrack with proper play counting
    const handlePlayTrack = (track: AudioTrack) => { 
        setCurrentAudioTrack(track); 
        setIsAudioPlaying(true); 
        
        // Add to play history
        setPlayHistory(prev => [...prev, {
            trackId: track.id,
            timestamp: Date.now(),
            duration: track.duration
        }]);
        
        // Update play count for the track
        if (track.type === 'music') {
            setSongs(prev => prev.map(song => 
                song.id === track.id 
                    ? { 
                        ...song, 
                        plays: (song.plays || 0) + 1,
                        stats: {
                            ...song.stats,
                            plays: (song.stats?.plays || 0) + 1
                        }
                    }
                    : song
            ));
        } else if (track.type === 'podcast') {
            setEpisodes(prev => prev.map(episode => 
                episode.id === track.id 
                    ? { 
                        ...episode, 
                        plays: (episode.plays || 0) + 1,
                        stats: {
                            ...episode.stats,
                            plays: (episode.stats?.plays || 0) + 1
                        }
                    }
                    : episode
            ));
        }
    };

    // Handle like for music/podcast posts with self-notification prevention
    const handleLikeTrack = (trackId: string, isLiked: boolean) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setLikedTracks(prev => 
            isLiked 
                ? prev.filter(id => id !== trackId)
                : [...prev, trackId]
        );
        
        // Update song/episode like count
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            if ('artist' in track) {
                // It's a song
                setSongs(prev => prev.map(song => 
                    song.id === trackId 
                        ? { 
                            ...song, 
                            likes: isLiked ? Math.max(0, (song.likes || 0) - 1) : (song.likes || 0) + 1,
                            stats: {
                                ...song.stats,
                                likes: isLiked ? Math.max(0, (song.stats?.likes || 0) - 1) : (song.stats?.likes || 0) + 1
                            }
                        }
                        : song
                ));
                
                // Send notification to song uploader if liking (prevent self-notification)
                if (!isLiked && track.uploaderId && track.uploaderId !== currentUser?.id) {
                    handleCreateNotification(
                        track.uploaderId,
                        currentUser!.id,
                        'music_like',
                        `liked your song "${track.title}"`,
                        { songId: trackId }
                    );
                }
            } else {
                // It's an episode
                setEpisodes(prev => prev.map(episode => 
                    episode.id === trackId 
                        ? { 
                            ...episode, 
                            likes: isLiked ? Math.max(0, (episode.likes || 0) - 1) : (episode.likes || 0) + 1,
                            stats: {
                                ...episode.stats,
                                likes: isLiked ? Math.max(0, (episode.stats?.likes || 0) - 1) : (episode.stats?.likes || 0) + 1
                            }
                        }
                        : episode
                ));
            }
        }
    };

    // Handle comment count for music/podcast posts
    const handleTrackComment = (trackId: string) => {
        // Update song/episode comment count
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            if ('artist' in track) {
                setSongs(prev => prev.map(song => 
                    song.id === trackId 
                        ? { 
                            ...song, 
                            comments: (song.comments || 0) + 1,
                            stats: {
                                ...song.stats,
                                comments: (song.stats?.comments || 0) + 1
                            }
                        }
                        : song
                ));
            } else {
                setEpisodes(prev => prev.map(episode => 
                    episode.id === trackId 
                        ? { 
                            ...episode, 
                            comments: (episode.comments || 0) + 1,
                            stats: {
                                ...episode.stats,
                                comments: (episode.stats?.comments || 0) + 1
                            }
                        }
                        : episode
                ));
            }
        }
    };

    // Handle share for music/podcast posts
    const handleTrackShare = (trackId: string) => {
        // Update song/episode share count
        const track = songs.find(s => s.id === trackId) || episodes.find(e => e.id === trackId);
        if (track) {
            if ('artist' in track) {
                setSongs(prev => prev.map(song => 
                    song.id === trackId 
                        ? { 
                            ...song, 
                            shares: (song.shares || 0) + 1,
                            stats: {
                                ...song.stats,
                                shares: (song.stats?.shares || 0) + 1
                            }
                        }
                        : song
                ));
            } else {
                setEpisodes(prev => prev.map(episode => 
                    episode.id === trackId 
                        ? { 
                            ...episode, 
                            shares: (episode.shares || 0) + 1,
                            stats: {
                                ...episode.stats,
                                shares: (episode.stats?.shares || 0) + 1
                            }
                        }
                        : episode
                ));
            }
        }
    };

    // ========== MISSING FUNCTIONS ADDED ==========
    const handleDeleteSong = (songId: string) => {
        if (!currentUser || !isAdmin) {
            handleNavigate('login');
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this song?")) {
            setSongs(prev => prev.filter(s => s.id !== songId));
            setPosts(prev => prev.filter(p => !p.audioTrack || p.audioTrack.id !== songId));
            alert("Song deleted successfully");
        }
    };

    const handleDeleteEpisode = (episodeId: string) => {
        if (!currentUser || !isAdmin) {
            handleNavigate('login');
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this episode?")) {
            setEpisodes(prev => prev.filter(e => e.id !== episodeId));
            setPosts(prev => prev.filter(p => !p.audioTrack || p.audioTrack.id !== episodeId));
            alert("Episode deleted successfully");
        }
    };

    const handleVerifyUser = (userId: number) => { 
        if (isAdmin) {
            setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !u.isVerified } : u));
            alert(`User ${users.find(u => u.id === userId)?.isVerified ? 'unverified' : 'verified'} successfully!`);
        }
    };
    
    const handleRestrictUser = (userId: number) => { 
        if (isAdmin) {
            setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: true, restrictedUntil: Date.now() + 24 * 60 * 60 * 1000 } : u));
            alert("User restricted for 24 hours");
        }
    };
    
    const handleDeleteUser = (userId: number) => { 
        if (isAdmin && window.confirm("Delete this user and all their content? This is irreversible.")) { 
            setUsers(users.filter(u => u.id !== userId)); 
            setPosts(posts.filter(p => p.authorId !== userId)); 
            setReels(reels.filter(r => r.userId !== userId)); 
            setStories(stories.filter(s => s.userId !== userId)); 
            alert("User deleted successfully");
        } 
    };
    
    const handleMakeModerator = (userId: number) => { 
        if (isAdmin) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: u.role === 'moderator' ? 'user' : 'moderator' } : u));
            const user = users.find(u => u.id === userId);
            alert(`${user?.name} is now ${user?.role === 'moderator' ? 'a user' : 'a moderator'}!`);
        }
    };
    
    // ========== ENHANCED GROUP FUNCTIONS WITH SELF-NOTIFICATION PREVENTION ==========
    const handleGroupComment = (groupId: string, postId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newComment: Comment = { 
            id: timestamp, 
            userId: currentUser.id, 
            text, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            likes: 0, 
            attachment,
            authorName: currentUser.name,
            authorImage: currentUser.profileImage
        };
        
        // Update the group post with new comment
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const updatedPosts = g.posts.map(p => {
                    if (p.id === postId) {
                        const updatedComments = [...(p.comments || []), newComment];
                        
                        // Send notification to post author (prevent self-notification)
                        if (p.authorId !== currentUser.id) {
                            const group = groups.find(gr => gr.id === groupId);
                            handleCreateNotification(
                                p.authorId,
                                currentUser.id,
                                'group_comment',
                                `commented on your post in ${group?.name || 'the group'}.`,
                                { postId, groupId, commentId: newComment.id }
                            );
                        }
                        
                        return { ...p, comments: updatedComments };
                    }
                    return p;
                });
                return { ...g, posts: updatedPosts };
            }
            return g;
        }));

        // Handle mentions in group comments with self-notification prevention
        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const mentions = [...text.matchAll(mentionRegex)];
        if (mentions.length > 0) {
            const mentionedUserIds = new Set<number>();
            mentions.forEach(match => {
                const userName = match[1];
                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                if (user && user.id !== currentUser.id) {
                    mentionedUserIds.add(user.id);
                    
                    const group = groups.find(g => g.id === groupId);
                    handleCreateNotification(
                        user.id,
                        currentUser.id,
                        'group_mention',
                        `mentioned you in a comment in ${group?.name || 'a group'}.`,
                        { postId, groupId, commentId: newComment.id }
                    );
                }
            });
        }
    };

    const handleInviteToGroup = (groupId: string, userIds: number[]) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? { 
                    ...g, 
                    members: [...new Set([...g.members, ...userIds])] 
                } 
                : g
        ));
        
        // Send notifications to invited users
        const group = groups.find(g => g.id === groupId);
        userIds.forEach(userId => {
            if (userId !== currentUser.id) {
                handleCreateNotification(
                    userId,
                    currentUser.id,
                    'group_invite',
                    `invited you to join ${group?.name || 'a group'}.`,
                    { groupId }
                );
            }
        });
        
        alert(`Invited ${userIds.length} user(s) to the group!`);
    };

    const handleJoinGroup = (groupId: string) => { 
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setGroups(prev => prev.map(g => 
            (g.id === groupId && !g.members.includes(currentUser.id)) 
                ? { 
                    ...g, 
                    members: [...g.members, currentUser.id] 
                } 
                : g
        )); 
        
        // Notify group admin (prevent self-notification)
        const group = groups.find(g => g.id === groupId);
        if (group && group.adminId !== currentUser.id) {
            handleCreateNotification(
                group.adminId,
                currentUser.id,
                'group_join',
                `joined your group ${group.name}.`,
                { groupId }
            );
        }
        
        // Remove from suggestions after joining
        setSuggestedGroups(prev => prev.filter(g => g.id !== groupId));
    };
    
    const handleLeaveGroup = (groupId: string) => { 
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setGroups(prev => prev.map(g => 
            (g.id === groupId) 
                ? { ...g, members: g.members.filter(id => id !== currentUser!.id) } 
                : g
        )); 
    };
    
    const handleDeleteGroup = (groupId: string) => { 
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const group = groups.find(g => g.id === groupId); 
        if (group && (group.adminId === currentUser.id || isAdmin)) { 
            if (window.confirm("Are you sure you want to permanently delete this group?")) { 
                setGroups(prev => prev.filter(g => g.id !== groupId)); 
                alert("Group deleted successfully!");
            } 
        } else {
            alert("You don't have permission to delete this group.");
        }
    };
    
    const handleUpdateGroupImage = (groupId: string, type: 'cover' | 'profile', file: File) => { 
        const url = URL.createObjectURL(file); 
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? (type === 'cover' 
                    ? { ...g, coverImage: url } 
                    : { ...g, image: url }) 
                : g
        )); 
    };
    
    // FIXED: Prevent self-notifications in group posts
    const handlePostToGroup = (groupId: string, content: string, files: File[] | null, type: any, background?: string) => { 
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        // Handle multiple images
        let images: string[] = [];
        let video: string | undefined = undefined;
        
        if (files && files.length > 0) {
            if (type === 'video' && files.length === 1) {
                video = URL.createObjectURL(files[0]);
            } else if (type === 'image' || type === 'multimage') {
                images = files.map(file => URL.createObjectURL(file));
            }
        }
        
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        
        const newGroupPost: GroupPost = { 
            id: timestamp,
            authorId: currentUser.id, 
            content, 
            images: images.length > 0 ? images : undefined,
            video: video,
            timestamp: timestamp, 
            formattedTime: formattedTime,
            reactions: [], 
            comments: [], 
            shares: 0,
            background: background
        }; 
        
        // 1. Update group posts
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? { ...g, posts: [newGroupPost, ...g.posts] } 
                : g
        )); 
        
        // 2. Create a proper PostType for the main feed with ALL required properties
        const newFeedPost: PostType = { 
            id: timestamp,
            authorId: currentUser.id, 
            content,
            images: images.length > 0 ? images : undefined,
            video: video,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp,
            reactions: [], 
            comments: [], 
            shares: 0,
            views: 0,
            type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (images.length > 0 ? 'image' : 'text')),
            visibility: 'Public' as const,
            groupId, 
            groupName: groups.find(g => g.id === groupId)?.name,
            background
        }; 
        
        console.log("Creating group post:", newFeedPost);
        
        // 3. Add to main posts array
        setPosts(prev => [newFeedPost, ...prev]); 
        
        // Notify group members (excluding the poster to prevent self-notification)
        const group = groups.find(g => g.id === groupId);
        if (group && group.memberPostingAllowed) {
            group.members.forEach(memberId => {
                if (memberId !== currentUser.id) {
                    handleCreateNotification(
                        memberId,
                        currentUser.id,
                        'group_post',
                        `posted in ${group.name}`,
                        { groupId, postId: timestamp }
                    );
                }
            });
        }
        
        alert("Post published to group successfully!");
    };
    
    const handleCreateGroupEvent = (groupId: string, eventData: Partial<Event>) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newEvent: Event = { 
            ...eventData, 
            id: timestamp, 
            attendees: [currentUser.id], 
            interestedIds: [],
            groupId: groupId,
            groupName: groups.find(g => g.id === groupId)?.name
        } as Event;
        
        // Add event to the group
        setGroups(prev => prev.map(g => 
            g.id === groupId 
                ? { ...g, events: [...(g.events || []), newEvent] } 
                : g
        ));
        
        // Also add to global events
        setEvents(prev => [newEvent, ...prev]);
        
        // Create a post about the event
        const eventPost: PostType = { 
            id: timestamp + 1, 
            authorId: currentUser.id, 
            content: `is hosting a new event in ${groups.find(g => g.id === groupId)?.name}: ${newEvent.title}`, 
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp, 
            reactions: [], 
            comments: [], 
            shares: 0, 
            type: 'event', 
            visibility: 'Public', 
            event: newEvent, 
            eventId: newEvent.id,
            groupId: groupId,
            groupName: groups.find(g => g.id === groupId)?.name
        };
        setPosts(prev => [eventPost, ...prev]);
    };
    
    // FIXED: Prevent self-notifications in group shares
    const handleGroupShare = (groupId: string, postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        // Find the group post
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        
        const groupPost = group.posts.find(p => p.id === postId);
        if (!groupPost) return;
        
        // Create a shared post for the feed
        const timestamp = Date.now();
        const formattedTime = formatRelativeTime(timestamp);
        const newSharedPost: PostType = {
            id: timestamp,
            authorId: currentUser.id,
            content: extraCaption ? `${extraCaption}\n\nShared from ${group.name}: ${groupPost.content}` : `Shared from ${group.name}: ${groupPost.content}`,
            images: groupPost.images,
            video: groupPost.video,
            timestamp: timestamp,
            formattedTime: formattedTime,
            createdAt: timestamp,
            reactions: [],
            comments: [],
            shares: 0,
            views: 0,
            type: groupPost.video ? 'video' : (groupPost.images ? 'image' : 'text'),
            visibility: 'Public',
            sharedPostId: postId,
            groupId: groupId,
            groupName: group.name
        };
        
        // Add to main feed
        setPosts(prev => [newSharedPost, ...prev]);
        
        // Update share count in the group post
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const updatedPosts = g.posts.map(p => {
                    if (p.id === postId) {
                        return { ...p, shares: (p.shares || 0) + 1 };
                    }
                    return p;
                });
                return { ...g, posts: updatedPosts };
            }
            return g;
        }));
        
        // Send notification to original post author (prevent self-notification)
        if (groupPost.authorId !== currentUser.id) {
            handleCreateNotification(
                groupPost.authorId,
                currentUser.id,
                'group_share',
                `shared your post from ${group.name}.`,
                { postId, groupId }
            );
        }
        
        setActiveGroupShare(null);
        alert("Shared successfully from group!");
    };
    
    const handleCreateGroup = (groupData: Partial<Group>) => {
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        const timestamp = Date.now();
        const newGroup: Group = { 
            ...groupData, 
            id: `g${timestamp}`, 
            adminId: currentUser.id, 
            members: [currentUser.id], 
            posts: [], 
            createdDate: timestamp,
            image: groupData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name || 'Group')}&background=random&size=150`,
            coverImage: groupData.coverImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
            events: [],
            memberPostingAllowed: true
        } as Group;
        setGroups(prev => [newGroup, ...prev]);
        
        // Notify followers about new group (excluding self)
        const followers = currentUser.followers || [];
        followers.forEach(followerId => {
            if (followerId !== currentUser.id) {
                handleCreateNotification(
                    followerId,
                    currentUser.id,
                    'group_created',
                    `created a new group: ${newGroup.name}`,
                    { groupId: newGroup.id }
                );
            }
        });
        
        alert("Group created successfully!");
    };
    
    // FIXED: Prevent self-notifications for group post reactions
    const handleReactGroupPost = (groupId: string, postId: number, type: ReactionType) => { 
        if (!currentUser) {
            handleNavigate('login');
            return;
        }
        
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const updatedPosts = g.posts.map(p => {
                    if (p.id === postId) {
                        const reactions = p.reactions || [];
                        const existing = reactions.find(r => r.userId === currentUser.id);
                        let newReactions = [...reactions];
                        if (existing) {
                            if (existing.type === type) {
                                newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                            } else {
                                newReactions = newReactions.map(r => 
                                    r.userId === currentUser!.id ? { ...r, type } : r
                                );
                            }
                        } else {
                            newReactions.push({ userId: currentUser!.id, type });
                            
                            // Send notification to post author (prevent self-notification)
                            if (p.authorId !== currentUser.id) {
                                const group = groups.find(g => g.id === groupId);
                                handleCreateNotification(
                                    p.authorId,
                                    currentUser.id,
                                    'group_reaction',
                                    `reacted to your post in ${group?.name || 'the group'}.`,
                                    { postId, groupId, reactionType: type }
                                );
                            }
                        }
                        return { ...p, reactions: newReactions };
                    }
                    return p;
                });
                return { ...g, posts: updatedPosts };
            }
            return g;
        }));
    };
    
    const handleOpenGroupComments = (groupId: string, postId: number) => {
        console.log('Opening group comments:', { groupId, postId });
        setActiveGroupComments({ groupId, postId });
    };
    
    const handleShareGroupPost = (groupId: string, postId: number) => {
        console.log('Sharing group post:', { groupId, postId });
        setActiveGroupShare({ groupId, postId });
    };
    
    const handleUpdateGroupSettings = (groupId: string, settings: Partial<Group>) => { 
        setGroups(prev => prev.map(g => 
            g.id === groupId ? { ...g, ...settings } : g
        )); 
    };
    
    const handleRemoveMember = (groupId: string, memberId: number) => { 
        const group = groups.find(g => g.id === groupId); 
        if (currentUser && group && (group.adminId === currentUser.id || isAdmin)) { 
            setGroups(prev => prev.map(g => 
                g.id === groupId 
                    ? { ...g, members: g.members.filter(id => id !== memberId) } 
                    : g
            )); 
            
            // Notify removed member
            handleCreateNotification(
                memberId,
                currentUser.id,
                'group_removed',
                `removed you from ${group.name}.`,
                { groupId }
            );
        } 
    };
    
    const handleDeleteGroupPost = (groupId: string, postId: number) => { 
        const group = groups.find(g => g.id === groupId); 
        const post = group?.posts.find(p => p.id === postId); 
        if (currentUser && group && post && (group.adminId === currentUser.id || isAdmin || post.authorId === currentUser.id)) { 
            if (window.confirm("Are you sure you want to delete this group post?")) {
                setGroups(prev => prev.map(g => 
                    (g.id === groupId) 
                        ? { ...g, posts: g.posts.filter(p => p.id !== postId) } 
                        : g
                )); 
                
                // Also delete from main feed if it exists
                setPosts(prev => prev.filter(p => !(p.id === postId && p.groupId === groupId)));
                
                alert("Group post deleted successfully!");
            }
        } else {
            alert("You don't have permission to delete this post.");
        }
    };

    // Birthday notification check with self-notification prevention
    useEffect(() => {
        const checkBirthdays = () => {
            if (!currentUser) return;
            
            const today = new Date();
            const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;
            
            users.forEach(user => {
                if (user.birthDate && user.id !== currentUser.id) {
                    const birthDate = new Date(user.birthDate);
                    const birthStr = `${birthDate.getMonth() + 1}/${birthDate.getDate()}`;
                    
                    if (birthStr === todayStr) {
                        // Check if birthday notification was already sent today
                        const alreadySent = notifications.some(n => 
                            n.type === 'birthday' && 
                            n.senderId === user.id && 
                            new Date(n.timestamp).toDateString() === today.toDateString()
                        );
                        
                        if (!alreadySent) {
                            handleCreateNotification(
                                currentUser.id,
                                user.id,
                                'birthday',
                                `It's ${user.name}'s birthday today!`,
                                {}
                            );
                        }
                    }
                }
            });
        };
        
        // Check birthdays on mount and every 24 hours
        checkBirthdays();
        const interval = setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [currentUser, users, notifications, handleCreateNotification]);

    // Update user online status periodically - ENHANCED
    useEffect(() => {
        const updateOnlineStatus = () => {
            console.log('[DEBUG] Updating online status');
            
            setUserStatus(prev => {
                const updated: Record<number, { isOnline: boolean; lastSeen: string; typing: boolean }> = {};
                
                // Update current user as online
                if (currentUser) {
                    updated[currentUser.id] = {
                        isOnline: true,
                        lastSeen: new Date().toISOString(),
                        typing: prev[currentUser.id]?.typing || false
                    };
                }
                
                // Update other users with random online status (for demo)
                users.forEach(user => {
                    if (user.id !== currentUser?.id) {
                        const currentStatus = prev[user.id];
                        // More realistic online status simulation
                        const isOnline = currentStatus?.isOnline || Math.random() > 0.6;
                        
                        updated[user.id] = {
                            isOnline,
                            lastSeen: isOnline 
                                ? new Date().toISOString() 
                                : (currentStatus?.lastSeen || new Date(Date.now() - Math.random() * 86400000).toISOString()),
                            typing: currentStatus?.typing || false
                        };
                    }
                });
                
                return updated;
            });
        };
        
        updateOnlineStatus();
        const interval = setInterval(updateOnlineStatus, 30000); // Update every 30 seconds
        
        return () => {
            clearInterval(interval);
            if (window['typingTimeout']) {
                clearTimeout(window['typingTimeout']);
            }
        };
    }, [currentUser, users]);

    // ========== CRITICAL FIX: Ensure guests see content on reload ==========
    useEffect(() => {
        if (isClient && !isLoading) {
            // If guest is on login view but at root path, show them content
            if (!currentUser && view === 'login' && (path === '/' || path === '')) {
                console.log('Guest at root path - showing content instead of login');
                setView('home');
                setActiveTab('home');
            }
        }
    }, [isClient, isLoading, currentUser, view, path]);
    
    // Function to render music/podcast posts
    const renderMusicPost = useCallback((post: PostType, author: any) => {
        const song = getSongForPost(post, songs, episodes);
        if (!song) return null;
        
        return (
            <MusicFeedPost 
                key={post.id}
                song={song}
                currentUser={currentUser}
                users={users}
                onPlayTrack={handlePlayTrack}
                onProfileClick={(id) => { 
                    if (!currentUser) {
                        handleNavigate('login');
                    } else {
                        setSelectedUserId(id); 
                        setView('profile'); 
                    }
                }}
                onLikeTrack={handleLikeTrack}
                onTrackComment={handleTrackComment}
                onTrackShare={handleTrackShare}
                isLiked={likedTracks.includes(song.id)}
                showLoginPrompt={() => handleNavigate('login')}
            />
        );
    }, [currentUser, users, songs, episodes, likedTracks, handlePlayTrack, handleLikeTrack, handleTrackComment, handleTrackShare, handleNavigate]);

    // ========== CRITICAL FIX: renderRegularPost function with useCallback ==========
    const renderRegularPost = useCallback((post: PostType, author: any, isFollowing?: boolean) => {
        const isBrandAuthor = author?.type === 'brand';
        const isFollowingBrand = isBrandAuthor && currentUser ? 
            brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false : 
            false;
        
        // CRITICAL: Create fresh object with new references
        const freshPost = {
            ...post,
            // Force new array references to ensure Post component re-renders
            reactions: [...(post.reactions || [])],
            comments: [...(post.comments || [])],
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        };
        
        return (
            <Post 
                key={`post-${post.id}-${post.reactions?.length || 0}-${post.comments?.length || 0}`}
                post={freshPost}
                author={author as any} 
                currentUser={currentUser} 
                users={users} 
                onProfileClick={(id) => { 
                    if (!currentUser) {
                        handleNavigate('login');
                        return;
                    }
                    if (isBrandAuthor) {
                        setActiveBrandId(id);
                        handleNavigate('brand_view');
                    } else {
                        setSelectedUserId(id); 
                        setView('profile');
                    }
                }} 
                onReact={handleReact} 
                onShare={(id) => {
                    if (!currentUser) {
                        handleNavigate('login');
                        return;
                    }
                    setActiveSharePostId(id);
                }} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => {
                    if (!currentUser) {
                        handleNavigate('login');
                    } else {
                        setActiveCommentsPostId(postId);
                    }
                }} 
                onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} 
                onViewProduct={(p) => setActiveProduct(p)} 
                onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); setView('groups'); setActiveTab('groups'); }} 
                onPlayAudioTrack={handlePlayTrack} 
                onFollow={isBrandAuthor ? handleFollowBrand : handleFollowUser} 
                isFollowing={isBrandAuthor ? isFollowingBrand : isFollowing} 
                onHashtagClick={handleTagClick} 
                onDeletePost={handleDeletePost} 
                isAdmin={isAdmin}
                showLoginPrompt={() => handleNavigate('login')}
            />
        );
    }, [
        currentUser, 
        users, 
        brands, 
        handleReact, 
        handleFollowUser, 
        handleFollowBrand, 
        handleDeletePost, 
        handlePlayTrack, 
        handleTagClick, 
        isAdmin,
        handleNavigate
    ]);
    
    // ========== CRITICAL FIX: UserProfile posts memoization ==========
    const userPostsForProfile = useMemo(() => {
        if (!selectedUserId) return [];
        
        // Get user's posts with current reactions/comments
        const userPosts = posts
            .filter(p => p.authorId === selectedUserId)
            .map(post => {
                // Create fresh object with new references
                return {
                    ...post,
                    // Ensure all posts have the same structure
                    formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || Date.now()),
                    reactions: [...(post.reactions || [])], // New array reference
                    comments: [...(post.comments || [])],   // New array reference
                    // Add any other arrays that might need new references
                    taggedUsers: post.taggedUsers ? [...post.taggedUsers] : undefined
                };
            });
        
        // Add product posts
        const productPosts = products
            .filter(p => p.sellerId === selectedUserId)
            .map(p => ({
                id: p.id + 100000,
                authorId: p.sellerId,
                content: `Just listed a new item: ${p.title}`,
                timestamp: p.date,
                formattedTime: formatRelativeTime(p.date),
                createdAt: p.date,
                reactions: [...(p.ratings?.map(r => ({ userId: r.userId, type: 'like' as ReactionType })) || [])],
                comments: [...(p.comments?.map(c => ({
                    id: Date.now() + Math.random(),
                    userId: c.userId,
                    text: c.text,
                    timestamp: c.timestamp,
                    formattedTime: formatRelativeTime(c.timestamp),
                    likes: 0,
                    authorName: c.authorName,
                    authorImage: c.authorImage
                })) || [])],
                shares: 0,
                views: p.views,
                type: 'product' as const,
                visibility: 'Public' as const,
                product: p,
                productId: p.id
            }));
        
        return [...userPosts, ...productPosts];
    }, [posts, products, selectedUserId]);
    
    // Function to render the main feed - FIXED to show to everyone
    const renderMainFeed = () => {
        return (
            <>
                {/* Feed posts - VISIBLE TO EVERYONE (logged-in and non-logged-in) */}
                {rankedPosts.map(post => {
                    const author = getAuthorForPost(post, users, brands);
                    if (!author) return null;
                    
                    let isFollowing = false;
                    if (author.type === 'user' && currentUser) {
                        isFollowing = currentUser.following.includes(author.id);
                    } else if (author.type === 'brand' && currentUser) {
                        const brand = brands.find(b => b.id === author.id);
                        isFollowing = brand ? brand.followers.includes(currentUser.id) : false;
                    }
                    
                    if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                        return renderMusicPost(post, author);
                    }
                    
                    return renderRegularPost(post, author, isFollowing);
                })}
                
                {/* Additional recommendations for logged-in users only */}
                {currentUser && (
                    <>
                        {/* Groups You May Like - Only for logged-in users */}
                        {suggestedGroups.length > 0 && (
                            <GroupsYouMayLike 
                                suggestedGroups={suggestedGroups}
                                currentUser={currentUser}
                                onViewGroup={handleViewGroup}
                                onJoinGroup={handleJoinGroup}
                                onRemove={handleRemoveSuggestedGroup}
                            />
                        )}
                        
                        {/* Brand Recommendations - Only for logged-in users */}
                        {brands.length > 0 && (
                            <BrandRecommendations 
                                brands={brands.slice(0, 4)}
                                currentUser={currentUser}
                                onViewBrand={(brandId) => {
                                    handleViewBrand(brandId);
                                    setBrandRotation(prev => prev + 1);
                                }}
                                onRemove={handleRemoveBrandRecommendation}
                            />
                        )}
                    </>
                )}
            </>
        );
    };
    
    // ========== CRITICAL FIX: Determine what to render ==========
    // Guests should see content, not login screen (unless explicitly on login)
    const showLoginScreen = view === 'login' && !currentUser;
    const showMainApp = !showLoginScreen || currentUser;
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
                </div>
            ) : showLoginScreen ? (
                // Show login/register only if view is 'login' AND user is not logged in
                showRegister 
                    ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
                    : showForgotPassword
                    ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
                    : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); setCurrentUser(null); }} error={loginError} />
            ) : (
                // ========== MAIN APP LAYOUT - FOR BOTH GUESTS AND LOGGED-IN USERS ==========
                <>
                    {currentAudioTrack && (
                        <GlobalAudioPlayer 
                            currentTrack={currentAudioTrack} 
                            isPlaying={isAudioPlaying} 
                            onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} 
                            onNext={() => {}} 
                            onPrevious={() => {}} 
                            onClose={() => { setCurrentAudioTrack(null); setIsAudioPlaying(false); }} 
                            onDownload={() => alert("Download started...")} 
                            onLike={(id) => setLikedTracks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])} 
                            isLiked={likedTracks.includes(currentAudioTrack.id)} 
                            uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)} 
                            onArtistClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                        />
                    )}
                    
                    {/* Header - Shows for both guests and logged-in users */}
                    <Header 
                        onHomeClick={() => handleNavigate('home')} 
                        onProfileClick={(id) => { 
                            if (!currentUser) {
                                handleNavigate('login');
                            } else {
                                setSelectedUserId(id); 
                                setView('profile');
                            }
                        }} 
                        onReelsClick={() => handleNavigate('reels')} 
                        onMarketplaceClick={() => handleNavigate('marketplace')} 
                        onGroupsClick={() => handleNavigate('groups')} 
                        currentUser={currentUser} 
                        notifications={notifications} 
                        users={users} 
                        onLogout={handleLogout} 
                        onLoginClick={() => handleNavigate('login')} 
                        onMarkNotificationsRead={handleMarkAllNotificationsRead} 
                        onNotificationClick={handleNotificationClick}
                        activeTab={activeTab} 
                        onNavigate={handleNavigate} 
                        onMessageClick={(userId) => {
                            if (!currentUser) {
                                handleNavigate('login');
                            } else {
                                const user = users.find(u => u.id === userId);
                                if (user) {
                                    setActiveChatUser(user);
                                }
                            }
                        }}
                    />
                    
                    <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                        {/* Sidebar - Hidden for guests on mobile, shown for logged-in */}
                        {currentUser && (
                            <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                                <Sidebar 
                                    currentUser={currentUser || INITIAL_USERS[0]} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onReelsClick={() => handleNavigate('reels')} 
                                    onMarketplaceClick={() => handleNavigate('marketplace')} 
                                    onGroupsClick={() => handleNavigate('groups')} 
                                />
                            </div>
                        )}
                        
                        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                            {view === 'home' && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    {/* Stories - Visible to everyone */}
                                    <StoryReel 
                                        stories={storiesWithUsers} 
                                        onProfileClick={(id) => { 
                                            if (!currentUser) {
                                                handleNavigate('login');
                                            } else {
                                                setSelectedUserId(id); 
                                                setView('profile');
                                            }
                                        }} 
                                        onCreateStory={() => {
                                            if (!currentUser) {
                                                handleNavigate('login');
                                            } else {
                                                setShowCreateStoryModal(true);
                                            }
                                        }} 
                                        onViewStory={(s) => setActiveStory(s)} 
                                        currentUser={currentUser} 
                                        onRequestLogin={() => handleNavigate('login')} 
                                    />
                                    
                                    {/* Create Post - Different for guests vs logged-in */}
                                    {currentUser ? (
                                        <CreatePost 
                                            currentUser={currentUser} 
                                            onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                            onClick={() => setShowCreatePostModal(true)} 
                                            onCreateEventClick={() => setShowCreateEventModal(true)} 
                                        />
                                    ) : (
                                        <GuestCreatePost onSignUp={() => handleNavigate('login')} />
                                    )}
                                    
                                    {/* People You May Know - Only for logged-in users */}
                                    {currentUser && suggestedUsers.length > 0 && (
                                        <PeopleYouMayKnow 
                                            suggestedUsers={suggestedUsers}
                                            onViewProfile={(userId) => {
                                                handleViewProfile(userId);
                                                setSuggestionRotation(prev => prev + 1);
                                            }}
                                            onRemove={(userId) => {
                                                handleRemoveSuggestedUser(userId);
                                                setSuggestionRotation(prev => prev + 1);
                                            }}
                                        />
                                    )}
                                    
                                    {/* Suggested Products Widget - Only for logged-in users */}
                                    {currentUser && (
                                        <SuggestedProductsWidget 
                                            products={products} 
                                            currentUser={currentUser} 
                                            onViewProduct={(p) => { setActiveProduct(p); }} 
                                            onSeeAll={() => handleNavigate('marketplace')} 
                                        />
                                    )}
                                    
                                    {/* Sign Up CTA for Guests */}
                                    {!currentUser && (
                                        <GuestSignUpCTA 
                                            onSignUp={() => handleNavigate('login')}
                                            title="Join UNERA to connect with friends"
                                            description="Sign up to see more posts, share your thoughts, and join communities."
                                        />
                                    )}
                                    
                                    {/* Main Feed - VISIBLE TO EVERYONE */}
                                    {renderMainFeed()}
                                </div>
                            )}
                            
                            {/* Other views... (profile, marketplace, etc.) */}
                            {view === 'profile' && selectedUserId !== null && (
                                <UserProfile 
                                    key={`user-profile-${selectedUserId}-${posts.length}-${Date.now()}`}
                                    user={users.find(u => u.id === selectedUserId)!} 
                                    currentUser={currentUser} 
                                    users={users} 
                                    posts={userPostsForProfile}
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onFollow={handleFollowUser} 
                                    onReact={handleReact} 
                                    onComment={handleComment} 
                                    onShare={(id) => setActiveSharePostId(id)} 
                                    onMessage={handleMessageIconClick} 
                                    onCreatePost={handleCreatePost} 
                                    onUpdateProfileImage={(f) => {}} 
                                    onUpdateCoverImage={(f) => {}} 
                                    onUpdateUserDetails={(d) => {}} 
                                    onDeletePost={handleDeletePost} 
                                    onEditPost={(postId, content) => {
                                        console.log('Edit post:', postId, content);
                                    }}
                                    getCommentAuthor={(id) => users.find(u => u.id === id)} 
                                    onViewImage={setFullScreenImage} 
                                    onOpenComments={setActiveCommentsPostId} 
                                    onVideoClick={(post) => {
                                        if (post.type === 'video') {
                                            setActiveReelId(post.id - 200000);
                                            setView('reels');
                                        }
                                    }} 
                                    onCreateEventClick={() => setShowCreateEventModal(true)} 
                                    onPlayAudioTrack={handlePlayTrack} 
                                    onVerifyUser={handleVerifyUser} 
                                    onRestrictUser={handleRestrictUser} 
                                    onDeleteUser={handleDeleteUser} 
                                    onMakeModerator={handleMakeModerator} 
                                    onHashtagClick={handleTagClick} 
                                    songs={songs}
                                    episodes={episodes}
                                    likedTracks={likedTracks}
                                    onLikeTrack={handleLikeTrack}
                                    onTrackComment={handleTrackComment}
                                    onTrackShare={handleTrackShare}
                                    renderMusicPost={renderMusicPost}
                                    renderRegularPost={renderRegularPost}
                                    unreadMessageCount={currentUserUnreadCount}
                                    onOpenMessages={handleOpenMessages}
                                    recentMessages={currentUserRecentConversations}
                                />
                            )}
                            
                            {/* Other view components remain the same... */}
                            {/* (single_post, marketplace, reels, groups, etc.) */}
                            {view === 'single_post' && activeSinglePostId !== null && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    {(() => {
                                        const post = posts.find(p => p.id === activeSinglePostId);
                                        if (!post) return null;
                                        
                                        const author = getAuthorForPost(post, users, brands);
                                        if (!author) return null;
                                        
                                        if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                            return renderMusicPost(post, author);
                                        }
                                        
                                        return renderRegularPost(post, author, false);
                                    })()}
                                </div>
                            )}
                            
                            {view === 'marketplace' && (
                                <MarketplacePage 
                                    products={products} 
                                    currentUser={currentUser} 
                                    onNavigateHome={() => handleNavigate('home')}
                                    onCreateProduct={handleCreateProduct}
                                    onViewProduct={(product) => setActiveProduct(product)}
                                    onLikeProduct={handleLikeProduct}
                                    onCommentOnProduct={handleCommentOnProduct}
                                />
                            )}
                            
                            {view === 'reels' && (
                                <ReelsFeed 
                                    reels={reels} 
                                    users={users} 
                                    currentUser={currentUser} 
                                    activeReelId={activeReelId} 
                                    onReelClick={setActiveReelId} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onNavigate={handleNavigate} 
                                    onReact={handleReelReact}
                                    onShare={(reelId, type) => {
                                        if (!currentUser) {
                                            handleNavigate('login');
                                            return;
                                        }
                                        
                                        if (type === 'feed') {
                                            const reel = reels.find(r => r.id === reelId);
                                            if (reel && currentUser) {
                                                const timestamp = Date.now();
                                                const formattedTime = formatRelativeTime(timestamp);
                                                const newPost: PostType = { 
                                                    id: timestamp, 
                                                    authorId: currentUser.id, 
                                                    content: `Shared a reel: ${reel.caption}`, 
                                                    video: reel.videoUrl,
                                                    timestamp: timestamp,
                                                    formattedTime: formattedTime,
                                                    createdAt: timestamp, 
                                                    reactions: [], 
                                                    comments: [], 
                                                    shares: 0, 
                                                    views: 0, 
                                                    type: 'video', 
                                                    visibility: 'Public' 
                                                };
                                                setPosts([newPost, ...posts]);
                                                setReels(prev => prev.map(r => 
                                                    r.id === reelId 
                                                        ? { ...r, shares: (r.shares || 0) + 1 }
                                                        : r
                                                ));
                                                
                                                // Send notification to reel owner (prevent self-notification)
                                                if (reel.userId !== currentUser.id) {
                                                    handleCreateNotification(
                                                        reel.userId,
                                                        currentUser.id,
                                                        'reel_share',
                                                        'shared your reel.',
                                                        { reelId }
                                                    );
                                                }
                                                
                                                alert("Reel shared to your feed!");
                                            }
                                        } else if (type === 'copy' && isClient) {
                                            navigator.clipboard.writeText(`https://unera.social/reels/${reelId}`);
                                            alert("Link copied to clipboard!");
                                        }
                                    }}
                                    onComment={(reelId, text) => {
                                        if (!currentUser) {
                                            handleNavigate('login');
                                            return;
                                        }
                                        
                                        const timestamp = Date.now();
                                        const formattedTime = formatRelativeTime(timestamp);
                                        const newComment = { 
                                            id: timestamp, 
                                            userId: currentUser.id, 
                                            text, 
                                            timestamp: timestamp,
                                            formattedTime: formattedTime,
                                            likes: 0,
                                            authorName: currentUser.name,
                                            authorImage: currentUser.profileImage
                                        };
                                        setReels(prev => prev.map(reel => 
                                            reel.id === reelId 
                                                ? { ...reel, comments: [...reel.comments, newComment] }
                                                : reel
                                        ));
                                        
                                        // Send notification to reel owner (prevent self-notification)
                                        const reel = reels.find(r => r.id === reelId);
                                        if (reel && reel.userId !== currentUser.id) {
                                            handleCreateNotification(
                                                reel.userId,
                                                currentUser.id,
                                                'reel_comment',
                                                'commented on your reel.',
                                                { reelId, commentId: newComment.id }
                                            );
                                        }
                                    }}
                                    onCreateReelClick={() => setShowCreateReelModal(true)}
                                    onFollow={handleFollowUser}
                                    getCommentAuthor={(id) => users.find(u => u.id === id)}
                                />
                            )}
                            
                            {view === 'groups' && (
                                <GroupsPage 
                                    key="groups-page"
                                    groups={groups}
                                    currentUser={currentUser}
                                    users={users}
                                    initialGroupId={initialGroupIdToView}
                                    onCreateGroup={handleCreateGroup}
                                    onJoinGroup={handleJoinGroup}
                                    onLeaveGroup={handleLeaveGroup}
                                    onDeleteGroup={handleDeleteGroup}
                                    onUpdateGroupImage={handleUpdateGroupImage}
                                    onPostToGroup={handlePostToGroup}
                                    onCreateGroupEvent={handleCreateGroupEvent}
                                    onInviteToGroup={handleInviteToGroup}
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                            setActiveTab('profile');
                                        }
                                    }}
                                    onLikePost={handleReactGroupPost}
                                    onOpenComments={handleOpenGroupComments}
                                    onSharePost={handleShareGroupPost}
                                    onDeleteGroupPost={handleDeleteGroupPost}
                                    onRemoveMember={handleRemoveMember}
                                    onUpdateGroupSettings={handleUpdateGroupSettings}
                                    onPlayAudioTrack={handlePlayTrack}
                                />
                            )}
                            
                            {/* Other view components... */}
                            {view === 'brands' && (
                                <BrandsPage 
                                    currentUser={currentUser}
                                    brands={brands}
                                    posts={posts}
                                    users={users}
                                    onCreateBrand={handleCreateBrand}
                                    onFollowBrand={handleFollowBrand}
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }}
                                    onPostAsBrand={handlePostAsBrand}
                                    onReact={handleReact}
                                    onShare={(id) => setActiveSharePostId(id)}
                                    onOpenComments={(postId) => {
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setActiveCommentsPostId(postId);
                                        }
                                    }}
                                    onUpdateBrand={handleUpdateBrand}
                                    onDeleteBrand={handleDeleteBrand}
                                    onMessage={(brandId) => {
                                        if (!currentUser) {
                                            handleNavigate('login');
                                            return;
                                        }
                                        const brand = brands.find(b => b.id === brandId);
                                        if (brand && currentUser) {
                                            alert(`Messaging ${brand.name} - Feature coming soon!`);
                                        }
                                    }}
                                    onCreateEvent={(brandId, eventData) => {
                                        if (!currentUser) {
                                            handleNavigate('login');
                                            return;
                                        }
                                        const eventWithBrand = {
                                            ...eventData,
                                            brandId: brandId,
                                            brandName: brands.find(b => b.id === brandId)?.name
                                        };
                                        handleCreateEvent(eventWithBrand);
                                    }}
                                    onUpdateBrandImage={handleUpdateBrandImage}
                                    onDeletePost={handleDeletePost}
                                    onVerifyBrand={handleVerifyBrand}
                                    initialBrandId={activeBrandId}
                                    onPlayAudioTrack={handlePlayTrack}
                                />
                            )}
                            
                            {/* Continue with other view components... */}
                            {view === 'events' && (
                                <EventsPage 
                                    events={events} 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onJoinEvent={handleJoinEvent} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onCreateEvent={() => setShowCreateEventModal(true)} 
                                />
                            )}
                            
                            {view === 'birthdays' && (
                                <BirthdaysPage 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                />
                            )}
                            
                            {view === 'suggested_profiles' && (
                                <SuggestedProfilesPage 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onFollow={handleFollowUser} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                />
                            )}
                            
                            {view === 'memories' && (
                                <MemoriesPage 
                                    posts={posts} 
                                    currentUser={currentUser} 
                                    users={users} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onPostClick={(postId) => { setActiveSinglePostId(postId); setView('single_post'); }} 
                                />
                            )}
                            
                            {view === 'music' && (
                                <MusicSystem 
                                    songs={songs} 
                                    episodes={episodes} 
                                    currentUser={currentUser} 
                                    onPlayTrack={handlePlayTrack} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onDeleteSong={handleDeleteSong} 
                                    onDeleteEpisode={handleDeleteEpisode} 
                                    likedTracks={likedTracks} 
                                    onToggleLike={handleLikeTrack} 
                                    onUploadToFeed={handleUploadToFeed} 
                                    onAddSong={handleAddSong} 
                                    onAddEpisode={handleAddEpisode} 
                                    playHistory={playHistory}
                                />
                            )}
                            
                            {view === 'tools' && (
                                <ToolsPage 
                                    currentUser={currentUser} 
                                    onNavigate={handleNavigate} 
                                />
                            )}
                            
                            {view === 'help_support' && (
                                <HelpSupportPage 
                                    currentUser={currentUser} 
                                />
                            )}
                            
                            {view === 'settings' && (
                                <SettingsPage 
                                    currentUser={currentUser} 
                                    onUpdateUser={(updates) => { 
                                        if (currentUser) {
                                            const updatedUser = { ...currentUser, ...updates };
                                            setCurrentUser(updatedUser);
                                            setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
                                        }
                                    }} 
                                    onLogout={handleLogout} 
                                />
                            )}
                            
                            {view === 'privacy_policy' && (
                                <PrivacyPolicyPage />
                            )}
                            
                            {view === 'terms_of_service' && (
                                <TermsOfServicePage />
                            )}
                        </div>
                        
                        {/* Right Sidebar - Only for logged-in users */}
                        {currentUser && (
                            <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                                <RightSidebar 
                                    contacts={users.filter(u => u.id !== currentUser?.id)} 
                                    onProfileClick={(id) => { 
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            setSelectedUserId(id); 
                                            setView('profile'); 
                                        }
                                    }} 
                                    onMessageClick={(userId) => {
                                        if (!currentUser) {
                                            handleNavigate('login');
                                        } else {
                                            const user = users.find(u => u.id === userId);
                                            if (user) {
                                                setActiveChatUser(user);
                                            }
                                        }
                                    }}
                                    getUserStatus={getUserStatus}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Modals (only for logged-in users) */}
                    {showCreatePostModal && currentUser && (
                        <CreatePostModal 
                            currentUser={currentUser} 
                            users={users} 
                            onClose={() => setShowCreatePostModal(false)} 
                            onCreatePost={handleCreatePost} 
                        />
                    )}
                    
                    {showCreateStoryModal && currentUser && (
                        <CreateStoryModal 
                            currentUser={currentUser} 
                            songs={songs} 
                            onClose={() => setShowCreateStoryModal(false)} 
                            onCreate={handleCreateStory} 
                        />
                    )}
                    
                    {showCreateReelModal && currentUser && (
                        <CreateReelModal 
                            currentUser={currentUser} 
                            songs={songs} 
                            onClose={() => setShowCreateReelModal(false)} 
                            onSubmit={handleCreateReel} 
                        />
                    )}
                    
                    {showCreateEventModal && currentUser && (
                        <CreateEventModal 
                            currentUser={currentUser} 
                            onClose={() => setShowCreateEventModal(false)} 
                            onCreate={handleCreateEvent} 
                        />
                    )}
                    
                    {/* Chat Window */}
                    {activeChatUser && currentUser && (
                        <ChatWindow 
                            key={`chat-${currentUser.id}-${activeChatUser.id}`}
                            currentUser={currentUser}
                            recipient={activeChatUser}
                            messages={messages.filter(msg => 
                                (msg.senderId === currentUser.id && msg.receiverId === activeChatUser.id) ||
                                (msg.senderId === activeChatUser.id && msg.receiverId === currentUser.id)
                            ).sort((a, b) => a.timestamp - b.timestamp)}
                            onClose={() => {
                                console.log('[DEBUG] Closing chat window');
                                setActiveChatUser(null);
                            }}
                            onSendMessage={handleSendMessage}
                            onDeleteMessage={handleDeleteMessage}
                            onReactToMessage={handleReactToMessage}
                            onTyping={handleTyping}
                            onMarkAsRead={handleMarkAsRead}
                            getUserStatus={getUserStatus}
                            gifApiKey="YOUR_GIPHY_API_KEY"
                        />
                    )}
                    
                    {/* Comments Sheet */}
                    {activeCommentsPostId && currentUser && (
                        <CommentsSheet 
                            post={posts.find(p => p.id === activeCommentsPostId)!} 
                            currentUser={currentUser} 
                            users={users} 
                            onClose={() => setActiveCommentsPostId(null)} 
                            onComment={handleComment} 
                            onLikeComment={() => {}} 
                            getCommentAuthor={(id) => users.find(u => u.id === id)} 
                            onProfileClick={(id) => { 
                                setSelectedUserId(id); 
                                setView('profile'); 
                                setActiveCommentsPostId(null); 
                            }} 
                        />
                    )}
                    
                    {/* Share Sheet */}
                    {activeSharePostId && currentUser && (
                        <ShareSheet 
                            currentUser={currentUser} 
                            groups={groups} 
                            brands={brands} 
                            postId={activeSharePostId} 
                            onClose={() => setActiveSharePostId(null)} 
                            onShare={(type, id, caption) => handleShare(activeSharePostId, type, id, caption)} 
                            onCopyLink={() => { if(isClient) { navigator.clipboard.writeText(`https://unera.social/posts/${activeSharePostId}`); alert("Link copied!"); } }} 
                        />
                    )}
                    
                    {/* Story Viewer */}
                    {activeStory && (
                        <StoryViewer 
                            story={activeStory} 
                            user={users.find(u => u.id === activeStory.userId)!} 
                            currentUser={currentUser} 
                            allStories={storiesWithUsers} 
                            onClose={() => setActiveStory(null)} 
                            onLike={() => handleLikeStory(activeStory.id)} 
                            onReply={(text) => handleReplyStory(activeStory.id, text)} 
                            onNext={() => {}} 
                            onPrev={() => {}} 
                            onFollow={handleFollowUser} 
                            isFollowing={currentUser ? currentUser.following.includes(activeStory.userId) : false} 
                        />
                    )}
                    
                    {/* Product Detail Modal */}
                    {activeProduct && (
                        <ProductDetailModal 
                            product={activeProduct} 
                            currentUser={currentUser} 
                            onClose={() => setActiveProduct(null)} 
                            onMessage={(sid) => setActiveChatUser(users.find(u => u.id === sid) || null)} 
                            onLike={() => handleLikeProduct(activeProduct.id)}
                            onComment={(text) => handleCommentOnProduct(activeProduct.id, text)}
                        />
                    )}
                    
                    {/* Image Viewer */}
                    {fullScreenImage && (
                        <ImageViewer 
                            imageUrl={fullScreenImage} 
                            onClose={() => setFullScreenImage(null)} 
                        />
                    )}
                </>
            )}
        </div>
    );
}
