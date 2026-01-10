import React, { useState, useRef, useEffect } from 'react';
import { User, Post as PostType, ReactionType, Reel, AudioTrack, Song, Episode } from '../types';

// API client function (matching App.tsx pattern)
const API_BASE_URL = 'https://unera.social';

const apiFetch = async (endpoint: string, options: RequestInit = {}, withAuth = true) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (withAuth) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            mode: 'cors',
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API did not return JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        if (Array.isArray(data)) {
            return { data: data, success: true };
        }
        
        return data;
    } catch (error) {
        console.error('API Error for', endpoint, ':', error);
        return { data: [], success: false, error: error.message };
    }
};

// Helper function to format relative time
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
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

// Transform API data
const transformUserFromAPI = (apiUser: any): User => {
    return {
        id: apiUser.id,
        name: apiUser.name || `User ${apiUser.id}`,
        email: apiUser.email || '',
        username: apiUser.username || `user${apiUser.id}`,
        password: apiUser.password || '',
        profileImage: apiUser.profile_image || apiUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiUser.name || 'User')}&background=random`,
        coverImage: apiUser.cover_image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
        bio: apiUser.bio || '',
        location: apiUser.location || '',
        followers: apiUser.followers || [],
        following: apiUser.following || [],
        posts: apiUser.posts || [],
        isVerified: apiUser.is_verified || false,
        isRestricted: apiUser.is_restricted || false,
        role: apiUser.role || 'user',
        birthDate: apiUser.birth_date,
        joinedDate: apiUser.created_at || apiUser.joined_date || new Date().toISOString()
    };
};

const transformPostFromAPI = (apiPost: any): PostType => {
    const timestamp = new Date(apiPost.created_at).getTime() || Date.now();
    
    return {
        id: apiPost.id,
        authorId: apiPost.user_id || apiPost.authorId || 1,
        content: apiPost.content || '',
        images: apiPost.media_url && apiPost.media_type === 'image' ? [apiPost.media_url] : undefined,
        video: apiPost.media_url && apiPost.media_type === 'video' ? apiPost.media_url : undefined,
        timestamp: timestamp,
        formattedTime: formatRelativeTime(timestamp),
        createdAt: timestamp,
        reactions: apiPost.reactions || [],
        comments: apiPost.comments || [],
        shares: apiPost.shares || 0,
        views: apiPost.views || 0,
        type: apiPost.media_type || apiPost.type || 'text',
        visibility: apiPost.visibility || 'Public',
        location: apiPost.location,
        feeling: apiPost.feeling,
        taggedUsers: apiPost.tagged_users,
        background: apiPost.background,
        linkPreview: apiPost.link_preview,
        audioTrack: apiPost.audio_track
    };
};

// --- EDIT PROFILE MODAL ---
interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updatedData: Partial<User>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
    const [bio, setBio] = useState(user.bio || '');
    const [work, setWork] = useState(user.work || '');
    const [education, setEducation] = useState(user.education || '');
    const [location, setLocation] = useState(user.location || '');
    const [website, setWebsite] = useState(user.website || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        
        try {
            await onSave({
                bio,
                work,
                education,
                location,
                website
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-[#242526] w-full max-w-[600px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#E4E6EB]">Edit Profile</h2>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4">
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                             <label className="text-[#E4E6EB] font-bold text-sm">Bio</label>
                        </div>
                        <textarea className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none focus:border-[#1877F2] text-center" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe yourself..." />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[#E4E6EB] font-bold text-lg">Details</h3>
                        
                        <div>
                            <div className="flex items-center gap-2 mb-1 text-[#B0B3B8]">
                                <i className="fas fa-briefcase w-5 text-center"></i>
                                <span className="text-sm">Work</span>
                            </div>
                            <input type="text" className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" value={work} onChange={e => setWork(e.target.value)} placeholder="Add a workplace" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1 text-[#B0B3B8]">
                                <i className="fas fa-graduation-cap w-5 text-center"></i>
                                <span className="text-sm">Education</span>
                            </div>
                            <input type="text" className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" value={education} onChange={e => setEducation(e.target.value)} placeholder="Add a high school or university" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1 text-[#B0B3B8]">
                                <i className="fas fa-map-marker-alt w-5 text-center"></i>
                                <span className="text-sm">Location</span>
                            </div>
                            <input type="text" className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" value={location} onChange={e => setLocation(e.target.value)} placeholder="Add current city" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1 text-[#B0B3B8]">
                                <i className="fas fa-link w-5 text-center"></i>
                                <span className="text-sm">Website</span>
                            </div>
                            <input type="text" className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" value={website} onChange={e => setWebsite(e.target.value)} placeholder="Add website link" />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[#3E4042] bg-[#242526] rounded-b-xl">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i>
                                Saving...
                            </span>
                        ) : 'Save Details'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface UserProfileProps {
    user: User;
    currentUser: User | null;
    users: User[];
    posts: PostType[];
    reels?: Reel[];
    songs?: Song[];
    episodes?: Episode[];
    likedTracks?: string[];
    onProfileClick: (id: number) => void;
    onFollow: (id: number) => void;
    onReact: (postId: number, type: ReactionType) => void;
    onComment: (postId: number, text: string) => void;
    onShare: (postId: number) => void;
    onMessage: (id: number) => void;
    onCreatePost: (text: string, files: File[] | null, type: any, visibility: any, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: any) => void;
    onUpdateProfileImage: (file: File) => void;
    onUpdateCoverImage: (file: File) => void;
    onUpdateUserDetails: (data: Partial<User>) => void;
    onDeletePost: (postId: number) => void;
    onEditPost: (postId: number, content: string) => void;
    getCommentAuthor: (id: number) => User | undefined;
    onViewImage: (url: string) => void;
    onCreateEventClick?: () => void;
    onOpenComments: (postId: number) => void;
    onVideoClick: (post: PostType) => void;
    onPlayAudioTrack: (track: AudioTrack) => void;
    onHashtagClick?: (tag: string) => void;
    
    // Admin Actions
    onVerifyUser?: (id: number) => void;
    onRestrictUser?: (id: number) => void;
    onDeleteUser?: (id: number) => void;
    onMakeModerator?: (id: number) => void;
    
    // Music-related props
    onLikeTrack?: (trackId: string, isLiked: boolean) => void;
    onTrackComment?: (trackId: string) => void;
    onTrackShare?: (trackId: string) => void;
    
    // Render functions for different post types
    renderMusicPost?: (post: PostType, author: any) => React.ReactNode;
    renderRegularPost?: (post: PostType, author: any, isFollowing?: boolean) => React.ReactNode;
    
    // New props for API integration
    onFetchUserPosts?: (userId: number) => Promise<PostType[]>;
    onFetchUserReels?: (userId: number) => Promise<Reel[]>;
    onFetchUserFollowers?: (userId: number) => Promise<User[]>;
    onFetchUserFollowing?: (userId: number) => Promise<User[]>;
}

// Helper function to get song for post
const getSongForPost = (post: PostType, songs?: Song[], episodes?: Episode[]) => {
    if (!post.audioTrack || !songs || !episodes) return null;
    
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
    
    return null;
};

export const UserProfile: React.FC<UserProfileProps> = ({ 
    user, 
    currentUser, 
    users, 
    posts, 
    reels = [], 
    songs = [], 
    episodes = [],
    likedTracks = [],
    onProfileClick, 
    onFollow, 
    onReact, 
    onComment, 
    onShare, 
    onMessage, 
    onCreatePost, 
    onUpdateProfileImage, 
    onUpdateCoverImage, 
    onUpdateUserDetails, 
    onDeletePost, 
    onEditPost, 
    getCommentAuthor, 
    onViewImage, 
    onCreateEventClick, 
    onOpenComments, 
    onVideoClick, 
    onPlayAudioTrack, 
    onHashtagClick, 
    onVerifyUser, 
    onRestrictUser, 
    onDeleteUser, 
    onMakeModerator,
    onLikeTrack,
    onTrackComment,
    onTrackShare,
    renderMusicPost,
    renderRegularPost,
    // API functions
    onFetchUserPosts,
    onFetchUserReels,
    onFetchUserFollowers,
    onFetchUserFollowing
}) => {
    const [activeTab, setActiveTab] = useState('Posts');
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userPosts, setUserPosts] = useState<PostType[]>(() => posts.filter(post => post.authorId === user.id));
    const [userReels, setUserReels] = useState<Reel[]>(() => reels.filter(reel => reel.userId === user.id));
    const [followers, setFollowers] = useState<User[]>(() => users.filter(u => user.followers.includes(u.id)));
    const [following, setFollowing] = useState<User[]>(() => users.filter(u => user.following.includes(u.id)));
    
    const isCurrentUser = currentUser && user.id === currentUser.id;
    const isFollowing = currentUser ? currentUser.following.includes(user.id) : false;
    const followerCount = followers.length;
    
    const profileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    
    const isAdmin = currentUser?.role === 'admin';

    // Fetch user data when component mounts or user changes
    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);
            try {
                // Fetch user posts if function provided
                if (onFetchUserPosts) {
                    const postsData = await onFetchUserPosts(user.id);
                    setUserPosts(postsData.map(post => ({
                        ...post,
                        formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                    })));
                } else {
                    // Use local filtering as fallback
                    setUserPosts(posts.filter(post => post.authorId === user.id).map(post => ({
                        ...post,
                        formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
                    })));
                }
                
                // Fetch user reels if function provided
                if (onFetchUserReels) {
                    const reelsData = await onFetchUserReels(user.id);
                    setUserReels(reelsData);
                }
                
                // Fetch followers if function provided
                if (onFetchUserFollowers) {
                    const followersData = await onFetchUserFollowers(user.id);
                    setFollowers(followersData);
                }
                
                // Fetch following if function provided
                if (onFetchUserFollowing) {
                    const followingData = await onFetchUserFollowing(user.id);
                    setFollowing(followingData);
                }
                
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [user.id, posts, reels, users]);

    // Calculate statistics
    const totalViews = userPosts.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalLikes = userPosts.reduce((acc, curr) => acc + curr.reactions.length, 0) + userReels.reduce((acc, curr) => acc + curr.reactions.length, 0);
    const totalShares = userPosts.reduce((acc, curr) => acc + curr.shares, 0) + userReels.reduce((acc, curr) => acc + curr.shares, 0);
    const totalComments = userPosts.reduce((acc, curr) => acc + curr.comments.length, 0) + userReels.reduce((acc, curr) => acc + curr.comments.length, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;

    // Function to update user details via API
    const handleUpdateUserDetails = async (data: Partial<User>) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch(`/api/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            if (response.success) {
                onUpdateUserDetails(data);
                // Update local state
                if (isCurrentUser) {
                    setCurrentUser?.({
                        ...currentUser,
                        ...data
                    });
                }
            } else {
                throw new Error(response.error || 'Failed to update profile');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update profile');
        }
    };

    // Function to update profile image via API
    const handleUpdateProfileImage = async (file: File) => {
        if (!currentUser) return;
        
        const formData = new FormData();
        formData.append('profile_image', file);
        
        try {
            const response = await apiFetch(`/api/users/${user.id}/profile-image`, {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type for FormData
            });
            
            if (response.success) {
                onUpdateProfileImage(file);
                // Refresh user data
                const userResponse = await apiFetch(`/api/users/${user.id}`);
                if (userResponse.success) {
                    onUpdateUserDetails(transformUserFromAPI(userResponse.data));
                }
            } else {
                throw new Error('Failed to update profile image');
            }
        } catch (error) {
            console.error('Error updating profile image:', error);
            alert('Failed to update profile image');
        }
    };

    // Function to update cover image via API
    const handleUpdateCoverImage = async (file: File) => {
        if (!currentUser) return;
        
        const formData = new FormData();
        formData.append('cover_image', file);
        
        try {
            const response = await apiFetch(`/api/users/${user.id}/cover-image`, {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type for FormData
            });
            
            if (response.success) {
                onUpdateCoverImage(file);
                // Refresh user data
                const userResponse = await apiFetch(`/api/users/${user.id}`);
                if (userResponse.success) {
                    onUpdateUserDetails(transformUserFromAPI(userResponse.data));
                }
            } else {
                throw new Error('Failed to update cover image');
            }
        } catch (error) {
            console.error('Error updating cover image:', error);
            alert('Failed to update cover image');
        }
    };

    // Function to handle follow via API
    const handleFollowWithAPI = async (userId: number) => {
        if (!currentUser) return;
        
        try {
            const response = await apiFetch(`/api/users/${userId}/follow`, {
                method: isFollowing ? 'DELETE' : 'POST'
            });
            
            if (response.success) {
                onFollow(userId);
                // Refresh followers list
                const followersResponse = await apiFetch(`/api/users/${userId}/followers`);
                if (followersResponse.success) {
                    const followerIds = followersResponse.data.map((u: any) => u.id);
                    setFollowers(users.filter(u => followerIds.includes(u.id)));
                }
            }
        } catch (error) {
            console.error('Error following user:', error);
            alert('Failed to follow user');
        }
    };

    // Function to render music/podcast posts
    const renderMusicPostDefault = (post: PostType, author: any) => {
        const song = getSongForPost(post, songs, episodes);
        if (!song) return null;
        
        return (
            <div key={post.id} className="bg-[#242526] rounded-xl border border-[#3E4042] p-4 mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <img 
                        src={author.profileImage} 
                        alt={author.name} 
                        className="w-12 h-12 rounded-full cursor-pointer"
                        onClick={() => onProfileClick(author.id)}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span 
                                className="font-bold text-[#E4E6EB] cursor-pointer hover:underline"
                                onClick={() => onProfileClick(author.id)}
                            >
                                {author.name}
                            </span>
                            {author.isVerified && <i className="fas fa-check-circle text-[#1877F2]"></i>}
                        </div>
                        <div className="text-[#B0B3B8] text-sm">{post.formattedTime}</div>
                    </div>
                </div>
                
                {post.content && (
                    <div className="mb-4 text-[#E4E6EB]">
                        {post.content}
                    </div>
                )}
                
                <div className="flex items-center gap-4 border border-[#3E4042] rounded-lg p-4 bg-[#3A3B3C]">
                    <img 
                        src={song.cover} 
                        alt={song.title} 
                        className="w-16 h-16 rounded-lg object-cover cursor-pointer"
                        onClick={() => onPlayAudioTrack && onPlayAudioTrack(song)}
                    />
                    <div className="flex-1">
                        <div className="font-bold text-[#E4E6EB]">{song.title}</div>
                        <div className="text-[#B0B3B8] text-sm">{song.artist}</div>
                        <div className="flex items-center gap-4 mt-2 text-[#B0B3B8] text-sm">
                            <div className="flex items-center gap-1">
                                <i className="fas fa-play"></i>
                                <span>{song.plays?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <i className="fas fa-heart"></i>
                                <span>{song.likes?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <i className="fas fa-share"></i>
                                <span>{song.shares?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        className="bg-[#1877F2] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#166FE5]"
                        onClick={() => onPlayAudioTrack && onPlayAudioTrack(song)}
                    >
                        <i className="fas fa-play"></i>
                    </button>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#3E4042]">
                    <button 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${likedTracks.includes(song.id) ? 'text-[#F02849]' : 'text-[#B0B3B8] hover:bg-[#3A3B3C]'}`}
                        onClick={() => onLikeTrack && onLikeTrack(song.id, likedTracks.includes(song.id))}
                    >
                        <i className={`fas fa-heart ${likedTracks.includes(song.id) ? 'text-[#F02849]' : ''}`}></i>
                        <span>{song.likes?.toLocaleString() || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#B0B3B8] hover:bg-[#3A3B3C]">
                        <i className="far fa-comment"></i>
                        <span>{song.comments?.toLocaleString() || 0}</span>
                    </button>
                    <button 
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#B0B3B8] hover:bg-[#3A3B3C]"
                        onClick={() => onTrackShare && onTrackShare(song.id)}
                    >
                        <i className="fas fa-share"></i>
                        <span>{song.shares?.toLocaleString() || 0}</span>
                    </button>
                </div>
            </div>
        );
    };

    // Function to render regular posts
    const renderRegularPostDefault = (post: PostType, author: any, isFollowing?: boolean) => {
        const { CreatePost, Post, CreatePostModal } = require('./Feed');
        
        return (
            <Post 
                key={post.id} 
                post={post} 
                author={author} 
                currentUser={currentUser} 
                users={users} 
                onProfileClick={onProfileClick} 
                onReact={onReact} 
                onShare={onShare} 
                onDelete={onDeletePost} 
                onEdit={onEditPost} 
                onHashtagClick={onHashtagClick} 
                onViewImage={onViewImage} 
                onOpenComments={onOpenComments}
                onVideoClick={onVideoClick}
                onViewProduct={() => {}} 
                onPlayAudioTrack={onPlayAudioTrack}
                onFollow={onFollow}
                isFollowing={isFollowing}
            />
        );
    };

    // Helper function to get all photos from posts
    const getAllPhotos = () => {
        const photos: string[] = [];
        userPosts.forEach(post => {
            if (post.type === 'image') {
                if (post.image) {
                    photos.push(post.image);
                }
                if (post.images && post.images.length > 0) {
                    photos.push(...post.images);
                }
            }
        });
        return photos;
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center py-20">
                    <div className="w-12 h-12 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        switch (activeTab) {
            case 'About': return (
                <div className="bg-[#242526] p-6 text-[#E4E6EB] rounded-xl border border-[#3E4042] mx-4 md:mx-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">About</h2>
                        {isCurrentUser && <button onClick={() => setShowEditProfile(true)} className="text-[#1877F2] font-semibold hover:underline">Edit</button>}
                    </div>
                    <p className="text-[#B0B3B8] text-lg italic mb-6">"{user.bio || 'No bio available'}"</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xl font-bold">Work & Education</h3>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-briefcase text-[#B0B3B8] w-6 text-center"></i>
                                <span>{user.work ? `Works at ${user.work}` : 'No workplace to show'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-graduation-cap text-[#B0B3B8] w-6 text-center"></i>
                                <span>{user.education ? `Studied at ${user.education}` : 'No schools to show'}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xl font-bold">Contact & Basic Info</h3>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-map-marker-alt text-[#B0B3B8] w-6 text-center"></i>
                                <span>{user.location || 'No location to show'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-link text-[#B0B3B8] w-6 text-center"></i>
                                <span>{user.website ? <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noreferrer" className="text-[#1877F2] hover:underline">{user.website}</a> : 'No website'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-birthday-cake text-[#B0B3B8] w-6 text-center"></i>
                                <span>{user.birthDate || 'No birth date'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-venus-mars text-[#B0B3B8] w-6 text-center"></i>
                                <span>{user.gender || 'Not specified'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
            case 'Followers': return (
                <div className="bg-[#242526] p-4 rounded-xl border border-[#3E4042] mx-4 md:mx-0">
                    <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Followers ({followers.length})</h2>
                    {followers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {followers.map(follower => (
                                <div key={follower.id} className="flex items-center gap-3 p-3 border border-[#3E4042] rounded-lg hover:bg-[#3A3B3C] cursor-pointer" onClick={() => onProfileClick(follower.id)}>
                                    <img src={follower.profileImage} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                    <div>
                                        <h4 className="font-semibold text-[#E4E6EB]">{follower.name}</h4>
                                        <span className="text-[#B0B3B8] text-sm">{follower.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-[#B0B3B8]">No followers yet.</p>}
                </div>
            );
            case 'Following': return (
                <div className="bg-[#242526] p-4 rounded-xl border border-[#3E4042] mx-4 md:mx-0">
                    <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Following ({following.length})</h2>
                    {following.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {following.map(followed => (
                                <div key={followed.id} className="flex items-center gap-3 p-3 border border-[#3E4042] rounded-lg hover:bg-[#3A3B3C] cursor-pointer" onClick={() => onProfileClick(followed.id)}>
                                    <img src={followed.profileImage} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                    <div>
                                        <h4 className="font-semibold text-[#E4E6EB]">{followed.name}</h4>
                                        <span className="text-[#B0B3B8] text-sm">{followed.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-[#B0B3B8]">Not following anyone yet.</p>}
                </div>
            );
            case 'Photos': 
                const photos = getAllPhotos();
                return (
                    <div className="bg-[#242526] p-4 rounded-xl border border-[#3E4042] mx-4 md:mx-0">
                        <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Photos ({photos.length})</h2>
                        {photos.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
                                {photos.map((photo, index) => (
                                    <div key={index} className="aspect-square cursor-pointer overflow-hidden relative group" onClick={() => onViewImage(photo)}>
                                        <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-[#B0B3B8]">No photos shared.</p>}
                    </div>
                );
            case 'Reels': 
                return (
                    <div className="bg-[#242526] p-4 rounded-xl border border-[#3E4042] mx-4 md:mx-0">
                        <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Reels ({userReels.length})</h2>
                        {userReels.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {userReels.map(reel => (
                                    <div key={reel.id} className="aspect-[9/16] relative bg-black rounded-lg overflow-hidden cursor-pointer group">
                                        <video src={reel.videoUrl} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                                            <div className="flex items-center gap-1 text-white text-xs font-bold">
                                                <i className="fas fa-play"></i> {reel.reactions.length * 10 + reel.shares * 5}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center py-8 text-[#B0B3B8]">No reels posted yet.</div>}
                    </div>
                );
            case 'Posts': default: return (
                <div className="max-w-[1095px] mx-auto w-full flex flex-col md:flex-row gap-4 px-0 md:px-4 mt-4">
                    <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col gap-4 px-4 md:px-0">
                        {isAdmin && !isCurrentUser && (
                            <div className="bg-[#242526] rounded-xl p-4 shadow-sm border border-red-900/50">
                                <h2 className="text-xl font-bold text-red-500 mb-4">Admin Controls</h2>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => onVerifyUser && onVerifyUser(user.id)} className="w-full bg-[#263951] text-[#2D88FF] py-2 rounded font-semibold hover:bg-[#2A3F5A]">
                                        {user.isVerified ? 'Remove Verification' : 'Verify User'}
                                    </button>
                                    <button onClick={() => onRestrictUser && onRestrictUser(user.id)} className="w-full bg-yellow-900/80 text-yellow-300 py-2 rounded font-semibold hover:bg-yellow-800">
                                        Suspend User (24h)
                                    </button>
                                     <button onClick={() => onMakeModerator && onMakeModerator(user.id)} className="w-full bg-[#3A3B3C] text-[#E4E6EB] py-2 rounded font-semibold hover:bg-[#4E4F50]">
                                        {user.role === 'moderator' ? 'Remove Moderator' : 'Make Moderator'}
                                    </button>
                                    <button onClick={() => onDeleteUser && onDeleteUser(user.id)} className="w-full bg-red-900/80 text-white py-2 rounded font-semibold hover:bg-red-800 mt-2">
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#242526] rounded-xl p-4 shadow-sm border border-[#3E4042]">
                            <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Intro</h2>
                            <div className="flex flex-col gap-3 text-[#E4E6EB]">
                                <div className="text-center mb-2"><p className="text-[15px]">{user.bio}</p></div>
                                <div className="h-[1px] bg-[#3E4042] w-full my-1"></div>
                                {user.work && <div className="flex items-center gap-3"><i className="fas fa-briefcase text-[#B0B3B8] w-5 text-center"></i><span>{user.work}</span></div>}
                                {user.education && <div className="flex items-center gap-3"><i className="fas fa-graduation-cap text-[#B0B3B8] w-5 text-center"></i><span>{user.education}</span></div>}
                                {user.location && <div className="flex items-center gap-3"><i className="fas fa-map-marker-alt text-[#B0B3B8] w-5 text-center"></i><span>{user.location}</span></div>}
                                {user.website && <div className="flex items-center gap-3"><i className="fas fa-link text-[#B0B3B8] w-5 text-center"></i><a href={user.website} target="_blank" rel="noreferrer" className="text-[#1877F2] hover:underline truncate">{user.website}</a></div>}
                                <div className="flex items-center gap-3"><i className="fas fa-rss text-[#B0B3B8] w-5 text-center"></i><span>{followerCount} Followers</span></div>
                                {isCurrentUser && <button className="w-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] font-semibold py-2 rounded-md transition-colors text-[15px] mt-2" onClick={() => setShowEditProfile(true)}>Edit Details</button>}
                            </div>
                        </div>
                        <div className="bg-[#242526] rounded-xl p-4 shadow-sm border border-[#3E4042]">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-xl font-bold text-[#E4E6EB]">Photos</h2>
                                <span className="text-[#1877F2] cursor-pointer hover:underline" onClick={() => setActiveTab('Photos')}>See all</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                                {getAllPhotos().slice(0, 9).map((photo, index) => (
                                    <img key={index} src={photo} className="w-full aspect-square object-cover cursor-pointer hover:opacity-90" alt="" onClick={() => onViewImage(photo)} />
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        {isCurrentUser && (
                            <div className="bg-[#242526] rounded-xl p-4 mb-4 border border-[#3E4042] shadow-sm animate-fade-in">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-[#E4E6EB] font-bold text-lg">Professional Dashboard</h2>
                                    <span className="text-[#B0B3B8] text-xs bg-[#3A3B3C] px-2 py-1 rounded border border-[#3E4042]">Private to you</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-[#3A3B3C] p-3 rounded-lg border border-[#3E4042]">
                                        <div className="text-[#B0B3B8] text-xs font-medium mb-1">Total Views</div>
                                        <div className="text-[#E4E6EB] font-bold text-xl flex items-center gap-2">
                                            {totalViews.toLocaleString()} <i className="fas fa-chart-line text-[#45BD62] text-sm"></i>
                                        </div>
                                    </div>
                                    <div className="bg-[#3A3B3C] p-3 rounded-lg border border-[#3E4042]">
                                        <div className="text-[#B0B3B8] text-xs font-medium mb-1">Engagement</div>
                                        <div className="text-[#E4E6EB] font-bold text-xl flex items-center gap-2">
                                            {totalEngagement.toLocaleString()} <i className="fas fa-fire text-[#F02849] text-sm"></i>
                                        </div>
                                    </div>
                                    <div className="bg-[#3A3B3C] p-3 rounded-lg border border-[#3E4042]">
                                        <div className="text-[#B0B3B8] text-xs font-medium mb-1">Total Likes</div>
                                        <div className="text-[#E4E6EB] font-bold text-xl flex items-center gap-2">
                                            {totalLikes.toLocaleString()} <i className="fas fa-thumbs-up text-[#1877F2] text-sm"></i>
                                        </div>
                                    </div>
                                    <div className="bg-[#3A3B3C] p-3 rounded-lg border border-[#3E4042]">
                                        <div className="text-[#B0B3B8] text-xs font-medium mb-1">Content</div>
                                        <div className="text-[#E4E6EB] font-bold text-xl">
                                            {userPosts.length + userReels.length} <span className="text-xs text-[#B0B3B8] font-normal">posts/reels</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isCurrentUser && currentUser && (
                            <>
                                {(() => {
                                    const { CreatePost } = require('./Feed');
                                    return (
                                        <CreatePost 
                                            currentUser={currentUser} 
                                            onProfileClick={onProfileClick} 
                                            onClick={() => setShowCreatePostModal(true)} 
                                            onCreateEventClick={onCreateEventClick}
                                        />
                                    );
                                })()}
                                {showCreatePostModal && (() => {
                                    const { CreatePostModal } = require('./Feed');
                                    return (
                                        <CreatePostModal 
                                            currentUser={currentUser} 
                                            onClose={() => setShowCreatePostModal(false)} 
                                            onCreatePost={onCreatePost} 
                                            users={users}
                                            onCreateEventClick={() => {
                                                setShowCreatePostModal(false);
                                                if (onCreateEventClick) onCreateEventClick();
                                            }}
                                        />
                                    );
                                })()}
                            </>
                        )}
                        <div className="bg-[#242526] p-3 mb-4 rounded-xl border border-[#3E4042] flex items-center justify-between mx-4 md:mx-0">
                            <h3 className="text-xl font-bold text-[#E4E6EB]">Posts ({userPosts.length})</h3>
                            <div className="flex gap-2">
                                <button className="bg-[#3A3B3C] px-3 py-1.5 rounded-md text-[#E4E6EB] font-semibold text-sm hover:bg-[#4E4F50]">
                                    <i className="fas fa-sliders-h mr-1"></i> Filters
                                </button>
                            </div>
                        </div>
                        
                        {userPosts.map(post => {
                            const isFollowingPostAuthor = currentUser ? currentUser.following.includes(post.authorId) : false;
                            
                            if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                                if (renderMusicPost) {
                                    return renderMusicPost(post, user);
                                }
                                return renderMusicPostDefault(post, user);
                            } else {
                                if (renderRegularPost) {
                                    return renderRegularPost(post, user, isFollowingPostAuthor);
                                }
                                return renderRegularPostDefault(post, user, isFollowingPostAuthor);
                            }
                        })}
                        
                        {userPosts.length === 0 && (
                            <div className="text-center py-8 text-[#B0B3B8] font-medium bg-[#242526] rounded-xl mx-4 md:mx-0 border border-[#3E4042]">
                                {isCurrentUser ? 'You haven\'t posted anything yet.' : 'No posts available'}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="w-full bg-[#18191A] min-h-screen">
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpdateProfileImage(e.target.files[0]); }} />
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpdateCoverImage(e.target.files[0]); }} />
            
            <div className="bg-[#242526] shadow-sm">
                <div className="max-w-[1095px] mx-auto w-full relative">
                    {/* Cover Photo */}
                    <div className="h-[200px] md:h-[350px] w-full bg-gray-700 relative group overflow-hidden md:rounded-b-xl">
                        {user.coverImage ? (
                            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" onClick={() => user.coverImage && onViewImage(user.coverImage)} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">No Cover</div>
                        )}
                        {isCurrentUser && (
                            <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-md cursor-pointer hover:bg-white/20 font-semibold text-white text-[15px] flex items-center gap-2" onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}>
                                <i className="fas fa-camera"></i> <span className="hidden sm:block">Edit cover photo</span>
                            </div>
                        )}
                    </div>

                    {/* Profile Header Info */}
                    <div className="px-4 pb-0">
                        <div className="flex flex-col md:flex-row items-center md:items-end -mt-[84px] md:-mt-[30px] relative z-10 mb-4">
                            <div className="relative">
                                <div className="w-[168px] h-[168px] rounded-full border-[6px] border-[#242526] bg-[#242526] overflow-hidden cursor-pointer relative group">
                                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" onClick={() => onViewImage(user.profileImage)} />
                                    {isCurrentUser && (
                                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center" onClick={(e) => { e.stopPropagation(); profileInputRef.current?.click(); }}>
                                            <i className="fas fa-camera text-white text-3xl"></i>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center md:items-start mt-4 md:mt-0 md:ml-6 text-center md:text-left md:mb-4">
                                <h1 className="text-[32px] font-bold text-[#E4E6EB] leading-tight flex items-center gap-2">
                                    {user.name} 
                                    {user.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-[20px]"></i>}
                                </h1>
                                <span className="text-[#B0B3B8] font-semibold text-[17px] mt-1">{followerCount} Followers</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 md:mt-0 md:mb-6">
                                {isCurrentUser ? (
                                    <>
                                        <button className="bg-[#1877F2] text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-[#166FE5] transition-colors">
                                            <i className="fas fa-plus"></i><span>Add to story</span>
                                        </button>
                                        <button className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-[#4E4F50] transition-colors" onClick={() => setShowEditProfile(true)}>
                                            <i className="fas fa-pen"></i><span>Edit profile</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {currentUser && (
                                            <>
                                            <button onClick={() => handleFollowWithAPI(user.id)} className={`${isFollowing ? 'bg-[#3A3B3C] text-[#E4E6EB]' : 'bg-[#1877F2] text-white'} px-6 py-2 rounded-md font-semibold flex items-center gap-2 transition-colors`}>
                                                {isFollowing ? (
                                                    <><i className="fas fa-user-check"></i><span>Following</span></>
                                                ) : (
                                                    <><i className="fas fa-user-plus"></i><span>Follow</span></>
                                                )}
                                            </button>
                                            <button onClick={() => onMessage(user.id)} className="bg-[#3A3B3C] text-[#E4E6EB] px-6 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-[#4E4F50] transition-colors">
                                                <i className="fab fa-facebook-messenger"></i><span>Message</span>
                                            </button>
                                            </>
                                        )}
                                        <button className="bg-[#3A3B3C] text-[#E4E6EB] px-3 py-2 rounded-md font-semibold hover:bg-[#4E4F50] transition-colors">
                                            <i className="fas fa-ellipsis-h"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="h-[1px] bg-[#3E4042] w-full mt-4"></div>
                        
                        {/* Tabs */}
                        <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                            {['Posts', 'About', 'Followers', 'Following', 'Photos', 'Reels'].map((tab) => (
                                <div key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 cursor-pointer whitespace-nowrap text-[15px] font-semibold border-b-[3px] transition-colors ${activeTab === tab ? 'text-[#1877F2] border-[#1877F2]' : 'text-[#B0B3B8] border-transparent hover:bg-[#3A3B3C] rounded-t-md'}`}>
                                    {tab}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {renderContent()}

            {showEditProfile && isCurrentUser && (
                <EditProfileModal 
                    user={user}
                    onClose={() => setShowEditProfile(false)}
                    onSave={handleUpdateUserDetails}
                />
            )}
        </div>
    );
};

// Default export API functions for App.tsx to use
export const userProfileApiFunctions = {
    fetchUserPosts: async (userId: number): Promise<PostType[]> => {
        try {
            const response = await apiFetch(`/api/users/${userId}/posts`);
            if (response.success && Array.isArray(response.data)) {
                return response.data.map(transformPostFromAPI);
            }
            return [];
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return [];
        }
    },
    
    fetchUserReels: async (userId: number): Promise<Reel[]> => {
        try {
            const response = await apiFetch(`/api/users/${userId}/reels`);
            if (response.success && Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching user reels:', error);
            return [];
        }
    },
    
    fetchUserFollowers: async (userId: number): Promise<User[]> => {
        try {
            const response = await apiFetch(`/api/users/${userId}/followers`);
            if (response.success && Array.isArray(response.data)) {
                return response.data.map(transformUserFromAPI);
            }
            return [];
        } catch (error) {
            console.error('Error fetching user followers:', error);
            return [];
        }
    },
    
    fetchUserFollowing: async (userId: number): Promise<User[]> => {
        try {
            const response = await apiFetch(`/api/users/${userId}/following`);
            if (response.success && Array.isArray(response.data)) {
                return response.data.map(transformUserFromAPI);
            }
            return [];
        } catch (error) {
            console.error('Error fetching user following:', error);
            return [];
        }
    }
};
