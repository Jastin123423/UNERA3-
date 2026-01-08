
import React, { useState, useRef, useEffect } from 'react';
import { User, Post as PostType, ReactionType, Reel, AudioTrack, Song, Episode } from '../types';
import { CreatePost, Post, CreatePostModal } from './Feed';

// --- EDIT PROFILE MODAL ---
interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updatedData: Partial<User>) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
    const [bio, setBio] = useState(user.bio || '');
    const [work, setWork] = useState(user.work || '');
    const [education, setEducation] = useState(user.education || '');
    const [location, setLocation] = useState(user.location || '');
    const [website, setWebsite] = useState(user.website || '');
    
    const handleSave = () => {
        onSave({
            bio,
            work,
            education,
            location,
            website
        });
        onClose();
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
                    <button onClick={handleSave} className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold shadow-md transition-colors">Save Details</button>
                </div>
            </div>
        </div>
    );
};

// Add this interface for message notifications
interface MessageNotification {
    count: number;
    lastMessage?: {
        content: string;
        timestamp: number;
        senderId: number;
    };
}

interface UserProfileProps {
    user: User;
    currentUser: User | null; // Allow null
    users: User[];
    posts: PostType[];
    reels?: Reel[]; // Added Reels prop
    songs?: Song[];
    episodes?: Episode[];
    likedTracks?: string[];
    onProfileClick: (id: number) => void;
    onFollow: (id: number) => void;
    onReact: (postId: number, type: ReactionType) => void;
    onComment: (postId: number, text: string) => void;
    onShare: (postId: number) => void;
    onMessage: (id: number) => void;
    // UPDATED: Changed to accept multiple files
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
    
    // Message-related props
    unreadMessageCount?: number;
    onOpenMessages?: () => void; // New prop to open messages
    recentMessages?: Array<{
        userId: number;
        userName: string;
        userImage: string;
        lastMessage: string;
        timestamp: number;
        unread: boolean;
    }>;
}

