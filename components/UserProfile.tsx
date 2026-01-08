import React, { useState, useRef } from 'react';
import { User, Post as PostType, ReactionType, Reel, AudioTrack, Song, Episode } from '../types';
import { CreatePost, Post, CreatePostModal } from './Feed';
import { CommentsModal } from './CommentsModal'; // You need to create this component

// ... [Keep all existing interfaces and EditProfileModal]

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
    const [selectedPostForComments, setSelectedPostForComments] = useState<number | null>(null);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    
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

    // Get selected post for comments
    const selectedPost = selectedPostForComments 
        ? posts.find(p => p.id === selectedPostForComments)
        : null;

    // Handle comment submission
    const handleCommentSubmit = (postId: number, text: string) => {
        onComment(postId, text);
    };

    // Handle opening comments
    const handleOpenComments = (postId: number) => {
        setSelectedPostForComments(postId);
        setShowCommentsModal(true);
    };

    // ... [Keep all existing formatMessageTime function]

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

    // Function to render regular posts - PROFESSIONALLY FIXED
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
                onComment={onComment}  // ✅ CRITICAL FIX: Added missing onComment prop
                onShare={onShare} 
                onDelete={onDeletePost} 
                onEdit={onEditPost} 
                onHashtagClick={onHashtagClick} 
                onViewImage={onViewImage} 
                onOpenComments={handleOpenComments}  // ✅ Use local handler
                onVideoClick={onVideoClick}
                onViewProduct={() => {}} 
                onPlayAudioTrack={onPlayAudioTrack}
                onFollow={onFollow}
                isFollowing={isFollowing}
            />
        );
    };

    // ... [Keep all existing helper functions and renderContent]

    return (
        <div className="w-full bg-[#18191A] min-h-screen">
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) onUpdateProfileImage(e.target.files[0]); }} />
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) onUpdateCoverImage(e.target.files[0]); }} />
            
            {/* ... [Keep all existing JSX structure] */}

            {renderContent()}

            {showEditProfile && isCurrentUser && (
                <EditProfileModal 
                    user={user}
                    onClose={() => setShowEditProfile(false)}
                    onSave={onUpdateUserDetails}
                />
            )}

            {/* Comments Modal */}
            {showCommentsModal && selectedPost && currentUser && (
                <CommentsModal
                    postId={selectedPost.id}
                    isOpen={showCommentsModal}
                    onClose={() => {
                        setShowCommentsModal(false);
                        setSelectedPostForComments(null);
                    }}
                    onComment={handleCommentSubmit}
                    comments={selectedPost.comments}
                    currentUser={currentUser}
                    getCommentAuthor={getCommentAuthor}
                />
            )}
        </div>
    );
};
