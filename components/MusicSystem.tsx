
import React, { useState, useEffect, useRef } from 'react';
import { Song, Album, Podcast, Episode, AudioTrack, User } from '../types';
import { MOCK_SONGS, MOCK_ALBUMS, MOCK_PODCASTS, MOCK_EPISODES, INITIAL_USERS } from '../constants';

// --- GLOBAL AUDIO PLAYER ---
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

export const AudioUploadModal: React.FC<{ 
    currentUser: User; 
    onClose: () => void; 
    onUpload: (items: any[], type: 'music' | 'podcast', meta?: any) => void;
}> = ({ currentUser, onClose, onUpload }) => {
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
            onUpload([{ title, artist, genre, cover, album: 'Single', duration: '3:45', audioUrl: URL.createObjectURL(audioFile) }], 'music');
        } else if (mode === 'album') {
            if (!albumTitle || albumTracks.length === 0) return alert("Album title and at least 1 track required");
            const processedTracks = albumTracks.map(t => ({ title: t.title, artist: t.artist || artist, genre, album: albumTitle, cover: t.cover || cover, duration: '3:30', audioUrl: URL.createObjectURL(t.file) }));
            onUpload(processedTracks, 'music', { albumTitle, isAlbum: true });
        } else if (mode === 'podcast') {
            if (!title || !desc || !audioFile) return alert("Title, description and audio required");
            onUpload([{ title, description: desc, season, episode: episodeNum, guests, host: artist, cover, duration: '45:00', audioUrl: URL.createObjectURL(audioFile) }], 'podcast');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
             <div className="bg-[#1E1E1E] rounded-2xl w-full max-w-3xl border border-[#333] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-[#333] bg-[#252525]">
                    <div className="flex justify-between items-center mb-6">
                        <div><h2 className="text-[#FFF] text-2xl font-bold">Professional Upload</h2><p className="text-[#888] text-sm">Distribute your content to UNERA Music</p></div>
                        <i className="fas fa-times text-[#888] cursor-pointer text-xl hover:text-white transition-colors" onClick={onClose}></i>
                    </div>
                    <div className="flex p-1 bg-[#111] rounded-lg">
                        {['single', 'album', 'podcast'].map(m => (
                            <button key={m} onClick={() => setMode(m as any)} className={`flex-1 py-2.5 rounded-md font-bold capitalize text-sm transition-all ${mode === m ? 'bg-[#1877F2] text-white shadow-lg' : 'text-[#888] hover:text-white'}`}>{m}</button>
                        ))}
                    </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">{mode === 'podcast' ? 'Host / Creator Name' : 'Main Artist Name'}</label><input className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2]" value={artist} onChange={e => setArtist(e.target.value)} /></div>
                            <div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Genre / Category</label><input className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2]" placeholder="Pop, Tech, News..." value={genre} onChange={e => setGenre(e.target.value)} /></div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">{mode === 'album' ? 'Album Artwork' : 'Artwork'}</label><div onClick={() => coverInputRef.current?.click()} className="w-full bg-[#151515] border border-[#333] rounded-lg h-[120px] flex flex-col items-center justify-center cursor-pointer hover:border-[#1877F2] group relative overflow-hidden">{coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" alt="Cover Preview" /> : <><i className="fas fa-image text-2xl text-[#666] group-hover:text-white mb-2"></i><span className="text-[#666] text-xs group-hover:text-white">Upload Image</span></>}<input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) { setCoverPreview(URL.createObjectURL(e.target.files[0])); } }} /></div></div>
                            {(mode === 'single' || mode === 'podcast') && (<div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#333] bg-[#151515] rounded-lg h-[86px] flex items-center justify-center cursor-pointer hover:border-[#1877F2] group"><input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={(e) => { if(e.target.files) setAudioFile(e.target.files[0]); }} />{audioFile ? <div className="text-[#1877F2] font-semibold flex items-center gap-2"><i className="fas fa-check-circle"></i> {audioFile.name}</div> : <div className="text-[#666] group-hover:text-white flex items-center gap-2"><i className="fas fa-cloud-upload-alt"></i> Upload High Quality Audio</div>}</div>)}
                        </div>
                    </div>
                    <div className="border-t border-[#333] pt-6">
                        {mode === 'single' && (<div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Song Name</label><input className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] text-lg font-bold" placeholder="Enter song title..." value={title} onChange={e => setTitle(e.target.value)} /></div>)}
                        {mode === 'podcast' && (<div className="space-y-4"><div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Episode Title</label><input className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] text-lg font-bold" placeholder="e.g. The Future of AI" value={title} onChange={e => setTitle(e.target.value)} /></div><div className="grid grid-cols-3 gap-4"><input className="bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none" placeholder="Season (e.g. 1)" value={season} onChange={e => setSeason(e.target.value)} /><input className="bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none" placeholder="Episode # (e.g. 5)" value={episodeNum} onChange={e => setEpisodeNum(e.target.value)} /><input className="bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none" placeholder="Guest Names" value={guests} onChange={e => setGuests(e.target.value)} /></div><div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Description / Show Notes</label><textarea className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] h-60 resize-none" placeholder="Write a professional description about this episode..." value={desc} onChange={e => setDesc(e.target.value)} /></div></div>)}
                        {mode === 'album' && (<div className="space-y-4"><div><label className="block text-[#888] text-xs font-bold mb-1.5 uppercase">Album Name</label><input className="w-full bg-[#151515] border border-[#333] p-3 rounded-lg text-white outline-none focus:border-[#1877F2] text-lg font-bold" placeholder="Enter album title..." value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} /></div><div className="bg-[#111] p-4 rounded-xl border border-[#333]"><h4 className="text-white font-bold mb-3 flex items-center gap-2"><i className="fas fa-list-ol text-[#1877F2]"></i> Add Tracks to Album</h4><div className="space-y-2 mb-4">{albumTracks.map((t, idx) => (<div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded border border-[#333]"><div className="flex items-center gap-3"><span className="text-[#666] font-mono">{idx + 1}</span><img src={t.cover || coverPreview || defaultCover} className="w-8 h-8 rounded object-cover" /><div><span className="text-white font-semibold block">{t.title}</span><span className="text-[#666] text-xs">{t.artist}</span></div></div><i className="fas fa-trash text-red-500 cursor-pointer" onClick={() => setAlbumTracks(albumTracks.filter((_, i) => i !== idx))}></i></div>))}{albumTracks.length === 0 && <div className="text-[#666] text-sm text-center py-2">No tracks added yet.</div>}</div><div className="flex flex-col gap-2 p-3 bg-[#1A1A1A] rounded border border-[#333] border-dashed"><div className="grid grid-cols-2 gap-2"><input className="bg-[#151515] border border-[#333] p-2 rounded text-white text-sm" placeholder="Song Name" value={tempTrackTitle} onChange={e => setTempTrackTitle(e.target.value)} /><input className="bg-[#151515] border border-[#333] p-2 rounded text-white text-sm" placeholder="Artist Name" value={tempTrackArtist} onChange={e => setTempTrackArtist(e.target.value)} /></div><input className="w-full bg-[#151515] border border-[#333] p-2 rounded text-white text-sm" placeholder="Specific Artwork URL (Optional)" value={tempTrackCover} onChange={e => setTempTrackCover(e.target.value)} /><div className="flex items-center gap-2 mt-2"><div onClick={() => trackInputRef.current?.click()} className="flex-1 bg-[#222] hover:bg-[#333] p-2 rounded text-center cursor-pointer text-sm text-[#888] hover:text-white transition-colors border border-[#444]">{tempTrackFile ? <span className="text-[#1877F2] font-bold"><i className="fas fa-file-audio"></i> {tempTrackFile.name}</span> : 'Select Audio File'}</div><button onClick={handleAddTrack} className="bg-[#1877F2] text-white px-6 py-2 rounded text-sm font-bold hover:bg-[#166FE5]">Add Track</button></div><input type="file" ref={trackInputRef} className="hidden" accept="audio/*" onChange={e => { if(e.target.files) setTempTrackFile(e.target.files[0]); }} /></div></div></div>)}
                    </div>
                </div>
                <div className="p-5 border-t border-[#333] bg-[#252525] flex justify-end"><button onClick={handleMainSubmit} className="bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 px-8 rounded-xl font-bold transition-all shadow-lg text-lg flex items-center gap-2"><i className="fas fa-cloud-upload-alt"></i> Publish Content</button></div>
             </div>
        </div>
    );
};

export const Dashboard: React.FC<{ 
    songs: Song[], 
    episodes: Episode[],
    onOpenUpload: () => void,
    onDeleteSong: (id: string) => void 
}> = ({ songs, episodes, onOpenUpload, onDeleteSong }) => {
    const totalStreams = songs.reduce((acc, s) => acc + s.stats.plays, 0) + episodes.reduce((acc, e) => acc + e.stats.plays, 0);
    const totalDownloads = songs.reduce((acc, s) => acc + s.stats.downloads, 0) + episodes.reduce((acc, e) => acc + e.stats.downloads, 0);
    const totalLikes = songs.reduce((acc, s) => acc + s.stats.likes, 0) + episodes.reduce((acc, e) => acc + e.stats.likes, 0);
    const catalog = [
        ...songs.map(s => ({ ...s, type: 'music', date: 'N/A' })), 
        ...episodes.map(e => ({ ...e, type: 'podcast', cover: e.thumbnail, album: 'Podcast Episode', artist: e.host }))
    ];

    return (
        <div className="p-6 text-[#E4E6EB] pb-24 max-w-6xl mx-auto font-sans">
            <div className="flex flex-col items-center justify-center mb-10 mt-4 text-center">
                <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 text-transparent bg-clip-text">Professional Creator Studio</h2>
                <p className="text-[#888] mb-6 max-w-2xl">Upload your music, podcasts, and albums. Monitor your performance and grow your audience on UNERA Music.</p>
                <button onClick={onOpenUpload} className="bg-gradient-to-r from-[#1877F2] to-[#0062E3] px-10 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 transition-transform shadow-[0_4px_20px_rgba(24,119,242,0.5)] text-lg"><i className="fas fa-cloud-upload-alt text-2xl"></i> Upload New Content</button>
            </div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-[#333] pb-2"><i className="fas fa-chart-line text-[#1877F2]"></i> Professional Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333] relative overflow-hidden group hover:border-[#1877F2] transition-colors shadow-lg"><div className="flex justify-between items-start mb-4"><div><p className="text-[#888] font-bold text-xs uppercase tracking-wider">Streams & Views</p><h3 className="text-4xl font-bold text-white mt-1">{totalStreams.toLocaleString()}</h3></div><div className="p-3 bg-[#1877F2]/10 rounded-full text-[#1877F2]"><i className="fas fa-headphones text-2xl"></i></div></div><p className="text-[#45BD62] text-xs font-bold flex items-center gap-1"><i className="fas fa-arrow-up"></i> +12.5% this week</p></div>
                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333] relative overflow-hidden group hover:border-[#45BD62] transition-colors shadow-lg"><div className="flex justify-between items-start mb-4"><div><p className="text-[#888] font-bold text-xs uppercase tracking-wider">Total Downloads</p><h3 className="text-4xl font-bold text-white mt-1">{totalDownloads.toLocaleString()}</h3></div><div className="p-3 bg-[#45BD62]/10 rounded-full text-[#45BD62]"><i className="fas fa-download text-2xl"></i></div></div><p className="text-[#45BD62] text-xs font-bold flex items-center gap-1"><i className="fas fa-arrow-up"></i> +5.2% this week</p></div>
                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333] relative overflow-hidden group hover:border-[#F3425F] transition-colors shadow-lg"><div className="flex justify-between items-start mb-4"><div><p className="text-[#888] font-bold text-xs uppercase tracking-wider">Audience Engagement</p><h3 className="text-4xl font-bold text-white mt-1">{totalLikes.toLocaleString()}</h3></div><div className="p-3 bg-[#F3425F]/10 rounded-full text-[#F3425F]"><i className="fas fa-heart text-2xl"></i></div></div><p className="text-[#888] text-xs">Likes, Shares & Comments</p></div>
            </div>
            <div className="bg-[#1E1E1E] rounded-2xl border border-[#333] overflow-hidden shadow-lg">
                <div className="p-6 border-b border-[#333] flex justify-between items-center"><h3 className="text-xl font-bold text-white">Your Catalog</h3><div className="flex gap-2"><input placeholder="Search uploads..." className="bg-[#2A2A2A] border border-[#3E4042] px-4 py-2 rounded-full text-sm text-white outline-none focus:border-[#1877F2]" /></div></div>
                <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-[#252525] text-[#888] text-xs uppercase font-bold tracking-wider"><tr><th className="p-4 w-16">#</th><th className="p-4">Content</th><th className="p-4 hidden md:table-cell">Type/Album</th><th className="p-4 text-center">Streams</th><th className="p-4 text-center hidden sm:table-cell">Downloads</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#333]">{catalog.map((item, i) => (<tr key={item.id} className="hover:bg-[#2A2A2A] transition-colors group"><td className="p-4 text-[#666] font-bold">{i + 1}</td><td className="p-4"><div className="flex items-center gap-3"><img src={item.cover} className="w-10 h-10 rounded object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" /><div><div className="font-bold text-white text-sm">{item.title}</div><div className="text-xs text-[#888]">{item.duration}</div></div></div></td><td className="p-4 text-[#BBB] text-sm hidden md:table-cell">{item.type === 'podcast' ? <span className="bg-[#1877F2]/20 text-[#1877F2] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#1877F2]/30">PODCAST</span> : item.album}</td><td className="p-4 text-center font-mono text-[#1877F2] font-bold text-sm">{item.stats.plays.toLocaleString()}</td><td className="p-4 text-center font-mono text-[#45BD62] font-bold text-sm hidden sm:table-cell">{item.stats.downloads.toLocaleString()}</td><td className="p-4 text-right"><button onClick={() => onDeleteSong(item.id)} className="text-[#666] hover:text-[#F3425F] p-2 transition-colors rounded-full hover:bg-[#F3425F]/10" title="Delete Content"><i className="fas fa-trash-alt"></i></button></td></tr>))}{catalog.length === 0 && (<tr><td colSpan={6} className="p-12 text-center text-[#666]"><div className="mb-3"><i className="fas fa-music text-4xl opacity-50"></i></div><p className="text-lg">No uploads yet.</p><p className="text-sm">Start by clicking "Upload New Content" above.</p></td></tr>)}</tbody></table></div>
            </div>
        </div>
    );
};

export const MusicHome: React.FC<{ 
    songs: Song[], albums: Album[], onPlay: (track: AudioTrack, queue?: AudioTrack[]) => void, 
    onDownload: (id: string) => void, downloads: string[], onSearch: (query: string) => void, 
    onArtistClick: (id: number) => void, users: User[], isAdmin: boolean, onDeleteSong: (id: string) => void 
}> = ({ songs, albums, onPlay, onSearch, onArtistClick, isAdmin, onDeleteSong }) => {
    return (
        <div className="p-4 pb-24">
            <input placeholder="Search songs, artists..." className="w-full bg-[#242526] text-[#E4E6EB] p-3 rounded-xl mb-6 border border-[#3E4042] outline-none focus:border-[#1877F2]" onChange={(e) => onSearch(e.target.value)} />
            <h3 className="text-[#E4E6EB] font-bold mb-4 text-[16px]">Featured Albums</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mb-6">
                {albums.map(album => (
                    <div key={album.id} className="min-w-[140px] cursor-pointer group">
                        <div className="relative aspect-square rounded-lg overflow-hidden mb-2"><img src={album.cover} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-play text-white ml-1"></i></div></div></div>
                        <h4 className="text-[#E4E6EB] font-bold text-[15px] truncate">{album.title}</h4>
                        <p className="text-[#B0B3B8] text-[14px] truncate">{album.artist}</p>
                    </div>
                ))}
            </div>
            <h3 className="text-[#E4E6EB] font-bold mb-4 text-[17px]">Trending Songs</h3>
            <div className="space-y-2 mb-8">
                {songs.slice(0, 5).map((song, index) => (
                    <div key={song.id} className="flex items-center gap-3 p-2 hover:bg-[#242526] rounded-xl cursor-pointer transition-colors group relative" onClick={() => onPlay({ id: song.id, url: song.audioUrl, title: song.title, artist: song.artist, cover: song.cover, type: 'music', uploaderId: song.uploaderId, isVerified: true }, songs.map(s => ({ id: s.id, url: s.audioUrl, title: s.title, artist: s.artist, cover: s.cover, type: 'music', uploaderId: s.uploaderId, isVerified: true })))}>
                        <span className="text-[#1877F2] w-6 text-center text-lg font-bold italic">#{index + 1}</span>
                        <img src={song.cover} className="w-12 h-12 rounded-lg object-cover" alt="" />
                        <div className="flex-1"><div className="text-[#E4E6EB] font-semibold text-[16px]">{song.title}</div><div className="text-[#B0B3B8] text-[14px] hover:underline" onClick={(e) => { e.stopPropagation(); if(song.uploaderId) onArtistClick(song.uploaderId); }}>{song.artist}</div></div>
                        <i className="fas fa-play-circle text-2xl text-[#3A3B3C] group-hover:text-[#1877F2] transition-colors"></i>
                        {isAdmin && (<button className="absolute right-10 p-2 text-[#666] hover:text-red-500 z-10" onClick={(e) => { e.stopPropagation(); onDeleteSong(song.id); }}><i className="fas fa-trash"></i></button>)}
                    </div>
                ))}
            </div>
            <h3 className="text-[#E4E6EB] font-bold mb-4 text-[17px]">All Songs</h3>
            <div className="space-y-2">
                {songs.map((song) => (
                    <div key={song.id} className="flex items-center gap-3 p-2 hover:bg-[#242526] rounded-xl cursor-pointer transition-colors group relative" onClick={() => onPlay({ id: song.id, url: song.audioUrl, title: song.title, artist: song.artist, cover: song.cover, type: 'music', uploaderId: song.uploaderId, isVerified: true })}>
                        <img src={song.cover} className="w-10 h-10 rounded-lg object-cover opacity-80 group-hover:opacity-100" alt="" />
                        <div className="flex-1"><div className="text-[#E4E6EB] font-medium text-[16px]">{song.title}</div><div className="text-[#B0B3B8] text-[14px]">{song.artist}</div></div>
                        <span className="text-[#B0B3B8] text-xs">{song.duration}</span>
                        {isAdmin && (<button className="ml-2 p-2 text-[#666] hover:text-red-500" onClick={(e) => { e.stopPropagation(); onDeleteSong(song.id); }}><i className="fas fa-trash"></i></button>)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PodcastHome: React.FC<{
    podcasts: Podcast[],
    episodes: Episode[],
    onPlay: (track: AudioTrack) => void,
    onDownload: (id: string) => void,
    downloads: string[],
    isAdmin: boolean,
    onDeletePodcast: (id: string) => void
}> = ({ podcasts, episodes, onPlay, onDownload, downloads, isAdmin, onDeletePodcast }) => {
    return (
        <div className="p-4 pb-24 text-[#E4E6EB]">
            <h2 className="text-2xl font-bold mb-4">Podcasts</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mb-8">
                {podcasts.map(podcast => (
                    <div key={podcast.id} className="min-w-[150px] cursor-pointer">
                         <img src={podcast.cover} className="w-full aspect-square rounded-xl object-cover mb-2" alt="" />
                         <div className="font-bold truncate text-[17px]">{podcast.title}</div>
                         <div className="text-[13px] text-[#888]">{podcast.category}</div>
                    </div>
                ))}
            </div>
            
            <h3 className="text-xl font-bold mb-4">New Episodes</h3>
            <div className="space-y-4">
                {episodes.map(ep => (
                     <div key={ep.id} className="flex gap-4 p-3 bg-[#1A1A1A] rounded-xl hover:bg-[#252525] transition-colors cursor-pointer group"
                        onClick={() => onPlay({ id: ep.id, url: ep.audioUrl, title: ep.title, artist: ep.host || MOCK_PODCASTS.find(p => p.id === ep.podcastId)?.host || 'Podcast Host', cover: ep.thumbnail, type: 'podcast', uploaderId: ep.uploaderId, isVerified: true })}
                     >
                         <div className="relative w-20 h-20 flex-shrink-0">
                             <img src={ep.thumbnail} className="w-full h-full object-cover rounded-lg" alt="" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <i className="fas fa-play text-white"></i>
                             </div>
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="font-bold truncate text-white text-[17px]">{ep.title}</div>
                             <div className="text-[15px] text-[#888] line-clamp-2">{ep.description}</div>
                             <div className="mt-2 flex items-center gap-3 text-xs text-[#666]">
                                 <span>{ep.date}</span>
                                 <span>• {ep.duration}</span>
                                 <button onClick={(e) => { e.stopPropagation(); onDownload(ep.id); }}>
                                    <i className={`fas fa-arrow-circle-down text-lg ${downloads.includes(ep.id) ? 'text-[#1877F2]' : 'hover:text-white'}`}></i>
                                 </button>
                                 {isAdmin && (<button onClick={(e) => { e.stopPropagation(); onDeletePodcast(ep.id); }} className="text-red-500 hover:text-red-400"><i className="fas fa-trash"></i></button>)}
                             </div>
                         </div>
                     </div>
                ))}
            </div>
        </div>
    );
};

export const ArtistProfileView: React.FC<{
    artistUser: User,
    artistSongs: Song[],
    onPlay: (track: AudioTrack) => void
}> = ({ artistUser, artistSongs, onPlay }) => {
    return (
        <div className="text-[#E4E6EB] pb-24">
             <div className="h-60 relative">
                 <img src={artistUser.coverImage || artistUser.profileImage} className="w-full h-full object-cover" alt="" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent"></div>
                 <div className="absolute bottom-4 left-4 flex items-end gap-4">
                     <img src={artistUser.profileImage} className="w-24 h-24 rounded-full border-4 border-[#0A0A0A] shadow-xl" alt="" />
                     <div className="mb-2">
                         <h1 className="text-3xl font-bold flex items-center gap-2">{artistUser.name}{artistUser.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-xl"></i>}</h1>
                         <p className="text-[#CCC] text-sm">{artistUser.followers.length.toLocaleString()} Followers</p>
                     </div>
                 </div>
             </div>
             
             <div className="p-4">
                 <div className="flex gap-3 mb-6"><button className="bg-[#1877F2] text-white px-6 py-2 rounded-full font-bold">Follow</button><button className="border border-[#333] text-white px-6 py-2 rounded-full font-bold">Message</button></div>
                 
                 <h3 className="text-xl font-bold mb-4">Popular Releases</h3>
                 <div className="space-y-2">
                     {artistSongs.map((song, i) => (
                         <div key={song.id} className="flex items-center gap-4 p-3 hover:bg-[#1A1A1A] rounded-xl cursor-pointer group transition-colors" onClick={() => onPlay({ id: song.id, url: song.audioUrl, title: song.title, artist: song.artist, cover: song.cover, type: 'music', uploaderId: song.uploaderId, isVerified: true })}>
                             <div className="text-[#666] font-bold w-4 text-center group-hover:hidden">{i + 1}</div>
                             <div className="hidden group-hover:block w-4 text-center text-white"><i className="fas fa-play"></i></div>
                             <img src={song.cover} className="w-12 h-12 rounded object-cover" alt="" />
                             <div className="flex-1"><div className="font-bold text-white">{song.title}</div><div className="text-xs text-[#888]">{song.stats.plays.toLocaleString()} plays</div></div>
                             <div className="text-sm text-[#666]">{song.duration}</div>
                         </div>
                     ))}
                     {artistSongs.length === 0 && <p className="text-[#666]">No tracks available.</p>}
                 </div>
             </div>
        </div>
    );
};

// --- MAIN MUSIC SYSTEM ---
export const MusicSystem: React.FC<{ 
    currentUser: User | null, 
    songs: Song[],
    episodes: Episode[],
    onUpdateSongs: (songs: Song[]) => void,
    onUpdateEpisodes: (episodes: Episode[]) => void,
    onPlayTrack: (track: AudioTrack) => void, 
    currentTrackId?: string, 
    isPlaying: boolean,
    onTogglePlay: () => void;
    onFeedPost: (post: any) => void;
    users: User[];
    onDeleteSong: (id: string) => void;
    onDeleteEpisode: (id: string) => void;
}> = ({ currentUser, songs, episodes, onUpdateSongs, onUpdateEpisodes, onPlayTrack, currentTrackId, isPlaying, onTogglePlay, onFeedPost, users, onDeleteSong, onDeleteEpisode }) => {
    
    const [view, setView] = useState<'music' | 'podcast' | 'dashboard' | 'artist'>('music');
    const [downloads, setDownloads] = useState<string[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
    const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
    const [playQueue, setPlayQueue] = useState<AudioTrack[]>([]);
    const [queueIndex, setQueueIndex] = useState<number>(0);
    const [likedTracks, setLikedTracks] = useState<string[]>([]);

    useEffect(() => { setFilteredSongs(songs); }, [songs]);

    const isAdmin = currentUser?.role === 'admin';

    const handleSearch = (query: string) => {
        if (!query) {
            setFilteredSongs(songs);
        } else {
            const lower = query.toLowerCase();
            setFilteredSongs(songs.filter(s => s.title.toLowerCase().includes(lower) || s.artist.toLowerCase().includes(lower)));
        }
    };

    const handleArtistClick = (uploaderId: number) => {
        setSelectedArtistId(uploaderId);
        setView('artist');
        window.scrollTo(0,0);
    };

    const handlePlay = (track: AudioTrack, newQueue?: AudioTrack[]) => {
        if (track.type === 'music') {
            onUpdateSongs(songs.map(s => s.id === track.id ? { ...s, stats: { ...s.stats, plays: s.stats.plays + 1 } } : s));
        } else {
            onUpdateEpisodes(episodes.map(e => e.id === track.id ? { ...e, stats: { ...e.stats, plays: e.stats.plays + 1 } } : e));
        }

        if (newQueue) {
            setPlayQueue(newQueue);
            const idx = newQueue.findIndex(t => t.id === track.id);
            setQueueIndex(idx !== -1 ? idx : 0);
        } else {
            const idx = playQueue.findIndex(t => t.id === track.id);
            if (idx === -1) {
                setPlayQueue([track]);
                setQueueIndex(0);
            } else {
                setQueueIndex(idx);
            }
        }
        onPlayTrack(track);
    };

    const handleLike = (id: string) => {
        if (likedTracks.includes(id)) {
            setLikedTracks(prev => prev.filter(tid => tid !== id));
        } else {
            setLikedTracks(prev => [...prev, id]);
            onUpdateSongs(songs.map(s => s.id === id ? { ...s, stats: { ...s.stats, likes: (s.stats.likes || 0) + 1 } } : s));
        }
    };

    const handleDownload = (id: string) => {
        if (!currentUser) {
            alert("Please login to download music.");
            return;
        }
        if (downloads.includes(id)) {
            setDownloads(prev => prev.filter(d => d !== id));
        } else {
            setDownloads(prev => [...prev, id]);
            const isSong = songs.some(s => s.id === id);
            if (isSong) {
                onUpdateSongs(songs.map(s => s.id === id ? { ...s, stats: { ...s.stats, downloads: s.stats.downloads + 1 } } : s));
            } else {
                onUpdateEpisodes(episodes.map(e => e.id === id ? { ...e, stats: { ...e.stats, downloads: e.stats.downloads + 1 } } : e));
            }
        }
    };

    const selectedArtistUser = users.find(u => u.id === selectedArtistId) || ({
        id: selectedArtistId || 0,
        name: filteredSongs.find(s => s.uploaderId === selectedArtistId)?.artist || 'Artist',
        profileImage: 'https://ui-avatars.com/api/?name=Artist&background=random',
        coverImage: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        followers: [], following: [], isOnline: false, isVerified: true, role: 'user' 
    } as User);

    return (
        <div className="bg-[#0A0A0A] min-h-screen font-sans">
            <div className="sticky top-14 bg-[#0A0A0A]/95 backdrop-blur-md z-30 px-4 py-4 border-b border-[#222] flex gap-6 overflow-x-auto scrollbar-hide">
                <span onClick={() => setView('music')} className={`cursor-pointer font-bold text-sm ${view === 'music' ? 'text-[#1877F2]' : 'text-gray-400'}`}>MUSIC</span>
                <span onClick={() => setView('podcast')} className={`cursor-pointer font-bold text-sm ${view === 'podcast' ? 'text-[#1877F2]' : 'text-gray-400'}`}>PODCASTS</span>
                {currentUser && (
                    <span onClick={() => setView('dashboard')} className={`cursor-pointer font-bold text-sm ${view === 'dashboard' ? 'text-[#1877F2]' : 'text-gray-400'}`}>DASHBOARD</span>
                )}
            </div>

            {view === 'music' && (
                <MusicHome 
                    songs={filteredSongs} 
                    albums={MOCK_ALBUMS} 
                    onPlay={handlePlay} 
                    onDownload={handleDownload} 
                    downloads={downloads}
                    onSearch={handleSearch}
                    onArtistClick={handleArtistClick}
                    users={users}
                    isAdmin={isAdmin}
                    onDeleteSong={onDeleteSong}
                />
            )}
            {view === 'podcast' && (
                <PodcastHome 
                    podcasts={MOCK_PODCASTS} 
                    episodes={episodes} 
                    onPlay={handlePlay} 
                    onDownload={handleDownload}
                    downloads={downloads}
                    isAdmin={isAdmin}
                    onDeletePodcast={onDeleteEpisode}
                />
            )}
            {view === 'dashboard' && currentUser && (
                <Dashboard 
                    songs={songs.filter(s => s.uploaderId === currentUser.id)} 
                    episodes={episodes.filter(e => e.uploaderId === currentUser.id)}
                    onOpenUpload={() => setShowUpload(true)} 
                    onDeleteSong={onDeleteSong}
                />
            )}
            {view === 'artist' && selectedArtistUser && (
                <ArtistProfileView 
                    artistUser={selectedArtistUser}
                    artistSongs={songs.filter(s => s.uploaderId === selectedArtistId || s.artist === selectedArtistUser.name)}
                    onPlay={(t) => handlePlay(t, [t])}
                />
            )}

            {showUpload && currentUser && (
                <AudioUploadModal 
                    currentUser={currentUser}
                    onClose={() => setShowUpload(false)} 
                    onUpload={(items, type) => {
                        if (type === 'music') {
                            const newSongs: Song[] = items.map(item => ({
                                id: `local_s_${Date.now()}_${Math.random()}`,
                                title: item.title,
                                artist: item.artist,
                                album: item.album,
                                cover: item.cover,
                                duration: item.duration,
                                audioUrl: item.audioUrl,
                                stats: { plays: 0, downloads: 0, shares: 0, likes: 0, reelsUse: 0 },
                                isLocal: true,
                                uploaderId: currentUser?.id
                            }));
                            onUpdateSongs([...newSongs, ...songs]);
                            newSongs.forEach(song => {
                                onFeedPost({
                                    type: 'audio',
                                    content: `released a new track: ${song.title}`,
                                    audioTrack: {
                                        id: song.id,
                                        url: song.audioUrl,
                                        title: song.title,
                                        artist: song.artist,
                                        cover: song.cover,
                                        type: 'music',
                                        uploaderId: song.uploaderId,
                                        isVerified: currentUser.isVerified
                                    }
                                });
                            });
                        } else if (type === 'podcast') {
                            const newEpisodes = items.map(item => ({
                                id: `local_ep_${Date.now()}_${Math.random()}`,
                                podcastId: `local_pod_${currentUser.id}`,
                                title: item.title,
                                description: item.description,
                                date: 'Just now',
                                duration: item.duration,
                                audioUrl: item.audioUrl,
                                thumbnail: item.cover,
                                stats: { plays: 0, downloads: 0, shares: 0, likes: 0, reelsUse: 0 },
                                uploaderId: currentUser?.id,
                                host: item.host
                            }));
                            onUpdateEpisodes([...newEpisodes, ...episodes]);
                            newEpisodes.forEach(ep => {
                                onFeedPost({
                                    type: 'audio',
                                    content: `released a new podcast episode: ${ep.title}`,
                                    audioTrack: {
                                        id: ep.id,
                                        url: ep.audioUrl,
                                        title: ep.title,
                                        artist: ep.host || currentUser.name,
                                        cover: ep.thumbnail,
                                        type: 'podcast',
                                        uploaderId: currentUser.id,
                                        isVerified: currentUser.isVerified
                                    }
                                });
                            });
                        }
                    }} 
                />
            )}
        </div>
    );
};
