import React, { useState, useRef, useEffect } from 'react';
import { User, Event, LocationSearchResult } from '../types';
import { LOCATIONS_DATA } from '../constants';

// ========== API CONFIGURATION ==========
const API_BASE_URL = 'https://unera.social';

// API client function (matching App.tsx pattern)
const apiFetch = async (endpoint: string, options: RequestInit = {}, withAuth = true) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (withAuth) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            mode: 'cors',
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API did not return JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        if (Array.isArray(data)) {
            return { data: data, success: true };
        }
        
        return data;
    } catch (error) {
        console.error('API Error for', endpoint, ':', error);
        return { data: [], success: false, error: error.message };
    }
};

// Transform API data
const transformEventFromAPI = (apiEvent: any): Event => {
    const eventDate = new Date(apiEvent.date || apiEvent.start_date || Date.now());
    const now = new Date();
    
    return {
        id: apiEvent.id,
        title: apiEvent.title || `Event ${apiEvent.id}`,
        description: apiEvent.description || '',
        date: apiEvent.date || apiEvent.start_date || Date.now(),
        time: apiEvent.time || apiEvent.start_time || '19:00',
        endTime: apiEvent.end_time,
        location: apiEvent.location || '',
        image: apiEvent.image || apiEvent.cover_image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        organizerId: apiEvent.organizer_id || apiEvent.organizerId || 1,
        organizerName: apiEvent.organizer_name,
        organizerAvatar: apiEvent.organizer_avatar,
        attendees: apiEvent.attendees || [],
        interestedIds: apiEvent.interested_ids || [],
        isOnline: apiEvent.is_online || false,
        link: apiEvent.link || '',
        price: apiEvent.price || 0,
        category: apiEvent.category || 'General',
        privacy: apiEvent.privacy || 'public',
        capacity: apiEvent.capacity || 0,
        tags: apiEvent.tags || [],
        createdAt: apiEvent.created_at || Date.now(),
        updatedAt: apiEvent.updated_at || Date.now(),
        status: eventDate < now ? 'past' : (apiEvent.status || 'upcoming')
    };
};

// Helper function to format date
const formatEventDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// Helper function to format time
const formatEventTime = (time: string): string => {
    if (!time) return 'TBD';
    
    // Handle both 24h and 12h formats
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
};

