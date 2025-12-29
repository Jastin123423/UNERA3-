import React, { useState, useEffect, useRef } from 'react';
import { Song, Episode, AudioTrack, User } from '../types';
import { MOCK_SONGS, MOCK_EPISODES, INITIAL_USERS } from '../constants';

// Global Audio Player remains the same
interface GlobalAudioPlayerProps {
    currentTrack: AudioTrack | null;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onClose: () => void;
    onDownload: (id: string) => void;
    onLike: (id: string) => void;
    onArtistClick?: (uploaderId: number) => void;
    isLiked: boolean;
    uploaderProfile?: User | null; 
}

export const GlobalAudioPlayer: React.FC<GlobalAudioPlayerProps> = ({ 
    currentTrack, isPlaying, onTogglePlay, onNext, onPrevious, 
    onClose, onDownload, onLike, onArtistClick, isLiked, uploaderProfile 
}) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [expanded, setExpanded] = useState(false); 
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastUrlRef = useRef<string | null>(null);
    const playPromiseRef = useRef<Promise<void> | null>(null);
    
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.preload = 'metadata';
        }
        
        const audio = audioRef.current;

        const setAudioData = () => {
            if (!isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            onNext();
        };

        const handleError = (e: Event) => {
            console.warn("Audio playback warning:", e);
        };

        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        const managePlayback = async () => {
            if (currentTrack && currentTrack.url) {
                if (lastUrlRef.current !== currentTrack.url) {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.src = currentTrack.url;
                    lastUrlRef.current = currentTrack.url;
                }
                
                if (isPlaying) {
                    try {
                        playPromiseRef.current = audio.play();
                        await playPromiseRef.current;
                    } catch (error: any) {
                        if (error.name !== 'AbortError' && error.name !== 'NotSupportedError') {
                            console.error("Playback failed", error);
                        }
                    }
                } else {
                    if (!audio.paused) {
                        audio.pause();
                    }
                }
            } else {
                audio.pause();
                if (lastUrlRef.current) {
                    audio.removeAttribute('src');
                    lastUrlRef.current = null;
                }
            }
        };

        managePlayback();

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [currentTrack, isPlaying]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleStop = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (isPlaying) {
            onTogglePlay();
        }
    };

    if (!currentTrack) return null;

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#222] transition-all duration-500 z-[160] shadow-2xl ${expanded ? 'h-full border-none' : 'h-20 mb-0'}`}>
            
            {expanded && (
                <div className="flex flex-col h-full w-full relative overflow-hidden bg-gradient-to-b from-gray-900 to-black animate-slide-up">
                    <div 
                        className="absolute inset-0 z-0 opacity-40 blur-3xl scale-150 pointer-events-none" 
                        style={{ backgroundImage: `url(${currentTrack.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    ></div>

                    <div className="relative z-10 flex justify-between items-center p-6 pt-10 text-white">
                        <div onClick={() => setExpanded(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors">
                            <i className="fas fa-chevron-down text-2xl"></i>
                        </div>
                        
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Now Playing</span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold bg-[#1877F2] px-1.5 py-0.5 rounded text-white">Hi-Res</span>
                                <span className="text-sm font-bold">{currentTrack.type === 'podcast' ? 'Podcast' : 'Music'}</span>
                            </div>
                        </div>
                        
                        <div onClick={onClose} className="w-10 h-10 rounded-full hover:bg-red-500/20 flex items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-red-500">
                            <i className="fas fa-times text-xl"></i>
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 flex items-center justify-center p-8">
                        <div 
                            className={`w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full border-[8px] border-[#1A1A1A] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex items-center justify-center ${isPlaying ? 'animate-[spin_15s_linear_infinite]' : ''}`}
                            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                        >
                            <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                            <div className="absolute w-8 h-8 bg-[#0A0A0A] rounded-full border-2 border-[#333]"></div>
                        </div>
                    </div>

                    <div className="relative z-10 p-6 sm:p-8 pb-12 bg-gradient-to-t from-black via-black/90 to-transparent">
                        
                        <div className="flex justify-between items-end mb-6">
                            <div className="flex-1 pr-4">
                                <h2 className="text-2xl font-bold text-white mb-2 line-clamp-1 leading-tight">{currentTrack.title}</h2>
                                <div 
                                    className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 -ml-2 rounded-lg transition-colors w-fit"
                                    onClick={() => currentTrack.uploaderId && onArtistClick && onArtistClick(currentTrack.uploaderId)}
                                >
                                    {uploaderProfile ? (
                                        <>
                                            <img src={uploaderProfile.profileImage} className="w-8 h-8 rounded-full border border-white/20" alt="" />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-white text-[16px] font-bold">{uploaderProfile.name}</span>
                                                    {uploaderProfile.isVerified && <i className="fas fa-check-circle text-xs text-[#1877F2]"></i>}
                                                </div>
                                                <span className="text-[#B0B3B8] text-[14px]">~ {currentTrack.artist}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <img src={currentTrack.cover} className="w-8 h-8 rounded-full border border-white/20 object-cover" alt="" />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-white text-[16px] font-bold">{currentTrack.artist}</span>
                                                    {currentTrack.isVerified && <i className="fas fa-check-circle text-xs text-[#1877F2]"></i>}
                                                </div>
                                                <span className="text-[#B0B3B8] text-[14px]">{currentTrack.type === 'podcast' ? 'Host' : 'Artist'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <i className="fas fa-download text-white text-2xl cursor-pointer hover:text-[#1877F2] transition-colors" onClick={() => onDownload(currentTrack.id)} title="Download"></i>
                                <i className={`${isLiked ? 'fas text-[#F3425F]' : 'far text-white'} fa-heart text-2xl cursor-pointer hover:scale-110 transition-transform`} onClick={() => onLike(currentTrack.id)}></i>
                            </div>
                        </div>

                        <div className="mb-6 group">
                            <input 
                                type="range" 
                                min={0} 
                                max={duration || 100} 
                                value={currentTime} 
                                onChange={handleSeek}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1877F2]"
                            />
                            <div className="flex justify-between text-[11px] text-gray-400 font-medium mt-2">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-10 px-4">
                            <i className="fas fa-stop text-[#B0B3B8] text-xl cursor-pointer hover:text-red-500 transition-colors" onClick={handleStop} title="Stop"></i>
                            <i className="fas fa-step-backward text-white text-3xl cursor-pointer hover:text-[#1877F2] transition-colors" onClick={onPrevious}></i>
                            <div 
                                className="w-16 h-16 bg-[#1877F2] rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(24,119,242,0.4)] hover:scale-110 hover:shadow-[0_0_30px_rgba(24,119,242,0.6)] transition-all"
                                onClick={onTogglePlay}
                            >
                                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play ml-1'} text-white text-2xl`}></i>
                            </div>
                            <i className="fas fa-step-forward text-white text-3xl cursor-pointer hover:text-[#1877F2] transition-colors" onClick={onNext}></i>
                            <div className="cursor-pointer text-gray-400 hover:text-white transition-colors" onClick={onClose}><i className="fas fa-times text-xl"></i></div>
                        </div>
                    </div>
                </div>
            )}

            {!expanded && (
                <div className="flex items-center justify-between px-4 h-full bg-[#141414] border-t border-[#333] relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gray-800">
                        <div className="h-full bg-[#1877F2]" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                    </div>

                    <div className="flex items-center flex-1 overflow-hidden" onClick={() => setExpanded(true)}>
                        <div className="w-12 h-12 relative group cursor-pointer mr-3">
                            <img src={currentTrack.cover} alt="Cover" className={`w-full h-full object-cover rounded-lg border border-[#333] ${isPlaying ? 'animate-pulse' : ''}`} />
                        </div>

                        <div className="flex-1 cursor-pointer overflow-hidden">
                            <h4 className="text-white font-bold text-[16px] truncate">{currentTrack.title}</h4>
                            <p className="text-gray-400 text-[14px] truncate flex items-center gap-1">
                                {uploaderProfile ? `${uploaderProfile.name}` : currentTrack.artist}
                                {currentTrack.isVerified && <i className="fas fa-check-circle text-[10px] text-[#1877F2]"></i>}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <i className="fas fa-step-backward text-gray-400 cursor-pointer hover:text-white text-lg" onClick={onPrevious}></i>
                        <div 
                            className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform shadow-lg"
                            onClick={onTogglePlay}
                        >
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play ml-0.5'} text-sm`}></i>
                        </div>
                        <i className="fas fa-step-forward text-gray-400 cursor-pointer hover:text-white text-lg" onClick={onNext}></i>
                        <div className="cursor-pointer text-gray-400 hover:text-red-500 ml-2" onClick={onClose}>
                            <i className="fas fa-times text-lg"></i>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main MusicSystem Component - UPDATED to accept your props
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
    const [view, setView] = useState<'music' | 'podcasts'>('music');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
    
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
            type: 'music'
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
            type: 'podcast'
        };
        onPlayTrack(audioTrack);
    };
    
    return (
        <div className="min-h-screen bg-[#18191A] text-white">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">🎵 UNERA Music</h1>
                        <p className="text-[#B0B3B8] text-lg">Listen to music and podcasts</p>
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
                            <button className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                                <i className="fas fa-plus"></i> Upload
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Navigation Tabs */}
                <div className="flex border-b border-[#3E4042] mb-8">
                    <button
                        className={`px-6 py-3 font-semibold text-lg border-b-2 transition-colors ${view === 'music' ? 'border-[#1877F2] text-white' : 'border-transparent text-[#B0B3B8] hover:text-white'}`}
                        onClick={() => setView('music')}
                    >
                        <i className="fas fa-music mr-2"></i> Music ({songs.length})
                    </button>
                    <button
                        className={`px-6 py-3 font-semibold text-lg border-b-2 transition-colors ${view === 'podcasts' ? 'border-[#1877F2] text-white' : 'border-transparent text-[#B0B3B8] hover:text-white'}`}
                        onClick={() => setView('podcasts')}
                    >
                        <i className="fas fa-podcast mr-2"></i> Podcasts ({episodes.length})
                    </button>
                </div>
                
                {/* Content */}
                {view === 'music' ? (
                    <div className="space-y-6">
                        {/* Featured Section */}
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <h2 className="text-2xl font-bold mb-4">Featured Music</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {songs.slice(0, 4).map((song) => (
                                    <div 
                                        key={song.id}
                                        className="bg-[#3A3B3C] rounded-xl overflow-hidden hover:bg-[#4E4F50] transition-colors cursor-pointer group"
                                        onClick={() => handlePlayTrackFromSong(song)}
                                    >
                                        <div className="relative h-48 overflow-hidden">
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
                                        <div className="p-4">
                                            <h3 className="font-bold text-white truncate">{song.title}</h3>
                                            <p className="text-[#B0B3B8] text-sm truncate">
                                                {song.artist}
                                            </p>
                                            <div className="flex justify-between items-center mt-3">
                                                <span className="text-[#B0B3B8] text-sm">{song.duration || '3:00'}</span>
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onToggleLike(song.id);
                                                        }}
                                                        className="text-lg"
                                                    >
                                                        <i className={`${likedTracks.includes(song.id) ? 'fas text-red-500' : 'far'} fa-heart`}></i>
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
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* All Songs List */}
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <h2 className="text-2xl font-bold mb-4">All Songs ({filteredSongs.length})</h2>
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
                                                    {song.uploaderId && users?.find(u => u.id === song.uploaderId)?.isVerified && (
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
                                                    className="text-lg"
                                                >
                                                    <i className={`${likedTracks.includes(song.id) ? 'fas text-red-500' : 'far'} fa-heart`}></i>
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
                ) : (
                    <div className="space-y-6">
                        {/* Featured Podcasts */}
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <h2 className="text-2xl font-bold mb-4">Featured Podcasts</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {episodes.slice(0, 6).map((episode) => (
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
                                ))}
                            </div>
                        </div>
                        
                        {/* All Episodes */}
                        <div className="bg-[#242526] rounded-2xl p-6">
                            <h2 className="text-2xl font-bold mb-4">All Episodes ({filteredEpisodes.length})</h2>
                            <div className="space-y-4">
                                {filteredEpisodes.length > 0 ? (
                                    filteredEpisodes.map((episode) => (
                                        <div 
                                            key={episode.id}
                                            className="flex items-center gap-4 p-4 hover:bg-[#3A3B3C] rounded-xl cursor-pointer transition-colors group"
                                            onClick={() => handlePlayTrackFromEpisode(episode)}
                                        >
                                            <div className="relative w-20 h-20 flex-shrink-0">
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
                                                <h3 className="font-semibold text-white line-clamp-1">{episode.title}</h3>
                                                <p className="text-[#B0B3B8] text-sm mt-1">{episode.host || 'Unknown Host'}</p>
                                                {episode.description && (
                                                    <p className="text-[#B0B3B8] text-sm mt-2 line-clamp-2">
                                                        {episode.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-[#B0B3B8]">
                                                    <span>{episode.date || 'Recent'}</span>
                                                    <span>•</span>
                                                    <span>{episode.duration || '45:00'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleLike(episode.id);
                                                    }}
                                                    className="text-lg"
                                                >
                                                    <i className={`${likedTracks.includes(episode.id) ? 'fas text-red-500' : 'far'} fa-heart`}></i>
                                                </button>
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
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <i className="fas fa-podcast text-5xl text-[#B0B3B8] mb-4"></i>
                                        <p className="text-[#B0B3B8] text-lg">No podcasts found</p>
                                        {searchQuery && (
                                            <p className="text-[#B0B3B8] text-sm mt-2">Try a different search term</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Stats Footer */}
                <div className="mt-12 bg-[#242526] rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">UNERA Music Stats</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-[#1877F2]">{songs.length + episodes.length}</div>
                            <p className="text-[#B0B3B8] mt-2">Total Tracks</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-[#45BD62]">
                                {songs.reduce((acc, s) => acc + (s.stats?.plays || 0), 0) + 
                                 episodes.reduce((acc, e) => acc + (e.stats?.plays || 0), 0).toLocaleString()}
                            </div>
                            <p className="text-[#B0B3B8] mt-2">Total Plays</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-[#F3425F]">{likedTracks.length}</div>
                            <p className="text-[#B0B3B8] mt-2">Liked Tracks</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
