import React, { useState, useEffect, useRef } from 'react';
import { Song, Episode, AudioTrack, User } from '../types';
import { MOCK_SONGS, MOCK_EPISODES } from '../constants';

// REMOVED THE PROBLEMATIC RE-EXPORT LINE:
// export { GlobalAudioPlayer } from './MusicSystem';

// Main MusicSystem Component - UPDATED to accept your props AND include upload features
interface MusicSystemProps {
    songs: Song[];
    episodes: Episode[];
    currentUser: User | null;
    onPlayTrack: (track: AudioTrack) => void;
    onProfileClick?: (id: number) => void;
    onDeleteSong: (id: string) => void;
    onDeleteEpisode: (id: string) => void;
    likedTracks: string[];
    onToggleLike: (id: string) => void;
}

export const MusicSystem: React.FC<MusicSystemProps> = ({
    songs,
    episodes,
    currentUser,
    onPlayTrack,
    onProfileClick,
    onDeleteSong,
    onDeleteEpisode,
    likedTracks,
    onToggleLike,
}) => {
    const [view, setView] = useState<'music' | 'podcasts' | 'dashboard' | 'artist'>('music');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [downloads, setDownloads] = useState<string[]>([]);
    
    // Create structured data for Google
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "UNERA Music",
        "url": "https://unera.social/music",
        "description": "Stream and upload music on UNERA Social Platform",
        "publisher": {
            "@type": "Organization",
            "name": "UNERA",
            "logo": "https://unera.social/logo.png"
        }
    };
    
    // Filter songs based on search
    const filteredSongs = songs.filter(song => 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Filter episodes based on search
    const filteredEpisodes = episodes.filter(episode =>
        episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (episode.host && episode.host.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    const isAdmin = currentUser?.role === 'admin';
    
    const handleArtistClick = (uploaderId: number) => {
        if (onProfileClick) {
            onProfileClick(uploaderId);
        } else {
            setSelectedArtistId(uploaderId);
            setView('artist');
        }
    };
    
    const handlePlayTrackFromSong = (song: Song) => {
        const audioTrack: AudioTrack = {
            id: song.id,
            title: song.title,
            artist: song.artist,
            duration: typeof song.duration === 'string' ? 
                parseInt(song.duration.split(':')[0]) * 60 + parseInt(song.duration.split(':')[1]) || 180 : 
                song.duration || 180,
            url: song.audioUrl || '',
            uploaderId: song.uploaderId || 1,
            cover: song.cover,
            type: 'music',
            isVerified: true
        };
        onPlayTrack(audioTrack);
    };
    
    const handlePlayTrackFromEpisode = (episode: Episode) => {
        const audioTrack: AudioTrack = {
            id: episode.id,
            title: episode.title,
            artist: episode.host || 'Podcast Host',
            duration: typeof episode.duration === 'string' ?
                parseInt(episode.duration.split(':')[0]) * 60 + parseInt(episode.duration.split(':')[1]) || 1800 :
                episode.duration || 1800,
            url: episode.audioUrl || '',
            uploaderId: episode.uploaderId || 1,
            cover: episode.thumbnail,
            type: 'podcast',
            isVerified: true
        };
        onPlayTrack(audioTrack);
    };
    
    const handleUpload = (items: any[], type: 'music' | 'podcast', meta?: any) => {
        console.log('Uploaded:', items, type, meta);
        // Here you would typically send to backend
        // For now, just show alert
        alert(`${items.length} ${type} item(s) uploaded successfully!`);
    };
    
    const handleDownload = (id: string) => {
        if (!currentUser) {
            alert("Please login to download music.");
            return;
        }
        if (!downloads.includes(id)) {
            setDownloads([...downloads, id]);
            alert("Download started!");
        }
    };
    
    const selectedArtistUser = currentUser && selectedArtistId === currentUser.id ? currentUser : {
        id: selectedArtistId || 0,
        name: songs.find(s => s.uploaderId === selectedArtistId)?.artist || 'Artist',
        profileImage: 'https://ui-avatars.com/api/?name=Artist&background=random',
        coverImage: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        followers: [],
        following: [],
        isOnline: false,
        isVerified: true,
        role: 'user'
    } as User;
    
    // Add Google Schema markup for SEO
    useEffect(() => {
        const addMusicSchema = () => {
            const schema = {
                "@context": "https://schema.org",
                "@type": "MusicGroup",
                "name": "UNERA Music",
                "description": "Stream and upload music on UNERA Social Platform",
                "url": window.location.href,
                "track": songs.slice(0, 10).map(song => ({
                    "@type": "MusicRecording",
                    "name": song.title,
                    "byArtist": {
                        "@type": "MusicGroup",
                        "name": song.artist
                    },
                    "duration": song.duration || "PT3M",
                    "url": song.audioUrl
                }))
            };
            
            // Remove existing schema
            const existingSchema = document.querySelector('script[type="application/ld+json"]');
            if (existingSchema) {
                existingSchema.remove();
            }
            
            // Add new schema
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(schema);
            document.head.appendChild(script);
        };
        
        addMusicSchema();
    }, [songs]);
    
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
            {/* Add structured data for Google */}
            <script 
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            
            {/* Navigation Tabs */}
            <div className="sticky top-14 bg-[#0A0A0A]/95 backdrop-blur-md z-30 px-4 py-4 border-b border-[#222] flex gap-6 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setView('music')}
                    className={`cursor-pointer font-bold text-sm whitespace-nowrap ${view === 'music' ? 'text-[#1877F2]' : 'text-gray-400 hover:text-white'}`}
                >
                    MUSIC
                </button>
                <button
                    onClick={() => setView('podcasts')}
                    className={`cursor-pointer font-bold text-sm whitespace-nowrap ${view === 'podcasts' ? 'text-[#1877F2]' : 'text-gray-400 hover:text-white'}`}
                >
                    PODCASTS
                </button>
                {currentUser && (
                    <button
                        onClick={() => setView('dashboard')}
                        className={`cursor-pointer font-bold text-sm whitespace-nowrap ${view === 'dashboard' ? 'text-[#1877F2]' : 'text-gray-400 hover:text-white'}`}
                    >
                        DASHBOARD
                    </button>
                )}
                {selectedArtistId && (
                    <button
                        onClick={() => setView('artist')}
                        className={`cursor-pointer font-bold text-sm whitespace-nowrap ${view === 'artist' ? 'text-[#1877F2]' : 'text-gray-400 hover:text-white'}`}
                    >
                        ARTIST
                    </button>
                )}
            </div>
            
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">🎵 UNERA Music</h1>
                            <p className="text-[#B0B3B8] text-lg">Stream, upload, and discover music with Google SEO indexing</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search music or podcasts..."
                                    className="bg-[#242526] text-white px-4 py-3 pl-10 rounded-xl w-full md:w-64 border border-[#3E4042] focus:border-[#1877F2] focus:outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <i className="fas fa-search absolute left-3 top-3.5 text-[#B0B3B8]"></i>
                            </div>
                            {currentUser && (
                                <button 
                                    onClick={() => setShowUploadModal(true)}
                                    className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
                                >
                                    <i className="fas fa-cloud-upload-alt"></i> Upload
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Stats Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#242526] rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[#B0B3B8] text-sm">Total Songs</p>
                                    <p className="text-2xl font-bold text-white">{songs.length}</p>
                                </div>
                                <i className="fas fa-music text-[#1877F2] text-xl"></i>
                            </div>
                        </div>
                        <div className="bg-[#242526] rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[#B0B3B8] text-sm">Total Podcasts</p>
                                    <p className="text-2xl font-bold text-white">{episodes.length}</p>
                                </div>
                                <i className="fas fa-podcast text-[#45BD62] text-xl"></i>
                            </div>
                        </div>
                        <div className="bg-[#242526] rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[#B0B3B8] text-sm">Total Plays</p>
                                    <p className="text-2xl font-bold text-white">
                                        {songs.reduce((acc, s) => acc + (s.stats?.plays || 0), 0) + 
                                         episodes.reduce((acc, e) => acc + (e.stats?.plays || 0), 0)}
                                    </p>
                                </div>
                                <i className="fas fa-headphones text-[#F3425F] text-xl"></i>
                            </div>
                        </div>
                        <div className="bg-[#242526] rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[#B0B3B8] text-sm">Your Likes</p>
                                    <p className="text-2xl font-bold text-white">{likedTracks.length}</p>
                                </div>
                                <i className="fas fa-heart text-[#F3425F] text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Main Content Views */}
                {view === 'music' && (
                    <div className="space-y-8">
                        {/* Featured Albums */}
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Featured Music</h2>
                                <button className="text-[#1877F2] hover:text-[#166FE5] font-semibold">
                                    View All
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {songs.slice(0, 5).map((song) => (
                                    <div 
                                        key={song.id}
                                        className="bg-[#3A3B3C] rounded-xl overflow-hidden hover:bg-[#4E4F50] transition-colors cursor-pointer group"
                                        onClick={() => handlePlayTrackFromSong(song)}
                                    >
                                        <div className="relative aspect-square overflow-hidden">
                                            <img 
                                                src={song.cover} 
                                                alt={song.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                                    <i className="fas fa-play text-black text-xl ml-1"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-bold text-white truncate text-sm">{song.title}</h3>
                                            <p className="text-[#B0B3B8] text-xs truncate">{song.artist}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[#B0B3B8] text-xs">{song.duration || '3:00'}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleLike(song.id);
                                                    }}
                                                    className="text-sm hover:scale-110 transition-transform"
                                                >
                                                    <i className={`${likedTracks.includes(song.id) ? 'fas text-[#F3425F]' : 'far'} fa-heart`}></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* All Songs */}
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-6">All Songs ({filteredSongs.length})</h2>
                            <div className="space-y-2">
                                {filteredSongs.length > 0 ? (
                                    filteredSongs.map((song, index) => (
                                        <div 
                                            key={song.id}
                                            className="flex items-center gap-4 p-4 hover:bg-[#3A3B3C] rounded-xl cursor-pointer transition-colors group"
                                            onClick={() => handlePlayTrackFromSong(song)}
                                        >
                                            <div className="text-[#B0B3B8] font-bold w-6 text-center">
                                                {index + 1}
                                            </div>
                                            <img 
                                                src={song.cover} 
                                                alt={song.title}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white truncate">{song.title}</h3>
                                                <div 
                                                    className="flex items-center gap-1 text-[#B0B3B8] text-sm cursor-pointer hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (song.uploaderId) {
                                                            handleArtistClick(song.uploaderId);
                                                        }
                                                    }}
                                                >
                                                    <span>{song.artist}</span>
                                                    {song.uploaderId && currentUser?.id === song.uploaderId && (
                                                        <i className="fas fa-check-circle text-[#1877F2] text-xs"></i>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[#B0B3B8] text-sm">{song.duration || '3:00'}</span>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleLike(song.id);
                                                    }}
                                                    className="text-lg hover:scale-110 transition-transform"
                                                >
                                                    <i className={`${likedTracks.includes(song.id) ? 'fas text-[#F3425F]' : 'far'} fa-heart`}></i>
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteSong(song.id);
                                                        }}
                                                        className="text-red-500 hover:text-red-400"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <i className="fas fa-music text-5xl text-[#B0B3B8] mb-4"></i>
                                        <p className="text-[#B0B3B8] text-lg">No songs found</p>
                                        {searchQuery && (
                                            <p className="text-[#B0B3B8] text-sm mt-2">Try a different search term</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'podcasts' && (
                    <div className="space-y-8">
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-6">Podcasts & Episodes ({filteredEpisodes.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEpisodes.length > 0 ? (
                                    filteredEpisodes.map((episode) => (
                                        <div 
                                            key={episode.id}
                                            className="bg-[#3A3B3C] rounded-xl overflow-hidden hover:bg-[#4E4F50] transition-colors cursor-pointer group"
                                            onClick={() => handlePlayTrackFromEpisode(episode)}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="relative w-16 h-16 flex-shrink-0">
                                                        <img 
                                                            src={episode.thumbnail} 
                                                            alt={episode.title}
                                                            className="w-full h-full object-cover rounded-lg"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <i className="fas fa-play text-white"></i>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-white line-clamp-2">{episode.title}</h3>
                                                        <p className="text-[#B0B3B8] text-sm mt-1">{episode.host || 'Unknown Host'}</p>
                                                        <div className="flex items-center justify-between mt-3">
                                                            <span className="text-[#B0B3B8] text-xs">{episode.duration || '45:00'}</span>
                                                            {isAdmin && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteEpisode(episode.id);
                                                                    }}
                                                                    className="text-red-500 hover:text-red-400"
                                                                >
                                                                    <i className="fas fa-trash"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {episode.description && (
                                                    <p className="text-[#B0B3B8] text-sm mt-3 line-clamp-2">
                                                        {episode.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-3 text-center py-12">
                                        <i className="fas fa-podcast text-5xl text-[#B0B3B8] mb-4"></i>
                                        <p className="text-[#B0B3B8] text-lg">No podcasts found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'dashboard' && currentUser && (
                    <div className="space-y-8">
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <div className="flex flex-col items-center justify-center mb-10 mt-4 text-center">
                                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">Creator Studio</h2>
                                <p className="text-[#888] mb-6 max-w-2xl">Upload your music, podcasts, and albums. Monitor your performance.</p>
                                <button 
                                    onClick={() => setShowUploadModal(true)}
                                    className="bg-gradient-to-r from-[#1877F2] to-[#0062E3] px-10 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 transition-transform shadow-[0_4px_20px_rgba(24,119,242,0.5)] text-lg"
                                >
                                    <i className="fas fa-cloud-upload-alt text-2xl"></i> Upload New Content
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[#888] font-bold text-xs uppercase tracking-wider">Your Songs</p>
                                            <h3 className="text-4xl font-bold text-white mt-1">
                                                {songs.filter(s => s.uploaderId === currentUser.id).length}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-[#1877F2]/10 rounded-full text-[#1877F2]">
                                            <i className="fas fa-music text-2xl"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[#888] font-bold text-xs uppercase tracking-wider">Your Podcasts</p>
                                            <h3 className="text-4xl font-bold text-white mt-1">
                                                {episodes.filter(e => e.uploaderId === currentUser.id).length}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-[#45BD62]/10 rounded-full text-[#45BD62]">
                                            <i className="fas fa-podcast text-2xl"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[#888] font-bold text-xs uppercase tracking-wider">Total Plays</p>
                                            <h3 className="text-4xl font-bold text-white mt-1">
                                                {songs.filter(s => s.uploaderId === currentUser.id).reduce((acc, s) => acc + (s.stats?.plays || 0), 0) + 
                                                 episodes.filter(e => e.uploaderId === currentUser.id).reduce((acc, e) => acc + (e.stats?.plays || 0), 0)}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-[#F3425F]/10 rounded-full text-[#F3425F]">
                                            <i className="fas fa-headphones text-2xl"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-[#1E1E1E] rounded-2xl border border-[#333] overflow-hidden">
                                <div className="p-6 border-b border-[#333]">
                                    <h3 className="text-xl font-bold text-white">Your Catalog</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-[#252525] text-[#888] text-xs uppercase font-bold">
                                            <tr>
                                                <th className="p-4">Content</th>
                                                <th className="p-4">Type</th>
                                                <th className="p-4 text-right">Plays</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#333]">
                                            {[...songs.filter(s => s.uploaderId === currentUser.id), ...episodes.filter(e => e.uploaderId === currentUser.id)].map((item) => (
                                                <tr key={item.id} className="hover:bg-[#2A2A2A]">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={item.cover || (item as any).thumbnail} className="w-10 h-10 rounded object-cover" alt="" />
                                                            <div>
                                                                <div className="font-bold text-white text-sm">{item.title}</div>
                                                                <div className="text-xs text-[#888]">{item.duration}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {(item as any).host ? 'Podcast' : 'Music'}
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-sm">
                                                        {item.stats?.plays || 0}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button 
                                                            onClick={() => (item as any).host ? onDeleteEpisode(item.id) : onDeleteSong(item.id)}
                                                            className="text-red-500 hover:text-red-400 p-2"
                                                        >
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {songs.filter(s => s.uploaderId === currentUser.id).length === 0 && episodes.filter(e => e.uploaderId === currentUser.id).length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-12 text-center text-[#666]">
                                                        <div className="mb-3">
                                                            <i className="fas fa-music text-4xl opacity-50"></i>
                                                        </div>
                                                        <p className="text-lg">No uploads yet.</p>
                                                        <p className="text-sm">Start by clicking "Upload New Content" above.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'artist' && selectedArtistUser && (
                    <div className="space-y-8">
                        <div className="bg-[#242526] rounded-2xl overflow-hidden">
                            <div className="h-48 relative">
                                <img src={selectedArtistUser.coverImage || selectedArtistUser.profileImage} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent"></div>
                                <div className="absolute bottom-4 left-4 flex items-end gap-4">
                                    <img src={selectedArtistUser.profileImage} className="w-20 h-20 rounded-full border-4 border-[#0A0A0A] shadow-xl" alt="" />
                                    <div className="mb-2">
                                        <h1 className="text-2xl font-bold flex items-center gap-2">
                                            {selectedArtistUser.name}
                                            {selectedArtistUser.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-sm"></i>}
                                        </h1>
                                        <p className="text-[#CCC] text-sm">
                                            {selectedArtistUser.followers?.length || 0} Followers
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-white mb-4">Popular Releases</h2>
                                    <div className="space-y-2">
                                        {songs.filter(s => s.uploaderId === selectedArtistUser.id).slice(0, 5).map((song, i) => (
                                            <div 
                                                key={song.id}
                                                className="flex items-center gap-4 p-3 hover:bg-[#3A3B3C] rounded-xl cursor-pointer group transition-colors"
                                                onClick={() => handlePlayTrackFromSong(song)}
                                            >
                                                <div className="text-[#B0B3B8] font-bold w-4 text-center group-hover:hidden">{i + 1}</div>
                                                <div className="hidden group-hover:block w-4 text-center text-white">
                                                    <i className="fas fa-play"></i>
                                                </div>
                                                <img src={song.cover} className="w-10 h-10 rounded object-cover" alt="" />
                                                <div className="flex-1">
                                                    <div className="font-bold text-white text-sm">{song.title}</div>
                                                    <div className="text-xs text-[#888]">{song.stats?.plays || 0} plays</div>
                                                </div>
                                                <div className="text-sm text-[#B0B3B8]">{song.duration || '3:00'}</div>
                                            </div>
                                        ))}
                                        {songs.filter(s => s.uploaderId === selectedArtistUser.id).length === 0 && (
                                            <p className="text-[#666] text-center py-4">No tracks available from this artist.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Upload Modal */}
            {showUploadModal && currentUser && (
                <AudioUploadModal 
                    currentUser={currentUser}
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleUpload}
                />
            )}
        </div>
    );
};

// Audio Upload Modal Component
interface AudioUploadModalProps {
    currentUser: User;
    onClose: () => void;
    onUpload: (items: any[], type: 'music' | 'podcast', meta?: any) => void;
}

export const AudioUploadModal: React.FC<AudioUploadModalProps> = ({ currentUser, onClose, onUpload }) => {
    const [mode, setMode] = useState<'single' | 'album' | 'podcast'>('single');
    const [artist, setArtist] = useState(currentUser.name);
    const [genre, setGenre] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState('');
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [albumTitle, setAlbumTitle] = useState('');
    const [albumTracks, setAlbumTracks] = useState<{title: string, file: File, cover?: string, artist?: string}[]>([]);
    const [season, setSeason] = useState('');
    const [episodeNum, setEpisodeNum] = useState('');
    const [guests, setGuests] = useState('');
    const [tempTrackTitle, setTempTrackTitle] = useState('');
    const [tempTrackArtist, setTempTrackArtist] = useState(currentUser.name);
    const [tempTrackFile, setTempTrackFile] = useState<File | null>(null);
    const [tempTrackCover, setTempTrackCover] = useState('');
    
    const defaultCover = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const trackInputRef = useRef<HTMLInputElement>(null);

    const handleAddTrack = () => {
        if (!tempTrackTitle || !tempTrackFile) {
            alert("Track title and audio file are required.");
            return;
        }
        setAlbumTracks([...albumTracks, {
            title: tempTrackTitle,
            artist: tempTrackArtist,
            file: tempTrackFile,
            cover: tempTrackCover
        }]);
        setTempTrackTitle('');
        setTempTrackFile(null);
        setTempTrackCover('');
    };

    const handleMainSubmit = () => {
        const cover = coverPreview || defaultCover;
        if (mode === 'single') {
            if (!title || !audioFile) return alert("Title and audio file required");
            onUpload([{ 
                title, 
                artist, 
                genre, 
                cover, 
                album: 'Single', 
                duration: '3:45', 
                audioUrl: URL.createObjectURL(audioFile),
                uploaderId: currentUser.id,
                stats: { plays: 0, downloads: 0, shares: 0, likes: 0, reelsUse: 0 }
            }], 'music');
        } else if (mode === 'album') {
            if (!albumTitle || albumTracks.length === 0) return alert("Album title and at least 1 track required");
            const processedTracks = albumTracks.map(t => ({ 
                title: t.title, 
                artist: t.artist || artist, 
                genre, 
                album: albumTitle, 
                cover: t.cover || cover, 
                duration: '3:30', 
                audioUrl: URL.createObjectURL(t.file),
                uploaderId: currentUser.id,
                stats: { plays: 0, downloads: 0, shares: 0, likes: 0, reelsUse: 0 }
            }));
            onUpload(processedTracks, 'music', { albumTitle, isAlbum: true });
        } else if (mode === 'podcast') {
            if (!title || !desc || !audioFile) return alert("Title, description and audio required");
            onUpload([{ 
                title, 
                description: desc, 
                season, 
                episode: episodeNum, 
                guests, 
                host: artist, 
                cover, 
                duration: '45:00', 
                audioUrl: URL.createObjectURL(audioFile),
                uploaderId: currentUser.id,
                stats: { plays: 0, downloads: 0, shares: 0, likes: 0, reelsUse: 0 }
            }], 'podcast');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
             <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-3xl border border-[#333] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-[#333] bg-[#252525]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-[#FFF] text-2xl font-bold">Professional Upload</h2>
                            <p className="text-[#888] text-sm">Distribute your content to UNERA Music</p>
                        </div>
                        <i className="fas fa-times text-[#888] cursor-pointer text-xl hover:text-white transition-colors" onClick={onClose}></i>
                    </div>
                    <div className="flex p-1 bg-[#111] rounded-lg">
                        {['single', 'album', 'podcast'].map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMode(m as any)} 
                                className={`flex-1 py-2.5 rounded-md font-bold capitalize text-sm transition-all ${mode === m ? 'bg-[#1877F2] text-white shadow-lg' : 'text-[#888] hover:text-white'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">
                                    {mode === 'podcast' ? 'Host / Creator Name' : 'Main Artist Name'}
                                </label>
                                <input 
                                    className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2]" 
                                    value={artist} 
                                    onChange={e => setArtist(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Genre / Category</label>
                                <input 
                                    className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2]" 
                                    placeholder="Pop, Tech, News..." 
                                    value={genre} 
                                    onChange={e => setGenre(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">
                                    {mode === 'album' ? 'Album Artwork' : 'Artwork'}
                                </label>
                                <div 
                                    onClick={() => coverInputRef.current?.click()} 
                                    className="w-full bg-[#151515] border border-[#333] rounded-lg h-[120px] flex flex-col items-center justify-center cursor-pointer hover:border-[#1877F2] group relative overflow-hidden"
                                >
                                    {coverPreview ? 
                                        <img src={coverPreview} className="w-full h-full object-cover" alt="Cover Preview" /> : 
                                        <>
                                            <i className="fas fa-image text-2xl text-[#666] group-hover:text-white mb-2"></i>
                                            <span className="text-[#666] text-xs group-hover:text-white">Upload Image</span>
                                        </>
                                    }
                                    <input 
                                        type="file" 
                                        ref={coverInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={(e) => { 
                                            if(e.target.files?.[0]) { 
                                                setCoverPreview(URL.createObjectURL(e.target.files[0])); 
                                            } 
                                        }} 
                                    />
                                </div>
                            </div>
                            {(mode === 'single' || mode === 'podcast') && (
                                <div 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="border-2 border-dashed border-[#333] bg-[#151515] rounded-lg h-[86px] flex items-center justify-center cursor-pointer hover:border-[#1877F2] group"
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="audio/*" 
                                        onChange={(e) => { 
                                            if(e.target.files) setAudioFile(e.target.files[0]); 
                                        }} 
                                    />
                                    {audioFile ? 
                                        <div className="text-[#1877F2] font-semibold flex items-center gap-2">
                                            <i className="fas fa-check-circle"></i> {audioFile.name}
                                        </div> : 
                                        <div className="text-[#666] group-hover:text-white flex items-center gap-2">
                                            <i className="fas fa-cloud-upload-alt"></i> Upload High Quality Audio
                                        </div>
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-[#333] pt-6">
                        {mode === 'single' && (
                            <div>
                                <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Song Name</label>
                                <input 
                                    className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] text-lg font-bold" 
                                    placeholder="Enter song title..." 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                />
                            </div>
                        )}
                        {mode === 'podcast' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Episode Title</label>
                                    <input 
                                        className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] text-lg font-bold" 
                                        placeholder="e.g. The Future of AI" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <input 
                                        className="bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none" 
                                        placeholder="Season (e.g. 1)" 
                                        value={season} 
                                        onChange={e => setSeason(e.target.value)} 
                                    />
                                    <input 
                                        className="bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none" 
                                        placeholder="Episode # (e.g. 5)" 
                                        value={episodeNum} 
                                        onChange={e => setEpisodeNum(e.target.value)} 
                                    />
                                    <input 
                                        className="bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none" 
                                        placeholder="Guest Names" 
                                        value={guests} 
                                        onChange={e => setGuests(e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Description / Show Notes</label>
                                    <textarea 
                                        className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] h-60 resize-none" 
                                        placeholder="Write a professional description about this episode..." 
                                        value={desc} 
                                        onChange={e => setDesc(e.target.value)} 
                                    />
                                </div>
                            </div>
                        )}
                        {mode === 'album' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Album Name</label>
                                    <input 
                                        className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] text-lg font-bold" 
                                        placeholder="Enter album title..." 
                                        value={albumTitle} 
                                        onChange={e => setAlbumTitle(e.target.value)} 
                                    />
                                </div>
                                <div className="bg-[#111] p-4 rounded-xl border border-[#333]">
                                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <i className="fas fa-list-ol text-[#1877F2]"></i> Add Tracks to Album
                                    </h4>
                                    <div className="space-y-2 mb-4">
                                        {albumTracks.map((t, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded border border-[#333]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[#666] font-mono">{idx + 1}</span>
                                                    <img src={t.cover || coverPreview || defaultCover} className="w-8 h-8 rounded object-cover" alt="" />
                                                    <div>
                                                        <span className="text-white font-semibold block">{t.title}</span>
                                                        <span className="text-[#666] text-xs">{t.artist}</span>
                                                    </div>
                                                </div>
                                                <i 
                                                    className="fas fa-trash text-red-500 cursor-pointer" 
                                                    onClick={() => setAlbumTracks(albumTracks.filter((_, i) => i !== idx))}
                                                ></i>
                                            </div>
                                        ))}
                                        {albumTracks.length === 0 && (
                                            <div className="text-[#666] text-sm text-center py-2">No tracks added yet.</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 p-3 bg-[#1A1A1A] rounded border border-[#333] border-dashed">
                                        <div className="grid grid-cols-2 gap-2">
                                            <input 
                                                className="bg-[#151515] border border-[#333] p-2 rounded text-white text-sm" 
                                                placeholder="Song Name" 
                                                value={tempTrackTitle} 
                                                onChange={e => setTempTrackTitle(e.target.value)} 
                                            />
                                            <input 
                                                className="bg-[#151515] border border-[#333] p-2 rounded text-white text-sm" 
                                                placeholder="Artist Name" 
                                                value={tempTrackArtist} 
                                                onChange={e => setTempTrackArtist(e.target.value)} 
                                            />
                                        </div>
                                        <input 
                                            className="w-full bg-[#151515] border border-[#333] p-2 rounded text-white text-sm" 
                                            placeholder="Specific Artwork URL (Optional)" 
                                            value={tempTrackCover} 
                                            onChange={e => setTempTrackCover(e.target.value)} 
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <div 
                                                onClick={() => trackInputRef.current?.click()} 
                                                className="flex-1 bg-[#222] hover:bg-[#333] p-2 rounded text-center cursor-pointer text-sm text-[#888] hover:text-white transition-colors border border-[#444]"
                                            >
                                                {tempTrackFile ? 
                                                    <span className="text-[#1877F2] font-bold">
                                                        <i className="fas fa-file-audio"></i> {tempTrackFile.name}
                                                    </span> : 
                                                    'Select Audio File'
                                                }
                                            </div>
                                            <button 
                                                onClick={handleAddTrack} 
                                                className="bg-[#1877F2] text-white px-6 py-2 rounded text-sm font-bold hover:bg-[#166FE5]"
                                            >
                                                Add Track
                                            </button>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={trackInputRef} 
                                            className="hidden" 
                                            accept="audio/*" 
                                            onChange={e => { 
                                                if(e.target.files) setTempTrackFile(e.target.files[0]); 
                                            }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-5 border-t border-[#333] bg-[#252525] flex justify-end">
                    <button 
                        onClick={handleMainSubmit} 
                        className="bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 px-8 rounded-xl font-bold transition-all shadow-lg text-lg flex items-center gap-2"
                    >
                        <i className="fas fa-cloud-upload-alt"></i> Publish Content
                    </button>
                </div>
             </div>
        </div>
    );
};
