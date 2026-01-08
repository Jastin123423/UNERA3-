import React, { useState, useEffect, useMemo } from 'react';
import { Login, Register } from './components/Auth';
import { Header, Sidebar, RightSidebar, MenuOverlay } from './components/Layout';
import { CreatePost, Post, CommentsSheet, ShareSheet, PostEditorModal, SuggestedPeopleWidget, SuggestedGroupsWidget, SuggestedProductsWidget, SuggestedBrandsWidget } from './components/Feed';
import { StoryReel, StoryViewer, CreateStoryModal } from './components/Story';
import { UserProfile } from './components/UserProfile';
import { MarketplacePage, ProductDetailModal, CreateProductModal } from './components/Marketplace';
import { ReelsFeed, CreateReel } from './components/Reels';
import { ChatWindow } from './components/Chat';
import { ImageViewer, Spinner } from './components/Common';
import { BirthdaysPage, SuggestedProfilesPage, SettingsPage, MemoriesPage } from './components/MenuPages';
import { CreateEventModal, EventsPage } from './components/Events';
import { GroupsPage, CreateGroupModal } from './components/Groups';
import { BrandsPage, CreateBrandModal } from './components/Brands';
import { MusicSystem, GlobalAudioPlayer } from './components/MusicSystem'; 
import { ToolsPage } from './components/Tools';
import { HelpSupportPage } from './components/HelpSupport';
import { PrivacyPolicyPage } from './components/PrivacyPolicy';
import { TermsOfServicePage } from './components/TermsOfService';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, CommentReply, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Song, Episode, Brand } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, MOCK_SONGS, MOCK_EPISODES, INITIAL_BRANDS, INITIAL_PRODUCTS } from './constants';
import { rankFeed } from './utils/ranking'; 
import { api } from './services/api';

// Moved these functions outside the component to avoid duplication
const setSession = (user: User) => {
    const expires = new Date(Date.now() + 30 * 864e5).toUTCString();
    document.cookie = 'unera_user=' + encodeURIComponent(JSON.stringify(user)) + '; expires=' + expires + '; path=/';
    try { localStorage.setItem('unera_user', JSON.stringify(user)); } catch (e) {}
};

const getSession = (): User | null => {
    try { const local = localStorage.getItem('unera_user'); if (local) return JSON.parse(local); } catch (e) {}
    const cookie = document.cookie.split('; ').reduce((r, v) => { const parts = v.split('='); return parts[0] === 'unera_user' ? decodeURIComponent(parts[1]) : r; }, '');
    if (cookie) { try { return JSON.parse(cookie); } catch (e) {} }
    return null;
};

const clearSession = () => {
    document.cookie = 'unera_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    try { localStorage.removeItem('unera_user'); } catch (e) {}
};

const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

// Create a function to convert products to feed posts
const createProductPosts = (products: Product[], users: User[]): PostType[] => {
    return products.map(product => {
        const seller = users.find(u => u.id === product.sellerId);
        return {
            id: product.id + 1000000, // Offset to avoid ID collisions
            authorId: product.sellerId,
            content: `📦 ${product.sellerName} listed a new item for sale: ${product.title}`,
            image: product.images[0],
            timestamp: getTimeAgo(product.date),
            createdAt: product.date,
            reactions: product.ratings?.map(r => ({ userId: r.userId, type: r.rating >= 4 ? 'love' : r.rating >= 3 ? 'like' : 'wow' as ReactionType })) || [],
            comments: product.comments?.map(c => ({
                id: c.id,
                userId: c.userId,
                text: c.text,
                timestamp: getTimeAgo(c.timestamp),
                likes: c.likes || 0,
                replies: [] as CommentReply[]
            })) || [],
            shares: 0,
            type: 'product',
            visibility: 'Public' as const,
            productId: product.id,
            price: product.mainPrice,
            location: product.address,
            productCategory: product.category
        };
    });
};

