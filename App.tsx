// App.tsx - Fixed Version with Complete API Integration
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
import MusicSystem from './components/MusicSystem';
import { GroupsPage } from './components/Groups';
import { ToolsPage } from './components/Tools';
import { PrivacyPolicyPage } from './components/PrivacyPolicy';
import { TermsOfServicePage } from './components/TermsOfService';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Message, Event, Product, Comment, ReactionType, LinkPreview, Group, GroupPost, AudioTrack, Brand, Song, Episode } from './types';
import { INITIAL_USERS, INITIAL_POSTS, INITIAL_STORIES, INITIAL_REELS, INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_BRANDS, MOCK_SONGS, MOCK_EPISODES } from './constants';
import { rankFeed } from './utils/ranking'; 

// ========== ERROR BOUNDARY ==========
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary Caught:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#18191A] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl text-white mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                className="bg-[#1877F2] text-white px-4 py-2 rounded hover:bg-[#166FE5] transition"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button 
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ========== API BASE URL ==========
const API_BASE_URL = 'https://unera.social';

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
    if (path === '/help') return { view: 'help_support' };
    if (path === '/settings') return { view: 'settings' };
    if (path === '/privacy') return { view: 'privacy_policy' };
    if (path === '/terms') return { view: 'terms_of_service' };
    
    return { view: 'home' };
};

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

// ========== CRITICAL FIX: Safe Profile Image Helper ==========
const getSafeProfileImage = (user: User | Brand | null | undefined): string => {
  if (!user) return '/default-profile.png';
  
  // Check if it's a Brand
  if ('isVerified' in user && 'followers' in user) {
    return user.profileImage || '/default-brand.png';
  }
  
  // It's a User
  return user.profileImage || '/default-profile.png';
};

const getDefaultUser = (): User => ({
  id: 0,
  username: 'guest',
  name: 'Guest User',
  email: 'guest@example.com',
  profileImage: '/default-profile.png',
  coverImage: '/default-cover.jpg',
  bio: '',
  isVerified: false,
  followers: [],
  following: [],
  role: 'user',
  createdAt: Date.now(),
  posts: [],
  birthDate: undefined,
  isRestricted: false,
  restrictedUntil: undefined
});

// ========== API HELPER FUNCTIONS ==========
const getAuthToken = (): string | null => {
  return localStorage.getItem('unera_token');
};

const setAuthToken = (token: string): void => {
  localStorage.setItem('unera_token', token);
};

const clearAuthToken = (): void => {
  localStorage.removeItem('unera_token');
  localStorage.removeItem('uneraCurrentUser');
};

const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
};