// Helper function to get song for post
const getSongForPost = (post: PostType, songs?: Song[], episodes?: Episode[]) => {
    if (!post.audioTrack || !songs || !episodes) return null;
    
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
                downloads: song.stats?.downloads || 0,
                reelsUse: song.stats?.reelsUse || 0
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
                downloads: episode.stats?.downloads || 0,
                reelsUse: episode.stats?.reelsUse || 0
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
    
    // Message-related props
    unreadMessageCount = 0,
    onOpenMessages,
    recentMessages = []
}) => {
    const [activeTab, setActiveTab] = useState('Posts');
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showMessagesPreview, setShowMessagesPreview] = useState(false);
    
    const userPosts = posts.filter(post => post.authorId === user.id);
    const userReels = reels.filter(reel => reel.userId === user.id);
    
    const isCurrentUser = currentUser && user.id === currentUser.id;
    const isFollowing = currentUser ? currentUser.following.includes(user.id) : false;
    const followerCount = user.followers.length;
    const followersList = users.filter(u => user.followers.includes(u.id));
    const profileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    
    const isAdmin = currentUser?.role === 'admin';

    const totalViews = userPosts.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalLikes = userPosts.reduce((acc, curr) => acc + curr.reactions.length, 0) + userReels.reduce((acc, curr) => acc + curr.reactions.length, 0);
    const totalShares = userPosts.reduce((acc, curr) => acc + curr.shares, 0) + userReels.reduce((acc, curr) => acc + curr.shares, 0);
    const totalComments = userPosts.reduce((acc, curr) => acc + curr.comments.length, 0) + userReels.reduce((acc, curr) => acc + curr.comments.length, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;

    // Format time for messages
    const formatMessageTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
                        <div className="text-[#B0B3B8] text-sm">{post.timestamp}</div>
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

    // Helper function to get all photos from posts (including multi-image posts)
    const getAllPhotos = () => {
        const photos: string[] = [];
        userPosts.forEach(post => {
            if (post.type === 'image') {
                // Handle single image posts
                if (post.image) {
                    photos.push(post.image);
                }
                // Handle multi-image posts
                if (post.images && post.images.length > 0) {
                    photos.push(...post.images);
                }
            }
        });
        return photos;
    };

    const renderContent = () => {
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
                    <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Followers</h2>
                    {followersList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {followersList.map(follower => (
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
                        <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Reels</h2>
                        {userReels.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {userReels.map(reel => (
                                    <div key={reel.id} className="aspect-[9/16] relative bg-black rounded-lg overflow-hidden cursor-pointer group">
                                        <video src={reel.videoUrl} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                                            <div className="flex items-center gap-1 text-white text-xs font-bold">
                                                <i className="fas fa-play"></i> {reel.reactions.length * 10 + reel.shares * 5} {/* Mock view count */}
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
                                
                                {/* Message Icon with Notification Badge - PRIVATE AREA */}
                                <div className="mb-4">
                                    <div 
                                        className="flex items-center justify-between p-3 bg-[#3A3B3C] rounded-lg border border-[#3E4042] hover:bg-[#4E4F50] cursor-pointer transition-colors"
                                        onClick={() => {
                                            if (onOpenMessages) {
                                                onOpenMessages();
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <i className="fas fa-envelope text-xl text-[#1877F2]"></i>
                                                {unreadMessageCount > 0 && (
                                                    <span className="absolute -top-2 -right-2 bg-[#F02849] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-[#E4E6EB] font-semibold">Messages</h3>
                                                <p className="text-[#B0B3B8] text-sm">
                                                    {unreadMessageCount 
                                                        ? `${unreadMessageCount} unread message${unreadMessageCount > 1 ? 's' : ''}`
                                                        : 'No new messages'}
                                                </p>
                                            </div>
                                        </div>
                                        <i className="fas fa-chevron-right text-[#B0B3B8]"></i>
                                    </div>
                                    
                                    {/* Recent Messages Preview */}
                                    {recentMessages.length > 0 && (
                                        <div className="mt-2 ml-3 pl-3 border-l border-[#3E4042]">
                                            {recentMessages.slice(0, 3).map((msg, index) => (
                                                <div 
                                                    key={index} 
                                                    className="flex items-center gap-2 p-2 rounded hover:bg-[#3A3B3C] cursor-pointer"
                                                    onClick={() => onMessage(msg.userId)}
                                                >
                                                    <img 
                                                        src={msg.userImage} 
                                                        alt={msg.userName}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#E4E6EB] text-sm font-medium truncate">
                                                                {msg.userName}
                                                            </span>
                                                            <span className="text-[#B0B3B8] text-xs">
                                                                {formatMessageTime(msg.timestamp)}
                                                            </span>
                                                        </div>
                                                        <p className="text-[#B0B3B8] text-xs truncate">
                                                            {msg.lastMessage}
                                                        </p>
                                                    </div>
                                                    {msg.unread && (
                                                        <div className="w-2 h-2 bg-[#1877F2] rounded-full"></div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                <CreatePost 
                                    currentUser={currentUser} 
                                    onProfileClick={onProfileClick} 
                                    onClick={() => setShowCreatePostModal(true)} 
                                    onCreateEventClick={onCreateEventClick}
                                />
                                {showCreatePostModal && (
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
                                )}
                            </>
                        )}
                        <div className="bg-[#242526] p-3 mb-4 rounded-xl border border-[#3E4042] flex items-center justify-between mx-4 md:mx-0">
                            <h3 className="text-xl font-bold text-[#E4E6EB]">Posts</h3>
                            <div className="flex gap-2">
                                <button className="bg-[#3A3B3C] px-3 py-1.5 rounded-md text-[#E4E6EB] font-semibold text-sm hover:bg-[#4E4F50]">
                                    <i className="fas fa-sliders-h mr-1"></i> Filters
                                </button>
                            </div>
                        </div>
                        
                        {userPosts.map(post => {
                            const isFollowingPostAuthor = currentUser ? currentUser.following.includes(post.authorId) : false;
                            
                            // Use custom render functions if provided, otherwise use default
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
                                No posts available
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="w-full bg-[#18191A] min-h-screen">
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) onUpdateProfileImage(e.target.files[0]); }} />
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) onUpdateCoverImage(e.target.files[0]); }} />
            
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
                                        {/* REMOVED "Add to story" button */}
                                        <button className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-[#4E4F50] transition-colors" onClick={() => setShowEditProfile(true)}>
                                            <i className="fas fa-pen"></i><span>Edit profile</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {currentUser && (
                                            <>
                                            <button onClick={() => onFollow(user.id)} className={`${isFollowing ? 'bg-[#3A3B3C] text-[#E4E6EB]' : 'bg-[#1877F2] text-white'} px-6 py-2 rounded-md font-semibold flex items-center gap-2 transition-colors`}>
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
                            {['Posts', 'About', 'Followers', 'Photos', 'Reels'].map((tab) => (
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
                    onSave={onUpdateUserDetails}
                />
            )}
        </div>
    );
};
