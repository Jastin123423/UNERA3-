
import React, { useState, useEffect, useMemo } from 'react';
import { Login, Register } from './components/Auth';
import { Header, Sidebar, RightSidebar, MenuOverlay } from './components/Layout';
import { CreatePost, Post, CommentsSheet, ShareSheet, CreatePostModal, SuggestedProductsWidget } from './components/Feed';
import { StoryReel, StoryViewer, CreateStoryModal } from './components/Story';
import { UserProfile } from './components/UserProfile';
import { MarketplacePage, ProductDetailModal } from './components/Marketplace';
import { ReelsFeed } from './components/Reels';
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
import { MessagesPage } from './components/MessagesPage';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Brand, Song, Episode, Conversation } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_BRANDS, MOCK_SONGS, MOCK_EPISODES, INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from './constants';
import { rankFeed } from './utils/ranking'; 

export default function App() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(INITIAL_POSTS);
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES.map(s => ({...s, createdAt: Date.now(), user: INITIAL_USERS.find(u => u.id === s.userId)}))); 
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>([]);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
    
    const [songs, setSongs] = useState<Song[]>(MOCK_SONGS);
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showRegister, setShowRegister] = useState(false);
    const [loginError, setLoginError] = useState('');
    
    const [activeTab, setActiveTab] = useState('home'); 
    const [view, setView] = useState('home'); 
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
    const [initialGroupIdToView, setInitialGroupIdToView] = useState<string | null>(null);
    
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
    
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(null);

    // Messaging State
    const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [initialChatUserId, setInitialChatUserId] = useState<number | null>(null);


    const storiesWithUsers = useMemo(() => {
        return stories.map(story => {
            const user = users.find(u => u.id === story.userId);
            return { ...story, user };
        }).sort((a,b) => b.createdAt - a.createdAt);
    }, [stories, users]);

    const rankedPosts = useMemo(() => {
        const standardPosts = rankFeed(posts, currentUser, users);
        const productPosts: PostType[] = products.map(p => ({
            id: p.id + 100000, 
            authorId: p.sellerId,
            content: `Just listed a new item: ${p.title}`,
            timestamp: 'Just now',
            createdAt: p.date,
            reactions: [], 
            comments: p.comments || [], 
            shares: 0,
            views: p.views,
            type: 'product',
            visibility: 'Public',
            product: p,
            productId: p.id
        }));

        let mixedFeed = [...standardPosts];
        productPosts.forEach((pp, index) => {
            const insertIndex = (index + 1) * 5;
            if (insertIndex <= mixedFeed.length) {
                mixedFeed.splice(insertIndex, 0, pp);
            } else {
                mixedFeed.push(pp);
            }
        });

        return mixedFeed;
    }, [posts, currentUser, users, products]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const twentyFourHours = 24 * 60 * 60 * 1000;
            setStories(prev => prev.filter(s => (now - (s.createdAt || 0)) < twentyFourHours));
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('universeCurrentUser');
        const storedUsers = localStorage.getItem('universeUsers');
        if (storedUsers) setUsers(JSON.parse(storedUsers));
        if (storedUser) {
            const user = JSON.parse(storedUser);
            const freshUser = (storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS).find((u: User) => u.id === user.id);
            if (freshUser) setCurrentUser(freshUser);
        } else {
             // If no user is stored, default to login view
            setView('login');
        }
        setTimeout(() => setIsLoading(false), 800);
    }, []);

    useEffect(() => {
        if (currentUser) localStorage.setItem('universeCurrentUser', JSON.stringify(currentUser));
        else localStorage.removeItem('universeCurrentUser');
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('universeUsers', JSON.stringify(users));
    }, [users]);

    const handleLogin = (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setView('home');
            setActiveTab('home');
            setLoginError('');
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
        setView('home');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('universeCurrentUser');
        setView('login');
        setCurrentAudioTrack(null);
        setIsAudioPlaying(false);
    };

    const handleNavigate = (targetView: string) => {
        if (targetView.startsWith('post-')) {
            const postId = parseInt(targetView.split('-')[1]);
            setActiveSinglePostId(postId);
            setView('single_post');
            return;
        }

        setActiveReelId(null);
        setActiveBrandId(null);
        setInitialGroupIdToView(null);

        const tabMap: Record<string, string> = { home: 'home', marketplace: 'marketplace', reels: 'reels', groups: 'groups', brands: 'brands', music: 'music', tools: 'tools', messages: 'messages' };
        if (tabMap[targetView]) {
            setView(tabMap[targetView]);
            if(tabMap[targetView] !== 'messages') setActiveTab(tabMap[targetView]);
        } else if (targetView === 'profile') {
            if (currentUser) {
                setSelectedUserId(currentUser.id);
                setView('profile');
            } else {
                alert("Please login to view your profile.");
            }
        } else if (targetView === 'create_event') {
            if (currentUser) setShowCreateEventModal(true);
            else alert("Please login to create events.");
        } else {
            setView(targetView);
            setActiveTab('home'); 
        }
    };

    const handleCreatePost = (text: string, file: File | null, type: any, visibility: any, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: LinkPreview) => {
        if (!currentUser) return;
        const newPost: PostType = {
            id: Date.now(),
            authorId: currentUser.id,
            content: text,
            image: file && type === 'image' ? URL.createObjectURL(file) : undefined,
            video: file && type === 'video' ? URL.createObjectURL(file) : undefined,
            timestamp: 'Just now',
            createdAt: Date.now(), 
            reactions: [], comments: [], shares: 0, views: 0, type, visibility, location, feeling, taggedUsers, background, linkPreview
        };
        setPosts([newPost, ...posts]);
    };

    const handleCreateStory = (storyData: Partial<Story>) => {
        if (!currentUser) return;
        const newStory: Story = {
            id: Date.now(),
            userId: currentUser.id,
            user: currentUser,
            ...storyData,
            createdAt: Date.now()
        } as Story;
        setStories(prev => [newStory, ...prev]);
        setShowCreateStoryModal(false);
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
        const newEvent: Event = {
            ...eventData,
            id: Date.now(),
            attendees: [currentUser.id],
            interestedIds: []
        } as Event;
        setEvents(prev => [newEvent, ...prev]);

        const eventPost: PostType = {
            id: Date.now() + 1,
            authorId: currentUser.id,
            content: `is hosting a new event: ${newEvent.title}`,
            timestamp: 'Just now',
            createdAt: Date.now(),
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
                return {
                    ...b,
                    followers: isFollowing 
                        ? b.followers.filter(id => id !== currentUser!.id) 
                        : [...b.followers, currentUser!.id]
                };
            }
            return b;
        }));
    };

    const handlePostAsBrand = (brandId: number, content: any) => {
        const newPost: PostType = {
            id: Date.now(),
            authorId: brandId,
            content: content.text,
            image: content.file && content.type === 'image' ? URL.createObjectURL(content.file) : undefined,
            video: content.file && content.type === 'video' ? URL.createObjectURL(content.file) : undefined,
            timestamp: 'Just now',
            createdAt: Date.now(),
            reactions: [],
            comments: [],
            shares: 0,
            views: 0,
            type: content.type,
            visibility: 'Public',
            background: content.background,
            linkPreview: content.linkPreview
        };
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

    const handleComment = (itemId: number, text: string, attachment?: any, parentId?: number) => {
        if (!currentUser) return;
        const newComment: Comment = { id: Date.now(), userId: currentUser.id, text, timestamp: 'Just now', likes: 0, attachment };

        // Check if it's a product post
        if (products.some(p => p.id + 100000 === itemId)) {
            const productId = itemId - 100000;
            setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                    return { ...p, comments: [...(p.comments || []), newComment] };
                }
                return p;
            }));
        } else {
            // It's a regular post
            setPosts(prev => prev.map(p => {
                if (p.id === itemId) return { ...p, comments: [...p.comments, newComment] };
                return p;
            }));
        }
    };

    const handleShare = (postId: number, targetType: 'profile' | 'group' | 'brand', targetId?: string | number, extraCaption?: string) => {
        if (!currentUser) return;
        const sourcePost = rankedPosts.find(p => p.id === postId);
        if (!sourcePost) return;
        const newSharedPost: PostType = {
            ...sourcePost,
            id: Date.now(),
            authorId: currentUser.id,
            content: extraCaption ? `${extraCaption}\n\n${sourcePost.content || ''}` : sourcePost.content,
            timestamp: 'Just now',
            createdAt: Date.now(),
            reactions: [],
            comments: [],
            shares: 0,
            sharedPostId: sourcePost.id
        };
        if (targetType === 'profile') setPosts([newSharedPost, ...posts]);
        else if (targetType === 'brand' && targetId) {
            setPosts([{ ...newSharedPost, brandId: Number(targetId) }, ...posts]);
        }
        setActiveSharePostId(null);
        alert("Shared successfully!");
    };

    const handleSendMessage = (conversationId: number, text: string, stickerUrl?: string) => {
        if (!currentUser) return;
        const newMessage: Message = {
            id: Date.now(),
            conversationId,
            senderId: currentUser.id,
            text,
            timestamp: Date.now(),
            stickerUrl
        };
        setMessages(prev => [...prev, newMessage]);
        // Update conversation with last message
        setConversations(prev => prev.map(c => 
            c.id === conversationId 
            ? { ...c, lastMessage: stickerUrl ? 'Sent a sticker' : text, lastMessageTimestamp: newMessage.timestamp }
            : c
        ));
    };

    const handleFeedPost = (data: any) => {
        if (!currentUser) return;
        const newPost: PostType = { id: Date.now(), authorId: currentUser.id, content: data.content, timestamp: 'Just now', createdAt: Date.now(), reactions: [], comments: [], shares: 0, views: 0, type: data.type || 'text', visibility: 'Public', audioTrack: data.audioTrack };
        setPosts([newPost, ...posts]);
    };

    const handlePlayTrack = (track: AudioTrack) => { setCurrentAudioTrack(track); setIsAudioPlaying(true); };

    // --- GROUP HANDLERS ---
    const handleCreateGroup = (groupData: Partial<Group>) => {
        if (!currentUser) return;
        const newGroup: Group = {
            ...groupData, id: `g${Date.now()}`, adminId: currentUser.id, members: [currentUser.id],
            posts: [], createdDate: Date.now()
        } as Group;
        setGroups(prev => [newGroup, ...prev]);
    };
    const handleJoinGroup = (groupId: string) => {
        if (!currentUser) return;
        setGroups(prev => prev.map(g => (g.id === groupId && !g.members.includes(currentUser.id)) ? { ...g, members: [...g.members, currentUser.id] } : g));
    };
    const handleLeaveGroup = (groupId: string) => {
        if (!currentUser) return;
        setGroups(prev => prev.map(g => (g.id === groupId) ? { ...g, members: g.members.filter(id => id !== currentUser!.id) } : g));
    };
    const handleDeleteGroup = (groupId: string) => {
        if (!currentUser) return;
        setGroups(prev => prev.filter(g => !(g.id === groupId && g.adminId === currentUser.id)));
    };
    const handleUpdateGroupImage = (groupId: string, type: 'cover' | 'profile', file: File) => {
        const url = URL.createObjectURL(file);
        setGroups(prev => prev.map(g => g.id === groupId ? (type === 'cover' ? { ...g, coverImage: url } : { ...g, image: url }) : g));
    };
    const handlePostToGroup = (groupId: string, content: string, file: File | null, type: any) => {
        if (!currentUser) return;
        const newPost: GroupPost = {
            id: Date.now(), authorId: currentUser.id, content,
            image: file && type === 'image' ? URL.createObjectURL(file) : undefined,
            video: file && type === 'video' ? URL.createObjectURL(file) : undefined,
            timestamp: Date.now(), reactions: [], comments: [], shares: 0
        };
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, posts: [newPost, ...g.posts] } : g));
        const newFeedPost: PostType = { ...newPost, type, visibility: 'Public', timestamp: 'Just now', createdAt: newPost.timestamp, groupId, groupName: groups.find(g => g.id === groupId)?.name };
        setPosts(prev => [newFeedPost, ...prev]);
    };
    const handleReactGroupPost = (groupId: string, postId: number, type: ReactionType) => {
        if (!currentUser) return;
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const updatedPosts = g.posts.map(p => {
                    if (p.id === postId) {
                        const reactions = p.reactions;
                        const existing = reactions.find(r => r.userId === currentUser.id);
                        let newReactions = [...reactions];
                        if (existing) {
                            if (existing.type === type) newReactions = newReactions.filter(r => r.userId !== currentUser!.id);
                            else newReactions = newReactions.map(r => r.userId === currentUser!.id ? { ...r, type } : r);
                        } else {
                            newReactions.push({ userId: currentUser!.id, type });
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
    const handleUpdateGroupSettings = (groupId: string, settings: Partial<Group>) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...settings } : g));
    };
    const handleRemoveMember = (groupId: string, memberId: number) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, members: g.members.filter(id => id !== memberId) } : g));
    };
    const handleDeleteGroupPost = (groupId: string, postId: number) => {
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return { ...g, posts: g.posts.filter(p => p.id !== postId) };
            }
            return g;
        }));
    };

    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
                    <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
                </div>
            ) : view === 'login' && !currentUser ? (
                showRegister 
                ? <Register onRegister={handleRegister} onBackToLogin={() => setShowRegister(false)} /> 
                : <Login onLogin={handleLogin} onNavigateToRegister={() => setShowRegister(true)} onClose={() => { setView('home'); }} error={loginError} />
            ) : (
                <>
                    {currentAudioTrack && (
                        <GlobalAudioPlayer 
                            currentTrack={currentAudioTrack} 
                            isPlaying={isAudioPlaying} 
                            onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)}
                            onNext={() => {}} onPrevious={() => {}} onClose={() => { setCurrentAudioTrack(null); setIsAudioPlaying(false); }}
                            onDownload={() => alert("Download started...")}
                            onLike={(id) => setLikedTracks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
                            isLiked={likedTracks.includes(currentAudioTrack.id)}
                            uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)}
                            onArtistClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                        />
                    )}

                    <Header 
                        onHomeClick={() => handleNavigate('home')} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                        onReelsClick={() => handleNavigate('reels')} onMarketplaceClick={() => handleNavigate('marketplace')} onGroupsClick={() => handleNavigate('groups')}
                        currentUser={currentUser} notifications={notifications} users={users} onLogout={handleLogout} onLoginClick={() => setView('login')}
                        onMarkNotificationsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                        activeTab={activeTab} onNavigate={handleNavigate}
                    />

                    <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                        { currentUser && <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                            <Sidebar 
                                currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                                onReelsClick={() => handleNavigate('reels')} onMarketplaceClick={() => handleNavigate('marketplace')} onGroupsClick={() => handleNavigate('groups')}
                            />
                        </div>}

                        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                            {view === 'home' && (
                                <div className="w-full pt-4 md:px-8 pb-10">
                                    <StoryReel 
                                        stories={storiesWithUsers} 
                                        onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                        onCreateStory={() => currentUser ? setShowCreateStoryModal(true) : setView('login')} 
                                        onViewStory={(s) => setActiveStory(s)}
                                        currentUser={currentUser}
                                        onRequestLogin={() => setView('login')}
                                    />
                                    {currentUser && (
                                        <>
                                            <CreatePost currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onClick={() => setShowCreatePostModal(true)} onCreateEventClick={() => setShowCreateEventModal(true)} />
                                            <SuggestedProductsWidget products={products} currentUser={currentUser} onViewProduct={(p) => { setActiveProduct(p); }} onSeeAll={() => handleNavigate('marketplace')} />
                                        </>
                                    )}
                                    {rankedPosts.map(post => {
                                        const author = users.find(u => u.id === post.authorId) || brands.find(b => b.id === post.authorId);
                                        if (!author) return null;
                                        return (
                                            <Post 
                                                key={post.id} post={post} author={author as any} currentUser={currentUser} users={users}
                                                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                                onReact={handleReact} onShare={(id) => setActiveSharePostId(id)} onViewImage={(url) => setFullScreenImage(url)} 
                                                onOpenComments={(postId) => setActiveCommentsPostId(postId)} onVideoClick={(p) => { setActiveReelId(p.id); setView('reels'); }}
                                                onViewProduct={(p) => setActiveProduct(p)}
                                                onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); setView('groups'); setActiveTab('groups'); }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            {view === 'messages' && currentUser && (
                                <MessagesPage 
                                    currentUser={currentUser}
                                    conversations={conversations}
                                    messages={messages}
                                    users={users}
                                    onSendMessage={handleSendMessage}
                                    onNavigateToProfile={(userId) => { setSelectedUserId(userId); setView('profile'); }}
                                    initialChatUserId={initialChatUserId}
                                    onSetInitialChatUserId={setInitialChatUserId}
                                />
                            )}
                            {view === 'groups' && <GroupsPage currentUser={currentUser} groups={groups} users={users} onCreateGroup={handleCreateGroup} onJoinGroup={handleJoinGroup} onLeaveGroup={handleLeaveGroup} onDeleteGroup={handleDeleteGroup} onUpdateGroupImage={handleUpdateGroupImage} onPostToGroup={handlePostToGroup} onCreateGroupEvent={() => {}} onInviteToGroup={() => {}} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onLikePost={handleReactGroupPost} onOpenComments={() => {}} onSharePost={() => {}} onDeleteGroupPost={handleDeleteGroupPost} onRemoveMember={handleRemoveMember} onUpdateGroupSettings={handleUpdateGroupSettings} initialGroupId={initialGroupIdToView} />}
                            {view === 'music' && <MusicSystem currentUser={currentUser} songs={songs} episodes={episodes} onUpdateSongs={setSongs} onUpdateEpisodes={setEpisodes} onPlayTrack={handlePlayTrack} currentTrackId={currentAudioTrack?.id} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} onFeedPost={handleFeedPost} users={users} />}
                            {view === 'reels' && <ReelsFeed reels={reels} users={users} currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateReelClick={() => setShowCreateReelModal(true)} onReact={handleReact} onComment={handleComment} onShare={(id, type) => alert(type === 'feed' ? 'Shared to Feed!' : 'Link copied!')} onFollow={(id) => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} initialReelId={activeReelId} />}
                            {view === 'marketplace' && <MarketplacePage currentUser={currentUser} products={products} onNavigateHome={() => handleNavigate('home')} onCreateProduct={(pData) => setProducts([...products, { ...pData, id: Date.now(), sellerId: currentUser?.id || 0, sellerName: currentUser?.name || 'Guest', sellerAvatar: currentUser?.profileImage || '', date: Date.now() } as Product])} onViewProduct={(p) => setActiveProduct(p)} />}
                            {view === 'brands' && <BrandsPage currentUser={currentUser} brands={brands} posts={posts} users={users} onCreateBrand={(bData) => setBrands([...brands, { ...bData, id: Date.now(), followers: [currentUser?.id || 0], createdDate: Date.now() } as Brand])} onFollowBrand={handleFollowBrand} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onPostAsBrand={handlePostAsBrand} onReact={handleReact} onShare={(id) => setActiveSharePostId(id)} onOpenComments={(id) => setActiveCommentsPostId(id)} onUpdateBrand={(id, data) => setBrands(brands.map(b => b.id === id ? { ...b, ...data } : b))} initialBrandId={activeBrandId} />}
                            {view === 'profiles' && currentUser && <SuggestedProfilesPage currentUser={currentUser} users={users} groups={groups} products={products} events={events} onFollow={(id) => alert(`Following ${id}`)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                            {view === 'settings' && <SettingsPage currentUser={currentUser} onUpdateUser={(data) => currentUser && setCurrentUser({ ...currentUser, ...data })} />}
                            {view === 'memories' && currentUser && <MemoriesPage currentUser={currentUser} posts={posts} users={users} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onReact={handleReact} onShare={(id) => setActiveSharePostId(id)} onViewImage={(url) => setFullScreenImage(url)} onOpenComments={(postId) => setActiveCommentsPostId(postId)} onVideoClick={(p) => { setActiveReelId(p.id); setView('reels'); }} />}
                            {view === 'birthdays' && currentUser && <BirthdaysPage currentUser={currentUser} users={users} onMessage={(id) => { setInitialChatUserId(id); handleNavigate('messages'); }} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                            {view === 'events' && <EventsPage events={events} currentUser={currentUser || INITIAL_USERS[0]} onJoinEvent={handleJoinEvent} onCreateEventClick={() => setShowCreateEventModal(true)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                            {view === 'privacy' && <PrivacyPolicyPage onNavigateHome={() => handleNavigate('home')} />}
                            {view === 'terms' && <TermsOfServicePage onNavigateHome={() => handleNavigate('home')} />}
                            {view === 'help' && <HelpSupportPage onNavigateHome={() => handleNavigate('home')} />}
                            {view === 'profile' && selectedUserId !== null && <UserProfile user={users.find(u => u.id === selectedUserId)!} currentUser={currentUser} users={users} posts={posts} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onFollow={(id) => {}} onReact={handleReact} onComment={handleComment} onShare={(id) => setActiveSharePostId(id)} onMessage={(id) => { setInitialChatUserId(id); handleNavigate('messages'); }} onCreatePost={handleCreatePost} onUpdateProfileImage={(f) => {}} onUpdateCoverImage={(f) => {}} onUpdateUserDetails={(d) => {}} onDeletePost={(id) => setPosts(posts.filter(p => p.id !== id))} onEditPost={() => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} onViewImage={setFullScreenImage} onOpenComments={setActiveCommentsPostId} onVideoClick={() => {}} onCreateEventClick={() => setShowCreateEventModal(true)} onNavigate={handleNavigate} />}
                            {view === 'tools' && <ToolsPage />}
                        </div>

                        { currentUser && <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                            <RightSidebar contacts={users.filter(u => u.id !== currentUser?.id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />
                        </div>}
                    </div>

                    {showCreatePostModal && currentUser && <CreatePostModal currentUser={currentUser} users={users} onClose={() => setShowCreatePostModal(false)} onCreatePost={handleCreatePost} />}
                    {showCreateStoryModal && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStoryModal(false)} onCreate={handleCreateStory} />}
                    {showCreateEventModal && currentUser && <CreateEventModal currentUser={currentUser} onClose={() => setShowCreateEventModal(false)} onCreate={handleCreateEvent} />}
                    {activeCommentsPostId && <CommentsSheet post={rankedPosts.find(p => p.id === activeCommentsPostId)!} currentUser={currentUser || INITIAL_USERS[0]} users={users} onClose={() => setActiveCommentsPostId(null)} onComment={handleComment} onLikeComment={() => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveCommentsPostId(null); }} />}
                    {activeSharePostId && <ShareSheet currentUser={currentUser} groups={groups} brands={brands} postId={activeSharePostId} onClose={() => setActiveSharePostId(null)} onShare={(type, id, caption) => handleShare(activeSharePostId, type, id, caption)} onCopyLink={() => { navigator.clipboard.writeText(`https://unera.social/posts/${activeSharePostId}`); alert("Link copied!"); }} />}
                    {activeStory && <StoryViewer story={activeStory} user={users.find(u => u.id === activeStory.userId)!} currentUser={currentUser} allStories={storiesWithUsers} onClose={() => setActiveStory(null)} onLike={() => handleLikeStory(activeStory.id)} onReply={(text) => handleReplyStory(activeStory.id, text)} onNext={() => {}} onPrev={() => {}} />}
                    {activeProduct && <ProductDetailModal product={activeProduct} currentUser={currentUser} onClose={() => setActiveProduct(null)} onMessage={(sid) => { setInitialChatUserId(sid); handleNavigate('messages'); }} />}
                    {fullScreenImage && <ImageViewer imageUrl={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
                </>
            )}
        </div>
    );
}
