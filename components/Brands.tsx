import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Brand, Post as PostType, Event, LinkPreview, AudioTrack } from '../types';
import { Post, CreatePostModal } from './Feed';
import { BRAND_CATEGORIES, LOCATIONS_DATA } from '../constants';
import { CreateEventModal } from './Events';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://unera.social';

// API Helper Functions
const getAuthToken = (): string | null => {
  return localStorage.getItem('unera_token');
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

// Brands API Functions
const BRANDS_API = {
  // Get all brands/pages
  getAll: async (): Promise<Brand[]> => {
    return apiRequest('/api/brands');
  },
  
  // Get single brand
  getById: async (brandId: number): Promise<Brand> => {
    return apiRequest(`/api/brands/${brandId}`);
  },
  
  // Create brand/page
  create: async (data: {
    name: string;
    category: string;
    description?: string;
    location?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    profileImage?: string;
    coverImage?: string;
  }): Promise<Brand> => {
    return apiRequest('/api/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // Update brand
  update: async (brandId: number, data: Partial<Brand>): Promise<Brand> => {
    return apiRequest(`/api/brands/${brandId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  // Delete brand
  delete: async (brandId: number): Promise<void> => {
    return apiRequest(`/api/brands/${brandId}`, {
      method: 'DELETE',
    });
  },
  
  // Follow/unfollow brand
  follow: async (brandId: number): Promise<{success: boolean; message: string}> => {
    return apiRequest(`/api/brands/${brandId}/follow`, {
      method: 'POST',
    });
  },
  
  unfollow: async (brandId: number): Promise<{success: boolean; message: string}> => {
    return apiRequest(`/api/brands/${brandId}/unfollow`, {
      method: 'POST',
    });
  },
  
  // Get brand posts
  getPosts: async (brandId: number, page = 1, limit = 20): Promise<PostType[]> => {
    return apiRequest(`/api/brands/${brandId}/posts?page=${page}&limit=${limit}`);
  },
  
  // Create brand post
  createPost: async (brandId: number, data: {
    content: string;
    type: string;
    media_url?: string;
    visibility: string;
    location?: string;
    feeling?: string;
    tagged_users?: number[];
    background?: string;
  }): Promise<PostType> => {
    return apiRequest(`/api/brands/${brandId}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // Upload brand image
  uploadImage: async (file: File, type: 'profile' | 'cover'): Promise<{url: string}> => {
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
    
    return response.json();
  }
};

// Posts API Functions
const POSTS_API = {
  // React to post (like, love, etc.)
  react: async (postId: number, type: string): Promise<void> => {
    return apiRequest(`/api/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  },
  
  // Share post
  share: async (postId: number): Promise<void> => {
    return apiRequest(`/api/posts/${postId}/share`, {
      method: 'POST',
    });
  },
  
  // Get post comments
  getComments: async (postId: number): Promise<any[]> => {
    return apiRequest(`/api/posts/${postId}/comments`);
  },
  
  // Add comment
  addComment: async (postId: number, content: string): Promise<any> => {
    return apiRequest(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
};

// Facebook-style relative time formatter for brand posts
const formatBrandPostTime = (timestamp: number): string => {
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

// --- CREATE BRAND MODAL ---
interface CreateBrandModalProps {
  currentUser: User;
  onClose: () => void;
  onCreate: (brand: Brand) => void;
}

const CreateBrandModal: React.FC<CreateBrandModalProps> = ({ currentUser, onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async () => {
    if (!name.trim() || !category || !location) {
      setError('Please fill all required fields');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const brandData = {
        name,
        category,
        description,
        website,
        location,
        contactEmail,
        contactPhone,
        profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
      };
      
      const newBrand = await BRANDS_API.create(brandData);
      onCreate(newBrand);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create brand page');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-[#242526] w-full max-w-[500px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#E4E6EB]">{step === 1 ? 'Create a Page' : 'Contact Info'}</h3>
          <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
            <i className="fas fa-times text-[#B0B3B8]"></i>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {step === 1 ? (
            <>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Page Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                  placeholder="Business or Brand Name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Category <span className="text-red-500">*</span></label>
                <select 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="">Select a Category</option>
                  {BRAND_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Description</label>
                <textarea 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] resize-none h-24" 
                  placeholder="Describe your brand..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Location (Country/Region) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  list="locations" 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                  placeholder="e.g. Dar es Salaam, Tanzania" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                />
                <datalist id="locations">
                  {LOCATIONS_DATA.map(l => <option key={l.name} value={l.name} />)}
                </datalist>
              </div>
              <button 
                onClick={() => setStep(2)} 
                disabled={!name.trim() || !category || !location || isLoading}
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Next'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#B0B3B8] mb-2">Add contact details to help people reach you (Optional).</p>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Website</label>
                <input 
                  type="text" 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                  placeholder="https://example.com" 
                  value={website} 
                  onChange={e => setWebsite(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Business Email</label>
                <input 
                  type="email" 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                  placeholder="contact@brand.com" 
                  value={contactEmail} 
                  onChange={e => setContactEmail(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Business Phone</label>
                <input 
                  type="tel" 
                  className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                  placeholder="+255..." 
                  value={contactPhone} 
                  onChange={e => setContactPhone(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setStep(1)} 
                  disabled={isLoading}
                  className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className="flex-1 bg-[#42B72A] hover:bg-[#36A420] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Page'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- EDIT BRAND MODAL ---
interface EditBrandModalProps {
  brand: Brand;
  onClose: () => void;
  onUpdate: (updatedBrand: Brand) => void;
}

const EditBrandModal: React.FC<EditBrandModalProps> = ({ brand, onClose, onUpdate }) => {
  const [description, setDescription] = useState(brand.description || '');
  const [website, setWebsite] = useState(brand.website || '');
  const [location, setLocation] = useState(brand.location || '');
  const [contactEmail, setContactEmail] = useState(brand.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(brand.contactPhone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedData = { description, website, location, contactEmail, contactPhone };
      const updatedBrand = await BRANDS_API.update(brand.id, updatedData);
      onUpdate(updatedBrand);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update brand');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-[#242526] w-full max-w-[600px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#E4E6EB]">Edit Page Info</h2>
          <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
            <i className="fas fa-times text-[#B0B3B8]"></i>
          </div>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Description</label>
            <textarea 
              className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none h-24 resize-none" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Location</label>
            <input 
              type="text" 
              className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Website</label>
            <input 
              type="text" 
              className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
              value={website} 
              onChange={e => setWebsite(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Contact Email</label>
            <input 
              type="email" 
              className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
              value={contactEmail} 
              onChange={e => setContactEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Contact Phone</label>
            <input 
              type="tel" 
              className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
              value={contactPhone} 
              onChange={e => setContactPhone(e.target.value)} 
            />
          </div>
          <button 
            onClick={handleSave} 
            disabled={isLoading}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- BRANDS PAGE COMPONENT ---
interface BrandsPageProps {
  currentUser: User | null;
  initialBrandId?: number | null;
  onPlayAudioTrack?: (track: AudioTrack) => void;
  onNavigate?: (view: string, params?: any) => void;
}

const BrandsPage: React.FC<BrandsPageProps> = ({ 
  currentUser, initialBrandId, onPlayAudioTrack, onNavigate 
}) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'Posts' | 'About' | 'Photos'>('Posts');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for API data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandPosts, setBrandPosts] = useState<PostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load brands from API
  useEffect(() => {
    const loadBrands = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const brandsData = await BRANDS_API.getAll();
        setBrands(brandsData);
        
        // Load users for post display
        try {
          const token = getAuthToken();
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const usersData = await response.json();
            setUsers(usersData);
          }
        } catch (err) {
          console.error('Failed to load users:', err);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load brands');
        console.error('Error loading brands:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBrands();
  }, []);

  // Load brand posts when active brand changes
  useEffect(() => {
    const loadBrandPosts = async () => {
      if (!activeBrandId) return;
      
      setBrandPosts([]);
      try {
        const posts = await BRANDS_API.getPosts(activeBrandId);
        const postsWithFormattedTime = posts.map(post => ({
          ...post,
          formattedTime: formatBrandPostTime(post.timestamp || post.createdAt || Date.now())
        }));
        setBrandPosts(postsWithFormattedTime);
      } catch (err) {
        console.error('Error loading brand posts:', err);
      }
    };

    if (activeBrandId && view === 'detail') {
      loadBrandPosts();
    }
  }, [activeBrandId, view]);

  useEffect(() => {
    if (initialBrandId) {
      const brand = brands.find(b => b.id === initialBrandId);
      if (brand) {
        setActiveBrandId(brand.id);
        setView('detail');
        setActiveTab('Posts');
      }
    } else {
      setView('list');
      setActiveBrandId(null);
    }
  }, [initialBrandId, brands]);

  const activeBrand = useMemo(() => brands.find(b => b.id === activeBrandId), [brands, activeBrandId]);
  const isAdmin = currentUser && activeBrand && activeBrand.adminId === currentUser.id;
  const isFollowing = currentUser && activeBrand && activeBrand.followers.includes(currentUser.id);

  const handleBrandClick = async (brandId: number) => {
    setActiveBrandId(brandId);
    setView('detail');
    setActiveTab('Posts');
    window.scrollTo(0, 0);
  };

  const handleCreateBrand = async (brandData: Partial<Brand>) => {
    if (!currentUser) {
      alert("Please login to create a brand page");
      return;
    }
    
    try {
      const newBrand = await BRANDS_API.create({
        name: brandData.name || '',
        category: brandData.category || '',
        description: brandData.description,
        location: brandData.location,
        website: brandData.website,
        contactEmail: brandData.contactEmail,
        contactPhone: brandData.contactPhone,
        profileImage: brandData.profileImage,
        coverImage: brandData.coverImage,
      });
      
      setBrands(prev => [newBrand, ...prev]);
      setShowCreateModal(false);
      
      // Auto-follow the brand after creation
      if (currentUser) {
        await BRANDS_API.follow(newBrand.id);
      }
    } catch (err: any) {
      alert(`Failed to create brand: ${err.message}`);
    }
  };

  const handleUpdateBrand = async (brandId: number, data: Partial<Brand>) => {
    try {
      const updatedBrand = await BRANDS_API.update(brandId, data);
      setBrands(prev => prev.map(b => b.id === brandId ? updatedBrand : b));
    } catch (err: any) {
      alert(`Failed to update brand: ${err.message}`);
    }
  };

  const handleFollowBrand = async (brandId: number) => {
    if (!currentUser) {
      alert("Login to follow brands");
      return;
    }
    
    try {
      const brand = brands.find(b => b.id === brandId);
      if (!brand) return;
      
      const isCurrentlyFollowing = brand.followers.includes(currentUser.id);
      
      if (isCurrentlyFollowing) {
        await BRANDS_API.unfollow(brandId);
        setBrands(prev => prev.map(b => 
          b.id === brandId 
            ? { ...b, followers: b.followers.filter(id => id !== currentUser.id) } 
            : b
        ));
      } else {
        await BRANDS_API.follow(brandId);
        setBrands(prev => prev.map(b => 
          b.id === brandId 
            ? { ...b, followers: [...b.followers, currentUser.id] } 
            : b
        ));
      }
    } catch (err: any) {
      alert(`Failed to follow/unfollow: ${err.message}`);
    }
  };

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
    if (!activeBrand) return;
    
    try {
      let media_url = undefined;
      
      // Handle file upload if present
      if (files && files.length > 0) {
        const file = files[0];
        const uploadResult = await BRANDS_API.uploadImage(file, 'post');
        media_url = uploadResult.url;
      }
      
      const postData = {
        content: text,
        type: type === 'multimage' ? 'image' : type,
        visibility,
        media_url,
        location,
        feeling,
        tagged_users: taggedUsers,
        background,
      };
      
      const newPost = await BRANDS_API.createPost(activeBrand.id, postData);
      
      // Add formatted time for display
      const postWithFormattedTime = {
        ...newPost,
        formattedTime: formatBrandPostTime(newPost.timestamp || Date.now())
      };
      
      setBrandPosts(prev => [postWithFormattedTime, ...prev]);
      setShowCreatePostModal(false);
    } catch (err: any) {
      alert(`Failed to create post: ${err.message}`);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'profile') => {
    if (!e.target.files || !e.target.files[0] || !activeBrand) return;
    
    const file = e.target.files[0];
    try {
      const uploadResult = await BRANDS_API.uploadImage(file, type);
      
      const updateData = type === 'cover' 
        ? { coverImage: uploadResult.url }
        : { profileImage: uploadResult.url };
      
      await handleUpdateBrand(activeBrand.id, updateData);
    } catch (err: any) {
      alert(`Failed to upload image: ${err.message}`);
    }
  };

  const handleReact = async (postId: number, type: any) => {
    if (!currentUser) {
      alert("Please login to react");
      return;
    }
    
    try {
      await POSTS_API.react(postId, type);
      
      // Update local state
      setBrandPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const reactions = post.reactions || [];
          const existingIndex = reactions.findIndex(r => r.userId === currentUser.id);
          
          if (existingIndex >= 0) {
            // Remove existing reaction
            const newReactions = [...reactions];
            newReactions.splice(existingIndex, 1);
            return { ...post, reactions: newReactions };
          } else {
            // Add new reaction
            return { 
              ...post, 
              reactions: [...reactions, { userId: currentUser.id, type }] 
            };
          }
        }
        return post;
      }));
    } catch (err: any) {
      console.error('Failed to react:', err);
    }
  };

  const handleShare = async (postId: number) => {
    if (!currentUser) {
      alert("Please login to share");
      return;
    }
    
    try {
      await POSTS_API.share(postId);
      
      // Update local state
      setBrandPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, shares: (post.shares || 0) + 1 }
          : post
      ));
    } catch (err: any) {
      console.error('Failed to share:', err);
    }
  };

  const handleOpenComments = (postId: number) => {
    // In a real app, you would open a comments modal or sheet
    console.log('Open comments for post:', postId);
  };

  const handleProfileClick = (id: number) => {
    if (onNavigate) {
      onNavigate('profile', { userId: id });
    }
  };

  const handleCreateEvent = async (eventData: Partial<Event>) => {
    if (!activeBrand || !currentUser) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          creator_id: currentUser.id,
          brand_id: activeBrand.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      
      const newEvent = await response.json();
      
      // Create a post about the event
      await handleCreatePost(
        `🎉 New event: ${newEvent.title}\n${newEvent.description}`,
        null,
        'event',
        'Public',
        newEvent.location,
        undefined,
        undefined,
        undefined,
        undefined
      );
      
      setShowCreateEventModal(false);
    } catch (err: any) {
      alert(`Failed to create event: ${err.message}`);
    }
  };

  if (isLoading && view === 'list') {
    return (
      <div className="w-full max-w-[1000px] mx-auto p-4 font-sans pb-20">
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error && view === 'list') {
    return (
      <div className="w-full max-w-[1000px] mx-auto p-4 font-sans pb-20">
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded-lg">
          <p className="font-bold">Error loading brands:</p>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (view === 'list' || !activeBrand) {
    const myBrands = currentUser ? brands.filter(b => b.adminId === currentUser.id) : [];
    let otherBrands = currentUser ? brands.filter(b => b.adminId !== currentUser.id) : brands;

    if (searchQuery.trim()) {
      otherBrands = otherBrands.filter(b => 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return (
      <div className="w-full max-w-[1000px] mx-auto p-4 font-sans pb-20">
        <div className="flex flex-col gap-4 mb-6 bg-[#242526] p-4 rounded-xl border border-[#3E4042]">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#E4E6EB]">Brands & Pages</h2>
              <p className="text-[#B0B3B8] text-sm">Discover businesses and creators.</p>
            </div>
            {currentUser && (
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="bg-[#263951] text-[#F3425F] hover:bg-[#2A3F5A] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
              >
                <i className="fas fa-briefcase text-lg"></i> <span>Create Brand</span>
              </button>
            )}
          </div>
          <div className="relative">
            <input 
              type="text" 
              className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 pl-10 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
              placeholder="Search Brands..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
          </div>
        </div>

        {myBrands.length > 0 && !searchQuery && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-[#E4E6EB] mb-3">Pages You Manage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBrands.map(brand => (
                <div 
                  key={brand.id} 
                  className="bg-[#242526] rounded-xl overflow-hidden border border-[#3E4042] cursor-pointer hover:shadow-lg transition-all flex flex-col" 
                  onClick={() => handleBrandClick(brand.id)}
                >
                  <div className="h-32 bg-gray-700 relative">
                    <img src={brand.coverImage} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="p-4 pt-10 relative">
                    <div className="absolute -top-8 left-4 rounded-full border-4 border-[#242526] overflow-hidden w-16 h-16 bg-[#3A3B3C]">
                      <img src={brand.profileImage} className="w-full h-full object-cover" alt="" />
                    </div>
                    <h4 className="font-bold text-lg text-[#E4E6EB]">{brand.name}</h4>
                    <p className="text-[#B0B3B8] text-xs">{brand.category} • {brand.followers.length} followers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold text-[#E4E6EB] mb-3">{searchQuery ? 'Search Results' : 'Suggested Pages'}</h3>
          {otherBrands.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherBrands.map(brand => (
                <div key={brand.id} className="bg-[#242526] rounded-xl overflow-hidden border border-[#3E4042] flex flex-col">
                  <div className="h-32 relative cursor-pointer" onClick={() => handleBrandClick(brand.id)}>
                    <img src={brand.coverImage} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="p-4 flex flex-col flex-1 relative">
                    <div className="absolute -top-8 left-4 rounded-full border-4 border-[#242526] overflow-hidden w-16 h-16 bg-[#3A3B3C] cursor-pointer" onClick={() => handleBrandClick(brand.id)}>
                      <img src={brand.profileImage} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="mt-8">
                      <h4 className="font-bold text-lg text-[#E4E6EB] hover:underline cursor-pointer" onClick={() => handleBrandClick(brand.id)}>
                        {brand.name} {brand.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-sm"></i>}
                      </h4>
                      <p className="text-[#B0B3B8] text-xs mb-1">{brand.category}</p>
                      <p className="text-[#B0B3B8] text-sm line-clamp-2 mb-4">{brand.description}</p>
                      <button 
                        onClick={() => handleFollowBrand(brand.id)} 
                        className="w-full bg-[#263951] text-[#F3425F] hover:bg-[#2A3F5A] font-bold py-2 rounded-lg transition-colors"
                      >
                        {currentUser && brand.followers.includes(currentUser.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#B0B3B8]">No brands found.</p>
          )}
        </div>

        {showCreateModal && currentUser && (
          <CreateBrandModal 
            currentUser={currentUser} 
            onClose={() => setShowCreateModal(false)} 
            onCreate={handleCreateBrand} 
          />
        )}
      </div>
    );
  }

  // Detail View
  return (
    <div className="w-full bg-[#18191A] min-h-screen pb-10 font-sans">
      <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'profile')} />
      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'cover')} />

      <div className="bg-[#242526] border-b border-[#3E4042] shadow-sm mb-4">
        <div className="max-w-[1100px] mx-auto">
          <div className="h-[200px] md:h-[350px] relative group bg-[#3A3B3C]">
            <img src={activeBrand.coverImage} className="w-full h-full object-cover md:rounded-b-xl" alt="Cover" />
            {isAdmin && (
              <div 
                className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/20 font-bold text-white text-sm flex items-center gap-2" 
                onClick={() => coverInputRef.current?.click()}
              >
                <i className="fas fa-camera"></i> Edit Cover
              </div>
            )}
          </div>
          <div className="px-4 pb-0">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-[40px] md:-mt-[30px] relative z-10 gap-4 mb-4">
              <div className="relative group">
                <div className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full border-4 border-[#242526] overflow-hidden bg-[#242526]">
                  <img src={activeBrand.profileImage} className="w-full h-full object-cover" alt="" />
                </div>
                {isAdmin && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                    onClick={() => profileInputRef.current?.click()}
                  >
                    <i className="fas fa-camera text-white text-2xl"></i>
                  </div>
                )}
              </div>
              
              <div className="flex-1 mt-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[#E4E6EB] leading-tight mb-1 flex items-center gap-2">
                  {activeBrand.name} 
                  {activeBrand.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-[20px]"></i>}
                </h1>
                <p className="text-[#B0B3B8] font-semibold text-[15px]">{activeBrand.category} • {activeBrand.location} • {activeBrand.followers.length} followers</p>
              </div>

              <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto">
                {isAdmin ? (
                  <>
                    <button 
                      onClick={() => setShowCreateEventModal(true)} 
                      className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4E4F50] flex-1 md:flex-none"
                    >
                      <i className="fas fa-plus"></i> Event
                    </button>
                    <button 
                      onClick={() => setShowEditBrandModal(true)} 
                      className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4E4F50] flex-1 md:flex-none"
                    >
                      <i className="fas fa-pen"></i> Edit Page
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => handleFollowBrand(activeBrand.id)} 
                      className={`${isFollowing ? 'bg-[#3A3B3C] text-[#E4E6EB]' : 'bg-[#1877F2] text-white'} px-6 py-2 rounded-lg font-bold text-base hover:opacity-90 flex-1 md:flex-none transition-colors`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => alert('Messaging feature coming soon!')} 
                      className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-base hover:bg-[#4E4F50] flex-1 md:flex-none"
                    >
                      <i className="fab fa-facebook-messenger mr-1"></i> Message
                    </button>
                    {activeBrand.contactPhone && (
                      <a 
                        href={`tel:${activeBrand.contactPhone}`} 
                        className="bg-[#25D366] text-white px-4 py-2 rounded-lg font-bold text-base hover:bg-[#20bd5a] flex items-center justify-center gap-2 flex-1 md:flex-none no-underline"
                      >
                        <i className="fab fa-whatsapp"></i> WhatsApp
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-[#3E4042] mt-4"></div>
            <div className="flex items-center gap-1 pt-1 overflow-x-auto">
              {['Posts', 'About', 'Photos'].map(tab => (
                <div 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={`px-4 py-3 cursor-pointer font-semibold text-base border-b-[3px] transition-colors whitespace-nowrap ${activeTab === tab ? 'text-[#1877F2] border-[#1877F2]' : 'text-[#B0B3B8] border-transparent hover:bg-[#3A3B3C] rounded-t-lg'}`}
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto w-full flex flex-col md:flex-row gap-4 px-0 md:px-4">
        <div className="w-full md:w-[360px] flex-shrink-0 flex flex-col gap-4 px-4 md:px-0">
          <div className="bg-[#242526] rounded-xl p-4 shadow-sm border border-[#3E4042]">
            <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">About</h2>
            <div className="flex flex-col gap-3 text-[#E4E6EB] text-[15px]">
              <p>{activeBrand.description}</p>
              <div className="h-[1px] bg-[#3E4042] w-full my-2"></div>
              <div className="flex items-center gap-3 text-[#B0B3B8]"><i className="fas fa-info-circle w-5 text-center"></i><span>{activeBrand.category}</span></div>
              <div className="flex items-center gap-3 text-[#B0B3B8]"><i className="fas fa-map-marker-alt w-5 text-center"></i><span>{activeBrand.location || 'Location not added'}</span></div>
              {activeBrand.website && (
                <div className="flex items-center gap-3 text-[#B0B3B8]">
                  <i className="fas fa-globe w-5 text-center"></i>
                  <a 
                    href={activeBrand.website.startsWith('http') ? activeBrand.website : `https://${activeBrand.website}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#1877F2] hover:underline truncate"
                  >
                    {activeBrand.website}
                  </a>
                </div>
              )}
              {activeBrand.contactEmail && (
                <div className="flex items-center gap-3 text-[#B0B3B8]"><i className="fas fa-envelope w-5 text-center"></i><span>{activeBrand.contactEmail}</span></div>
              )}
              {isAdmin && (
                <button 
                  className="w-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] font-semibold py-2 rounded-md transition-colors text-sm mt-2" 
                  onClick={() => setShowEditBrandModal(true)}
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === 'Posts' && (
            <>
              {isAdmin && currentUser && (
                <>
                  <div className="bg-[#242526] rounded-xl p-3 md:p-4 mb-4 shadow-sm border border-[#3E4042]">
                    <div className="flex gap-2 mb-3">
                      <img src={activeBrand.profileImage} alt="" className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#3E4042]" />
                      <div 
                        className="flex-1 bg-[#3A3B3C] rounded-full px-3 md:px-4 py-2 hover:bg-[#4E4F50] cursor-pointer flex items-center transition-colors" 
                        onClick={() => setShowCreatePostModal(true)}
                      >
                        <span className="text-[#B0B3B8] text-[17px] truncate">What new brand idea Today?</span>
                      </div>
                    </div>
                    <div className="border-t border-[#3E4042] pt-2 flex justify-between">
                      <div 
                        className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" 
                        onClick={() => setShowCreatePostModal(true)}
                      >
                        <i className="fas fa-video text-[#F3425F] text-[24px]"></i>
                        <span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Live Video</span>
                      </div>
                      <div 
                        className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" 
                        onClick={() => setShowCreatePostModal(true)}
                      >
                        <i className="fas fa-images text-[#45BD62] text-[24px]"></i>
                        <span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Photo/Video</span>
                      </div>
                      <div 
                        className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" 
                        onClick={() => setShowCreateEventModal(true)}
                      >
                        <i className="fas fa-calendar-plus text-[#F7B928] text-[24px]"></i>
                        <span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Event</span>
                      </div>
                    </div>
                  </div>

                  {showCreatePostModal && (
                    <CreatePostModal 
                      currentUser={{
                        ...currentUser, 
                        name: activeBrand.name, 
                        profileImage: activeBrand.profileImage
                      }} 
                      users={users} 
                      onClose={() => setShowCreatePostModal(false)}
                      onCreatePost={handleCreatePost}
                    />
                  )}
                </>
              )}
              
              <div className="space-y-4">
                {brandPosts.length > 0 ? brandPosts.map(post => {
                  const author = {
                    ...activeBrand,
                    type: 'brand' as const,
                    id: activeBrand.id,
                    name: activeBrand.name,
                    profileImage: activeBrand.profileImage,
                    isVerified: activeBrand.isVerified,
                    followers: activeBrand.followers
                  };
                  
                  return (
                    <Post 
                      key={post.id}
                      post={post}
                      author={author}
                      currentUser={currentUser}
                      users={users}
                      onProfileClick={handleProfileClick}
                      onReact={handleReact}
                      onShare={handleShare}
                      onOpenComments={handleOpenComments}
                      onVideoClick={() => {}}
                      onViewImage={() => {}}
                      onPlayAudioTrack={onPlayAudioTrack}
                    />
                  );
                }) : (
                  <div className="bg-[#242526] rounded-xl p-8 text-center border border-[#3E4042] mx-4 md:mx-0">
                    <p className="text-[#B0B3B8]">No posts yet.</p>
                    {isAdmin && (
                      <button 
                        onClick={() => setShowCreatePostModal(true)}
                        className="mt-4 bg-[#1877F2] text-white px-4 py-2 rounded-lg hover:bg-[#166FE5]"
                      >
                        Create Your First Post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          
          {activeTab === 'Photos' && (
            <div className="bg-[#242526] rounded-xl p-4 border border-[#3E4042] mx-4 md:mx-0">
              <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Photos</h2>
              <div className="grid grid-cols-3 gap-1">
                {brandPosts
                  .filter(p => (p.type === 'image' && p.images && p.images.length > 0) || p.image)
                  .flatMap(p => {
                    if (p.images && p.images.length > 0) {
                      return p.images.map((img, idx) => (
                        <img key={`${p.id}-${idx}`} src={img} className="aspect-square object-cover w-full cursor-pointer hover:opacity-90" alt="" />
                      ));
                    } else if (p.image) {
                      return [<img key={p.id} src={p.image} className="aspect-square object-cover w-full cursor-pointer hover:opacity-90" alt="" />];
                    }
                    return [];
                  })
                }
              </div>
              {brandPosts.filter(p => (p.type === 'image' && (p.images?.length || p.image))).length === 0 && 
                <p className="text-[#B0B3B8]">No photos available.</p>
              }
            </div>
          )}
        </div>
      </div>

      {showEditBrandModal && activeBrand && (
        <EditBrandModal 
          brand={activeBrand} 
          onClose={() => setShowEditBrandModal(false)} 
          onUpdate={(updatedBrand) => {
            setBrands(prev => prev.map(b => b.id === updatedBrand.id ? updatedBrand : b));
          }} 
        />
      )}

      {showCreateEventModal && currentUser && (
        <CreateEventModal 
          currentUser={currentUser}
          onClose={() => setShowCreateEventModal(false)}
          onCreate={handleCreateEvent}
        />
      )}
    </div>
  );
};

export { BrandsPage };
