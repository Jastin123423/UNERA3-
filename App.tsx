
import React, { useState, useEffect, useMemo } from 'react';
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
import { MusicSystem, GlobalAudioPlayer } from './components/MusicSystem'; 
import { GroupsPage } from './components/Groups';
import { ToolsPage } from './components/Tools';
import { PrivacyPolicyPage } from './components/PrivacyPolicy';
import { TermsOfServicePage } from './components/TermsOfService';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Brand, Song, Episode } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_BRANDS, MOCK_SONGS, MOCK_EPISODES } from './constants';
import { rankFeed } from './utils/ranking'; 

const getPath = () => {
    if (typeof window !== 'undefined') {
        return window.location.pathname;
    }
    return '/';
};

const parsePath = (path: string) => {
    if (path.startsWith('/@')) {
        return { view: 'profile', username: path.substring(2) };
    }
    if (path.startsWith('/post/')) {
        return { view: 'single_post', postId: parseInt(path.substring(6), 10) };
    }
    if (path === '/marketplace') return { view: 'marketplace' };
    if (path === '/reels') return { view: 'reels' };
    if (path === '/groups') return { view: 'groups' };
    // Add other routes here
    return { view: 'home' };
};

export default function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
    const { t } = useLanguage();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const serverPath = initialPath || '/';
    const clientPath = isClient ? getPath() : serverPath;
    const path = clientPath;
    const parsedPath = useMemo(() => parsePath(path), [path]);

    const [users, setUsers] = useState<User[]>(initialData?.users || INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(initialData?.posts || INITIAL_POSTS);
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES.map(s => ({...s, createdAt: Date.now(), user: (initialData?.users || INITIAL_USERS).find((u: User) => u.id === s.userId)}))); 
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
    
    const [songs, setSongs] = useState<Song[]>(MOCK_SONGS);
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
    
    const [currentUser, setCurrentUser] = useState<User | null>(initialData?.currentUser || null);
    const [showRegister, setShowRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    
    const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : '');
    const [view, setView] = useState(initialData?.view || parsedPath.view);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(initialData?.selectedUserId || null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
    const [initialGroupIdToView, setInitialGroupIdToView] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [likedTracks, setLikedTracks] = useState<string[]>([]);

    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
    const [showCreateReelModal, setShowCreateReelModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeSharePostId, setActiveSharePostId] = useState<number | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(initialData?.activeSinglePostId || parsedPath.postId || null);

    const isAdmin = currentUser?.role === 'admin';

    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    const rankedPosts = useMemo(() => {
        const productPosts: PostType[] = products.map(p => ({ id: p.id + 100000, authorId: p.sellerId, content: `Just listed a new item: ${p.title}`, timestamp: 'Just now', createdAt: p.date, reactions: [], comments: [], shares: 0, views: p.views, type: 'product', visibility: 'Public', product: p, productId: p.id }));
        const reelPosts: PostType[] = reels.map(reel => ({ id: reel.id + 200000, authorId: reel.userId, content: reel.caption, video: reel.videoUrl, timestamp: 'Recently', createdAt: reel.createdAt, reactions: reel.reactions, comments: reel.comments, shares: reel.shares, views: (reel.reactions.length * 10) + (reel.shares * 5) + (reel.comments.length * 3), type: 'video', visibility: 'Public' }));
        const allContent = [...posts, ...productPosts, ...reelPosts];
        return rankFeed(allContent, currentUser, users);
    }, [posts, reels, products, currentUser, users]);

    useEffect(() => {
        if (isClient) {
            const storedUser = localStorage.getItem('universeCurrentUser');
            const storedUsers = localStorage.getItem('universeUsers');
            if (storedUsers) setUsers(JSON.parse(storedUsers));
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const freshUser = (storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS).find((u: User) => u.id === user.id);
                if (freshUser) setCurrentUser(freshUser);
            }
        }
        setTimeout(() => setIsLoading(false), 800);
    }, [isClient]);

    useEffect(() => {
        if (isClient) {
            if (currentUser) localStorage.setItem('universeCurrentUser', JSON.stringify(currentUser));
            else localStorage.removeItem('universeCurrentUser');
        }
    }, [currentUser, isClient]);

    useEffect(() => {
        if (isClient) {
            localStorage.setItem('universeUsers', JSON.stringify(users));
        }
    }, [users, isClient]);

    // ... (keep all handlers like handleLogin, handleRegister, etc. the same)

    const handleLogin = (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setView('home');
            setActiveTab('home');
            setLoginError('');
            setShowRegister(false);
            setShowForgotPassword(false);
            if (isClient) window.history.pushState({}, '', '/');
        } else {
            setLoginError('Invalid email or password');
        }
    };

    const handleRegister = (newUser: Partial<User>) => {
        const id = Math.max(...users.map(u => u.id)) + 1;
        const user: User = { ...newUser, id, role: 'user', followers: [], following: [], joinedDate: new Date().toISOString() } as User;
        setUsers([...users, user]);
        setCurrentUser(user);
        setShowRegister(false);
        setShowForgotPassword(false);
        setView('home');
        if (isClient) window.history.pushState({}, '', '/');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        if (isClient) {
            localStorage.removeItem('universeCurrentUser');
            window.history.pushState({}, '', '/');
        }
        setView('login');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    const handleTagClick = (tag: string) => {
        setActiveTag(tag.replace('#', ''));
        setView('tag_feed');
    };

    const handleNavigate = (targetView: string) => {
        if (isClient) {
            const pathMap: { [key: string]: string } = {
                home: '/',
                marketplace: '/marketplace',
                reels: '/reels',
                groups: '/groups',
                brands: '/brands',
                music: '/music',
                tools: '/tools',
                profile: currentUser ? `/@${currentUser.username || currentUser.id}` : '/login',
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

        if (targetView === 'home') {
            setView('home');
            setActiveTab('home');
        } else if (targetView === 'marketplace') {
            setView('marketplace');
            setActiveTab('marketplace');
        } else if (targetView === 'reels') {
            setView('reels');
            setActiveTab('reels');
        } else if (targetView === 'groups') {
            setView('groups');
            setActiveTab('groups');
        } else if (targetView === 'brands') {
            setView('brands');
            setActiveTab('brands');
        } else if (targetView === 'music') {
            setView('music');
            setActiveTab('music');
        } else if (targetView === 'tools') {
            setView('tools');
            setActiveTab('tools');
        } else if (targetView === 'profile') {
            if (currentUser) {
                setSelectedUserId(currentUser.id);
                setView('profile');
            } else {
                setView('login');
            }
        } else if (targetView === 'create_event') {
            if (currentUser) setShowCreateEventModal(true);
            else setView('login');
        } else {
            setView(targetView);
            setActiveTab('home'); 
        }
    };
    
    // ... all other handlers (handleFollowUser, handleCreatePost, etc.) remain the same

// --- Keep all the handler functions as they were in the original file ---
    const handleFollowUser = (userIdToToggle: number) => {
        if (!currentUser) {
            alert("Please login to follow users.");
            return;
        }
        const currentUserId = currentUser.id;
    
        const isCurrentlyFollowing = currentUser.following.includes(userIdToToggle);
    
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

    const handleCreatePost = (text: string, file: File | null, type: any, visibility: any, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: LinkPreview) => {
        if (!currentUser) return;
        const newPost: PostType = { id: Date.now(), authorId: currentUser.id, content: text, image: file && type === 'image' ? URL.createObjectURL(file) : undefined, video: file && type === 'video' ? URL.createObjectURL(file) : undefined, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, views: 0, type, visibility, location, feeling, taggedUsers, background, linkPreview };
        setPosts([newPost, ...posts]);
        if (taggedUsers && taggedUsers.length > 0) {
            const newNotifications: Notification[] = taggedUsers.map(userId => ({ id: Date.now() + userId, userId: userId, senderId: currentUser.id, type: 'mention', content: 'mentioned you in a post.', postId: newPost.id, timestamp: Date.now(), read: false, }));
            setNotifications(prev => [...newNotifications, ...prev]);
        }
    };

    const handleCreateStory = (storyData: Partial<Story>) => {
        if (!currentUser) return;
        const newStory: Story = { id: Date.now(), userId: currentUser.id, user: currentUser, ...storyData, createdAt: Date.now() } as Story;
        setStories(prev => [newStory, ...prev]);
        setShowCreateStoryModal(false);
    };

    const handleCreateReel = (videoFile: File, caption: string, song?: Song | { name: string, url: string }, effectName?: string) => {
        if (!currentUser) return;
        const newReel: Reel = { id: Date.now(), userId: currentUser.id, videoUrl: URL.createObjectURL(videoFile), caption, songName: song ? (song as Song).title || (song as {name: string}).name : 'Original Audio', effectName: effectName, createdAt: Date.now(), reactions: [], comments: [], shares: 0, };
        setReels(prev => [newReel, ...prev]);
    };

    const handleLikeStory = (storyId: number) => {
        if (!currentUser) { alert("Please login to like stories."); return; }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const reactions = s.reactions || [];
                const existingLike = reactions.find(r => r.userId === currentUser!.id);
                if (existingLike) {
                    return { ...s, reactions: reactions.filter(r => r.userId !== currentUser!.id) };
                } else {
                    return { ...s, reactions: [...reactions, { userId: currentUser!.id }] };
                }
            }
            return s;
        }));
    };
    
    const handleReplyStory = (storyId: number, text: string) => {
        if (!currentUser) { alert("Please login to reply."); return; }
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const replies = s.replies || [];
                const newReply = { userId: currentUser!.id, text, timestamp: Date.now() };
                return { ...s, replies: [...replies, newReply] };
            }
            return s;
        }));
    };

    const handleCreateEvent = (eventData: Partial<Event>) => {
        if (!currentUser) return;
        const newEvent: Event = { ...eventData, id: Date.now(), attendees: [currentUser.id], interestedIds: [] } as Event;
        setEvents(prev => [newEvent, ...prev]);
        const eventPost: PostType = { id: Date.now() + 1, authorId: currentUser.id, content: `is hosting a new event: ${newEvent.title}`, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, type: 'event', visibility: 'Public', event: newEvent, eventId: newEvent.id };
        setPosts(prev => [eventPost, ...prev]);
    };

    const handleJoinEvent = (eventId: number) => {
        if (!currentUser) return alert("Please login to join events.");
        setEvents(prev => prev.map(ev => {
            if (ev.id === eventId) {
                const isAttending = ev.attendees.includes(currentUser!.id);
                const isInterested = ev.interestedIds?.includes(currentUser!.id);
                if (isAttending) return ev;
                if (isInterested) {
                    return { ...ev, interestedIds: ev.interestedIds!.filter(id => id !== currentUser!.id), attendees: [...ev.attendees, currentUser!.id] };
                }
                return { ...ev, interestedIds: [...(ev.interestedIds || []), currentUser!.id] };
            }
            return ev;
        }));
    };

    const handleFollowBrand = (brandId: number) => {
        if (!currentUser) return alert("Login to follow brands.");
        setBrands(prev => prev.map(b => {
            if (b.id === brandId) {
                const isFollowing = b.followers.includes(currentUser!.id);
                return { ...b, followers: isFollowing ? b.followers.filter(id => id !== currentUser!.id) : [...b.followers, currentUser!.id] };
            }
            return b;
        }));
    };

    const handlePostAsBrand = (brandId: number, content: any) => {
        const newPost: PostType = { id: Date.now(), authorId: brandId, content: content.text, image: content.file && content.type === 'image' ? URL.createObjectURL(content.file) : undefined, video: content.file && content.type === 'video' ? URL.createObjectURL(content.file) : undefined, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, views: 0, type: content.type, visibility: 'Public', background: content.background, linkPreview: content.linkPreview };
        setPosts([newPost, ...posts]);
    };
    
    const handleReact = (itemId: number, type: ReactionType) => {
        if (!currentUser) return alert("Please login to react.");
        setPosts(prev => prev.map(post => {
            if (post.id === itemId) {
                const existing = post.reactions.find(r => r.userId === currentUser!.id);
                let newReactions = [...post.reactions];
                if (existing) {
                    if (existing.type === type) newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                    else newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type } : r);
                } else {
                    newReactions.push({ userId: currentUser!.id, type });
                }
                return { ...post, reactions: newReactions };
            }
            return post;
        }));
    };

    const handleReelReact = (reelId: number, type: ReactionType | undefined) => {
        if (!currentUser) return alert("Please login to react.");
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
                }
                return { ...reel, reactions: newReactions };
            }
            return reel;
        }));
    };

    const handleComment = (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        const newComment: Comment = { id: Date.now(), userId: currentUser.id, text, timestamp: 'Just now', likes: 0, attachment };
        setPosts(prev => prev.map(p => {
            if (p.id === itemId) return { ...p, comments: [...p.comments, newComment] };
            return p;
        }));

        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const mentions = [...text.matchAll(mentionRegex)];
        if (mentions.length > 0) {
            const mentionedUserIds = new Set<number>();
            mentions.forEach(match => {
                const userName = match[1];
                const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                if (user && user.id !== currentUser.id) {
                    mentionedUserIds.add(user.id);
                }
            });

            if (mentionedUserIds.size > 0) {
                const newNotifications: Notification[] = Array.from(mentionedUserIds).map(userId => ({ id: Date.now() + userId, userId: userId, senderId: currentUser.id, type: 'mention', content: 'mentioned you in a comment.', postId: itemId, timestamp: Date.now(), read: false, }));
                setNotifications(prev => [...newNotifications, ...prev]);
            }
        }
    };

    const handleShare = (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        const sourcePost = rankedPosts.find(p => p.id === postId);
        if (!sourcePost) return;
        const newSharedPost: PostType = { ...sourcePost, id: Date.now(), authorId: currentUser.id, content: extraCaption ? `${extraCaption}\n\n${sourcePost.content || ''}` : sourcePost.content, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, sharedPostId: sourcePost.id };
        if (targetType === 'profile') setPosts([newSharedPost, ...posts]);
        else if (targetType === 'brand' && targetId) {
            setPosts([{ ...newSharedPost, brandId: Number(targetId) }, ...posts]);
        }
        setActiveSharePostId(null);
        alert("Shared successfully!");
    };

    const handleFeedPost = (data: any) => {
        if (!currentUser) return;
        const newPost: PostType = { id: Date.now(), authorId: currentUser.id, content: data.content, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, views: 0, type: data.type || 'text', visibility: 'Public', audioTrack: data.audioTrack };
        setPosts([newPost, ...posts]);
    };

    const handlePlayTrack = (track: AudioTrack) => { setCurrentAudioTrack(track); setIsAudioPlaying(true); };

    const handleVerifyUser = (userId: number) => { if (isAdmin) setUsers(users.map(u => u.id === userId ? { ...u, isVerified: !u.isVerified } : u)); };
    const handleRestrictUser = (userId: number) => { if (isAdmin) setUsers(users.map(u => u.id === userId ? { ...u, isRestricted: true, restrictedUntil: Date.now() + 24 * 60 * 60 * 1000 } : u)); };
    const handleDeleteUser = (userId: number) => { if (isAdmin && window.confirm("Delete this user and all their content? This is irreversible.")) { setUsers(users.filter(u => u.id !== userId)); setPosts(posts.filter(p => p.authorId !== userId)); setReels(reels.filter(r => r.userId !== userId)); setStories(stories.filter(s => s.userId !== userId)); } };
    const handleMakeModerator = (userId: number) => { if (isAdmin) setUsers(users.map(u => u.id === userId ? { ...u, role: u.role === 'moderator' ? 'user' : 'moderator' } : u)); };
    const handleDeleteBrand = (brandId: number) => { if(isAdmin && window.confirm("Delete this brand page permanently?")) { setBrands(prev => prev.filter(b => b.id !== brandId)); setView('brands'); } };
    const handleDeleteSong = (id: string) => { if(isAdmin) { setSongs(prev => prev.filter(s => s.id !== id)); } };
    const handleDeleteEpisode = (id: string) => { if(isAdmin) { setEpisodes(prev => prev.filter(e => e.id !== id)); } };

    const handleCreateGroup = (groupData: Partial<Group>) => {
        if (!currentUser) return;
        const newGroup: Group = { ...groupData, id: `g${Date.now()}`, adminId: currentUser.id, members: [currentUser.id], posts: [], createdDate: Date.now() } as Group;
        setGroups(prev => [newGroup, ...prev]);
    };
    const handleJoinGroup = (groupId: string) => { if (!currentUser) return; setGroups(prev => prev.map(g => (g.id === groupId && !g.members.includes(currentUser.id)) ? { ...g, members: [...g.members, currentUser.id] } : g)); };
    const handleLeaveGroup = (groupId: string) => { if (!currentUser) return; setGroups(prev => prev.map(g => (g.id === groupId) ? { ...g, members: g.members.filter(id => id !== currentUser!.id) } : g)); };
    const handleDeleteGroup = (groupId: string) => { if (!currentUser) return; const group = groups.find(g => g.id === groupId); if (group && (group.adminId === currentUser.id || isAdmin)) { if (window.confirm("Are you sure you want to permanently delete this group?")) { setGroups(prev => prev.filter(g => g.id !== groupId)); } } };
    const handleUpdateGroupImage = (groupId: string, type: 'cover' | 'profile', file: File) => { const url = URL.createObjectURL(file); setGroups(prev => prev.map(g => g.id === groupId ? (type === 'cover' ? { ...g, coverImage: url } : { ...g, image: url }) : g)); };
    const handlePostToGroup = (groupId: string, content: string, file: File | null, type: any) => { if (!currentUser) return; const newPost: GroupPost = { id: Date.now(), authorId: currentUser.id, content, image: file && type === 'image' ? URL.createObjectURL(file) : undefined, video: file && type === 'video' ? URL.createObjectURL(file) : undefined, timestamp: Date.now(), reactions: [], comments: [], shares: 0 }; setGroups(prev => prev.map(g => g.id === groupId ? { ...g, posts: [newPost, ...g.posts] } : g)); const newFeedPost: PostType = { ...newPost, type, visibility: 'Public', timestamp: 'Just now', createdAt: newPost.timestamp, groupId, groupName: groups.find(g => g.id === groupId)?.name }; setPosts(prev => [newFeedPost, ...prev]); };
    const handleReactGroupPost = (groupId: string, postId: number, type: ReactionType) => { if (!currentUser) return; setGroups(prev => prev.map(g => { if (g.id === groupId) { const updatedPosts = g.posts.map(p => { if (p.id === postId) { const reactions = p.reactions; const existing = reactions.find(r => r.userId === currentUser.id); let newReactions = [...reactions]; if (existing) { if (existing.type === type) newReactions = newReactions.filter(r => r.userId !== currentUser!.id); else newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type } : r); } else { newReactions.push({ userId: currentUser!.id, type }); } return { ...p, reactions: newReactions }; } return p; }); return { ...g, posts: updatedPosts }; } return g; })); };
    const handleUpdateGroupSettings = (groupId: string, settings: Partial<Group>) => { setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...settings } : g)); };
    const handleRemoveMember = (groupId: string, memberId: number) => { const group = groups.find(g => g.id === groupId); if (currentUser && group && (group.adminId === currentUser.id || isAdmin)) { setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: g.members.filter(id => id !== memberId) } : g)); } };
    const handleDeleteGroupPost = (groupId: string, postId: number) => { const group = groups.find(g => g.id === groupId); const post = group?.posts.find(p => p.id === postId); if (currentUser && group && post && (group.adminId === currentUser.id || isAdmin || post.authorId === currentUser.id)) { setGroups(prev => prev.map(g => (g.id === groupId) ? { ...g, posts: g.posts.filter(p => p.id !== postId) } : g)); } };

    // ... The rest of the App component ...
    // The render logic from the original file follows here.
    const effectiveView = isClient ? view : (initialData?.view || parsedPath.view);
    
    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
                </div>
            ) : effectiveView === 'login' ? (
                 showRegister 
                    ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
                    : showForgotPassword
                    ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
                    : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); setCurrentUser(null); }} error={loginError} />
            ) : (
                <>
                    {currentAudioTrack && (<GlobalAudioPlayer currentTrack={currentAudioTrack} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} onNext={() => {}} onPrevious={() => {}} onClose={() => { setCurrentAudioTrack(null); setIsAudioPlaying(false); }} onDownload={() => alert("Download started...")} onLike={(id) => setLikedTracks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])} isLiked={likedTracks.includes(currentAudioTrack.id)} uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)} onArtistClick={(id) => { setSelectedUserId(id); setView('profile'); }} />)}
                    <Header onHomeClick={() => handleNavigate('home')} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onReelsClick={() => handleNavigate('reels')} onMarketplaceClick={() => handleNavigate('marketplace')} onGroupsClick={() => handleNavigate('groups')} currentUser={currentUser} notifications={notifications} users={users} onLogout={handleLogout} onLoginClick={() => setView('login')} onMarkNotificationsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} activeTab={activeTab} onNavigate={handleNavigate} />
                    <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block"><Sidebar currentUser={currentUser || INITIAL_USERS[0]} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onReelsClick={() => handleNavigate('reels')} onMarketplaceClick={() => handleNavigate('marketplace')} onGroupsClick={() => handleNavigate('groups')} /></div>
                        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                            {effectiveView === 'home' && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <StoryReel stories={storiesWithUsers} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateStory={() => currentUser ? setShowCreateStoryModal(true) : setView('login')} onViewStory={(s) => setActiveStory(s)} currentUser={currentUser} onRequestLogin={() => setView('login')} />
                                    {currentUser && (<> <CreatePost currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onClick={() => setShowCreatePostModal(true)} onCreateEventClick={() => setShowCreateEventModal(true)} /> <SuggestedProductsWidget products={products} currentUser={currentUser} onViewProduct={(p) => { setActiveProduct(p); }} onSeeAll={() => handleNavigate('marketplace')} /> </>)}
                                    {rankedPosts.map(post => {
                                        const author = users.find(u => u.id === post.authorId) || brands.find(b => b.id === post.authorId);
                                        if (!author) return null;
                                        const isFollowing = currentUser && author && 'followers' in author ? currentUser.following.includes(author.id) : false;
                                        return (<Post key={post.id} post={post} author={author as any} currentUser={currentUser} users={users} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onReact={handleReact} onShare={(id) => setActiveSharePostId(id)} onViewImage={(url) => setFullScreenImage(url)} onOpenComments={(postId) => setActiveCommentsPostId(postId)} onVideoClick={(p) => { setActiveReelId(p.id - 200000); setView('reels'); }} onViewProduct={(p) => setActiveProduct(p)} onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); setView('groups'); setActiveTab('groups'); }} onPlayAudioTrack={handlePlayTrack} onFollow={handleFollowUser} isFollowing={isFollowing} onHashtagClick={handleTagClick} />);
                                    })}
                                </div>
                            )}
                            {effectiveView === 'profile' && selectedUserId !== null && <UserProfile user={users.find(u => u.id === selectedUserId)!} currentUser={currentUser} users={users} posts={posts} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onFollow={handleFollowUser} onReact={handleReact} onComment={handleComment} onShare={(id) => setActiveSharePostId(id)} onMessage={(id) => setActiveChatUser(users.find(u => u.id === id) || null)} onCreatePost={handleCreatePost} onUpdateProfileImage={(f) => {}} onUpdateCoverImage={(f) => {}} onUpdateUserDetails={(d) => {}} onDeletePost={(id) => setPosts(posts.filter(p => p.id !== id))} onEditPost={() => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} onViewImage={setFullScreenImage} onOpenComments={setActiveCommentsPostId} onVideoClick={() => {}} onCreateEventClick={() => setShowCreateEventModal(true)} onPlayAudioTrack={handlePlayTrack} onVerifyUser={handleVerifyUser} onRestrictUser={handleRestrictUser} onDeleteUser={handleDeleteUser} onMakeModerator={handleMakeModerator} onHashtagClick={handleTagClick} />}
                            {effectiveView === 'single_post' && activeSinglePostId !== null && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <Post
                                         key={activeSinglePostId}
                                         post={posts.find(p => p.id === activeSinglePostId)!}
                                         author={users.find(u => u.id === posts.find(p => p.id === activeSinglePostId)!.authorId)!}
                                         currentUser={currentUser}
                                         users={users}
                                         onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                                         onReact={handleReact}
                                         onShare={(id) => setActiveSharePostId(id)}
                                         onViewImage={setFullScreenImage}
                                         onOpenComments={setActiveCommentsPostId}
                                         onVideoClick={() => {}}
                                         onPlayAudioTrack={handlePlayTrack}
                                    />
                                </div>
                            )}
                            {/* ... Render other views based on effectiveView ... */}
                        </div>
                        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4"><RightSidebar contacts={users.filter(u => u.id !== currentUser?.id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} /></div>
                    </div>
                    {showCreatePostModal && currentUser && <CreatePostModal currentUser={currentUser} users={users} onClose={() => setShowCreatePostModal(false)} onCreatePost={handleCreatePost} />}
                    {showCreateStoryModal && currentUser && <CreateStoryModal currentUser={currentUser} songs={songs} onClose={() => setShowCreateStoryModal(false)} onCreate={handleCreateStory} />}
                    {showCreateReelModal && currentUser && <CreateReelModal currentUser={currentUser} songs={songs} onClose={() => setShowCreateReelModal(false)} onSubmit={handleCreateReel} />}
                    {showCreateEventModal && currentUser && <CreateEventModal currentUser={currentUser} onClose={() => setShowCreateEventModal(false)} onCreate={handleCreateEvent} />}
                    {activeCommentsPostId && <CommentsSheet post={rankedPosts.find(p => p.id === activeCommentsPostId)!} currentUser={currentUser || INITIAL_USERS[0]} users={users} onClose={() => setActiveCommentsPostId(null)} onComment={handleComment} onLikeComment={() => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveCommentsPostId(null); }} />}
                    {activeSharePostId && <ShareSheet currentUser={currentUser} groups={groups} brands={brands} postId={activeSharePostId} onClose={() => setActiveSharePostId(null)} onShare={(type, id, caption) => handleShare(activeSharePostId, type, id, caption)} onCopyLink={() => { if(isClient) { navigator.clipboard.writeText(`https://unera.social/posts/${activeSharePostId}`); alert("Link copied!"); } }} />}
                    {activeStory && <StoryViewer story={activeStory} user={users.find(u => u.id === activeStory.userId)!} currentUser={currentUser} allStories={storiesWithUsers} onClose={() => setActiveStory(null)} onLike={() => handleLikeStory(activeStory.id)} onReply={(text) => handleReplyStory(activeStory.id, text)} onNext={() => {}} onPrev={() => {}} onFollow={handleFollowUser} isFollowing={currentUser ? currentUser.following.includes(activeStory.userId) : false} />}
                    {activeChatUser && currentUser && <ChatWindow currentUser={currentUser} recipient={activeChatUser} messages={messages} onClose={() => setActiveChatUser(null)} onSendMessage={() => {}} />}
                    {activeProduct && <ProductDetailModal product={activeProduct} currentUser={currentUser} onClose={() => setActiveProduct(null)} onMessage={(sid) => setActiveChatUser(users.find(u => u.id === sid) || null)} />}
                    {fullScreenImage && <ImageViewer imageUrl={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
                </>
            )}
        </div>
    );
}