// --- OSM LOCATION SEARCH COMPONENT ---
const LocationSearch: React.FC<{ 
    value: string, 
    onSelect: (val: string, coordinates?: { lat: number, lon: number }) => void,
    disabled?: boolean
}> = ({ value, onSelect, disabled = false }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchTimeout = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (q: string) => {
        if (q.length < 2) { 
            setResults([]); 
            return; 
        }
        
        setLoading(true);
        try {
            // Try OpenStreetMap Nominatim API
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`,
                { headers: { 'Accept-Language': 'en' } }
            );
            
            if (res.ok) {
                const data = await res.json();
                const formattedResults: LocationSearchResult[] = data.map((item: any) => ({
                    display_name: item.display_name,
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    type: item.type,
                    importance: item.importance || 0
                }));
                setResults(formattedResults);
            }
        } catch (err) {
            console.error("Location search failed", err);
            // Fallback to local data
            const localResults = LOCATIONS_DATA
                .filter(loc => loc.name.toLowerCase().includes(q.toLowerCase()))
                .slice(0, 8);
            setResults(localResults);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setShowResults(true);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => handleSearch(val), 300);
    };

    const handleSelect = (result: LocationSearchResult) => {
        onSelect(result.display_name, { lat: result.lat, lon: result.lon });
        setQuery(result.display_name);
        setShowResults(false);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input 
                    className={`w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] text-sm pl-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Search city, venue, or address..." 
                    value={query} 
                    onChange={handleChange}
                    onFocus={() => !disabled && setShowResults(true)}
                    disabled={disabled}
                />
                <i className="fas fa-map-marker-alt absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
                {loading && <i className="fas fa-spinner fa-spin absolute right-4 top-1/2 -translate-y-1/2 text-[#1877F2]"></i>}
                {!loading && query && (
                    <button 
                        onClick={() => {
                            setQuery('');
                            onSelect('', undefined);
                            setResults([]);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0B3B8] hover:text-[#E4E6EB]"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>
            
            {showResults && results.length > 0 && !disabled && (
                <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-[#242526] border border-[#3E4042] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
                    {results.map((result, i) => (
                        <div 
                            key={`${result.display_name}-${i}`} 
                            className="p-3 hover:bg-[#3A3B3C] cursor-pointer text-white text-sm border-b border-[#3E4042] last:border-0 transition-colors"
                            onClick={() => handleSelect(result)}
                        >
                            <div className="flex items-start gap-2">
                                <i className="fas fa-location-dot mt-0.5 text-[#B0B3B8] flex-shrink-0"></i>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[#E4E6EB] truncate">{result.display_name}</div>
                                    {result.type && (
                                        <div className="text-[#B0B3B8] text-xs mt-0.5">
                                            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {showResults && query.length >= 2 && results.length === 0 && !loading && !disabled && (
                <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-[#242526] border border-[#3E4042] rounded-xl shadow-2xl p-4 animate-fade-in">
                    <div className="text-center text-[#B0B3B8] text-sm">
                        No locations found. Try a different search.
                    </div>
                </div>
            )}
        </div>
    );
};

interface CreateEventModalProps {
    currentUser: User;
    onClose: () => void;
    onCreate: (event: Partial<Event>) => Promise<void>;
    brandId?: number;
    groupId?: string;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ 
    currentUser, 
    onClose, 
    onCreate,
    brandId,
    groupId 
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const [onlineLink, setOnlineLink] = useState('');
    const [price, setPrice] = useState('0');
    const [category, setCategory] = useState('General');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [capacity, setCapacity] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [coordinates, setCoordinates] = useState<{ lat: number, lon: number } | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const today = new Date().toISOString().split('T')[0];

    const categories = [
        'General', 'Music', 'Art', 'Sports', 'Technology', 'Business',
        'Education', 'Food & Drink', 'Health & Wellness', 'Community',
        'Entertainment', 'Conference', 'Workshop', 'Party', 'Networking'
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                return;
            }
            
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setImage(ev.target.result as string);
                    setError('');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
            setTags([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!title.trim()) {
            setError('Event title is required');
            return;
        }
        
        if (!date) {
            setError('Event date is required');
            return;
        }
        
        if (!time) {
            setError('Start time is required');
            return;
        }
        
        if (!isOnline && !location.trim()) {
            setError('Location is required for in-person events');
            return;
        }
        
        if (isOnline && !onlineLink.trim()) {
            setError('Online event link is required');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            // Create event data
            const eventDate = new Date(`${date}T${time}`);
            const eventData: Partial<Event> = {
                title: title.trim(),
                description: description.trim(),
                date: eventDate.getTime(),
                time,
                endTime: endTime || undefined,
                location: isOnline ? 'Online Event' : location.trim(),
                image: image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
                organizerId: currentUser.id,
                organizerName: currentUser.name,
                organizerAvatar: currentUser.profileImage,
                attendees: [currentUser.id],
                interestedIds: [],
                isOnline,
                link: isOnline ? onlineLink.trim() : undefined,
                price: parseFloat(price) || 0,
                category,
                privacy,
                capacity: capacity ? parseInt(capacity) : 0,
                tags,
                coordinates: !isOnline && coordinates ? coordinates : undefined,
                brandId,
                groupId
            };
            
            await onCreate(eventData);
            // Modal will close from parent component
        } catch (err: any) {
            setError(err.message || 'Failed to create event. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocationSelect = (location: string, coords?: { lat: number, lon: number }) => {
        setLocation(location);
        setCoordinates(coords);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans backdrop-blur-sm">
            <div className="bg-[#242526] w-full max-w-[600px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
                <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#E4E6EB]">Create Event</h2>
                    <div 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer transition-colors"
                    >
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                
                <div className="flex border-b border-[#3E4042]">
                    <button
                        onClick={() => setStep(1)}
                        className={`flex-1 py-3 text-center font-semibold ${step === 1 ? 'text-[#1877F2] border-b-2 border-[#1877F2]' : 'text-[#B0B3B8] hover:bg-[#3A3B3C]'}`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => step === 1 && title && date && time && setStep(2)}
                        className={`flex-1 py-3 text-center font-semibold ${step === 2 ? 'text-[#1877F2] border-b-2 border-[#1877F2]' : 'text-[#B0B3B8] hover:bg-[#3A3B3C]'}`}
                    >
                        Settings
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    {step === 1 ? (
                        <>
                            {/* Image Upload */}
                            <div 
                                className="w-full h-40 bg-[#3A3B3C] rounded-lg flex flex-col items-center justify-center cursor-pointer border border-dashed border-[#B0B3B8] hover:bg-[#4E4F50] transition-colors overflow-hidden relative group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {image ? (
                                    <>
                                        <img src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Event Cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white font-semibold">Change Photo</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-camera text-2xl text-[#E4E6EB] mb-2 group-hover:scale-110 transition-transform"></i>
                                        <span className="text-[#E4E6EB] text-sm font-semibold">Add Cover Photo</span>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Event Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="What are you hosting?"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Date & Time <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <div className="text-[#B0B3B8] text-xs mb-1">Start Date</div>
                                        <input 
                                            type="date" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                            value={date} 
                                            onChange={e => setDate(e.target.value)}
                                            min={today}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[#B0B3B8] text-xs mb-1">Start Time</div>
                                        <input 
                                            type="time" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                            value={time} 
                                            onChange={e => setTime(e.target.value)}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="text-[#B0B3B8] text-xs mb-1">End Time (Optional)</div>
                                    <input 
                                        type="time" 
                                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                        value={endTime} 
                                        onChange={e => setEndTime(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Event Type
                                </label>
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsOnline(false)}
                                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${!isOnline ? 'bg-[#1877F2] text-white' : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'}`}
                                        disabled={isLoading}
                                    >
                                        <i className="fas fa-map-marker-alt mr-2"></i>
                                        In-Person
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOnline(true)}
                                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${isOnline ? 'bg-[#1877F2] text-white' : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'}`}
                                        disabled={isLoading}
                                    >
                                        <i className="fas fa-video mr-2"></i>
                                        Online
                                    </button>
                                </div>
                                
                                {isOnline ? (
                                    <div>
                                        <div className="text-[#B0B3B8] text-xs mb-1">Event Link <span className="text-red-500">*</span></div>
                                        <input 
                                            type="url" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                            placeholder="https://meet.google.com/xyz-abc-def"
                                            value={onlineLink}
                                            onChange={e => setOnlineLink(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-[#B0B3B8] text-xs mb-1">Location <span className="text-red-500">*</span></div>
                                        <LocationSearch 
                                            value={location} 
                                            onSelect={handleLocationSelect}
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Description
                                </label>
                                <textarea 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] h-32 resize-none disabled:opacity-50"
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Tell people more about the event..."
                                    disabled={isLoading}
                                />
                            </div>

                            <button 
                                type="button"
                                onClick={() => {
                                    if (!title || !date || !time) {
                                        setError('Please fill in all required fields');
                                        return;
                                    }
                                    if (!isOnline && !location) {
                                        setError('Location is required for in-person events');
                                        return;
                                    }
                                    if (isOnline && !onlineLink) {
                                        setError('Online event link is required');
                                        return;
                                    }
                                    setStep(2);
                                    setError('');
                                }}
                                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                Continue to Settings
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Category
                                </label>
                                <select 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    disabled={isLoading}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Privacy
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPrivacy('public')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${privacy === 'public' ? 'bg-[#1877F2] text-white' : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'}`}
                                        disabled={isLoading}
                                    >
                                        <i className="fas fa-globe-americas mr-2"></i>
                                        Public
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPrivacy('private')}
                                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${privacy === 'private' ? 'bg-[#1877F2] text-white' : 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50]'}`}
                                        disabled={isLoading}
                                    >
                                        <i className="fas fa-lock mr-2"></i>
                                        Private
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Price (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]">$</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 pl-8 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="text-[#B0B3B8] text-xs mt-1">
                                    Enter 0 for free events
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Capacity (Optional)
                                </label>
                                <input 
                                    type="number" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                    value={capacity}
                                    onChange={e => setCapacity(e.target.value)}
                                    min="0"
                                    placeholder="Leave empty for unlimited"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-1 text-sm">
                                    Tags (Optional)
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="Add a tag and press Enter"
                                        disabled={isLoading || tags.length >= 5}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] px-4 rounded-lg transition-colors disabled:opacity-50"
                                        disabled={isLoading || !tagInput.trim() || tags.length >= 5}
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <div 
                                            key={tag} 
                                            className="bg-[#3A3B3C] px-3 py-1 rounded-full flex items-center gap-1"
                                        >
                                            <span className="text-[#E4E6EB] text-sm">#{tag}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="text-[#B0B3B8] hover:text-[#E4E6EB]"
                                                disabled={isLoading}
                                            >
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[#B0B3B8] text-xs mt-1">
                                    Add up to 5 tags to help people find your event
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    Back
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-[#42B72A] hover:bg-[#36A420] text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-calendar-plus"></i> 
                                            Create Event
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

// Exportable API functions for App.tsx
export const eventsApiFunctions = {
    fetchEvents: async (filters?: {
        category?: string;
        dateRange?: { start: number; end: number };
        location?: string;
        organizerId?: number;
        attending?: number; // user ID
        interested?: number; // user ID
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<Event[]> => {
        try {
            let endpoint = '/api/events';
            const queryParams = new URLSearchParams();
            
            if (filters) {
                if (filters.category) queryParams.append('category', filters.category);
                if (filters.location) queryParams.append('location', filters.location);
                if (filters.organizerId) queryParams.append('organizer_id', filters.organizerId.toString());
                if (filters.attending) queryParams.append('attending', filters.attending.toString());
                if (filters.interested) queryParams.append('interested', filters.interested.toString());
                if (filters.search) queryParams.append('search', filters.search);
                if (filters.limit) queryParams.append('limit', filters.limit.toString());
                if (filters.offset) queryParams.append('offset', filters.offset.toString());
                
                if (filters.dateRange) {
                    queryParams.append('start_date', filters.dateRange.start.toString());
                    queryParams.append('end_date', filters.dateRange.end.toString());
                }
                
                if (Array.from(queryParams).length > 0) {
                    endpoint += `?${queryParams.toString()}`;
                }
            }
            
            const response = await apiFetch(endpoint);
            if (response.success && Array.isArray(response.data)) {
                return response.data.map(transformEventFromAPI);
            }
            return [];
        } catch (error) {
            console.error('Error fetching events:', error);
            return [];
        }
    },
    
    fetchEventById: async (eventId: number): Promise<Event | null> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}`);
            if (response.success && response.data) {
                return transformEventFromAPI(response.data);
            }
            return null;
        } catch (error) {
            console.error('Error fetching event:', error);
            return null;
        }
    },
    
    createEvent: async (eventData: Partial<Event>): Promise<Event> => {
        try {
            // Transform data for API
            const apiEventData = {
                title: eventData.title,
                description: eventData.description,
                start_date: eventData.date,
                start_time: eventData.time,
                end_time: eventData.endTime,
                location: eventData.location,
                is_online: eventData.isOnline || false,
                link: eventData.link,
                price: eventData.price || 0,
                category: eventData.category || 'General',
                privacy: eventData.privacy || 'public',
                capacity: eventData.capacity || 0,
                tags: eventData.tags || [],
                coordinates: eventData.coordinates,
                brand_id: eventData.brandId,
                group_id: eventData.groupId,
                image: eventData.image
            };
            
            const response = await apiFetch('/api/events', {
                method: 'POST',
                body: JSON.stringify(apiEventData)
            });
            
            if (response.success) {
                return transformEventFromAPI(response.data);
            }
            throw new Error(response.error || 'Failed to create event');
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create event');
        }
    },
    
    updateEvent: async (eventId: number, eventData: Partial<Event>): Promise<Event> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}`, {
                method: 'PUT',
                body: JSON.stringify(eventData)
            });
            
            if (response.success) {
                return transformEventFromAPI(response.data);
            }
            throw new Error(response.error || 'Failed to update event');
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update event');
        }
    },
    
    deleteEvent: async (eventId: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}`, {
                method: 'DELETE'
            });
            
            return response.success;
        } catch (error) {
            console.error('Error deleting event:', error);
            return false;
        }
    },
    
    attendEvent: async (eventId: number, userId: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}/attend`, {
                method: 'POST',
                body: JSON.stringify({ user_id: userId })
            });
            
            return response.success;
        } catch (error) {
            console.error('Error attending event:', error);
            return false;
        }
    },
    
    unattendEvent: async (eventId: number, userId: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}/attend`, {
                method: 'DELETE',
                body: JSON.stringify({ user_id: userId })
            });
            
            return response.success;
        } catch (error) {
            console.error('Error unattending event:', error);
            return false;
        }
    },
    
    markInterested: async (eventId: number, userId: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}/interested`, {
                method: 'POST',
                body: JSON.stringify({ user_id: userId })
            });
            
            return response.success;
        } catch (error) {
            console.error('Error marking event as interested:', error);
            return false;
        }
    },
    
    unmarkInterested: async (eventId: number, userId: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/events/${eventId}/interested`, {
                method: 'DELETE',
                body: JSON.stringify({ user_id: userId })
            });
            
            return response.success;
        } catch (error) {
            console.error('Error unmarking event as interested:', error);
            return false;
        }
    },
    
    uploadEventImage: async (eventId: number, file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await apiFetch(`/api/events/${eventId}/image`, {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type for FormData
            });
            
            if (response.success) {
                return response.data.image_url;
            }
            throw new Error('Failed to upload image');
        } catch (error: any) {
            throw new Error(error.message || 'Failed to upload image');
        }
    }
};