// ========== UNERA API ENDPOINTS ==========
const UNERA_API = {
  // 1. Users API
  users: {
    signup: (data: { username: string; email: string; password: string }) =>
      apiRequest('/users/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    login: (data: { email: string; password: string }) =>
      apiRequest('/users/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getCurrentUser: () =>
      apiRequest('/users/me'),
    
    getUser: (userId: number) =>
      apiRequest(`/users/${userId}`),
    
    updateProfile: (data: Partial<{ username: string; bio: string; avatar_url: string }>) =>
      apiRequest('/users/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // 2. Posts API
  posts: {
    create: (data: { 
      user_id?: number;
      content: string; 
      media_url?: string;
      background?: string;
      feeling?: string;
      location?: string;
      tagged_users?: number[];
      type?: string;
      visibility?: string;
    }) =>
      apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: data.content,
          media_url: data.media_url,
          ...(data.user_id && { user_id: data.user_id })
        }),
      }),
    
    getAll: (params?: { 
      page?: number; 
      limit?: number; 
      user_id?: number;
      type?: string;
    }) => {
      const query = params ? new URLSearchParams(params as any).toString() : '';
      return apiRequest(`/posts${query ? `?${query}` : ''}`);
    },
    
    getById: (postId: number) =>
      apiRequest(`/posts/${postId}`),
    
    delete: (postId: number) =>
      apiRequest(`/posts/${postId}`, {
        method: 'DELETE',
      }),
  },

  // 3. Brands API
  brands: {
    getAll: () =>
      apiRequest('/brands_pages'),
    
    getById: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}`),
    
    create: (data: any) =>
      apiRequest('/brands_pages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (brandId: number, data: any) =>
      apiRequest(`/brands_pages/${brandId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}`, {
        method: 'DELETE',
      }),
    
    follow: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}/follow`, {
        method: 'POST',
      }),
    
    unfollow: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}/unfollow`, {
        method: 'POST',
      }),
    
    getPosts: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}/posts`),
    
    createPost: (brandId: number, data: any) =>
      apiRequest(`/brands_pages/${brandId}/posts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    verify: (brandId: number) =>
      apiRequest(`/brands_pages/${brandId}/verify`, {
        method: 'POST',
      }),
  },

  // 4. File Upload API
  upload: {
    getSignedUrl: async (file: File, type: string): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      return data.url;
    },
  },

  // 5. Comments API
  comments: {
    create: (data: { post_id: number; content: string }) =>
      apiRequest('/comments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 6. Likes API
  likes: {
    create: (data: { target_id: number; target_type: string }) =>
      apiRequest('/likes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    delete: (targetId: number, targetType: string) =>
      apiRequest(`/likes?target_id=${targetId}&target_type=${targetType}`, {
        method: 'DELETE',
      }),
  },

  // 7. Events API
  events: {
    create: (data: any) =>
      apiRequest('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 8. Messages API
  messages: {
    send: (data: { receiver_id: number; content: string }) =>
      apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 9. Groups API
  groups: {
    getAll: () =>
      apiRequest('/groups'),
  },

  // 10. Music API
  music: {
    getAll: () =>
      apiRequest('/music'),
  },

  // 11. Stories API
  stories: {
    getAll: () =>
      apiRequest('/stories'),
  },

  // 12. Products API
  products: {
    getAll: () =>
      apiRequest('/products'),
  },
};

// ========== CRITICAL FIX: Safe getAuthorForPost function ==========
const getAuthorForPost = (post: PostType, users: User[], brands: Brand[]) => {
  if (post.brandId) {
    const brand = brands.find(b => b.id === post.brandId);
    if (brand) {
      return {
        ...brand,
        type: 'brand' as const,
        name: brand.name,
        profileImage: getSafeProfileImage(brand),
        isVerified: brand.isVerified,
        id: brand.id,
        followers: brand.followers || []
      };
    }
  }
  
  const brandByAuthorId = brands.find(b => b.id === post.authorId);
  if (brandByAuthorId) {
    return {
      ...brandByAuthorId,
      type: 'brand' as const,
      name: brandByAuthorId.name,
      profileImage: getSafeProfileImage(brandByAuthorId),
      isVerified: brandByAuthorId.isVerified,
      id: brandByAuthorId.id,
      followers: brandByAuthorId.followers || []
    };
  }
  
  const user = users.find(u => u.id === post.authorId);
  if (user) {
    return {
      ...user,
      type: 'user' as const,
      profileImage: getSafeProfileImage(user)
    };
  }
  
  // Return a default user if none found
  return {
    ...getDefaultUser(),
    id: post.authorId || 0,
    type: 'user' as const
  };
};

const getSongForPost = (post: PostType, songs: Song[], episodes: Episode[]) => {
  if (!post.audioTrack) return null;
  
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

const notificationExists = (notifications: Notification[], userId: number, senderId: number, type: string, postId?: number): boolean => {
  const recentTime = Date.now() - 300000;
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

// ========== MAIN APP COMPONENT ==========
function App({ initialData, initialPath }: { initialData?: any, initialPath?: string }) {
  const { t } = useLanguage();

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // State with safe initialization
  const [users, setUsers] = useState<User[]>(() => {
    return (initialData?.users || INITIAL_USERS).map(user => ({
      ...user,
      profileImage: getSafeProfileImage(user)
    }));
  });
  
  const [posts, setPosts] = useState<PostType[]>(() => {
    const initialPosts = initialData?.posts || INITIAL_POSTS;
    return initialPosts.map(post => ({
      ...post,
      formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
    }));
  });
  
  const [stories, setStories] = useState<Story[]>(() => {
    return INITIAL_STORIES.map(s => ({
      ...s, 
      createdAt: Date.now(), 
      user: users.find((u: User) => u.id === s.userId) || getDefaultUser()
    }));
  }); 
  
  const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [brands, setBrands] = useState<Brand[]>(() => {
    return INITIAL_BRANDS.map(brand => ({
      ...brand,
      profileImage: getSafeProfileImage(brand)
    }));
  });
  
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
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const user = initialData?.currentUser || null;
    if (user) {
      return {
        ...user,
        profileImage: getSafeProfileImage(user)
      };
    }
    return null;
  });
  
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Navigation
  const serverPath = initialPath || '/';
  const clientPath = isClient ? getPath() : serverPath;
  const path = clientPath;
  const parsedPath = useMemo(() => parsePath(path, users), [path, users]);
  const [activeTab, setActiveTab] = useState(parsedPath.view === 'home' ? 'home' : parsedPath.view);
  const [view, setView] = useState(initialData?.view || parsedPath.view);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialData?.selectedUserId || parsedPath.userId || null);
  
  // Media states
  const [activeReelId, setActiveReelId] = useState<number | null>(null);
  const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
  const [initialGroupIdToView, setInitialGroupIdToView] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeGroupComments, setActiveGroupComments] = useState<{groupId: string, postId: number} | null>(null);
  const [activeGroupShare, setActiveGroupShare] = useState<{groupId: string, postId: number} | null>(null);
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
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSinglePostId, setActiveSinglePostId] = useState<number | null>(initialData?.activeSinglePostId || parsedPath.postId || null);

  const isAdmin = currentUser?.role === 'admin';

  // ========== CRITICAL FIX: handleNavigate function INSIDE App component ==========
  const handleNavigate = useCallback((destination: string, params?: any) => {
    setApiError(null);
    
    switch (destination) {
      case 'home':
        setView('home');
        setActiveTab('home');
        setSelectedUserId(null);
        setActiveBrandId(null);
        setActiveSinglePostId(null);
        if (isClient) window.history.pushState({}, '', '/');
        break;
        
      case 'profile':
        if (params?.userId) {
          setSelectedUserId(params.userId);
          setView('profile');
          setActiveTab('profile');
          if (isClient) window.history.pushState({}, '', `/@${params.userId}`);
        }
        break;
        
      case 'brand_view':
        if (params?.brandId) {
          setActiveBrandId(params.brandId);
          setView('brands');
          setActiveTab('brands');
          if (isClient) window.history.pushState({}, '', `/brands/${params.brandId}`);
        } else {
          setView('brands');
          setActiveTab('brands');
          if (isClient) window.history.pushState({}, '', '/brands');
        }
        break;
        
      case 'marketplace':
        setView('marketplace');
        setActiveTab('marketplace');
        if (isClient) window.history.pushState({}, '', '/marketplace');
        break;
        
      case 'reels':
        setView('reels');
        setActiveTab('reels');
        if (isClient) window.history.pushState({}, '', '/reels');
        break;
        
      case 'groups':
        setView('groups');
        setActiveTab('groups');
        if (isClient) window.history.pushState({}, '', '/groups');
        break;
        
      case 'events':
        setView('events');
        setActiveTab('events');
        if (isClient) window.history.pushState({}, '', '/events');
        break;
        
      case 'music':
        setView('music');
        setActiveTab('music');
        if (isClient) window.history.pushState({}, '', '/music');
        break;
        
      case 'login':
        setView('login');
        setActiveTab('login');
        if (isClient) window.history.pushState({}, '', '/login');
        break;
        
      case 'single_post':
        if (params?.postId) {
          setActiveSinglePostId(params.postId);
          setView('single_post');
          if (isClient) window.history.pushState({}, '', `/post/${params.postId}`);
        }
        break;
        
      default:
        console.warn('Unknown navigation destination:', destination);
        setView('home');
        setActiveTab('home');
        if (isClient) window.history.pushState({}, '', '/');
    }
    
    window.scrollTo(0, 0);
  }, [isClient]);

  // ========== OTHER HANDLERS ==========
  const handleTagClick = useCallback((tag: string) => {
    setActiveTag(tag);
    setView('home');
    setActiveTab('home');
    if (isClient) window.history.pushState({}, '', `/tag/${tag}`);
  }, [isClient]);

  const handleFollowUser = useCallback(async (userId: number) => {
    if (!currentUser) {
      alert("Please login to follow users");
      return;
    }
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Update local state
        setUsers(prev => prev.map(user => {
          if (user.id === userId) {
            return { ...user, followers: [...(user.followers || []), currentUser.id] };
          }
          if (user.id === currentUser.id) {
            return { ...user, following: [...(user.following || []), userId] };
          }
          return user;
        }));
        
        if (currentUser) {
          setCurrentUser(prev => prev ? {
            ...prev,
            following: [...(prev.following || []), userId]
          } : prev);
        }
        
        // Create notification
        handleCreateNotification(
          userId,
          currentUser.id,
          'follow',
          'started following you.',
          {}
        );
      }
    } catch (err) {
      console.error('Failed to follow user:', err);
      alert('Failed to follow user');
    }
  }, [currentUser]);

  const handleCreateNotification = useCallback((
    userId: number,
    senderId: number,
    type: string,
    content: string,
    extraData?: any
  ) => {
    if (userId === senderId) return;
    
    if (notificationExists(notifications, userId, senderId, type, extraData?.postId)) {
      return;
    }
    
    const newNotification = createNotification(userId, senderId, type, content, extraData);
    setNotifications(prev => [newNotification, ...prev]);
    
    if (typeof Audio !== 'undefined' && currentUser?.id === userId) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }, [notifications, currentUser?.id]);

  const handleNotificationClick = (notification: Notification) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notification.id ? { ...notif, read: true } : notif
      )
    );
    
    if (notification.postId) {
      handleNavigate('single_post', { postId: notification.postId });
    } else if (notification.groupId) {
      setInitialGroupIdToView(notification.groupId);
      handleNavigate('groups');
    } else if (notification.brandId) {
      handleNavigate('brand_view', { brandId: notification.brandId });
    } else if (notification.senderId) {
      handleNavigate('profile', { userId: notification.senderId });
    }
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const handlePlayTrack = (track: AudioTrack) => {
    setCurrentAudioTrack(track);
    setIsAudioPlaying(true);
    
    // Add to play history
    setPlayHistory(prev => [...prev, {
      trackId: track.id,
      timestamp: Date.now(),
      duration: track.duration || 180
    }]);
    
    // Like the track automatically after first play
    if (!likedTracks.includes(track.id)) {
      setTimeout(() => {
        setLikedTracks(prev => [...prev, track.id]);
      }, 30000); // Like after 30 seconds of listening
    }
  };

  const handleLikeTrack = (trackId: string, isCurrentlyLiked: boolean) => {
    if (isCurrentlyLiked) {
      setLikedTracks(prev => prev.filter(id => id !== trackId));
    } else {
      setLikedTracks(prev => [...prev, trackId]);
    }
  };

  // ========== BRANDS PAGE HANDLERS ==========
  const handleCreateBrand = async (brandData: Partial<Brand>) => {
    if (!currentUser) {
      alert("Please login to create a brand page");
      return;
    }
    
    try {
      setApiError(null);
      const newBrand = await UNERA_API.brands.create({
        ...brandData,
        admin_id: currentUser.id,
        profile_image: brandData.profileImage,
        cover_image: brandData.coverImage,
      });
      
      setBrands(prev => [newBrand, ...prev]);
      
      // Auto-follow the brand
      await UNERA_API.brands.follow(newBrand.id);
      
      // Update user's following list
      if (currentUser) {
        setCurrentUser(prev => prev ? {
          ...prev,
          following: [...prev.following, newBrand.id]
        } : prev);
      }
      
      return newBrand;
    } catch (err: any) {
      setApiError(err.message || 'Failed to create brand');
      throw err;
    }
  };

  const handleFollowBrand = async (brandId: number) => {
    if (!currentUser) {
      alert("Login to follow brands");
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      const isFollowing = brand?.followers.includes(currentUser.id);
      
      if (isFollowing) {
        await UNERA_API.brands.unfollow(brandId);
        setBrands(prev => prev.map(b => 
          b.id === brandId 
            ? { ...b, followers: b.followers.filter(id => id !== currentUser.id) } 
            : b
        ));
        
        // Update user's following list
        setCurrentUser(prev => prev ? {
          ...prev,
          following: prev.following.filter(id => id !== brandId)
        } : prev);
      } else {
        await UNERA_API.brands.follow(brandId);
        setBrands(prev => prev.map(b => 
          b.id === brandId 
            ? { ...b, followers: [...b.followers, currentUser.id] } 
            : b
        ));
        
        // Update user's following list
        setCurrentUser(prev => prev ? {
          ...prev,
          following: [...prev.following, brandId]
        } : prev);
        
        // Send notification to brand admin
        if (brand && brand.adminId !== currentUser.id) {
          handleCreateNotification(
            brand.adminId,
            currentUser.id,
            'brand_follow',
            `followed your brand ${brand.name}.`,
            { brandId }
          );
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to follow/unfollow brand');
    }
  };

  const handlePostAsBrand = async (brandId: number, postData: any) => {
    if (!currentUser) {
      alert("Please login to post as brand");
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
      
      if (brand.adminId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('Only brand admin can post');
      }
      
      let media_url = undefined;
      if (postData.files && postData.files.length > 0) {
        const file = postData.files[0];
        media_url = await UNERA_API.upload.getSignedUrl(file, 'post');
      }
      
      const brandPost = await UNERA_API.brands.createPost(brandId, {
        content: postData.text,
        type: postData.type,
        media_url,
        visibility: postData.visibility,
        location: postData.location,
        feeling: postData.feeling,
        tagged_users: postData.taggedUsers,
        background: postData.background,
      });
      
      // Add to posts
      const newPost: PostType = {
        ...brandPost,
        formattedTime: formatRelativeTime(brandPost.timestamp || Date.now()),
        brandId: brandId,
        authorId: brandId,
      };
      
      setPosts(prev => [newPost, ...prev]);
      
      // Update brand posts
      setBrands(prev => prev.map(b => 
        b.id === brandId 
          ? { ...b, posts: [...(b.posts || []), brandPost.id] }
          : b
      ));
      
      return brandPost;
    } catch (err: any) {
      setApiError(err.message || 'Failed to create brand post');
      throw err;
    }
  };

  const handleUpdateBrand = async (brandId: number, data: Partial<Brand>) => {
    if (!currentUser) {
      alert("Please login to update brand");
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
      
      if (brand.adminId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('Only brand admin can update');
      }
      
      const updatedBrand = await UNERA_API.brands.update(brandId, data);
      setBrands(prev => prev.map(b => b.id === brandId ? updatedBrand : b));
      
      return updatedBrand;
    } catch (err: any) {
      setApiError(err.message || 'Failed to update brand');
      throw err;
    }
  };

  const handleDeleteBrand = async (brandId: number) => {
    if (!currentUser) {
      alert("Please login to delete brand");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this brand? This action cannot be undone.")) {
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
      
      if (brand.adminId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('Only brand admin can delete');
      }
      
      await UNERA_API.brands.delete(brandId);
      setBrands(prev => prev.filter(b => b.id !== brandId));
      
      // Remove from user's following list
      if (currentUser) {
        setCurrentUser(prev => prev ? {
          ...prev,
          following: prev.following.filter(id => id !== brandId)
        } : prev);
      }
      
      // Navigate back to brands list
      handleNavigate('brand_view');
      
      alert("Brand deleted successfully");
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete brand');
      alert(`Failed to delete brand: ${err.message}`);
    }
  };

  const handleUpdateBrandImage = async (brandId: number, imageType: 'profile' | 'cover', file: File) => {
    if (!currentUser) {
      alert("Please login to update brand image");
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
      
      if (brand.adminId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('Only brand admin can update images');
      }
      
      const imageUrl = await UNERA_API.upload.getSignedUrl(file, 'image');
      
      const updateData = imageType === 'profile' 
        ? { profileImage: imageUrl }
        : { coverImage: imageUrl };
      
      const updatedBrand = await UNERA_API.brands.update(brandId, updateData);
      setBrands(prev => prev.map(b => b.id === brandId ? updatedBrand : b));
      
      return updatedBrand;
    } catch (err: any) {
      setApiError(err.message || 'Failed to update brand image');
      throw err;
    }
  };

  const handleVerifyBrand = async (brandId: number) => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert("Only admin can verify brands");
      return;
    }
    
    try {
      setApiError(null);
      const verifiedBrand = await UNERA_API.brands.verify(brandId);
      setBrands(prev => prev.map(b => b.id === brandId ? verifiedBrand : b));
      
      // Notify brand admin
      const brand = brands.find(b => b.id === brandId);
      if (brand) {
        handleCreateNotification(
          brand.adminId,
          currentUser.id,
          'brand_verified',
          `verified your brand ${brand.name}.`,
          { brandId }
        );
      }
      
      alert("Brand verified successfully");
      return verifiedBrand;
    } catch (err: any) {
      setApiError(err.message || 'Failed to verify brand');
      throw err;
    }
  };

  const handleCreateEvent = async (brandId: number, eventData: Partial<Event>) => {
    if (!currentUser) {
      alert("Please login to create event");
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
      
      if (brand.adminId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('Only brand admin can create events');
      }
      
      const newEvent = await UNERA_API.events.create({
        ...eventData,
        creator_id: currentUser.id,
        brand_id: brandId,
      });
      
      setEvents(prev => [newEvent, ...prev]);
      
      // Create event post
      await handlePostAsBrand(brandId, {
        text: `🎉 New event: ${newEvent.title}\n${newEvent.description}\nDate: ${new Date(newEvent.date).toLocaleDateString()}\nLocation: ${newEvent.location}`,
        type: 'event',
        visibility: 'Public',
        location: newEvent.location,
      });
      
      alert("Event created successfully");
      return newEvent;
    } catch (err: any) {
      setApiError(err.message || 'Failed to create event');
      throw err;
    }
  };

  const handleMessageBrand = async (brandId: number) => {
    if (!currentUser) {
      alert("Please login to message");
      return;
    }
    
    try {
      setApiError(null);
      const brand = brands.find(b => b.id === brandId);
      if (!brand) {
        throw new Error('Brand not found');
      }
      
      // Find brand admin
      const brandAdmin = users.find(u => u.id === brand.adminId);
      if (!brandAdmin) {
        throw new Error('Brand admin not found');
      }
      
      // Start conversation with brand admin
      setActiveChatUser(brandAdmin);
      setView('chat');
      
    } catch (err: any) {
      setApiError(err.message || 'Failed to start conversation');
      alert(`Failed to message brand: ${err.message}`);
    }
  };

  // ========== POST HANDLERS ==========
  const handleCreatePost = async (
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
      alert("Please login to create a post");
      return;
    }
    
    try {
      setApiError(null);
      let media_url = undefined;
      
      // Handle file upload if present
      if (files && files.length > 0) {
        const file = files[0];
        media_url = await UNERA_API.upload.getSignedUrl(file, 'post');
      }
      
      const postData: any = {
        content: text,
        type: type === 'multimage' ? 'image' : type,
        visibility,
        ...(media_url && { media_url }),
        ...(location && { location }),
        ...(feeling && { feeling }),
        ...(taggedUsers && taggedUsers.length > 0 && { tagged_users: taggedUsers }),
        ...(background && { background }),
      };
      
      const data = await UNERA_API.posts.create(postData);
      
      if (data) {
        const newPost: PostType = {
          ...data,
          formattedTime: formatRelativeTime(data.timestamp || Date.now()),
          reactions: [],
          comments: [],
          shares: 0,
          views: 0,
          authorId: currentUser.id,
        };
        
        setPosts(prev => [newPost, ...prev]);
        
        // Notify tagged users
        if (taggedUsers && taggedUsers.length > 0) {
          taggedUsers.forEach(userId => {
            if (userId !== currentUser!.id) {
              handleCreateNotification(
                userId,
                currentUser!.id,
                'tag_post',
                'tagged you in a post.',
                { postId: newPost.id }
              );
            }
          });
        }
        
        return newPost;
      }
    } catch (error: any) {
      setApiError(error.message);
      throw error;
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!currentUser) {
      alert("Please login to delete posts.");
      return;
    }
    
    try {
      setApiError(null);
      const post = posts.find(p => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check permissions
      if (post.authorId !== currentUser.id && currentUser.role !== 'admin') {
        throw new Error('You do not have permission to delete this post');
      }
      
      await UNERA_API.posts.delete(postId);
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
      
      return true;
    } catch (error: any) {
      setApiError(error.message);
      throw error;
    }
  };

  const handleReact = async (postId: number, type: ReactionType) => {
    if (!currentUser) {
      alert("Please login to react.");
      return;
    }
    
    try {
      setApiError(null);
      
      // Check if already liked
      const post = posts.find(p => p.id === postId);
      const existingReaction = post?.reactions?.find(r => r.userId === currentUser.id);
      
      if (existingReaction) {
        // Unlike
        await UNERA_API.likes.delete(postId, 'post');
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, reactions: (p.reactions || []).filter(r => r.userId !== currentUser.id) }
            : p
        ));
      } else {
        // Like
        await UNERA_API.likes.create({
          target_id: postId,
          target_type: 'post'
        });
        
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            const newReactions = [...(p.reactions || []), { userId: currentUser.id, type }];
            
            // Send notification
            if (p.authorId !== currentUser.id) {
              handleCreateNotification(
                p.authorId,
                currentUser.id,
                'like_post',
                'liked your post.',
                { postId: postId, reactionType: type }
              );
            }
            
            return { ...p, reactions: newReactions };
          }
          return p;
        }));
      }
    } catch (error: any) {
      setApiError(error.message);
      console.error('Failed to react:', error);
    }
  };

  const handleShare = async (postId: number) => {
    if (!currentUser) {
      alert("Please login to share.");
      return;
    }
    
    try {
      setApiError(null);
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      // Create shared post
      const sharedPost = await UNERA_API.posts.create({
        content: `Shared: ${post.content}`,
        type: 'share',
        visibility: 'Public',
      });
      
      // Update original post share count
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, shares: (p.shares || 0) + 1 }
          : p
      ));
      
      // Add shared post to feed
      const newPost: PostType = {
        ...sharedPost,
        formattedTime: formatRelativeTime(sharedPost.timestamp || Date.now()),
        reactions: [],
        comments: [],
        shares: 0,
        views: 0,
        authorId: currentUser.id,
        sharedPostId: postId,
      };
      
      setPosts(prev => [newPost, ...prev]);
      
      // Notify original author
      if (post.authorId !== currentUser.id) {
        handleCreateNotification(
          post.authorId,
          currentUser.id,
          'share_post',
          'shared your post.',
          { postId: postId }
        );
      }
      
      alert("Post shared successfully!");
    } catch (error: any) {
      setApiError(error.message);
      console.error('Failed to share:', error);
    }
  };

  const handleComment = async (postId: number, text: string) => {
    if (!currentUser) {
      alert("Please login to comment.");
      return;
    }
    
    try {
      setApiError(null);
      const comment = await UNERA_API.comments.create({
        post_id: postId,
        content: text,
      });
      
      const newComment: Comment = {
        id: comment.id,
        userId: currentUser.id,
        text: text,
        timestamp: Date.now(),
        formattedTime: formatRelativeTime(Date.now()),
        likes: 0,
        authorName: currentUser.name,
        authorImage: getSafeProfileImage(currentUser)
      };
      
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const comments = Array.isArray(p.comments) ? p.comments : [];
          return { ...p, comments: [...comments, newComment] };
        }
        return p;
      }));
      
      // Send notification
      const post = posts.find(p => p.id === postId);
      if (post && post.authorId !== currentUser.id) {
        handleCreateNotification(
          post.authorId,
          currentUser.id,
          'comment_post',
          'commented on your post.',
          { postId: postId, commentId: newComment.id }
        );
      }
      
      return newComment;
    } catch (error: any) {
      setApiError(error.message);
      throw error;
    }
  };

  // ========== AUTH HANDLERS ==========
  const handleLogin = async (email: string, password: string) => {
    try {
      setApiError(null);
      setLoginError('');
      const data = await UNERA_API.users.login({ email, password });
      
      if (data.token && data.user) {
        setAuthToken(data.token);
        setCurrentUser({
          ...data.user,
          profileImage: getSafeProfileImage(data.user)
        });
        
        // Load user data after login
        const [postsData, brandsData, usersData] = await Promise.all([
          UNERA_API.posts.getAll().catch(() => []),
          UNERA_API.brands.getAll().catch(() => []),
          UNERA_API.users.getAll?.().catch(() => []) // Add this endpoint to your API
        ]);
        
        if (postsData && Array.isArray(postsData)) {
          setPosts(postsData.map((post: any) => ({
            ...post,
            formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
          })));
        }
        
        if (brandsData && Array.isArray(brandsData)) {
          setBrands(brandsData.map((brand: any) => ({
            ...brand,
            profileImage: getSafeProfileImage(brand)
          })));
        }
        
        if (usersData && Array.isArray(usersData)) {
          setUsers(usersData.map((user: any) => ({
            ...user,
            profileImage: getSafeProfileImage(user)
          })));
        }
        
        handleNavigate('home');
      } else {
        setLoginError('Invalid response from server');
      }
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
      setApiError(error.message);
    }
  };

  const handleRegister = async (newUser: Partial<User>) => {
    try {
      setApiError(null);
      setLoginError('');
      const { username, email, password } = newUser;
      if (!username || !email || !password) {
        setLoginError('All fields are required');
        return;
      }
      
      const data = await UNERA_API.users.signup({ username, email, password });
      
      if (data.token && data.user) {
        setAuthToken(data.token);
        const safeUser = {
          ...data.user,
          profileImage: getSafeProfileImage(data.user)
        };
        setCurrentUser(safeUser);
        setUsers(prev => [...prev, safeUser]);
        setShowRegister(false);
        setShowForgotPassword(false);
        
        handleNavigate('home');
      }
    } catch (error: any) {
      setLoginError(error.message || 'Registration failed');
      setApiError(error.message);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setView('login');
    setCurrentAudioTrack(null);
    setIsAudioPlaying(false);
    if (isClient) {
      window.history.pushState({}, '', '/');
    }
  };

  // ========== DATA LOADING ==========
  useEffect(() => {
    const loadDataFromAPI = async () => {
      if (isClient && getAuthToken()) {
        try {
          setIsLoading(true);
          
          // Load current user
          const userData = await UNERA_API.users.getCurrentUser();
          if (userData) {
            setCurrentUser({
              ...userData,
              profileImage: getSafeProfileImage(userData)
            });
          }
          
          // Load other data
          const [postsData, brandsData, storiesData, groupsData, musicData] = await Promise.all([
            UNERA_API.posts.getAll().catch(() => []),
            UNERA_API.brands.getAll().catch(() => []),
            UNERA_API.stories.getAll().catch(() => []),
            UNERA_API.groups.getAll().catch(() => []),
            UNERA_API.music.getAll().catch(() => []),
          ]);
          
          if (postsData && Array.isArray(postsData)) {
            setPosts(postsData.map((post: any) => ({
              ...post,
              formattedTime: formatRelativeTime(post.timestamp || post.createdAt || Date.now())
            })));
          }
          
          if (brandsData && Array.isArray(brandsData)) {
            setBrands(brandsData.map((brand: any) => ({
              ...brand,
              profileImage: getSafeProfileImage(brand)
            })));
          }
          
          if (storiesData && Array.isArray(storiesData)) {
            setStories(storiesData);
          }
          
          if (groupsData && Array.isArray(groupsData)) {
            setGroups(groupsData);
          }
          
          if (musicData && Array.isArray(musicData)) {
            setSongs(musicData);
          }
          
        } catch (error) {
          console.error('Failed to load data from API:', error);
          setApiError('Failed to load data. Please check your connection.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setTimeout(() => setIsLoading(false), 800);
      }
    };
    
    if (isClient) {
      loadDataFromAPI();
    }
  }, [isClient]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ========== MEMOIZED VALUES ==========
  const storiesWithUsers = useMemo(() => {
    return stories.map(story => {
      const user = users.find(u => u.id === story.userId) || getDefaultUser();
      return { ...story, user };
    }).sort((a,b) => b.createdAt - a.createdAt);
  }, [stories, users]);

  const rankedPosts = useMemo(() => {
    const processedPosts = posts.map(post => ({
      ...post,
      formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
    }));
    
    const productPosts: PostType[] = products.map(p => ({ 
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
      type: 'product', 
      visibility: 'Public', 
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
      type: 'video', 
      visibility: 'Public' 
    }));
    
    const allContent = [...processedPosts, ...productPosts, ...reelPosts];
    return rankFeed(allContent, currentUser, users, brands);
  }, [posts, reels, products, currentUser, users, brands]);

  const effectiveView = isClient ? view : (initialData?.view || parsedPath.view);

  // ========== RENDER FUNCTIONS ==========
  const renderMusicPost = (post: PostType, author: any) => {
    const song = getSongForPost(post, songs, episodes);
    if (!song) return null;
    
    const safePost = {
      ...post,
      formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
    };
    
    return (
      <Post 
        key={post.id} 
        post={safePost}
        author={author} 
        currentUser={currentUser}
        users={users} 
        onProfileClick={(id) => { 
          if (author.type === 'brand') {
            handleNavigate('brand_view', { brandId: id });
          } else {
            handleNavigate('profile', { userId: id });
          }
        }} 
        onReact={handleReact} 
        onShare={handleShare} 
        onViewImage={(url) => setFullScreenImage(url)} 
        onOpenComments={(postId) => setActiveCommentsPostId(postId)} 
        onVideoClick={() => {}} 
        onPlayAudioTrack={handlePlayTrack} 
        onFollow={author.type === 'brand' ? handleFollowBrand : handleFollowUser} 
        isFollowing={author.type === 'brand' && currentUser ? 
          brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false :
          author.type === 'user' && currentUser ?
          currentUser.following.includes(author.id) : false}
        onHashtagClick={handleTagClick} 
        onDeletePost={handleDeletePost} 
        isAdmin={isAdmin}
      />
    );
  };

  const renderRegularPost = (post: PostType, author: any, isFollowing?: boolean) => {
    const isBrandAuthor = author?.type === 'brand';
    const isFollowingBrand = isBrandAuthor && currentUser ? 
      brands.find(b => b.id === author.id)?.followers.includes(currentUser.id) || false : 
      false;
    
    const postWithFormattedTime = {
      ...post,
      formattedTime: post.formattedTime || formatRelativeTime(post.timestamp || post.createdAt || Date.now())
    };
    
    return (
      <Post 
        key={post.id} 
        post={postWithFormattedTime}
        author={author} 
        currentUser={currentUser} 
        users={users} 
        onProfileClick={(id) => { 
          if (isBrandAuthor) {
            handleNavigate('brand_view', { brandId: id });
          } else {
            handleNavigate('profile', { userId: id });
          }
        }} 
        onReact={handleReact} 
        onShare={handleShare} 
        onViewImage={(url) => setFullScreenImage(url)} 
        onOpenComments={(postId) => setActiveCommentsPostId(postId)} 
        onVideoClick={(p) => { setActiveReelId(p.id - 200000); handleNavigate('reels'); }} 
        onViewProduct={(p) => setActiveProduct(p)} 
        onGroupClick={(groupId) => { setInitialGroupIdToView(groupId); handleNavigate('groups'); }} 
        onPlayAudioTrack={handlePlayTrack} 
        onFollow={isBrandAuthor ? handleFollowBrand : handleFollowUser} 
        isFollowing={isBrandAuthor ? isFollowingBrand : isFollowing} 
        onHashtagClick={handleTagClick} 
        onDeletePost={handleDeletePost} 
        isAdmin={isAdmin}
      />
    );
  };

  // ========== MAIN RENDER ==========
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#18191A] flex-col">
        <div className="w-20 h-20 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[#1877F2] font-bold text-xl animate-pulse">Loading UNERA...</div>
        {apiError && (
          <div className="mt-4 p-3 bg-red-900/30 text-red-300 rounded-lg">
            API Error: {apiError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
      {apiError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-900 text-red-100 px-4 py-2 rounded-lg shadow-lg">
            API Error: {apiError}
            <button 
              onClick={() => setApiError(null)}
              className="ml-3 text-red-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {effectiveView === 'login' ? (
         showRegister 
            ? <Register onRegister={handleRegister} onBackToLogin={() => { setShowRegister(false); setShowForgotPassword(false); }} /> 
            : showForgotPassword
            ? <ForgotPassword onBackToLogin={() => { setShowForgotPassword(false); setShowRegister(false); }} />
            : <Login onLogin={handleLogin} onNavigateToRegister={() => { setShowRegister(true); setShowForgotPassword(false); }} onNavigateToForgotPassword={() => { setShowForgotPassword(true); setShowRegister(false); }} onClose={() => { setView('home'); setCurrentUser(null); }} error={loginError} />
      ) : (
        <>
          {currentAudioTrack && (
            <div className="fixed bottom-0 left-0 right-0 bg-[#242526] border-t border-gray-700 p-4 z-50">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img 
                    src={currentAudioTrack.cover || '/default-cover.jpg'} 
                    alt={currentAudioTrack.title}
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <h4 className="text-white font-medium">{currentAudioTrack.title}</h4>
                    <p 
                      className="text-gray-400 text-sm cursor-pointer hover:text-white"
                      onClick={() => {
                        const uploader = users.find(u => u.id === currentAudioTrack.uploaderId);
                        if (uploader) {
                          handleNavigate('profile', { userId: uploader.id });
                        }
                      }}
                    >
                      {currentAudioTrack.artist}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                    className="text-white hover:text-[#1877F2] text-2xl"
                  >
                    {isAudioPlaying ? '⏸️' : '▶️'}
                  </button>
                  
                  <button 
                    onClick={() => handleLikeTrack(currentAudioTrack.id, likedTracks.includes(currentAudioTrack.id))}
                    className={`${likedTracks.includes(currentAudioTrack.id) ? 'text-[#1877F2]' : 'text-gray-400'} hover:text-white text-2xl`}
                  >
                    {likedTracks.includes(currentAudioTrack.id) ? '❤️' : '🤍'}
                  </button>
                  
                  <button 
                    onClick={() => alert("Download started...")}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ⬇️
                  </button>
                  
                  <button 
                    onClick={() => { setCurrentAudioTrack(null); setIsAudioPlaying(false); }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <Header 
            onHomeClick={() => handleNavigate('home')} 
            onProfileClick={(id) => handleNavigate('profile', { userId: id })} 
            onReelsClick={() => handleNavigate('reels')} 
            onMarketplaceClick={() => handleNavigate('marketplace')} 
            onGroupsClick={() => handleNavigate('groups')} 
            currentUser={currentUser ? {
              ...currentUser,
              profileImage: getSafeProfileImage(currentUser)
            } : null} 
            notifications={notifications} 
            users={users.map(user => ({
              ...user,
              profileImage: getSafeProfileImage(user)
            }))} 
            onLogout={handleLogout} 
            onLoginClick={() => setView('login')} 
            onMarkNotificationsRead={handleMarkAllNotificationsRead} 
            onNotificationClick={handleNotificationClick}
            activeTab={activeTab} 
            onNavigate={handleNavigate} 
          />
          
          <div className="flex-1 flex pt-16">
            <Sidebar 
              currentUser={currentUser ? {
                ...currentUser,
                profileImage: getSafeProfileImage(currentUser)
              } : null} 
              onNavigate={handleNavigate} 
              activeTab={activeTab} 
            />
            
            <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
              {effectiveView === 'home' && (
                <div className="max-w-[1000px] mx-auto p-4">
                  <StoryReel 
                    stories={storiesWithUsers} 
                    currentUser={currentUser ? {
                      ...currentUser,
                      profileImage: getSafeProfileImage(currentUser)
                    } : null} 
                    onStoryClick={(story) => setActiveStory(story)} 
                    onCreateStory={() => setShowCreateStoryModal(true)} 
                  />
                  
                  <CreatePost 
                    currentUser={currentUser} 
                    users={users} 
                    onCreatePost={handleCreatePost} 
                    onNavigate={handleNavigate} 
                  />
                  
                  <div className="space-y-4 mt-4">
                    {rankedPosts.map(post => {
                      const author = getAuthorForPost(post, users, brands);
                      
                      if (post.type === 'music' || post.type === 'podcast') {
                        return renderMusicPost(post, author);
                      } else {
                        const isFollowing = author.type === 'user' && currentUser 
                          ? currentUser.following.includes(author.id) 
                          : false;
                        return renderRegularPost(post, author, isFollowing);
                      }
                    })}
                  </div>
                </div>
              )}
              
              {effectiveView === 'brands' && (
                <BrandsPage 
                  currentUser={currentUser} 
                  initialBrandId={activeBrandId}
                  onPlayAudioTrack={handlePlayTrack}
                  onNavigate={handleNavigate}
                  // Brand handlers passed as props
                  onCreateBrand={handleCreateBrand}
                  onFollowBrand={handleFollowBrand}
                  onPostAsBrand={handlePostAsBrand}
                  onUpdateBrand={handleUpdateBrand}
                  onDeleteBrand={handleDeleteBrand}
                  onUpdateBrandImage={handleUpdateBrandImage}
                  onVerifyBrand={handleVerifyBrand}
                  onCreateEvent={handleCreateEvent}
                  onMessage={handleMessageBrand}
                />
              )}
              
              {/* Add other views here (profile, marketplace, groups, etc.) */}
              
            </main>
            
            <RightSidebar 
              currentUser={currentUser} 
              users={users} 
              groups={groups} 
              events={events} 
              onNavigate={handleNavigate} 
              onFollowUser={handleFollowUser} 
              onJoinGroup={(groupId) => console.log('Join group:', groupId)} 
            />
          </div>
          
          {/* Modals */}
          {showCreateStoryModal && currentUser && (
            <CreateStoryModal 
              currentUser={currentUser}
              onClose={() => setShowCreateStoryModal(false)}
              onCreateStory={(storyData) => {
                console.log('Create story:', storyData);
                setShowCreateStoryModal(false);
              }}
            />
          )}
          
          {showCreateEventModal && currentUser && (
            <CreateEventModal 
              currentUser={currentUser}
              onClose={() => setShowCreateEventModal(false)}
              onCreate={(eventData) => {
                console.log('Create event:', eventData);
                setShowCreateEventModal(false);
              }}
            />
          )}
          
          {showCreatePostModal && currentUser && (
            <CreatePostModal 
              currentUser={currentUser}
              users={users}
              onClose={() => setShowCreatePostModal(false)}
              onCreatePost={handleCreatePost}
            />
          )}
          
          {activeCommentsPostId && (
            <CommentsSheet 
              post={posts.find(p => p.id === activeCommentsPostId)!}
              currentUser={currentUser}
              onClose={() => setActiveCommentsPostId(null)}
              onComment={handleComment}
            />
          )}
          
          {activeSharePostId && (
            <ShareSheet 
              post={posts.find(p => p.id === activeSharePostId)!}
              onClose={() => setActiveSharePostId(null)}
              onShare={handleShare}
            />
          )}
          
          {fullScreenImage && (
            <ImageViewer 
              imageUrl={fullScreenImage}
              onClose={() => setFullScreenImage(null)}
            />
          )}
          
          {activeStory && (
            <StoryViewer 
              stories={storiesWithUsers}
              initialStory={activeStory}
              onClose={() => setActiveStory(null)}
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )}
          
          {activeProduct && (
            <ProductDetailModal 
              product={activeProduct}
              onClose={() => setActiveProduct(null)}
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )}
          
          {activeChatUser && (
            <ChatWindow 
              otherUser={activeChatUser}
              currentUser={currentUser}
              onClose={() => setActiveChatUser(null)}
            />
          )}
          
          {showCreateReelModal && (
            <CreateReelModal 
              onClose={() => setShowCreateReelModal(false)}
              onCreateReel={(reelData) => {
                console.log('Create reel:', reelData);
                setShowCreateReelModal(false);
              }}
              currentUser={currentUser}
            />
          )}
          
          <MenuOverlay 
            isOpen={false}
            onClose={() => {}}
            onNavigate={handleNavigate}
            currentUser={currentUser}
          />
          
          <MusicSystem 
            currentUser={currentUser}
            onPlayTrack={handlePlayTrack}
            likedTracks={likedTracks}
            onLikeTrack={handleLikeTrack}
            onNavigate={handleNavigate}
          />
        </>
      )}
    </div>
  );
}

// Export the wrapped App component with Error Boundary
export default function WrappedApp(props: { initialData?: any, initialPath?: string }) {
  return (
    <ErrorBoundary>
      <App {...props} />
    </ErrorBoundary>
  );
}
