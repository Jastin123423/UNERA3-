
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
import { rankFeed } from './utils/ranking'; 

export default function App() {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [reels, setReels] = useState<Reel[]>([]);
    const [songs, setSongs] = useState<Song[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('unera_token'));
    const [view, setView] = useState('home'); 
    const [activeTab, setActiveTab] = useState('home');
    
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [activeReelId, setActiveReelId] = useState<number | null>(null);
    const [currentAudioTrack, setCurrentAudioTrack] = useState<AudioTrack | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
    const [showCreateReelModal, setShowCreateReelModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [activeStory, setActiveStory] = useState<Story | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);

    const rankedPosts = useMemo(() => rankFeed(posts, currentUser, users), [posts, currentUser, users]);

    const fetchCoreData = async () => {
        try {
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
            const [pRes, sRes, rRes, uRes, prodRes, songRes] = await Promise.all([
                fetch('/api/posts', { headers }),
                fetch('/api/stories', { headers }),
                fetch('/api/reels', { headers }),
                fetch('/api/users', { headers }),
                fetch('/api/products', { headers }),
                fetch('/api/songs', { headers })
            ]);

            if (pRes.ok) setPosts(await pRes.json());
            if (sRes.ok) setStories(await sRes.json());
            if (rRes.ok) setReels(await rRes.json());
            if (uRes.ok) setUsers(await uRes.json());
            if (prodRes.ok) setProducts(await prodRes.json());
            if (songRes.ok) setSongs(await songRes.json());
        } catch (err) {
            console.error("Sync Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (authToken) {
                try {
                    const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${authToken}` } });
                    if (res.ok) setCurrentUser(await res.json());
                    else handleLogout();
                } catch { handleLogout(); }
            }
            await fetchCoreData();
        };
        init();
        const poll = setInterval(fetchCoreData, 30000);
        return () => clearInterval(poll);
    }, [authToken]);

    const handleLogin = async (email: string, pass: string) => {
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();
        if (data.token) {
            setAuthToken(data.token);
            localStorage.setItem('unera_token', data.token);
            setCurrentUser(data.user);
            setView('home');
        } else alert(data.error || "Login Failed");
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setAuthToken(null);
        localStorage.removeItem('unera_token');
        setView('login');
    };

    const handleNavigate = (target: string) => {
        // 'music' removed from restricted list to allow guests
        if (['profile', 'settings', 'memories', 'create_event'].includes(target) && !currentUser) return setView('login');
        if (target === 'create_event') { setShowCreateEventModal(true); return; }
        setView(target);
        if (['home', 'reels', 'marketplace', 'groups', 'brands'].includes(target)) setActiveTab(target);
        window.scrollTo(0, 0);
    };

    const handleAction = async (method: string, url: string, body?: any) => {
        if (!authToken) return setView('login');
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: body ? JSON.stringify(body) : undefined
        });
        if (res.ok) fetchCoreData();
        return res;
    };

    if (isLoading && !currentUser) return <div className="h-screen flex items-center justify-center bg-[#18191A] text-white font-bold animate-pulse">UNERA SOCIAL...</div>;

    return (
        <div className="bg-[#18191A] min-h-screen flex flex-col font-sans">
            <Header 
                onHomeClick={() => handleNavigate('home')} 
                onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                onReelsClick={() => handleNavigate('reels')} 
                onMarketplaceClick={() => handleNavigate('marketplace')} 
                onGroupsClick={() => handleNavigate('groups')} 
                currentUser={currentUser} 
                users={users} 
                notifications={[]} 
                onLogout={handleLogout} 
                onLoginClick={() => setView('login')} 
                onMarkNotificationsRead={() => {}} 
                activeTab={activeTab} 
                onNavigate={handleNavigate} 
            />
            
            <div className="flex justify-center w-full max-w-[1920px] mx-auto relative flex-1">
                {currentUser && (
                    <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden lg:block">
                        <Sidebar 
                            currentUser={currentUser} 
                            onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} 
                            onReelsClick={() => handleNavigate('reels')} 
                            onMarketplaceClick={() => handleNavigate('marketplace')} 
                            onGroupsClick={() => handleNavigate('groups')} 
                        />
                    </div>
                )}
                
                <div className="w-full lg:w-[740px] xl:w-[700px] min-h-screen">
                    {view === 'home' && (
                        <div className="w-full pt-4 md:px-8 pb-10">
                            <StoryReel stories={stories} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateStory={() => setShowCreateStoryModal(true)} onViewStory={setActiveStory} currentUser={currentUser} onRequestLogin={() => setView('login')} />
                            {currentUser && <CreatePost currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onClick={() => setShowCreatePostModal(true)} onCreateEventClick={() => setShowCreateEventModal(true)} />}
                            <SuggestedProductsWidget products={products} currentUser={currentUser!} onViewProduct={setActiveProduct} onSeeAll={() => handleNavigate('marketplace')} />
                            {rankedPosts.map(post => {
                                const author = users.find(u => u.id === post.user_id);
                                if (!author) return null;
                                return <Post key={post.id} post={post} author={author} currentUser={currentUser} users={users} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onReact={(id) => handleAction('POST', `/api/posts/${id}/like`)} onShare={() => {}} onViewImage={setFullScreenImage} onOpenComments={setActiveCommentsPostId} onVideoClick={(p) => { setActiveReelId(p.id); setView('reels'); }} onPlayAudioTrack={(t) => { setCurrentAudioTrack(t); setIsAudioPlaying(true); }} />;
                            })}
                        </div>
                    )}

                    {view === 'reels' && <ReelsFeed reels={reels} users={users} currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onCreateReelClick={() => setShowCreateReelModal(true)} initialReelId={activeReelId} />}
                    {view === 'marketplace' && <MarketplacePage currentUser={currentUser} authToken={authToken} onNavigateHome={() => handleNavigate('home')} onViewProduct={setActiveProduct} />}
                    {view === 'groups' && <GroupsPage currentUser={currentUser} authToken={authToken} users={users} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onOpenComments={(gid, pid) => setActiveCommentsPostId(pid)} onPlayAudioTrack={(t) => { setCurrentAudioTrack(t); setIsAudioPlaying(true); }} />}
                    {view === 'brands' && <BrandsPage currentUser={currentUser} users={users} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onOpenComments={setActiveCommentsPostId} onPlayAudioTrack={(t) => { setCurrentAudioTrack(t); setIsAudioPlaying(true); }} />}
                    {view === 'music' && <MusicSystem currentUser={currentUser} authToken={authToken} onPlayTrack={(t) => { setCurrentAudioTrack(t); setIsAudioPlaying(true); }} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} users={users} onLoginRequest={() => setView('login')} />}
                    {view === 'events' && currentUser && <EventsPage currentUser={currentUser} onCreateEventClick={() => setShowCreateEventModal(true)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                    {view === 'profiles' && currentUser && <SuggestedProfilesPage currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />}
                    {view === 'memories' && currentUser && <MemoriesPage currentUser={currentUser} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onOpenComments={setActiveCommentsPostId} onViewImage={setFullScreenImage} />}
                    {view === 'settings' && <SettingsPage currentUser={currentUser} onUpdateUser={(d) => handleAction('PUT', '/api/users/me', d)} />}
                    {view === 'help' && <HelpSupportPage onNavigateHome={() => setView('home')} />}
                    {view === 'privacy' && <PrivacyPolicyPage onNavigateHome={() => setView('home')} />}
                    {view === 'terms' && <TermsOfServicePage onNavigateHome={() => setView('home')} />}

                    {view === 'profile' && selectedUserId !== null && (
                        <UserProfile user={users.find(u => u.id === selectedUserId)!} currentUser={currentUser} users={users} posts={posts} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} onMessage={(id) => setActiveChatUser(users.find(u => u.id === id) || null)} onViewImage={setFullScreenImage} onOpenComments={setActiveCommentsPostId} onPlayAudioTrack={(t) => { setCurrentAudioTrack(t); setIsAudioPlaying(true); }} />
                    )}

                    {view === 'login' && <Login onLogin={handleLogin} onNavigateToRegister={() => setView('register')} onNavigateToForgotPassword={() => {}} onClose={() => setView('home')} error="" />}
                    {view === 'register' && <Register onRegister={(u) => handleAction('POST', '/api/users/signup', u)} onBackToLogin={() => setView('login')} />}
                </div>

                {currentUser && (
                    <div className="sticky top-14 h-[calc(100vh-56px)] z-20 hidden xl:block pl-4">
                        <RightSidebar contacts={users.filter(u => u.id !== currentUser?.id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); }} />
                    </div>
                )}
            </div>

            {currentAudioTrack && <GlobalAudioPlayer currentTrack={currentAudioTrack} isPlaying={isAudioPlaying} onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)} onClose={() => setCurrentAudioTrack(null)} />}
            {activeChatUser && currentUser && <ChatWindow currentUser={currentUser} recipient={activeChatUser} onClose={() => setActiveChatUser(null)} />}
            {activeCommentsPostId && currentUser && <CommentsSheet post={posts.find(p => p.id === activeCommentsPostId)!} currentUser={currentUser} users={users} onClose={() => setActiveCommentsPostId(null)} onComment={(id, txt) => handleAction('POST', `/api/posts/${id}/comment`, { text: txt })} onLikeComment={() => {}} getCommentAuthor={(id) => users.find(u => u.id === id)} onProfileClick={(id) => { setSelectedUserId(id); setView('profile'); setActiveCommentsPostId(null); }} />}
            {showCreatePostModal && currentUser && <CreatePostModal currentUser={currentUser} users={users} onClose={() => setShowCreatePostModal(false)} onCreatePost={(txt, f) => handleAction('POST', '/api/posts', { content: txt })} />}
            {showCreateStoryModal && currentUser && <CreateStoryModal currentUser={currentUser} songs={songs} onClose={() => setShowCreateStoryModal(false)} onCreate={(s) => handleAction('POST', '/api/stories', s)} />}
            {showCreateReelModal && currentUser && <CreateReelModal songs={songs} onClose={() => setShowCreateReelModal(false)} onSubmit={(f, c) => handleAction('POST', '/api/reels', { caption: c, video_url: URL.createObjectURL(f) })} />}
            {showCreateEventModal && currentUser && <CreateEventModal currentUser={currentUser} onClose={() => setShowCreateEventModal(false)} onCreate={(e) => handleAction('POST', '/api/events', e)} />}
            {activeProduct && <ProductDetailModal product={activeProduct} onClose={() => setActiveProduct(null)} currentUser={currentUser} onMessage={(id) => { setSelectedUserId(id); setView('profile'); setActiveProduct(null); }} />}
            {fullScreenImage && <ImageViewer imageUrl={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
        </div>
    );
}
