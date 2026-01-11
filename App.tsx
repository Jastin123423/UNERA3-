
import React, { useState, useEffect, useMemo } from 'react';
import { Login, Register } from './components/Auth';
import { Header, Sidebar, RightSidebar } from './components/Layout';
import { CreatePost, Post, CommentsSheet, CreatePostModal, SuggestedProductsWidget } from './components/Feed';
import { StoryReel, StoryViewer } from './components/Story';
import { UserProfile } from './components/UserProfile';
import { MarketplacePage, ProductDetailModal } from './components/Marketplace';
import { ReelsFeed } from './components/Reels';
import { ImageViewer, Spinner } from './components/Common';
import { MessagesPage } from './components/MessagesPage';
import { MusicSystem, GlobalAudioPlayer } from './components/MusicSystem';
import { useLanguage } from './contexts/LanguageContext';
import { User, Post as PostType, Story, Reel, Notification, Product, ReactionType, Conversation, Message, AudioTrack } from './types';
import { api } from './services/api';

export default function App() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [stories, setStories] = useState<Story[]>([]); 
    const [reels, setReels] = useState<Reel[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('unera_token'));
    
    const [view, setView] = useState('home'); 
    const [activeTab, setActiveTab] = useState('home');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Audio State
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    // UI states
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [activeStory, setActiveStory] = useState<Story | null>(null);

    // Messaging & Notifs
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // 1. Initial Load from API - Guest Friendly
    useEffect(() => {
        const fetchContent = async () => {
            try {
                // Fetch public content regardless of token
                const [feedData, storiesData, reelsData, productsData] = await Promise.all([
                    api.getFeed(authToken),
                    api.getStories(authToken),
                    api.getReels(authToken),
                    api.getProducts(authToken)
                ]);
                setPosts(feedData);
                setStories(storiesData);
                setReels(reelsData);
                setProducts(productsData);

                // Fetch user data only if token exists
                if (authToken) {
                    const me = await api.getCurrentUser(authToken);
                    setCurrentUser(me);
                }
            } catch (err: any) {
                if (err.message.includes('Unauthorized')) handleLogout();
                else console.error("Data fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [authToken]);

    // 2. Real-time Polling (Only if Logged In)
    useEffect(() => {
        if (!authToken || !currentUser) return;
        const poll = async () => {
            try {
                const convos = await api.getConversations(authToken);
                setConversations(convos);
            } catch (e) { console.warn("Polling paused", e); }
        };
        const interval = setInterval(poll, 10000);
        return () => clearInterval(interval);
    }, [authToken, currentUser]);

    const handleLogin = async (email: string, pass: string) => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });
            const data = await response.json();
            if (data.token) {
                localStorage.setItem('unera_token', data.token);
                setAuthToken(data.token);
                setView('home');
            } else {
                alert(data.message || "Login failed");
            }
        } catch (err) {
            alert("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setAuthToken(null);
        localStorage.removeItem('unera_token');
        setView('home'); // Guests stay on home
    };

    const guestCheck = () => {
        if (!currentUser) {
            if (window.confirm("You need to be logged in to do this. Go to Login page?")) {
                setView('login');
            }
            return true;
        }
        return false;
    };

    const handleReact = async (postId: number, type: ReactionType) => {
        if (guestCheck()) return;
        try {
            await api.reactToPost(authToken!, postId, type);
            const updatedFeed = await api.getFeed(authToken);
            setPosts(updatedFeed);
        } catch (e) { alert("Action failed"); }
    };

    const handleCreatePost = async (text: string, file: File | null, type: any) => {
        if (guestCheck()) return;
        try {
            const payload = { content: text, type: type || 'text' };
            await api.createPost(authToken!, payload);
            const updatedFeed = await api.getFeed(authToken);
            setPosts(updatedFeed);
            setShowCreatePostModal(false);
        } catch (e) { alert("Post failed"); }
    };

    const handleNavigate = (target: string) => {
        if (['messages'].includes(target) && !currentUser) {
            setView('login');
            return;
        }
        setView(target);
        if (['home', 'reels', 'marketplace', 'groups', 'music'].includes(target)) setActiveTab(target);
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#18191A]"><Spinner /></div>;

    if (view === 'login' && !currentUser) {
        return <Login onLogin={handleLogin} onNavigateToRegister={() => setView('register')} onClose={() => setView('home')} error={error || ''} />;
    }

    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            {currentAudioTrack && (
                <GlobalAudioPlayer 
                    currentTrack={currentAudioTrack} isPlaying={isAudioPlaying} 
                    onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} 
                    onNext={() => {}} onPrevious={() => {}} onClose={() => setCurrentAudioTrack(null)} 
                    onDownload={() => guestCheck()} onLike={() => guestCheck()} isLiked={false}
                />
            )}

            <Header 
                onHomeClick={() => handleNavigate('home')} 
                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                onReelsClick={() => handleNavigate('reels')} 
                onMarketplaceClick={() => handleNavigate('marketplace')} 
                onGroupsClick={() => handleNavigate('groups')}
                currentUser={currentUser} notifications={notifications} users={users} onLogout={handleLogout} 
                onLoginClick={() => setView('login')}
                onMarkNotificationsRead={() => {}}
                activeTab={activeTab} onNavigate={handleNavigate}
            />

            <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                    {currentUser ? (
                        <Sidebar 
                            currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }}
                            onReelsClick={() => handleNavigate('reels')} onMarketplaceClick={() => handleNavigate('marketplace')} onGroupsClick={() => handleNavigate('groups')}
                        />
                    ) : (
                        <div className="w-[300px] p-4 text-[#B0B3B8]">
                            <p className="mb-4 text-sm font-bold uppercase tracking-wider">Public Navigation</p>
                            <button onClick={() => setView('login')} className="w-full bg-[#1877F2] text-white py-3 rounded-lg font-bold mb-4">Log In to UNERA</button>
                            <div className="flex flex-col gap-2">
                                <div onClick={() => handleNavigate('reels')} className="p-3 hover:bg-[#3A3B3C] rounded-lg cursor-pointer flex items-center gap-3"><i className="fas fa-clapperboard text-[#E41E3F]"></i> <span>Public Reels</span></div>
                                <div onClick={() => handleNavigate('marketplace')} className="p-3 hover:bg-[#3A3B3C] rounded-lg cursor-pointer flex items-center gap-3"><i className="fas fa-store text-[#1877F2]"></i> <span>Marketplace</span></div>
                                <div onClick={() => handleNavigate('music')} className="p-3 hover:bg-[#3A3B3C] rounded-lg cursor-pointer flex items-center gap-3"><i className="fas fa-music text-[#2D88FF]"></i> <span>UNERA Music</span></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                    {view === 'home' && (
                        <div className="w-full pt-4 md:px-8 pb-10">
                            <StoryReel stories={stories} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateStory={() => guestCheck()} onViewStory={setActiveStory} currentUser={currentUser} onRequestLogin={() => setView('login')} />
                            {currentUser ? (
                                <>
                                    <CreatePost currentUser={currentUser} onClick={() => setShowCreatePostModal(true)} />
                                    <SuggestedProductsWidget products={products} onViewProduct={setActiveProduct} onSeeAll={() => handleNavigate('marketplace')} />
                                </>
                            ) : (
                                <div className="bg-[#242526] p-6 rounded-xl border border-[#3E4042] mb-4 text-center">
                                    <h2 className="text-xl font-bold text-[#E4E6EB] mb-2">Welcome to UNERA</h2>
                                    <p className="text-[#B0B3B8] mb-4">Connect with friends and the world around you. Join today!</p>
                                    <button onClick={() => setView('login')} className="bg-[#1877F2] text-white px-8 py-2 rounded-lg font-bold">Log In or Sign Up</button>
                                </div>
                            )}
                            {posts.map(post => (
                                <Post 
                                    key={post.id} post={post} author={post as any} currentUser={currentUser} users={users}
                                    onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                                    onReact={handleReact} onShare={() => guestCheck()} onViewImage={() => {}} 
                                    onOpenComments={setActiveCommentsPostId} onViewProduct={setActiveProduct}
                                />
                            ))}
                        </div>
                    )}
                    {view === 'reels' && <ReelsFeed reels={reels} users={users} currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateReelClick={() => guestCheck()} onReact={handleReact} onComment={() => guestCheck()} onShare={() => guestCheck()} onFollow={() => guestCheck()} getCommentAuthor={(id) => users.find(u => u.id === id)} />}
                    {view === 'marketplace' && <MarketplacePage currentUser={currentUser} products={products} onNavigateHome={() => setView('home')} onCreateProduct={() => guestCheck()} onViewProduct={setActiveProduct} />}
                    {view === 'music' && <MusicSystem currentUser={currentUser} songs={[]} episodes={[]} onUpdateSongs={() => {}} onUpdateEpisodes={() => {}} onPlayTrack={setCurrentAudioTrack} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} onFeedPost={() => {}} users={users} />}
                    {view === 'messages' && currentUser && <MessagesPage currentUser={currentUser} conversations={conversations} messages={[]} users={users} onSendMessage={() => {}} onNavigateToProfile={() => {}} onSetInitialChatUserId={() => {}} />}
                    {view === 'profile' && selectedUserId && (
                         <div className="text-center py-20 text-[#B0B3B8]">
                            <p>Profiles are public. Browse posts below.</p>
                            <button onClick={() => setView('home')} className="mt-4 text-[#1877F2] font-bold">Back to Feed</button>
                         </div>
                    )}
                </div>

                <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                    {currentUser && <RightSidebar contacts={users} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                </div>
            </div>

            {showCreatePostModal && currentUser && <CreatePostModal currentUser={currentUser} onClose={() => setShowCreatePostModal(false)} onCreatePost={handleCreatePost} />}
            {activeCommentsPostId && <CommentsSheet post={posts.find(p => p.id === activeCommentsPostId)!} currentUser={currentUser} users={users} onClose={() => setActiveCommentsPostId(null)} onComment={() => guestCheck()} onLikeComment={() => guestCheck()} getCommentAuthor={(id: number) => users.find(u => u.id === id)} onProfileClick={() => {}} />}
            {activeProduct && <ProductDetailModal product={activeProduct} currentUser={currentUser} onClose={() => setActiveProduct(null)} onMessage={() => guestCheck()} />}
            {activeStory && <StoryViewer story={activeStory} user={users.find(u => u.id === activeStory.userId)!} currentUser={currentUser} onClose={() => setActiveStory(null)} allStories={stories} onLike={() => guestCheck()} onReply={() => guestCheck()} onFollow={() => guestCheck()} />}
        </div>
    );
}
