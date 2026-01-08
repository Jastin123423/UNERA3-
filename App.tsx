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
    
    // ========== CRITICAL FIX: Initialize view state properly ==========
    const [view, setView] = useState(() => {
        // If there's explicit view in initialData, use it
        if (initialData?.view) {
            return initialData.view;
        }
        
        // IMPORTANT FIX: Check if we're on a login/register path
        if (path === '/login' || path === '/register') {
            return 'login';
        }
        
        // If guest is at root path, show them content, not login
        if (parsedPath.view === 'home' || path === '/') {
            return 'home';
        }
        
        // For protected routes, show login for guests
        const protectedRoutes = ['profile', 'create_event', 'create_post', 'create_story', 
            'create_reel', 'marketplace_create', 'messages', 'settings',
            'suggested_profiles', 'profiles', 'groups'];
        
        if (protectedRoutes.includes(parsedPath.view) && !initialData?.currentUser) {
            return 'login';
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

    // ========== FIXED: Enhanced navigation handler ==========
    const handleNavigate = (targetView: string) => {
        console.log('[DEBUG] handleNavigate called:', { 
            targetView, 
            currentView: view, 
            hasUser: !!currentUser,
            isLoginView: targetView === 'login' || targetView === 'register'
        });
        
        // ========== CRITICAL FIX: Special handling for login/register ==========
        if (targetView === 'login' || targetView === 'register') {
            console.log('[DEBUG] Direct navigation to auth page');
            setView(targetView);
            setActiveTab('home');
            
            // Don't check for auth requirements on login/register pages
            if (isClient) {
                const path = targetView === 'login' ? '/login' : '/register';
                window.history.pushState({}, '', path);
            }
            return;
        }
        
        // ========== FIXED: Check if login is required for this view ==========
        const requiresLogin = [
            'profile', 'create_event', 'create_post', 'create_story', 
            'create_reel', 'marketplace_create', 'messages', 'settings',
            'groups', 'suggested_profiles', 'profiles', 'memories'
        ].includes(targetView);
        
        if (requiresLogin && !currentUser) {
            console.log('[DEBUG] Login required for', targetView, 'redirecting to login');
            
            // Store the intended destination for after login
            if (isClient) {
                sessionStorage.setItem('unauth_redirect', targetView);
            }
            
            // Set view to login without immediately redirecting
            setView('login');
            
            // Update URL to login page
            if (isClient) {
                window.history.pushState({}, '', '/login');
            }
            return;
        }
        
        // ========== Handle regular navigation for authenticated users ==========
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
            };
            window.history.pushState({}, '', pathMap[targetView] || '/');
        }

        setActiveTag(null);
        if (targetView.startsWith('post-')) {
            const postId = parseInt(targetView.split('-')[1]);
            setActiveSinglePostId(postId);
            setView('single_post');
            return;
        }

        setActiveReelId(null);
        setActiveBrandId(null);
        setInitialGroupIdToView(null);
        setActiveGroupComments(null);
        setActiveGroupShare(null);

        // Handle all menu views
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
                }
                break;
            case 'create_event':
                if (currentUser) {
                    setShowCreateEventModal(true);
                } else {
                    setView('login');
                }
                break;
            case 'brand_view':
                setView('brands');
                setActiveTab('brands');
                break;
            default:
                setView(targetView);
                setActiveTab('home');
        }
    };
    
    // ========== FIXED: Enhanced login handler with redirect support ==========
    const handleLogin = (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setLoginError('');
            setShowRegister(false);
            setShowForgotPassword(false);
            
            // Check if there's a stored redirect URL
            if (isClient) {
                const redirectTo = sessionStorage.getItem('unauth_redirect');
                
                if (redirectTo) {
                    console.log('[DEBUG] Redirecting to stored target after login:', redirectTo);
                    sessionStorage.removeItem('unauth_redirect');
                    handleNavigate(redirectTo);
                } else {
                    // Default to home
                    setView('home');
                    setActiveTab('home');
                    window.history.pushState({}, '', '/');
                }
            } else {
                setView('home');
                setActiveTab('home');
            }
        } else {
            setLoginError('Invalid email or password');
        }
    };

    // ========== FIXED: Enhanced register handler with redirect support ==========
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
        
        setUsers([...users, user]);
        setCurrentUser(user);
        setShowRegister(false);
        setShowForgotPassword(false);
        
        // Check for redirect after registration
        if (isClient) {
            const redirectTo = sessionStorage.getItem('unauth_redirect');
            
            if (redirectTo) {
                console.log('[DEBUG] Redirecting after registration:', redirectTo);
                sessionStorage.removeItem('unauth_redirect');
                handleNavigate(redirectTo);
            } else {
                // Default to home
                setView('home');
                window.history.pushState({}, '', '/');
            }
        } else {
            setView('home');
        }
    };

    // ========== FIXED: Logout handler with cleanup ==========
    const handleLogout = () => {
        setCurrentUser(null);
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            // Clear any stored redirects
            sessionStorage.removeItem('unauth_redirect');
            window.history.pushState({}, '', '/');
        }
        // Keep guests on home page to see content
        setView('home');
        setActiveTab('home');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    // ========== FIXED: Auth navigation helper for profile clicks ==========
    const handleAuthNavigation = (targetView: string, requireAuth: boolean = false) => {
        console.log('[DEBUG] Auth Navigation:', { 
            targetView, 
            requireAuth, 
            currentUser: !!currentUser,
            currentView: view 
        });
        
        // If this view requires authentication and user is not logged in
        if (requireAuth && !currentUser) {
            console.log('[DEBUG] Authentication required, redirecting to login');
            
            // Store the intended target view for after login
            if (isClient && targetView !== 'login' && targetView !== 'register') {
                sessionStorage.setItem('unauth_redirect', targetView);
            }
            
            // Set view to login without immediately redirecting
            setView('login');
            
            // Update URL for login page
            if (isClient) {
                window.history.pushState({}, '', '/login');
            }
            
            return;
        }
        
        // If user is already on login/register and clicks login/register again, stay there
        if ((targetView === 'login' || targetView === 'register') && 
            (view === 'login' || view === 'register')) {
            console.log('[DEBUG] Already on auth page, staying');
            return;
        }
        
        // Handle regular navigation for authenticated users
        handleNavigate(targetView);
    };

    // ========== CRITICAL FIX: Browser navigation handling ==========
    useEffect(() => {
        if (!isClient) return;
        
        const handlePopState = () => {
            const newPath = getPath();
            const parsed = parsePath(newPath, users);
            
            console.log('[DEBUG] Popstate detected:', { newPath, parsed, currentUser: !!currentUser });
            
            // Don't automatically redirect if on login/register pages
            if (newPath === '/login' || newPath === '/register') {
                if (currentUser) {
                    // User is logged in but navigated to login page, redirect to home
                    window.history.replaceState({}, '', '/');
                    setView('home');
                    setActiveTab('home');
                } else {
                    // Guest stays on login page
                    setView('login');
                }
                return;
            }
            
            // Handle other routes normally
            if (parsed.view === 'home' || newPath === '/') {
                setView('home');
                setActiveTab('home');
            } else if (parsed.view === 'profile' && parsed.userId) {
                if (!currentUser) {
                    // Guest trying to view profile, redirect to login
                    setView('login');
                    if (isClient) {
                        sessionStorage.setItem('unauth_redirect', 'profile');
                        window.history.replaceState({}, '', '/login');
                    }
                } else {
                    setSelectedUserId(parsed.userId);
                    setView('profile');
                    setActiveTab('profile');
                }
            } else {
                // Check if this route requires auth
                const protectedRoutes = [
                    'profile', 'create_event', 'create_post', 'create_story', 
                    'create_reel', 'marketplace_create', 'messages', 'settings',
                    'groups', 'suggested_profiles', 'profiles', 'memories'
                ];
                
                if (protectedRoutes.includes(parsed.view) && !currentUser) {
                    // Guest trying to access protected route, redirect to login
                    setView('login');
                    if (isClient) {
                        sessionStorage.setItem('unauth_redirect', parsed.view);
                        window.history.replaceState({}, '', '/login');
                    }
                } else {
                    setView(parsed.view);
                    setActiveTab(parsed.view);
                }
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isClient, users, currentUser]);

    // ========== Rest of your existing functions (keep them as is) ==========
    const handleTagClick = (tag: string) => {
        setActiveTag(tag.replace('#', ''));
        setView('tag_feed');
    };
    
    // ... [Keep all your existing functions like handleFollowUser, handleReact, handleComment, etc.] ...
    
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
        // handleTyping(currentUser.id, false);
        
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
                    const recipientStatus = userStatus[activeChatUser.id];
                    if (recipientStatus?.isOnline) {
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
    
    // ========== FIXED LIKE AND REACT FUNCTIONS ==========
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            setView('login');
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
    const handleReact = (itemId: number, type: ReactionType) => {
        console.log('[DEBUG] handleReact called:', { 
            itemId, 
            type, 
            currentUserId: currentUser?.id,
            currentUserName: currentUser?.name
        });
        
        if (!currentUser) {
            console.log('[DEBUG] No current user, showing login');
            setView('login');
            return;
        }
        
        // Check if it's a product post (ID > 100000)
        if (itemId > 100000) {
            console.log('[DEBUG] Product post detected, calling handleLikeProduct');
            const productId = itemId - 100000;
            // handleLikeProduct(productId);
            return;
        }
        
        // Find the post first
        const postToUpdate = posts.find(p => p.id === itemId);
        if (!postToUpdate) {
            console.log('[DEBUG] Post not found:', itemId);
            return;
        }
        
        console.log('[DEBUG] Found post:', {
            postId: postToUpdate.id,
            authorId: postToUpdate.authorId,
            currentReactions: postToUpdate.reactions.length,
            postAuthorName: users.find(u => u.id === postToUpdate.authorId)?.name || 'Unknown'
        });
        
        // Update posts state
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
                            console.log('[DEBUG] Removed reaction for post:', post.id);
                        } else {
                            // Update reaction type
                            newReactions = newReactions.map(r => 
                                r.userId === currentUser.id ? { ...r, type } : r
                            );
                            console.log('[DEBUG] Updated reaction type to:', type, 'for post:', post.id);
                        }
                    } else {
                        // Add new reaction
                        newReactions.push({ userId: currentUser.id, type });
                        console.log('[DEBUG] Added new reaction:', type, 'for post:', post.id);
                        
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
                    
                    return { ...post, reactions: newReactions };
                }
                return post;
            });
        });
    };

    // ========== CRITICAL FIX: Enhanced handleComment function ==========
    const handleComment = (itemId: number, text: string, attachment?: any, parentId?: number) => {
        console.log('[DEBUG] handleComment called:', { 
            itemId, 
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            currentUserId: currentUser?.id,
            currentUserName: currentUser?.name
        });
        
        if (!currentUser) {
            console.log('[DEBUG] No current user, showing login');
            setView('login');
            return;
        }
        
        // Check if it's a product post (ID > 100000)
        if (itemId > 100000) {
            console.log('[DEBUG] Product post detected, calling handleCommentOnProduct');
            const productId = itemId - 100000;
            // handleCommentOnProduct(productId, text);
            return;
        }
        
        // Find the post first
        const postToUpdate = posts.find(p => p.id === itemId);
        if (!postToUpdate) {
            console.log('[DEBUG] Post not found:', itemId);
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
            authorImage: currentUser.profileImage,
            parentId
        };
        
        console.log('[DEBUG] Adding comment to post:', {
            postId: itemId,
            postAuthorId: postToUpdate.authorId,
            commentId: newComment.id,
            commentTextPreview: text.substring(0, 30)
        });
        
        // Update posts state
        setPosts(prev => {
            return prev.map(p => {
                if (p.id === itemId) {
                    const updatedComments = [...p.comments, newComment];
                    console.log('[DEBUG] Updated comments for post', p.id, ':', updatedComments.length);
                    
                    // Send notification to post author (prevent self-commenting notifications)
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
                    
                    // Handle mentions in comments with self-notification prevention
                    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
                    const mentions = [...text.matchAll(mentionRegex)];
                    if (mentions.length > 0) {
                        const mentionedUserIds = new Set<number>();
                        mentions.forEach(match => {
                            const userName = match[1];
                            const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                            if (user && user.id !== currentUser.id) {
                                mentionedUserIds.add(user.id);
                                
                                // Send mention notification
                                console.log('[DEBUG] Sending mention notification to user:', user.id);
                                handleCreateNotification(
                                    user.id,
                                    currentUser.id,
                                    'mention_comment',
                                    'mentioned you in a comment.',
                                    { postId: itemId, commentId: newComment.id }
                                );
                            }
                        });
                    }
                    
                    return { ...p, comments: updatedComments };
                }
                return p;
            });
        });

        // Update comment count for music/podcast posts
        const post = posts.find(p => p.id === itemId);
        if (post && (post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
            const song = getSongForPost(post, songs, episodes);
            if (song) {
                // handleTrackComment(song.id);
            }
        }
        
        // Close comments sheet if it's open
        if (activeCommentsPostId === itemId) {
            console.log('[DEBUG] Closing comments sheet for post:', itemId);
            setActiveCommentsPostId(null);
        }
        
        console.log('[DEBUG] Comment added successfully to post:', itemId);
    };

    // ========== Rest of your existing functions (simplified for brevity) ==========
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
            setView('login');
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

    // ========== Function to render music/podcast posts ==========
    const renderMusicPost = (post: PostType, author: any) => {
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
                    handleAuthNavigation('profile', true);
                }}
                onLikeTrack={handleLikeTrack}
                onTrackComment={handleTrackComment}
                onTrackShare={handleTrackShare}
                isLiked={likedTracks.includes(song.id)}
                showLoginPrompt={() => setView('login')}
            />
        );
    };

    // ========== Function to render regular posts with brand support ==========
    const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
        const isBrandAuthor = author?.type === 'brand';
        const isFollowingBrand = isBrandAuthor && currentUser ? 
            brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false : 
            false;
        
        // Ensure post has formattedTime
        const postWithFormattedTime = {
            ...post,
            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
        };
        
        return (
            <Post 
                key={post.id} 
                post={postWithFormattedTime}
                author={author as any} 
                currentUser={currentUser} 
                users={users} 
                onProfileClick={(id) => { 
                    handleAuthNavigation('profile', true);
                }} 
                onReact={handleReact} 
                onShare={(id) => setActiveSharePostId(id)} 
                onViewImage={(url) => setFullScreenImage(url)} 
                onOpenComments={(postId) => {
                    if (!currentUser) {
                        setView('login');
                    } else {
                        setActiveCommentsPostId(postId);
                    }
                }} 
                onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} 
                onViewProduct={(p) => setActiveProduct(p)} 
                onGroupClick={(groupId) => { 
                    setInitialGroupIdToView(groupId); 
                    handleAuthNavigation('groups', true);
                }} 
                onPlayAudioTrack={handlePlayTrack} 
                onFollow={isBrandAuthor ? handleFollowBrand : handleFollowUser} 
                isFollowing={isBrandAuthor ? isFollowingBrand : isFollowing} 
                onHashtagClick={handleTagClick} 
                onDeletePost={handleDeletePost} 
                isAdmin={isAdmin}
                showLoginPrompt={() => setView('login')}
            />
        );
    };
    
    // ========== Function to render the main feed ==========
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
    const showLoginScreen = view === 'login' && !currentUser;
    const showMainApp = !showLoginScreen || currentUser;
    
    // ========== Render the app ==========
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
                            handleAuthNavigation('profile', true);
                        }} 
                        onReelsClick={() => handleNavigate('reels')} 
                        onMarketplaceClick={() => handleNavigate('marketplace')} 
                        onGroupsClick={() => handleAuthNavigation('groups', true)} 
                        currentUser={currentUser} 
                        notifications={notifications} 
                        users={users} 
                        onLogout={handleLogout} 
                        onLoginClick={() => {
                            console.log('[DEBUG] Login clicked from Header');
                            // IMPORTANT: Use handleNavigate for login to ensure proper flow
                            handleNavigate('login');
                        }} 
                        onMarkNotificationsRead={handleMarkAllNotificationsRead} 
                        onNotificationClick={handleNotificationClick}
                        activeTab={activeTab} 
                        onNavigate={handleNavigate} 
                        onMessageClick={(userId) => {
                            handleAuthNavigation('messages', true);
                        }}
                    />
                    
                    <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                        {/* Sidebar - Hidden for guests on mobile, shown for logged-in */}
                        {currentUser && (
                            <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                                <Sidebar 
                                    currentUser={currentUser || INITIAL_USERS[0]} 
                                    onProfileClick={(id) => { 
                                        handleAuthNavigation('profile', true);
                                    }} 
                                    onReelsClick={() => handleNavigate('reels')} 
                                    onMarketplaceClick={() => handleNavigate('marketplace')} 
                                    onGroupsClick={() => handleAuthNavigation('groups', true)} 
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
                                            handleAuthNavigation('profile', true);
                                        }} 
                                        onCreateStory={() => {
                                            handleAuthNavigation('create_story', true);
                                        }} 
                                        onViewStory={(s) => setActiveStory(s)} 
                                        currentUser={currentUser} 
                                        onRequestLogin={() => setView('login')} 
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
                                        <GuestCreatePost onSignUp={() => setView('login')} />
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
                                            onSignUp={() => setView('login')}
                                            title="Join UNERA to connect with friends"
                                            description="Sign up to see more posts, share your thoughts, and join communities."
                                        />
                                    )}
                                    
                                    {/* Main Feed - VISIBLE TO EVERYONE */}
                                    {renderMainFeed()}
                                </div>
                            )}
                            
                            {/* Other views... */}
                            {view === 'profile' && selectedUserId !== null && (
                                <UserProfile 
                                    user={users.find(u => u.id === selectedUserId)!} 
                                    currentUser={currentUser} 
                                    users={users} 
                                    posts={(() => {
                                        const userPosts = posts.filter(p => p.authorId === selectedUserId);
                                        const enhancedPosts = userPosts.map(post => ({
                                            ...post,
                                            formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                                        }));
                                        
                                        return [
                                            ...enhancedPosts,
                                            ...products
                                                .filter(p => p.sellerId === selectedUserId)
                                                .map(p => ({
                                                    id: p.id + 100000,
                                                    authorId: p.sellerId,
                                                    content: `Just listed a new item: ${p.title}`,
                                                    timestamp: p.date,
                                                    formattedTime: formatRelativeTime(p.date),
                                                    createdAt: p.date,
                                                    reactions: [],
                                                    comments: [],
                                                    shares: 0,
                                                    views: p.views,
                                                    type: 'product' as const,
                                                    visibility: 'Public' as const,
                                                    product: p,
                                                    productId: p.id
                                                }))
                                        ];
                                    })()}
                                    onProfileClick={(id) => { 
                                        handleAuthNavigation('profile', true);
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
                                    onDeletePost={(id) => {
                                        if (id > 100000) {
                                            const productId = id - 100000;
                                            setProducts(prev => prev.filter(p => p.id !== productId));
                                        } else {
                                            const postToDelete = posts.find(p => p.id === id);
                                            if (postToDelete && (postToDelete.type === 'music' || postToDelete.type === 'podcast') && postToDelete.audioTrack) {
                                                const trackId = postToDelete.audioTrack.id;
                                                setSongs(prev => prev.filter(s => s.id !== trackId));
                                                setEpisodes(prev => prev.filter(e => e.id !== trackId));
                                            }
                                            setPosts(posts.filter(p => p.id !== id));
                                        }
                                    }} 
                                    onEditPost={() => {}} 
                                    getCommentAuthor={(id) => users.find(u => u.id === id)} 
                                    onViewImage={setFullScreenImage} 
                                    onOpenComments={setActiveCommentsPostId} 
                                    onVideoClick={() => {}} 
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
                                    renderMusicPost={(post: PostType, author: any) => {
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
                                                    handleAuthNavigation('profile', true);
                                                }}
                                                onLikeTrack={handleLikeTrack}
                                                onTrackComment={handleTrackComment}
                                                onTrackShare={handleTrackShare}
                                                isLiked={likedTracks.includes(song.id)}
                                                showLoginPrompt={() => setView('login')}
                                            />
                                        );
                                    }}
                                    renderRegularPost={renderRegularPost}
                                    // MESSAGE ICON PROPS
                                    unreadMessageCount={currentUserUnreadCount}
                                    onOpenMessages={handleOpenMessages}
                                    recentMessages={currentUserRecentConversations}
                                />
                            )}
                            
                            {/* Suggested Profiles Page (requires auth) */}
                            {view === 'suggested_profiles' && (
                                <SuggestedProfilesPage 
                                    users={users} 
                                    currentUser={currentUser} 
                                    onFollow={handleFollowUser} 
                                    onProfileClick={(id) => { 
                                        handleAuthNavigation('profile', true);
                                    }} 
                                />
                            )}
                            
                            {/* Other view components (marketplace, reels, groups, etc.) */}
                            {/* ... rest of your view rendering logic ... */}
                            
                        </div>
                        
                        {/* Right Sidebar - Only for logged-in users */}
                        {currentUser && (
                            <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                                <RightSidebar 
                                    contacts={users.filter(u => u.id !== currentUser?.id)} 
                                    onProfileClick={(id) => { 
                                        handleAuthNavigation('profile', true);
                                    }} 
                                    onMessageClick={(userId) => {
                                        handleAuthNavigation('messages', true);
                                    }}
                                    getUserStatus={getUserStatus}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Modals and other components */}
                    {/* ... rest of your modal rendering logic ... */}
                    
                </>
            )}
        </div>
    );
}
