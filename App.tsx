import React, { useState, useEffect, useMemo } from 'react';
import { Login, Register, ForgotPassword } from './components/Auth';
import { Header, Sidebar, RightSidebar } from './components/Layout';
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

// ========== SIMPLE API HELPER ==========
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`https://unera.social${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    return null;
  }
};

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

// Helper functions
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
      comments: song.comments || 0
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
      comments: episode.comments || 0
    };
  }
  
  return null;
};

const getAuthorForPost = (post: PostType, users: User[], brands: Brand[]) => {
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
  
  const user = users.find(u => u.id === post.authorId);
  if (user) {
    return {
      ...user,
      type: 'user' as const
    };
  }
  
  return null;
};

// ========== MAIN APP COMPONENT ==========
export default function App({ initialPath }: { initialPath?: string }) {
  const { t } = useLanguage();

  // CRITICAL FIX: Remove all complex loading states initially
  const [isClient, setIsClient] = useState(false);
  
  // Start with initial data ALWAYS
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [posts, setPosts] = useState<PostType[]>(() => {
    return INITIAL_POSTS.map(post => ({
      ...post,
      formattedTime: formatRelativeTime(post.timestamp || Date.now())
    }));
  });
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [brands, setBrands] = useState<Brand[]>(INITIAL_BRANDS);
  const [songs, setSongs] = useState<Song[]>(MOCK_SONGS);
  const [episodes, setEpisodes] = useState<Episode[]>(MOCK_EPISODES);
  
  // GUEST MODE: Start as null (not admin)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Simple states
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState('home');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeReelId, setActiveReelId] = useState<number | null>(null);
  const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
  
  // Modals
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
  const [activeSharePostId, setActiveSharePostId] = useState<number | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Simple API call in background
    const fetchData = async () => {
      try {
        // Try to fetch posts from API
        const postsData = await apiFetch('/api/posts/public');
        if (postsData && Array.isArray(postsData)) {
          const transformedPosts = postsData.map((post: any) => ({
            id: post.id || Date.now(),
            authorId: post.user_id || 1,
            content: post.content || '',
            timestamp: new Date(post.created_at).getTime() || Date.now(),
            formattedTime: formatRelativeTime(new Date(post.created_at).getTime() || Date.now()),
            createdAt: new Date(post.created_at).getTime() || Date.now(),
            reactions: post.reactions || [],
            comments: post.comments || [],
            shares: post.shares || 0,
            views: post.views || 0,
            type: post.type || 'text',
            visibility: post.visibility || 'Public'
          }));
          setPosts(transformedPosts);
        }
      } catch (error) {
        // Silently fail - we already have initial data
        console.log('Using initial data');
      }
    };
    
    fetchData();
  }, []);

  // Handle path changes
  useEffect(() => {
    if (isClient) {
      const path = getPath();
      const parsed = parsePath(path, users);
      setView(parsed.view);
      setActiveTab(parsed.view === 'home' ? 'home' : parsed.view);
      
      if (parsed.userId) {
        setSelectedUserId(parsed.userId);
      }
    }
  }, [isClient, users]);

  // Basic handlers
  const handleLogin = (email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      setView('home');
      setActiveTab('home');
      setLoginError('');
    } else {
      setLoginError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('home');
  };

  const handleNavigate = (targetView: string) => {
    setView(targetView);
    setActiveTab(targetView);
  };

  const handleCreatePost = (text: string, files: File[] | null, type: any, visibility: any) => {
    if (!currentUser) {
      setView('login');
      return;
    }
    
    const newPost: PostType = {
      id: Date.now(),
      authorId: currentUser.id,
      content: text,
      timestamp: Date.now(),
      formattedTime: 'Just now',
      createdAt: Date.now(),
      reactions: [],
      comments: [],
      shares: 0,
      views: 0,
      type: 'text',
      visibility: 'Public'
    };
    
    setPosts([newPost, ...posts]);
    setShowCreatePostModal(false);
  };

  // Enhanced ranked posts
  const rankedPosts = useMemo(() => {
    return rankFeed(posts, currentUser, users, brands);
  }, [posts, currentUser, users, brands]);

  // Render functions
  const renderMusicPost = (post: PostType, author: any) => {
    const song = getSongForPost(post, songs, episodes);
    if (!song) return null;
    
    return (
      <MusicFeedPost 
        key={post.id}
        song={song}
        currentUser={currentUser}
        users={users}
        onPlayTrack={(track) => {
          setCurrentAudioTrack(track);
          setIsAudioPlaying(true);
        }}
        onProfileClick={(id) => {
          setSelectedUserId(id);
          setView('profile');
        }}
        onLikeTrack={() => {}}
        onTrackComment={() => {}}
        onTrackShare={() => {}}
        isLiked={false}
      />
    );
  };

  const renderRegularPost = (post: PostType, author: any) => {
    return (
      <Post 
        key={post.id}
        post={post}
        author={author}
        currentUser={currentUser}
        users={users}
        onProfileClick={(id) => {
          setSelectedUserId(id);
          setView('profile');
        }}
        onReact={() => {}}
        onShare={() => {}}
        onViewImage={setFullScreenImage}
        onOpenComments={setActiveCommentsPostId}
        onVideoClick={() => {}}
        onViewProduct={setActiveProduct}
        onGroupClick={() => {}}
        onPlayAudioTrack={() => {}}
        onFollow={() => {}}
        isFollowing={false}
        onHashtagClick={() => {}}
        onDeletePost={() => {}}
        isAdmin={false}
        getImageGridClass={() => ''}
        getImageItemClass={() => ''}
      />
    );
  };

  // MAIN RENDER - SIMPLIFIED
  return (
    <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
      {/* ALWAYS SHOW HEADER */}
      <Header 
        onHomeClick={() => handleNavigate('home')}
        onProfileClick={(id) => {
          if (currentUser) {
            setSelectedUserId(id);
            setView('profile');
          } else {
            setView('login');
          }
        }}
        onReelsClick={() => handleNavigate('reels')}
        onMarketplaceClick={() => handleNavigate('marketplace')}
        onGroupsClick={() => handleNavigate('groups')}
        currentUser={currentUser}
        notifications={[]}
        users={users}
        onLogout={handleLogout}
        onLoginClick={() => setView('login')}
        onMarkNotificationsRead={() => {}}
        onNotificationClick={() => {}}
        activeTab={activeTab}
        onNavigate={handleNavigate}
      />
      
      <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
        {/* SIDEBAR */}
        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
          <Sidebar 
            currentUser={currentUser || users[0]}
            onProfileClick={(id) => {
              if (currentUser) {
                setSelectedUserId(id);
                setView('profile');
              } else {
                setView('login');
              }
            }}
            onReelsClick={() => handleNavigate('reels')}
            onMarketplaceClick={() => handleNavigate('marketplace')}
            onGroupsClick={() => handleNavigate('groups')}
          />
        </div>
        
        {/* MAIN CONTENT - ALWAYS VISIBLE */}
        <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
          {view === 'login' && !currentUser ? (
            showRegister ? (
              <Register 
                onRegister={(user) => {
                  const newUser = { ...user, id: users.length + 1 } as User;
                  setUsers([...users, newUser]);
                  setCurrentUser(newUser);
                  setShowRegister(false);
                  setView('home');
                }}
                onBackToLogin={() => setShowRegister(false)}
              />
            ) : showForgotPassword ? (
              <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />
            ) : (
              <Login 
                onLogin={handleLogin}
                onNavigateToRegister={() => setShowRegister(true)}
                onNavigateToForgotPassword={() => setShowForgotPassword(true)}
                onClose={() => setView('home')}
                error={loginError}
              />
            )
          ) : view === 'home' ? (
            <div className="w-full pt-4 md:px-8 pb-10">
              {/* STORIES */}
              <StoryReel 
                stories={stories.map(story => ({
                  ...story,
                  user: users.find(u => u.id === story.userId)
                }))}
                onProfileClick={(id) => {
                  if (currentUser) {
                    setSelectedUserId(id);
                    setView('profile');
                  } else {
                    setView('login');
                  }
                }}
                onCreateStory={() => currentUser ? setShowCreateStoryModal(true) : setView('login')}
                onViewStory={setActiveStory}
                currentUser={currentUser}
                onRequestLogin={() => setView('login')}
              />
              
              {/* CREATE POST - ONLY FOR LOGGED IN */}
              {currentUser && (
                <CreatePost 
                  currentUser={currentUser}
                  onProfileClick={(id) => {
                    setSelectedUserId(id);
                    setView('profile');
                  }}
                  onClick={() => setShowCreatePostModal(true)}
                  onCreateEventClick={() => setShowCreateEventModal(true)}
                />
              )}
              
              {/* POSTS - ALWAYS VISIBLE */}
              {rankedPosts.map(post => {
                const author = getAuthorForPost(post, users, brands);
                if (!author) return null;
                
                if ((post.type === 'music' || post.type === 'podcast') && post.audioTrack) {
                  return renderMusicPost(post, author);
                }
                
                return renderRegularPost(post, author);
              })}
              
              {rankedPosts.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  No posts to show. {!currentUser && "Login to create the first post!"}
                </div>
              )}
            </div>
          ) : view === 'profile' && selectedUserId ? (
            <UserProfile 
              user={users.find(u => u.id === selectedUserId)!}
              currentUser={currentUser}
              users={users}
              posts={posts.filter(p => p.authorId === selectedUserId)}
              onProfileClick={(id) => {
                setSelectedUserId(id);
                setView('profile');
              }}
              onFollow={() => {}}
              onReact={() => {}}
              onComment={() => {}}
              onShare={() => {}}
              onMessage={() => {}}
              onCreatePost={handleCreatePost}
              onUpdateProfileImage={() => {}}
              onUpdateCoverImage={() => {}}
              onUpdateUserDetails={() => {}}
              onDeletePost={() => {}}
              onEditPost={() => {}}
              getCommentAuthor={(id) => users.find(u => u.id === id)}
              onViewImage={setFullScreenImage}
              onOpenComments={setActiveCommentsPostId}
              onVideoClick={() => {}}
              onCreateEventClick={() => setShowCreateEventModal(true)}
              onPlayAudioTrack={() => {}}
              onVerifyUser={() => {}}
              onRestrictUser={() => {}}
              onDeleteUser={() => {}}
              onMakeModerator={() => {}}
              onHashtagClick={() => {}}
              songs={songs}
              episodes={episodes}
              likedTracks={[]}
              onLikeTrack={() => {}}
              onTrackComment={() => {}}
              onTrackShare={() => {}}
              renderMusicPost={renderMusicPost}
              renderRegularPost={renderRegularPost}
              getImageGridClass={() => ''}
              getImageItemClass={() => ''}
            />
          ) : view === 'marketplace' ? (
            <MarketplacePage 
              products={products}
              currentUser={currentUser}
              onNavigateHome={() => handleNavigate('home')}
              onCreateProduct={(productData) => {
                const newProduct: Product = {
                  id: Date.now(),
                  ...productData,
                  sellerId: currentUser?.id || 0,
                  sellerName: currentUser?.name || '',
                  sellerAvatar: currentUser?.profileImage || '',
                  status: 'active',
                  views: 0,
                  ratings: [],
                  comments: [],
                  date: Date.now(),
                  shareId: 'prod_' + Math.random().toString(36).substr(2, 9)
                } as Product;
                setProducts([...products, newProduct]);
              }}
              onViewProduct={setActiveProduct}
            />
          ) : view === 'reels' ? (
            <ReelsFeed 
              reels={reels}
              users={users}
              currentUser={currentUser}
              activeReelId={activeReelId}
              onReelClick={setActiveReelId}
              onProfileClick={(id) => {
                setSelectedUserId(id);
                setView('profile');
              }}
              onNavigate={handleNavigate}
              onReact={() => {}}
              onShare={() => {}}
              onComment={() => {}}
              onCreateReelClick={() => {
                if (currentUser) {
                  // Show create reel modal
                } else {
                  setView('login');
                }
              }}
              onFollow={() => {}}
              getCommentAuthor={(id) => users.find(u => u.id === id)}
            />
          ) : view === 'groups' ? (
            <GroupsPage 
              groups={groups}
              currentUser={currentUser}
              users={users}
              initialGroupId={null}
              onCreateGroup={() => {}}
              onJoinGroup={() => {}}
              onLeaveGroup={() => {}}
              onDeleteGroup={() => {}}
              onUpdateGroupImage={() => {}}
              onPostToGroup={() => {}}
              onCreateGroupEvent={() => {}}
              onInviteToGroup={() => {}}
              onProfileClick={(id) => {
                setSelectedUserId(id);
                setView('profile');
              }}
              onLikePost={() => {}}
              onOpenComments={() => {}}
              onSharePost={() => {}}
              onDeleteGroupPost={() => {}}
              onRemoveMember={() => {}}
              onUpdateGroupSettings={() => {}}
              onPlayAudioTrack={() => {}}
              getImageGridClass={() => ''}
              getImageItemClass={() => ''}
            />
          ) : view === 'brands' ? (
            <BrandsPage 
              currentUser={currentUser}
              brands={brands}
              posts={posts.filter(p => p.brandId)}
              users={users}
              onCreateBrand={() => {}}
              onFollowBrand={() => {}}
              onProfileClick={(id) => {
                setSelectedUserId(id);
                setView('profile');
              }}
              onPostAsBrand={() => {}}
              onReact={() => {}}
              onShare={() => {}}
              onOpenComments={setActiveCommentsPostId}
              onUpdateBrand={() => {}}
              onDeleteBrand={() => {}}
              onMessage={() => {}}
              onCreateEvent={() => {}}
              onUpdateBrandImage={() => {}}
              onDeletePost={() => {}}
              onVerifyBrand={() => {}}
              initialBrandId={activeBrandId}
              onPlayAudioTrack={() => {}}
              getImageGridClass={() => ''}
              getImageItemClass={() => ''}
            />
          ) : view === 'music' ? (
            <MusicSystem 
              songs={songs}
              episodes={episodes}
              currentUser={currentUser}
              onPlayTrack={(track) => {
                setCurrentAudioTrack(track);
                setIsAudioPlaying(true);
              }}
              onProfileClick={(id) => {
                setSelectedUserId(id);
                setView('profile');
              }}
              onDeleteSong={() => {}}
              onDeleteEpisode={() => {}}
              likedTracks={[]}
              onToggleLike={() => {}}
              onUploadToFeed={() => {}}
              onAddSong={() => {}}
              onAddEpisode={() => {}}
              playHistory={[]}
            />
          ) : view === 'events' ? (
            <EventsPage 
              events={events}
              users={users}
              currentUser={currentUser}
              onJoinEvent={() => {}}
              onProfileClick={(id) => {
                setSelectedUserId(id);
                setView('profile');
              }}
              onCreateEvent={() => setShowCreateEventModal(true)}
            />
          ) : (
            // Default fallback - show home content
            <div className="w-full pt-4 md:px-8 pb-10">
              <div className="text-center py-20 text-gray-400">
                Content for {view} is loading...
                <button 
                  onClick={() => handleNavigate('home')}
                  className="mt-4 bg-[#1877F2] text-white px-4 py-2 rounded-lg"
                >
                  Go Home
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* RIGHT SIDEBAR */}
        <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
          <RightSidebar 
            contacts={users.filter(u => u.id !== currentUser?.id).slice(0, 5)}
            onProfileClick={(id) => {
              setSelectedUserId(id);
              setView('profile');
            }}
          />
        </div>
      </div>
      
      {/* MODALS */}
      {showCreatePostModal && currentUser && (
        <CreatePostModal 
          currentUser={currentUser}
          users={users}
          onClose={() => setShowCreatePostModal(false)}
          onCreatePost={handleCreatePost}
        />
      )}
      
      {activeStory && (
        <StoryViewer 
          story={activeStory}
          user={users.find(u => u.id === activeStory.userId)!}
          currentUser={currentUser}
          allStories={stories.map(s => ({ ...s, user: users.find(u => u.id === s.userId) }))}
          onClose={() => setActiveStory(null)}
          onLike={() => {}}
          onReply={() => {}}
          onNext={() => {}}
          onPrev={() => {}}
          onFollow={() => {}}
          isFollowing={false}
        />
      )}
      
      {activeProduct && (
        <ProductDetailModal 
          product={activeProduct}
          currentUser={currentUser}
          onClose={() => setActiveProduct(null)}
          onMessage={(sid) => setActiveChatUser(users.find(u => u.id === sid) || null)}
        />
      )}
      
      {fullScreenImage && (
        <ImageViewer 
          imageUrl={fullScreenImage}
          onClose={() => setFullScreenImage(null)}
        />
      )}
      
      {currentAudioTrack && (
        <GlobalAudioPlayer 
          currentTrack={currentAudioTrack}
          isPlaying={isAudioPlaying}
          onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)}
          onNext={() => {}}
          onPrevious={() => {}}
          onClose={() => {
            setCurrentAudioTrack(null);
            setIsAudioPlaying(false);
          }}
          onDownload={() => {}}
          onLike={() => {}}
          isLiked={false}
          uploaderProfile={users.find(u => u.id === currentAudioTrack.uploaderId)}
          onArtistClick={(id) => {
            setSelectedUserId(id);
            setView('profile');
          }}
        />
      )}
    </div>
  );
}