export default function App() {
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [posts, setPosts] = useState<PostType[]>(INITIAL_POSTS);
    const [stories, setStories] = useState<Story[]>(INITIAL_STORIES.map(s => ({...s, createdAt: Date.now(), type: s.type || 'image'}))); 
    const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
    const [songs, setSongs] = useState<Song[]>(MOCK_SONGS);
    const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
    
    const [currentUser, setCurrentUser] = useState<User | null>(getSession());
    const [showRegister, setShowRegister] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [activeTab, setActiveTab] = useState('home'); 
    const [view, setView] = useState('home'); 
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    const [postEditorState, setPostEditorState] = useState<PostType | 'create' | null>(null);
    const [showCreateReelModal, setShowCreateReelModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showCreateStory, setShowCreateStory] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeSharePostId, setActiveSharePostId] = useState<number | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [showCreateProductModal, setShowCreateProductModal] = useState(false);
    
    useEffect(() => {
        if (currentUser) {
            api.getNotifications(currentUser.id).then((nots) => { if(Array.isArray(nots)) setNotifications(nots); });
        }
        setIsLoading(false);
    }, [currentUser]);

    const enrichedStories = useMemo(() => stories.map(story => story.user ? story : { ...story, user: users.find(u => u.id === story.userId) }), [stories, users]);

    const rankedPosts = useMemo(() => {
        // Create product posts for feed
        const productPosts = createProductPosts(products, users);
        
        // Combine all types of posts
        const brandIds = new Set(brands.map(b => b.id));
        const brandOwnedPosts = posts.filter(p => brandIds.has(p.authorId) || p.brandId);
        const standardPosts = rankFeed(posts.filter(p => !brandIds.has(p.authorId) && !p.brandId), currentUser, users);
        
        const groupPosts = groups.filter(g => g.type === 'public' || (currentUser && g.members.includes(currentUser.id))).flatMap(group => group.posts.map(gp => ({ 
            id: gp.id, 
            authorId: gp.authorId, 
            content: gp.content, 
            image: gp.image, 
            video: gp.video, 
            timestamp: getTimeAgo(gp.timestamp), 
            createdAt: gp.timestamp, 
            reactions: gp.reactions || [], 
            comments: gp.comments || [], 
            shares: gp.shares || 0, 
            type: gp.video ? 'video' : (gp.image ? 'image' : 'text'), 
            visibility: 'Public', 
            background: gp.background, 
            groupId: group.id, 
            groupName: group.name, 
            isGroupAdmin: group.adminId === gp.authorId 
        } as PostType)));
        
        // Merge all posts and sort by date
        const merged = [...brandOwnedPosts, ...standardPosts, ...groupPosts, ...productPosts]
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        return merged;
    }, [posts, groups, products, currentUser, users, brands]);

    const handleLogin = async (email: string, pass: string) => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            setCurrentUser(user);
            setSession(user);
            setShowLogin(false);
            setLoginError('');
        } else {
            setLoginError('Invalid email or password');
        }
    };

    const handleCreatePost = (text: string, file: File | null, type: string, visibility: string, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: LinkPreview, wantsMessages?: boolean) => {
        if (!currentUser) return;
        const newPost: PostType = {
          id: Date.now(),
          authorId: currentUser.id,
          content: text,
          image: file && !file.type.startsWith('video') ? URL.createObjectURL(file) : undefined,
          video: file && file.type.startsWith('video') ? URL.createObjectURL(file) : undefined,
          timestamp: 'Just now',
          createdAt: Date.now(),
          reactions: [],
          comments: [],
          shares: 0,
          type: file ? (file.type.startsWith('video') ? 'video' : 'image') : (background ? 'text' : type as any),
          visibility: visibility as 'Public' | 'Friends',
          location,
          feeling,
          taggedUsers,
          background,
          linkPreview,
          wantsMessages,
        };
        setPosts(prev => [newPost, ...prev]);
        setPostEditorState(null);
    };

    const handlePostAsBrand = (
        brandId: number, 
        text: string, 
        file: File | null, 
        type: string, 
        visibility: string, 
        location?: string, 
        feeling?: string, 
        taggedUsers?: number[], 
        background?: string, 
        linkPreview?: LinkPreview, 
        wantsMessages?: boolean
    ) => {
        const brand = brands.find(b => b.id === brandId);
        if (!brand || !currentUser) return;
        
        // Check if current user is the brand admin
        if (brand.adminId !== currentUser.id) {
            alert('Only brand admins can post as the brand');
            return;
        }
        
        const newPost: PostType = {
            id: Date.now(),
            authorId: brandId, // CRITICAL: Set authorId to brand ID
            content: text,
            image: file && !file.type.startsWith('video') ? URL.createObjectURL(file) : undefined,
            video: file && file.type.startsWith('video') ? URL.createObjectURL(file) : undefined,
            timestamp: 'Just now',
            createdAt: Date.now(),
            reactions: [],
            comments: [],
            shares: 0,
            type: file ? (file.type.startsWith('video') ? 'video' : 'image') : (background ? 'text' : type as any),
            visibility: visibility as 'Public' | 'Friends',
            location,
            feeling,
            taggedUsers,
            background,
            linkPreview,
            wantsMessages,
            brandId: brandId,
            brandName: brand.name,
        };
        
        console.log('Creating brand post:', newPost);
        setPosts(prev => [newPost, ...prev]);
    };

    const handleUpdatePost = (updatedData: Partial<PostType> & { id: number, newFile?: File | null, imageKept: boolean }) => {
        setPosts(prevPosts => prevPosts.map(p => {
            if (p.id === updatedData.id) {
                const updatedPost = { ...p, ...updatedData };
                
                if (updatedData.newFile) {
                    const objectURL = URL.createObjectURL(updatedData.newFile);
                    if (updatedData.newFile.type.startsWith('video')) {
                        updatedPost.video = objectURL;
                        updatedPost.image = undefined;
                        updatedPost.type = 'video';
                    } else {
                        updatedPost.image = objectURL;
                        updatedPost.video = undefined;
                        updatedPost.type = 'image';
                    }
                } else if (!updatedData.imageKept) {
                    updatedPost.image = undefined;
                    updatedPost.video = undefined;
                    if (updatedPost.type === 'image' || updatedPost.type === 'video') {
                        updatedPost.type = 'text';
                    }
                }
                return updatedPost;
            }
            return p;
        }));
        setPostEditorState(null);
    };

    const handleReact = (postId: number, type: ReactionType) => {
        if (!currentUser) { setShowLogin(true); return; }
        
        // Check if it's a product post
        const productPost = rankedPosts.find(p => p.id === postId && p.type === 'product');
        if (productPost && productPost.productId) {
            // Handle product reaction (rating)
            const product = products.find(p => p.id === productPost.productId);
            if (product) {
                const ratingValue = type === 'love' ? 5 : type === 'like' ? 4 : type === 'wow' ? 3 : 2;
                const newRating = {
                    userId: currentUser.id,
                    rating: ratingValue,
                    comment: '',
                    timestamp: Date.now()
                };
                
                setProducts(prev => prev.map(p => 
                    p.id === product.id 
                        ? { 
                            ...p, 
                            ratings: [...(p.ratings || []), newRating] 
                          } 
                        : p
                ));
            }
            return;
        }
        
        const isGroupPost = groups.some(g => g.posts.some(p => p.id === postId));
        if (isGroupPost) {
            const group = groups.find(g => g.posts.some(p => p.id === postId));
            if (group) handleLikeGroupPost(group.id, postId);
            return;
        }

        setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: p.reactions.some(r => r.userId === currentUser.id) ? p.reactions.map(r => r.userId === currentUser.id ? { ...r, type } : r) : [...p.reactions, { userId: currentUser.id, type }] } : p));
    };

    const handleFollow = async (id: number) => {
        if(!currentUser) { setShowLogin(true); return; }
        const isAlreadyFollowing = currentUser.following.includes(id);
        const updatedUser = { ...currentUser, following: isAlreadyFollowing ? currentUser.following.filter(uid => uid !== id) : [...currentUser.following, id] };
        setCurrentUser(updatedUser); setSession(updatedUser);
        setUsers(prev => prev.map(u => u.id === id ? { ...u, followers: !isAlreadyFollowing ? [...u.followers, currentUser.id] : u.followers.filter(fid => fid !== currentUser.id) } : u));
    };

    const handleFollowBrand = async (id: number) => {
        if(!currentUser) { setShowLogin(true); return; }
        const isAlreadyFollowing = currentUser.following.includes(id);
        const updatedUser = { ...currentUser, following: isAlreadyFollowing ? currentUser.following.filter(uid => uid !== id) : [...currentUser.following, id] };
        setCurrentUser(updatedUser); setSession(updatedUser);
        setBrands(prev => prev.map(b => b.id === id ? { ...b, followers: !isAlreadyFollowing ? [...b.followers, currentUser.id] : b.followers.filter(fid => fid !== currentUser.id) } : b));
    };

    const handleJoinGroup = (groupId: string) => {
        if (!currentUser) { setShowLogin(true); return; }
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                if (g.members.includes(currentUser.id)) return g;
                return { ...g, members: [...g.members, currentUser.id] };
            }
            return g;
        }));
    };

    const handlePostToGroup = (groupId: string, content: string, file: File | null, type: 'image' | 'video' | 'doc' | 'text', background?: string) => {
        if (!currentUser) return;
        const mediaUrl = file ? URL.createObjectURL(file) : undefined;
        const newPost: GroupPost = {
            id: Date.now(),
            authorId: currentUser.id,
            content,
            image: type === 'image' ? mediaUrl : undefined,
            video: type === 'video' ? mediaUrl : undefined,
            timestamp: Date.now(),
            likes: [],
            reactions: [],
            comments: [],
            shares: 0,
            background
        };
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, posts: [newPost, ...g.posts] } : g));
    };

    const handleLikeGroupPost = (groupId: string, postId: number) => {
        if (!currentUser) { setShowLogin(true); return; }
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    posts: g.posts.map(p => {
                        if (p.id === postId) {
                            const hasLiked = p.reactions?.some(r => r.userId === currentUser.id);
                            const updatedReactions = hasLiked 
                                ? p.reactions?.filter(r => r.userId !== currentUser.id) 
                                : [...(p.reactions || []), { userId: currentUser.id, type: 'like' as ReactionType }];
                            return { ...p, reactions: updatedReactions };
                        }
                        return p;
                    })
                };
            }
            return g;
        }));
    };

    const handleToggleEventInterest = (eventId: number) => {
        if (!currentUser) { setShowLogin(true); return; }
        const toggle = (list: number[]) => list.includes(currentUser.id) ? list.filter(id => id !== currentUser.id) : [...list, currentUser.id];
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, interestedIds: toggle(e.interestedIds) } : e));
        setPosts(prev => prev.map(p => (p.type === 'event' && p.event?.id === eventId) ? { ...p, event: { ...p.event, interestedIds: toggle(p.event.interestedIds) } } : p));
    };

    const handleCreateStory = (storyData: Partial<Story>) => {
        if (!currentUser) return;
        const newStory: Story = {
            id: Date.now(),
            ...storyData as any,
            userId: currentUser.id,
            createdAt: Date.now(),
            user: currentUser,
            reactions: [],
            replies: []
        };
        setStories([newStory, ...stories]);
        setShowCreateStory(false);
    };

    const handleCreateGroup = (groupData: Partial<Group>) => {
        if (!currentUser) return;
        const newGroup: Group = {
            id: `g${Date.now()}`,
            name: groupData.name || 'Untitled Group',
            description: groupData.description || '',
            type: groupData.type || 'public',
            image: groupData.image || `https://ui-avatars.com/api/?name=${groupData.name}&background=random`,
            coverImage: groupData.coverImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
            adminId: currentUser.id,
            members: [currentUser.id],
            posts: [],
            createdDate: Date.now(),
            memberPostingAllowed: true
        };
        setGroups([newGroup, ...groups]);
        setView('groups');
        setSelectedGroupId(newGroup.id);
    };

    const handleCreateBrand = (brandData: Partial<Brand>) => {
        if (!currentUser) return;
        const newBrand: Brand = {
            id: Date.now(),
            name: brandData.name || 'Untitled Page',
            description: brandData.description || '',
            category: brandData.category || 'Community',
            profileImage: brandData.profileImage || `https://ui-avatars.com/api/?name=${brandData.name}&background=random`,
            coverImage: brandData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926',
            adminId: currentUser.id,
            followers: [],
            isVerified: false,
            joinedDate: new Date().toISOString().split('T')[0],
            website: brandData.website,
            location: brandData.location,
            contactEmail: brandData.contactEmail,
            contactPhone: brandData.contactPhone
        };
        setBrands([newBrand, ...brands]);
        setView('brands');
    };

    const handleCreateEvent = (eventData: Partial<Event>) => {
        if (!currentUser) return;
        const newEvent: Event = {
            id: Date.now(),
            organizerId: currentUser.id,
            title: eventData.title || 'Untitled Event',
            description: eventData.description || '',
            date: eventData.date || new Date().toISOString(),
            time: eventData.time || '12:00',
            location: eventData.location || 'Online',
            image: eventData.image || 'https://images.unsplash.com/photo-1540575467063-178a50935278',
            attendees: [currentUser.id],
            interestedIds: []
        };
        setEvents([newEvent, ...events]);
        
        const eventPost: PostType = {
            id: Date.now() + 1,
            authorId: currentUser.id,
            content: `is hosting a new event: ${newEvent.title}!`,
            type: 'event',
            event: newEvent,
            eventId: newEvent.id,
            timestamp: 'Just now',
            createdAt: Date.now(),
            reactions: [],
            comments: [],
            shares: 0,
            visibility: 'Public'
        };
        setPosts([eventPost, ...posts]);
    };

    const handleCreateGroupEvent = (groupId: string, eventData: Partial<Event>) => {
        if (!currentUser) return;
        const newEvent: Event = {
            id: Date.now(),
            organizerId: currentUser.id,
            title: eventData.title || 'Untitled Event',
            description: eventData.description || '',
            date: eventData.date || new Date().toISOString(),
            time: eventData.time || '12:00',
            location: eventData.location || 'Online',
            image: eventData.image || 'https://images.unsplash.com/photo-1540575467063-178a50935278',
            attendees: [currentUser.id],
            interestedIds: []
        };
        setEvents([newEvent, ...events]);
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, events: [newEvent, ...(g.events || [])] } : g));
        
        const group = groups.find(g => g.id === groupId);
        const eventPost: PostType = {
            id: Date.now() + 1,
            authorId: currentUser.id,
            content: `is hosting a new event in ${group?.name || 'Group'}: ${newEvent.title}!`,
            type: 'event',
            event: newEvent,
            eventId: newEvent.id,
            timestamp: 'Just now',
            createdAt: Date.now(),
            reactions: [],
            comments: [],
            shares: 0,
            visibility: 'Public',
            groupId: groupId,
            groupName: group?.name
        };
        setPosts([eventPost, ...posts]);
    };

    const handleNextStory = () => {
        if (!activeStory) return;
        const userStories = enrichedStories.filter(s => s.userId === activeStory.userId);
        const idx = userStories.findIndex(s => s.id === activeStory.id);
        if (idx < userStories.length - 1) {
            setActiveStory(userStories[idx + 1]);
        } else {
            const uniqueUsers = Array.from(new Set(enrichedStories.map(s => s.userId)));
            const userIdx = uniqueUsers.indexOf(activeStory.userId);
            if (userIdx < uniqueUsers.length - 1) {
                const nextUserStories = enrichedStories.filter(s => s.userId === uniqueUsers[userIdx + 1]);
                setActiveStory(nextUserStories[0]);
            } else {
                setActiveStory(null);
            }
        }
    };

    const handlePrevStory = () => {
        if (!activeStory) return;
        const userStories = enrichedStories.filter(s => s.userId === activeStory.userId);
        const idx = userStories.findIndex(s => s.id === activeStory.id);
        if (idx > 0) {
            setActiveStory(userStories[idx - 1]);
        } else {
            const uniqueUsers = Array.from(new Set(enrichedStories.map(s => s.userId)));
            const userIdx = uniqueUsers.indexOf(activeStory.userId);
            if (userIdx > 0) {
                const prevUserStories = enrichedStories.filter(s => s.userId === uniqueUsers[userIdx - 1]);
                setActiveStory(prevUserStories[prevUserStories.length - 1]);
            }
        }
    };

    const handleStoryReaction = (storyId: number) => {
        if (!currentUser) return;
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const existing = s.reactions?.find(r => r.userId === currentUser.id);
                if (existing) {
                    return { ...s, reactions: s.reactions?.filter(r => r.userId !== currentUser.id) };
                } else {
                    return { ...s, reactions: [...(s.reactions || []), { userId: currentUser.id, type: 'love' as ReactionType }] };
                }
            }
            return s;
        }));
    };

    const handleStoryReply = (storyId: number, text: string) => {
        if (!currentUser) return;
        setStories(prev => prev.map(s => {
            if (s.id === storyId) {
                const newComment = { id: Date.now(), userId: currentUser.id, text, timestamp: 'Just now', likes: 0 };
                return { ...s, replies: [...(s.replies || []), newComment as Comment] };
            }
            return s;
        }));
    };

    const handleCreateProduct = (product: Product) => {
        setProducts(prev => [product, ...prev]);
        setShowCreateProductModal(false);
    };

    // Create author object for posts
    const getPostAuthor = (post: PostType) => {
        // Check if this is a brand post
        if (brands.some(b => b.id === post.authorId) || post.brandId) {
            const brandId = post.brandId || post.authorId;
            const brand = brands.find(b => b.id === brandId);
            if (brand) {
                return {
                    id: brand.id,
                    name: brand.name,
                    profileImage: brand.profileImage,
                    isVerified: brand.isVerified,
                    isBrand: true,
                    followers: brand.followers,
                    following: [],
                    email: '',
                    password: '',
                    bio: brand.description || '',
                    coverImage: brand.coverImage,
                    joinedDate: brand.joinedDate,
                    location: brand.location,
                    website: brand.website,
                    posts: []
                };
            }
        }
        
        // For product posts
        if (post.type === 'product') {
            const product = products.find(p => p.id === post.productId);
            if (product) {
                const seller = users.find(u => u.id === product.sellerId);
                if (seller) {
                    return {
                        ...seller,
                        isBrand: false
                    };
                }
            }
        }
        
        // For regular user posts
        const user = users.find(u => u.id === post.authorId);
        if (user) {
            return {
                ...user,
                isBrand: false
            };
        }
        
        // Return a fallback if no author found
        return {
            id: post.authorId,
            name: 'Unknown User',
            profileImage: 'https://ui-avatars.com/api/?name=Unknown&background=random',
            isBrand: false,
            followers: [],
            following: [],
            email: '',
            password: '',
            bio: '',
            coverImage: '',
            joinedDate: '',
            location: '',
            website: '',
            posts: []
        };
    };

    // Handle product view from feed
    const handleViewProductFromFeed = (post: PostType) => {
        if (post.type === 'product' && post.productId) {
            const product = products.find(p => p.id === post.productId);
            if (product) {
                setActiveProduct(product);
            }
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="bg-[#18191A] min-h-screen text-[#E4E6EB] font-sans">
            <Header 
                onHomeClick={() => { setView('home'); setActiveTab('home'); setSelectedGroupId(null); }} 
                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                onReelsClick={() => { setView('reels'); setActiveTab('reels'); }} 
                onMarketplaceClick={() => { setView('marketplace'); setActiveTab('marketplace'); }} 
                onGroupsClick={() => { setView('groups'); setActiveTab('groups'); setSelectedGroupId(null); }} 
                onEventsClick={() => { setView('events'); setActiveTab('events'); }}
                currentUser={currentUser} 
                notifications={notifications} 
                users={users} 
                groups={groups} 
                brands={brands} 
                onLogout={() => { setCurrentUser(null); clearSession(); }} 
                onLoginClick={() => setShowLogin(true)} 
                onMarkNotificationsRead={() => {}} 
                activeTab={activeTab} 
                onNavigate={setView} 
                onSellClick={() => {
                    if (currentUser) {
                        setShowCreateProductModal(true);
                    } else {
                        setShowLogin(true);
                    }
                }}
            />
            <div className="flex justify-center">
                <Sidebar 
                    currentUser={currentUser || INITIAL_USERS[0]} 
                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                    onReelsClick={() => { setView('reels'); setActiveTab('reels'); }} 
                    onMarketplaceClick={() => { setView('marketplace'); setActiveTab('marketplace'); }} 
                    onGroupsClick={() => { setView('groups'); setActiveTab('groups'); setSelectedGroupId(null); }} 
                    onEventsClick={() => { setView('events'); setActiveTab('events'); }}
                    onCreateSellClick={() => {
                        if (currentUser) {
                            setShowCreateProductModal(true);
                        } else {
                            setShowLogin(true);
                        }
                    }}
                />
                <div className="flex-1 w-full max-w-[700px] min-h-screen relative">
                    {view === 'home' && (
                        <div className="w-full pb-20 pt-4 px-0 md:px-4">
                            <StoryReel stories={enrichedStories} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateStory={() => setShowCreateStory(true)} onViewStory={setActiveStory} currentUser={currentUser} onRequestLogin={() => setShowLogin(true)} />
                            {currentUser && <CreatePost currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onClick={() => setPostEditorState('create')} onCreateEventClick={() => setShowCreateEventModal(true)} onCreateSellClick={() => setShowCreateProductModal(true)} />}
                            
                            {rankedPosts.map((post, index) => {
                                const author = getPostAuthor(post);
                                
                                return (
                                    <React.Fragment key={post.id}>
                                        <Post 
                                            post={post} 
                                            author={author} 
                                            currentUser={currentUser} 
                                            users={users} 
                                            onProfileClick={(id) => { 
                                                // If it's a brand post, navigate to brand page
                                                if (author.isBrand) {
                                                    setView('brands');
                                                    // You might want to set a selected brand ID here
                                                } else {
                                                    setSelectedUserId(id); 
                                                    setView('profile'); 
                                                }
                                            }} 
                                            onReact={handleReact} 
                                            onShare={(id) => setActiveSharePostId(id)} 
                                            onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} 
                                            onEdit={setPostEditorState} 
                                            onViewImage={setFullScreenImage} 
                                            onOpenComments={setActiveCommentsPostId} 
                                            onVideoClick={() => {}} 
                                            onViewProduct={post.type === 'product' ? () => handleViewProductFromFeed(post) : setActiveProduct} 
                                            onFollow={author.isBrand ? handleFollowBrand : handleFollow} 
                                            isFollowing={currentUser?.following.includes(author.id)} 
                                            onPlayAudio={() => {}} 
                                            sharedPost={(post as any).embeddedSharedPost} 
                                            onMessage={(uid) => { if(!currentUser) setShowLogin(true); else setActiveChatUser(users.find(u => u.id === uid) || null); }} 
                                            onJoinEvent={handleToggleEventInterest} 
                                            onGroupClick={(gid) => { setSelectedGroupId(gid); setView('groups'); }} 
                                        />
                                        
                                        {index === 2 && <SuggestedPeopleWidget users={users} currentUser={currentUser} onFollow={handleFollow} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                                        {index === 5 && <SuggestedGroupsWidget groups={groups} currentUser={currentUser} onJoin={handleJoinGroup} />}
                                        {index === 8 && <SuggestedProductsWidget products={products} onViewProduct={setActiveProduct} />}
                                        {index === 11 && <SuggestedBrandsWidget brands={brands} currentUser={currentUser} onFollowBrand={handleFollowBrand} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                    
                    {view === 'profile' && selectedUserId && (
                        <UserProfile 
                            user={users.find(u => u.id === selectedUserId)!} 
                            currentUser={currentUser} 
                            users={users} 
                            groups={groups} 
                            brands={brands} 
                            posts={posts} 
                            reels={reels} 
                            songs={songs} 
                            episodes={episodes} 
                            onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                            onFollow={handleFollow} 
                            onReact={handleReact} 
                            onComment={() => {}} 
                            onShare={setActiveSharePostId} 
                            onMessage={(id) => { if(!currentUser) setShowLogin(true); else setActiveChatUser(users.find(u => u.id === id) || null); }} 
                            onCreatePost={() => {}} 
                            onUpdateProfileImage={() => {}} 
                            onUpdateCoverImage={() => {}} 
                            onUpdateUserDetails={() => {}} 
                            onDeletePost={() => {}} 
                            onEditPost={setPostEditorState} 
                            getCommentAuthor={(id) => users.find(u => u.id === id)} 
                            onViewImage={setFullScreenImage} 
                            onCreateEventClick={() => { if(!currentUser) setShowLogin(true); else setShowCreateEventModal(true); }} 
                            onCreateStoryClick={() => { if(!currentUser) setShowLogin(true); else setShowCreateStory(true); }} 
                            onOpenComments={setActiveCommentsPostId} 
                            onVideoClick={() => {}} 
                            onPlayAudio={() => {}} 
                            onViewProduct={setActiveProduct} 
                            onJoinEvent={handleToggleEventInterest} 
                        />
                    )}
                    
                    {view === 'marketplace' && <MarketplacePage currentUser={currentUser} products={products} onNavigateHome={() => setView('home')} onCreateProduct={handleCreateProduct} onViewProduct={setActiveProduct} />}
                    
                    {view === 'reels' && <ReelsFeed reels={reels} users={users} currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateReelClick={() => setShowCreateReelModal(true)} onReact={() => {}} onComment={() => {}} onShare={() => {}} onFollow={handleFollow} getCommentAuthor={(id) => users.find(u => u.id === id)} initialReelId={activeReelId} />}
                    
                    {view === 'groups' && (
                        <GroupsPage 
                            currentUser={currentUser} 
                            groups={groups} 
                            users={users} 
                            onCreateGroup={handleCreateGroup} 
                            onJoinGroup={handleJoinGroup} 
                            onLeaveGroup={() => {}} 
                            onDeleteGroup={(id) => setGroups(groups.filter(g => g.id !== id))} 
                            onUpdateGroupImage={() => {}} 
                            onPostToGroup={handlePostToGroup} 
                            onCreateGroupEvent={handleCreateGroupEvent} 
                            onInviteToGroup={() => {}} 
                            onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                            onLikePost={handleLikeGroupPost} 
                            onOpenComments={(_, pid) => setActiveCommentsPostId(pid)} 
                            onSharePost={(_, pid) => setActiveSharePostId(pid)} 
                            onDeleteGroupPost={() => {}} 
                            onRemoveMember={() => {}} 
                            onUpdateGroupSettings={() => {}} 
                            initialGroupId={selectedGroupId} 
                        />
                    )}
                    
                    {view === 'brands' && (
                        <BrandsPage 
                            currentUser={currentUser} 
                            brands={brands} 
                            posts={posts.filter(p => brands.some(b => b.id === p.authorId) || p.brandId)} 
                            users={users} 
                            onCreateBrand={handleCreateBrand} 
                            onFollowBrand={handleFollowBrand} 
                            onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                            onPostAsBrand={handlePostAsBrand}
                            onReact={handleReact} 
                            onShare={setActiveSharePostId} 
                            onOpenComments={setActiveCommentsPostId} 
                            onUpdateBrand={() => {}} 
                            onMessage={() => {}} 
                            onCreateEvent={handleCreateEvent}
                            initialBrandId={selectedBrandId}
                        />
                    )}
                    
                    {view === 'events' && (
                        <EventsPage 
                            events={events} 
                            currentUser={currentUser} 
                            onJoinEvent={handleToggleEventInterest} 
                            onCreateEventClick={() => setShowCreateEventModal(true)} 
                        />
                    )}
                    
                    {view === 'music' && <MusicSystem currentUser={currentUser} songs={songs} episodes={episodes} onUpdateSongs={setSongs} onUpdateEpisodes={setEpisodes} onPlayTrack={() => {}} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} onFeedPost={(p) => setPosts([p, ...posts])} />}
                    
                    {view === 'tools' && <ToolsPage />}
                    
                    {view === 'help' && <HelpSupportPage onNavigateHome={() => setView('home')} />}
                    
                    {view === 'privacy' && <PrivacyPolicyPage onNavigateHome={() => setView('home')} />}
                    
                    {view === 'terms' && <TermsOfServicePage onNavigateHome={() => setView('home')} />}
                    
                    {view === 'birthdays' && currentUser && <BirthdaysPage currentUser={currentUser} users={users} onMessage={(id) => setActiveChatUser(users.find(u => u.id === id) || null)} />}
                    
                    {view === 'memories' && currentUser && <MemoriesPage currentUser={currentUser} posts={posts} users={users} />}
                    
                    {view === 'profiles' && <SuggestedProfilesPage currentUser={currentUser} users={users} groups={groups} products={products} events={events} onFollow={handleFollow} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onJoinGroup={handleJoinGroup} onJoinEvent={handleToggleEventInterest} onViewProduct={setActiveProduct} />}
                </div>
                <RightSidebar contacts={users.filter(u => currentUser && currentUser.following.includes(u.id))} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />
            </div>
            
            {/* Modals and Overlays */}
            {showLogin && <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowLogin(false); setShowRegister(true); }} onClose={() => setShowLogin(false)} error={loginError} />}
            {showRegister && <Register onRegister={() => setShowRegister(false)} onBackToLogin={() => { setShowRegister(false); setShowLogin(true); }} />}
            
            {activeStory && <StoryViewer story={activeStory} user={enrichedStories.find(s => s.id === activeStory.id)?.user!} currentUser={currentUser} onClose={() => setActiveStory(null)} allStories={enrichedStories} onNext={handleNextStory} onPrev={handlePrevStory} onLike={() => handleStoryReaction(activeStory.id)} onReply={(text) => handleStoryReply(activeStory.id, text)} onFollow={handleFollow} isFollowing={currentUser?.following.includes(activeStory.userId)} />}
            
            {currentUser && postEditorState && <PostEditorModal currentUser={currentUser} users={users} onClose={() => setPostEditorState(null)} onCreatePost={handleCreatePost} onUpdatePost={handleUpdatePost} onCreateEventClick={() => { setPostEditorState(null); setShowCreateEventModal(true); }} postToEdit={typeof postEditorState === 'object' ? postEditorState : undefined} />}
            
            {showCreateReelModal && currentUser && <CreateReel currentUser={currentUser} onClose={() => setShowCreateReelModal(false)} onSubmit={() => {}} />}
            
            {showCreateEventModal && currentUser && <CreateEventModal currentUser={currentUser} onClose={() => setShowCreateEventModal(false)} onCreate={handleCreateEvent} />}
            
            {showCreateStory && currentUser && <CreateStoryModal currentUser={currentUser} onClose={() => setShowCreateStory(false)} onCreate={handleCreateStory} />}
            
            {showCreateGroupModal && currentUser && <CreateGroupModal currentUser={currentUser} onClose={() => setShowCreateGroupModal(false)} onCreate={handleCreateGroup} />}
            
            {showCreateBrandModal && currentUser && <CreateBrandModal currentUser={currentUser} onClose={() => setShowCreateBrandModal(false)} onCreate={handleCreateBrand} />}
            
            {showCreateProductModal && currentUser && (
                <CreateProductModal 
                    currentUser={currentUser}
                    onClose={() => setShowCreateProductModal(false)}
                    onCreate={handleCreateProduct}
                />
            )}
            
            {activeCommentsPostId && <CommentsSheet post={rankedPosts.find(p => p.id === activeCommentsPostId)!} currentUser={currentUser} users={users} brands={brands} onClose={() => setActiveCommentsPostId(null)} onComment={() => {}} onLikeComment={() => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveCommentsPostId(null); }} />}
            
            {activeSharePostId && <ShareSheet post={rankedPosts.find(p => p.id === activeSharePostId)!} groups={groups.filter(g => currentUser && g.members.includes(currentUser.id))} onClose={() => setActiveSharePostId(null)} onShareNow={() => {}} onShareToGroup={() => {}} onCopyLink={() => {}} />}
            
            {activeChatUser && currentUser && <ChatWindow currentUser={currentUser} recipient={activeChatUser} messages={messages.filter(m => (m.senderId === currentUser.id && m.receiverId === activeChatUser.id) || (m.senderId === activeChatUser.id && m.receiverId === currentUser.id))} onClose={() => setActiveChatUser(null)} onSendMessage={(text, sticker) => setMessages([...messages, { id: Date.now(), senderId: currentUser.id, receiverId: activeChatUser.id, text: sticker ? '' : text, stickerUrl: sticker, timestamp: Date.now() }])} />}
            
            {fullScreenImage && <ImageViewer image={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
            
            {activeProduct && <ProductDetailModal product={activeProduct} currentUser={currentUser} onClose={() => setActiveProduct(null)} onMessage={(id) => { if(!currentUser) setShowLogin(true); else { setActiveChatUser(users.find(u => u.id === id) || null); setActiveProduct(null); } }} />}
            
            {currentAudioTrack && <GlobalAudioPlayer currentTrack={currentAudioTrack} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} onNext={() => {}} onPrevious={() => {}} onClose={() => {}} onDownload={() => {}} onLike={() => {}} isLiked={false} uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)} />}
        </div>
    );
}
