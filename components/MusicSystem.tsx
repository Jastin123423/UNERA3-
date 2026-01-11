import React, { useState, useEffect, useCallback } from 'react';
import { Song, Episode, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// API Client
const API_BASE_URL = 'https://unera.social';

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = localStorage.getItem('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle array response format
        if (Array.isArray(data)) {
            return { data, success: true };
        }
        
        return data;
    } catch (error: any) {
        console.error('API Error:', error);
        return { 
            data: [], 
            success: false, 
            error: error.message 
        };
    }
};

interface MusicSystemProps {
    currentUser: User | null;
    onPlayTrack: (track: any) => void;
    onProfileClick: (userId: number) => void;
    onDeleteSong?: (songId: string) => void;
    onDeleteEpisode?: (episodeId: string) => void;
    likedTracks: string[];
    onToggleLike: (trackId: string, isLiked: boolean) => void;
    onUploadToFeed?: (song: Song) => void;
    onAddSong?: (song: Song) => void;
    onAddEpisode?: (episode: Episode) => void;
    playHistory: Array<{trackId: string, timestamp: number, duration: number}>;
}

const MusicSystem: React.FC<MusicSystemProps> = ({
    currentUser,
    onPlayTrack,
    onProfileClick,
    onDeleteSong,
    onDeleteEpisode,
    likedTracks,
    onToggleLike,
    onUploadToFeed,
    onAddSong,
    onAddEpisode,
    playHistory
}) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'songs' | 'podcasts' | 'history'>('songs');
    const [songs, setSongs] = useState<Song[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [commentText, setCommentText] = useState('');
    const [activeComments, setActiveComments] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ========== API FETCHING FUNCTIONS ==========

    // Fetch songs from API
    const fetchSongs = useCallback(async () => {
        if (!currentUser) return;
        
        setLoading(true);
        try {
            const response = await apiFetch('/api/songs');
            
            if (response.success && Array.isArray(response.data)) {
                const transformedSongs = response.data.map((song: any) => ({
                    id: song.id.toString(),
                    title: song.title,
                    artist: song.artist || 'Unknown Artist',
                    cover: song.cover || '/default-cover.jpg',
                    audioUrl: song.audio_url,
                    duration: song.duration || 0,
                    uploaderId: song.uploader_id || currentUser.id,
                    type: 'music' as const,
                    plays: song.plays || 0,
                    likes: song.likes || 0,
                    shares: song.shares || 0,
                    comments: song.comments || 0,
                    description: song.description,
                    uploadDate: song.created_at || new Date().toISOString(),
                    stats: {
                        plays: song.plays || 0,
                        likes: song.likes || 0,
                        shares: song.shares || 0,
                        comments: song.comments || 0,
                        downloads: song.downloads || 0,
                        reelsUse: song.reels_use || 0
                    }
                }));
                
                setSongs(transformedSongs);
                setError(null);
            } else {
                setError('Failed to fetch songs');
            }
        } catch (err) {
            console.error('Error fetching songs:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // Fetch podcasts from API
    const fetchPodcasts = useCallback(async () => {
        if (!currentUser) return;
        
        setLoading(true);
        try {
            const response = await apiFetch('/api/podcasts');
            
            if (response.success && Array.isArray(response.data)) {
                const transformedEpisodes = response.data.map((episode: any) => ({
                    id: episode.id.toString(),
                    title: episode.title,
                    host: episode.host || 'Unknown Host',
                    thumbnail: episode.thumbnail || '/default-podcast.jpg',
                    audioUrl: episode.audio_url,
                    duration: episode.duration || 0,
                    uploaderId: episode.uploader_id || currentUser.id,
                    type: 'podcast' as const,
                    plays: episode.plays || 0,
                    likes: episode.likes || 0,
                    shares: episode.shares || 0,
                    comments: episode.comments || 0,
                    description: episode.description,
                    uploadDate: episode.created_at || new Date().toISOString(),
                    stats: {
                        plays: episode.plays || 0,
                        likes: episode.likes || 0,
                        shares: episode.shares || 0,
                        comments: episode.comments || 0,
                        downloads: episode.downloads || 0,
                        reelsUse: episode.reels_use || 0
                    }
                }));
                
                setEpisodes(transformedEpisodes);
                setError(null);
            } else {
                setError('Failed to fetch podcasts');
            }
        } catch (err) {
            console.error('Error fetching podcasts:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // ========== INTERACTION FUNCTIONS ==========

    // Handle song/podcast like
    const handleLike = async (trackId: string, isMusic: boolean) => {
        if (!currentUser) {
            alert('Please login to like tracks');
            return;
        }

        const isCurrentlyLiked = likedTracks.includes(trackId);
        const endpoint = isMusic ? '/api/song-likes' : '/api/podcast-episode-likes';
        
        try {
            if (isCurrentlyLiked) {
                // Unlike
                const response = await apiFetch(`${endpoint}/${trackId}`, {
                    method: 'DELETE'
                });
                
                if (response.success) {
                    onToggleLike(trackId, false);
                    
                    // Update local state
                    if (isMusic) {
                        setSongs(prev => prev.map(song => 
                            song.id === trackId 
                                ? { ...song, likes: Math.max(0, song.likes - 1) }
                                : song
                        ));
                    } else {
                        setEpisodes(prev => prev.map(episode => 
                            episode.id === trackId 
                                ? { ...episode, likes: Math.max(0, episode.likes - 1) }
                                : episode
                        ));
                    }
                }
            } else {
                // Like
                const response = await apiFetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({
                        [isMusic ? 'song_id' : 'episode_id']: trackId,
                        user_id: currentUser.id
                    })
                });
                
                if (response.success) {
                    onToggleLike(trackId, true);
                    
                    // Update local state
                    if (isMusic) {
                        setSongs(prev => prev.map(song => 
                            song.id === trackId 
                                ? { ...song, likes: (song.likes || 0) + 1 }
                                : song
                        ));
                    } else {
                        setEpisodes(prev => prev.map(episode => 
                            episode.id === trackId 
                                ? { ...episode, likes: (episode.likes || 0) + 1 }
                                : episode
                        ));
                    }
                }
            }
        } catch (err) {
            console.error('Error toggling like:', err);
            alert('Failed to update like status');
        }
    };

    // Handle comment submission
    const handleCommentSubmit = async (trackId: string, isMusic: boolean) => {
        if (!currentUser || !commentText.trim()) return;

        const endpoint = isMusic ? '/api/song-comments' : '/api/podcast-episode-comments';
        
        try {
            const response = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    [isMusic ? 'song_id' : 'episode_id']: trackId,
                    user_id: currentUser.id,
                    content: commentText.trim()
                })
            });

            if (response.success) {
                // Update local state
                if (isMusic) {
                    setSongs(prev => prev.map(song => 
                        song.id === trackId 
                            ? { ...song, comments: (song.comments || 0) + 1 }
                            : song
                    ));
                } else {
                    setEpisodes(prev => prev.map(episode => 
                        episode.id === trackId 
                            ? { ...episode, comments: (episode.comments || 0) + 1 }
                            : episode
                    ));
                }
                
                setCommentText('');
                setActiveComments(null);
                alert('Comment posted successfully!');
            }
        } catch (err) {
            console.error('Error posting comment:', err);
            alert('Failed to post comment');
        }
    };

    // Handle track play (increment play count)
    const handlePlay = async (track: Song | Episode) => {
        // First trigger the UI play
        onPlayTrack({
            ...track,
            type: track.type,
            artist: track.type === 'music' ? (track as Song).artist : (track as Episode).host
        });

        // Then increment play count on backend
        try {
            const endpoint = track.type === 'music' 
                ? `/api/songs/${track.id}/play` 
                : `/api/podcasts/${track.id}/play`;
            
            await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ user_id: currentUser?.id })
            });

            // Update local state
            if (track.type === 'music') {
                setSongs(prev => prev.map(song => 
                    song.id === track.id 
                        ? { ...song, plays: (song.plays || 0) + 1 }
                        : song
                ));
            } else {
                setEpisodes(prev => prev.map(episode => 
                    episode.id === track.id 
                        ? { ...episode, plays: (episode.plays || 0) + 1 }
                        : episode
                ));
            }
        } catch (err) {
            console.error('Error updating play count:', err);
        }
    };

    // Handle upload
    const handleUpload = async (file: File, isMusic: boolean) => {
        if (!currentUser) return;
        
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name);
            formData.append('user_id', currentUser.id.toString());
            formData.append('type', isMusic ? 'music' : 'podcast');
            
            const endpoint = isMusic ? '/api/songs/upload' : '/api/podcasts/upload';
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert(`${isMusic ? 'Song' : 'Podcast'} uploaded successfully!`);
                
                // Refresh the list
                if (isMusic) {
                    fetchSongs();
                    if (onAddSong && result.data) {
                        onAddSong(result.data);
                    }
                } else {
                    fetchPodcasts();
                    if (onAddEpisode && result.data) {
                        onAddEpisode(result.data);
                    }
                }
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Handle delete
    const handleDelete = async (trackId: string, isMusic: boolean) => {
        if (!currentUser || !window.confirm('Are you sure you want to delete this?')) {
            return;
        }

        try {
            const endpoint = isMusic ? `/api/songs/${trackId}` : `/api/podcasts/${trackId}`;
            
            const response = await apiFetch(endpoint, {
                method: 'DELETE'
            });

            if (response.success) {
                // Update local state
                if (isMusic) {
                    setSongs(prev => prev.filter(song => song.id !== trackId));
                    if (onDeleteSong) onDeleteSong(trackId);
                } else {
                    setEpisodes(prev => prev.filter(episode => episode.id !== trackId));
                    if (onDeleteEpisode) onDeleteEpisode(trackId);
                }
                
                alert('Deleted successfully!');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete');
        }
    };

    // ========== EFFECT HOOKS ==========

    // Initial data loading
    useEffect(() => {
        if (currentUser) {
            if (activeTab === 'songs') {
                fetchSongs();
            } else if (activeTab === 'podcasts') {
                fetchPodcasts();
            }
        }
    }, [currentUser, activeTab, refreshTrigger, fetchSongs, fetchPodcasts]);

    // Polling for updates every 30 seconds
    useEffect(() => {
        if (!currentUser) return;

        const pollInterval = setInterval(() => {
            if (activeTab === 'songs') {
                fetchSongs();
            } else if (activeTab === 'podcasts') {
                fetchPodcasts();
            }
        }, 30000);

        return () => clearInterval(pollInterval);
    }, [currentUser, activeTab, fetchSongs, fetchPodcasts]);

    // ========== RENDER FUNCTIONS ==========

    const renderTrackCard = (track: Song | Episode, isMusic: boolean) => {
        const isLiked = likedTracks.includes(track.id);
        
        return (
            <div key={track.id} className="bg-[#242526] rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <img 
                            src={track.cover || (isMusic ? '/default-cover.jpg' : '/default-podcast.jpg')} 
                            alt={track.title}
                            className="w-16 h-16 rounded-md object-cover"
                        />
                        <button
                            onClick={() => handlePlay(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md hover:bg-opacity-70 transition text-white"
                        >
                            ▶️
                        </button>
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="text-white font-semibold">{track.title}</h3>
                        <p className="text-gray-400 text-sm">
                            {isMusic ? (track as Song).artist : (track as Episode).host}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span>{track.plays || 0} plays</span>
                            <span>{track.likes || 0} likes</span>
                            <span>{track.comments || 0} comments</span>
                        </div>
                    </div>
                    
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleLike(track.id, isMusic)}
                            className="p-2 rounded-full hover:bg-[#3A3B3C] transition"
                            title={isLiked ? 'Unlike' : 'Like'}
                        >
                            {isLiked ? (
                                <span className="text-red-500">❤️</span>
                            ) : (
                                <span className="text-gray-400">🤍</span>
                            )}
                        </button>
                        
                        <button
                            onClick={() => setActiveComments(activeComments === track.id ? null : track.id)}
                            className="p-2 rounded-full hover:bg-[#3A3B3C] transition"
                            title="Comment"
                        >
                            <span className="text-gray-400">💬</span>
                        </button>
                        
                        <button
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: track.title,
                                        text: `Check out this ${isMusic ? 'song' : 'podcast'} on UNERA`,
                                        url: `${window.location.origin}/${isMusic ? 'song' : 'podcast'}/${track.id}`
                                    });
                                } else {
                                    navigator.clipboard.writeText(`${window.location.origin}/${isMusic ? 'song' : 'podcast'}/${track.id}`);
                                    alert('Link copied to clipboard!');
                                }
                            }}
                            className="p-2 rounded-full hover:bg-[#3A3B3C] transition"
                            title="Share"
                        >
                            <span className="text-gray-400">🔗</span>
                        </button>
                        
                        {currentUser && (currentUser.id === track.uploaderId || currentUser.role === 'admin') && (
                            <button
                                onClick={() => handleDelete(track.id, isMusic)}
                                className="p-2 rounded-full hover:bg-[#3A3B3C] transition text-red-400"
                                title="Delete"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Comments section */}
                {activeComments === track.id && (
                    <div className="mt-4 pt-4 border-t border-[#3A3B3C]">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-[#3A3B3C] text-white px-3 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && commentText.trim()) {
                                        handleCommentSubmit(track.id, isMusic);
                                    }
                                }}
                            />
                            <button
                                onClick={() => handleCommentSubmit(track.id, isMusic)}
                                disabled={!commentText.trim()}
                                className="bg-[#1877F2] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#166FE5] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Post
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderHistory = () => {
        const historyTracks = playHistory.map(entry => {
            const song = songs.find(s => s.id === entry.trackId);
            const episode = episodes.find(e => e.id === entry.trackId);
            return song || episode;
        }).filter((track): track is Song | Episode => track !== undefined);

        return (
            <div>
                {historyTracks.length > 0 ? (
                    historyTracks.map(track => track && renderTrackCard(track, track.type === 'music'))
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mx-auto mb-4">📜</div>
                        <p>No play history yet</p>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        if (!currentUser) {
            return (
                <div className="text-center py-8">
                    <p className="text-gray-400">Please login to access music features</p>
                </div>
            );
        }

        if (loading) {
            return (
                <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-400">
                    <p>{error}</p>
                    <button
                        onClick={() => setRefreshTrigger(prev => prev + 1)}
                        className="mt-2 text-[#1877F2] hover:underline"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        switch (activeTab) {
            case 'songs':
                return songs.length > 0 ? (
                    songs.map(song => renderTrackCard(song, true))
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mx-auto mb-4">🎵</div>
                        <p>No songs available</p>
                    </div>
                );
            
            case 'podcasts':
                return episodes.length > 0 ? (
                    episodes.map(episode => renderTrackCard(episode, false))
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <div className="text-4xl mx-auto mb-4">🎙️</div>
                        <p>No podcasts available</p>
                    </div>
                );
            
            case 'history':
                return renderHistory();
            
            default:
                return null;
        }
    };

    return (
        <div className="bg-[#18191A] min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Music & Podcasts</h1>
                    
                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search songs, podcasts..."
                            className="w-full bg-[#3A3B3C] text-white pl-10 pr-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                        />
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex border-b border-[#3A3B3C]">
                        <button
                            onClick={() => setActiveTab('songs')}
                            className={`flex-1 py-3 text-center font-semibold ${
                                activeTab === 'songs'
                                    ? 'text-[#1877F2] border-b-2 border-[#1877F2]'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <span className="mr-2">🎵</span>
                            Songs
                        </button>
                        <button
                            onClick={() => setActiveTab('podcasts')}
                            className={`flex-1 py-3 text-center font-semibold ${
                                activeTab === 'podcasts'
                                    ? 'text-[#1877F2] border-b-2 border-[#1877F2]'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <span className="mr-2">🎙️</span>
                            Podcasts
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-3 text-center font-semibold ${
                                activeTab === 'history'
                                    ? 'text-[#1877F2] border-b-2 border-[#1877F2]'
                                    : 'text-gray-400 hover:text-gray-300'
                            }`}
                        >
                            <span className="mr-2">📜</span>
                            History
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div>
                    {renderContent()}
                </div>
                
                {/* Upload Button (for admins/uploaders) */}
                {currentUser && (currentUser.role === 'admin' || currentUser.role === 'uploader') && (
                    <div className="fixed bottom-6 right-6">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const isMusic = file.type.startsWith('audio/');
                                        handleUpload(file, isMusic);
                                    }
                                }}
                                disabled={uploading}
                            />
                            <div className="bg-[#1877F2] text-white p-4 rounded-full shadow-lg hover:bg-[#166FE5] transition flex items-center justify-center">
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span>📤</span>
                                )}
                            </div>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicSystem;
