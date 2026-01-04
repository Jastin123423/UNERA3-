import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Users, TrendingUp, MapPin, Globe, Mail, Phone, 
  Calendar, Image as ImageIcon, Video, Music, FileText, 
  MoreVertical, Edit, Trash2, Check, X, Share2, MessageCircle,
  Heart, MessageSquare, BarChart2, Filter, Plus, Crown, Shield
} from 'lucide-react';
import { Post } from './Feed'; // CORRECTED IMPORT
import { CreatePostModal } from './Feed';
import { EventCard } from './Events';
import { Brand, Post as PostType, User } from '../types';

interface BrandsPageProps {
  currentUser: User | null;
  brands: Brand[];
  posts: PostType[];
  users: User[];
  onCreateBrand: (brandData: Partial<Brand>) => void;
  onFollowBrand: (brandId: number) => void;
  onProfileClick: (userId: number) => void;
  onPostAsBrand: (
    brandId: number, 
    content: string, 
    files: File[] | null, 
    type: string, 
    visibility: string, 
    location?: string, 
    feeling?: string, 
    taggedUsers?: number[], 
    background?: string, 
    linkPreview?: any
  ) => void;
  onReact: (postId: number, reactionType: any) => void;
  onShare: (postId: number) => void;
  onOpenComments: (postId: number) => void;
  onUpdateBrand: (brandId: number, updates: Partial<Brand>) => void;
  onDeleteBrand: (brandId: number) => void;
  onMessage: (brandId: number) => void;
  onCreateEvent: (brandId: number, eventData: Partial<any>) => void;
  onUpdateBrandImage: (brandId: number, type: 'cover' | 'profile', file: File) => void;
  onDeletePost: (postId: number) => void;
  onVerifyBrand: (brandId: number) => void;
  initialBrandId?: number | null;
  onPlayAudioTrack?: (track: any) => void;
}

const BrandsPage: React.FC<BrandsPageProps> = ({
  currentUser,
  brands,
  posts,
  users,
  onCreateBrand,
  onFollowBrand,
  onProfileClick,
  onPostAsBrand,
  onReact,
  onShare,
  onOpenComments,
  onUpdateBrand,
  onDeleteBrand,
  onMessage,
  onCreateEvent,
  onUpdateBrandImage,
  onDeletePost,
  onVerifyBrand,
  initialBrandId = null,
  onPlayAudioTrack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'verified'>('popular');
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [selectedBrandForPost, setSelectedBrandForPost] = useState<number | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(initialBrandId);
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'about' | 'followers'>('feed');
  
  // Filter and sort brands
  const filteredBrands = useMemo(() => {
    let filtered = [...brands];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(brand => 
        brand.name.toLowerCase().includes(query) ||
        brand.category.toLowerCase().includes(query) ||
        brand.description.toLowerCase().includes(query) ||
        brand.location.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(brand => brand.category === selectedCategory);
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.followers?.length || 0) - (a.followers?.length || 0);
      } else if (sortBy === 'newest') {
        return b.createdAt - a.createdAt;
      } else { // verified
        return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
      }
    });
    
    return filtered;
  }, [brands, searchQuery, selectedCategory, sortBy]);
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = brands.map(b => b.category);
    return ['all', ...Array.from(new Set(cats))];
  }, [brands]);
  
  // Get brand posts
  const brandPosts = useMemo(() => {
    if (!selectedBrandId) return [];
    return posts.filter(post => post.authorId === selectedBrandId || post.brandId === selectedBrandId);
  }, [posts, selectedBrandId]);
  
  // Get selected brand
  const selectedBrand = useMemo(() => {
    return selectedBrandId ? brands.find(b => b.id === selectedBrandId) : null;
  }, [brands, selectedBrandId]);
  
  // Get brand events
  const brandEvents = useMemo(() => {
    if (!selectedBrand) return [];
    // This would come from your events data
    return [];
  }, [selectedBrand]);
  
  // Handle brand selection
  useEffect(() => {
    if (initialBrandId && !selectedBrandId) {
      setSelectedBrandId(initialBrandId);
    }
  }, [initialBrandId, selectedBrandId]);
  
  // Handle create brand
  const handleCreateBrand = (brandData: Partial<Brand>) => {
    onCreateBrand(brandData);
    setShowCreateBrandModal(false);
  };
  
  // Handle brand post
  const handleBrandPost = (content: string, files: File[] | null, type: string, visibility: string, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: any) => {
    if (!selectedBrandForPost || !currentUser) return;
    
    onPostAsBrand(
      selectedBrandForPost,
      content,
      files,
      type,
      visibility,
      location,
      feeling,
      taggedUsers,
      background,
      linkPreview
    );
    
    setShowCreatePostModal(false);
    setSelectedBrandForPost(null);
  };
  
  // Check if user follows a brand
  const isFollowingBrand = (brandId: number) => {
    if (!currentUser) return false;
    const brand = brands.find(b => b.id === brandId);
    return brand ? brand.followers.includes(currentUser.id) : false;
  };
  
  // Check if user is brand admin
  const isBrandAdmin = (brandId: number) => {
    if (!currentUser) return false;
    const brand = brands.find(b => b.id === brandId);
    return brand ? brand.adminId === currentUser.id : false;
  };
  
  // Render brand card
  const renderBrandCard = (brand: Brand) => {
    const isFollowing = isFollowingBrand(brand.id);
    const isAdmin = isBrandAdmin(brand.id);
    
    return (
      <div key={brand.id} className="bg-[#242526] rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="relative">
              <img 
                src={brand.profileImage} 
                alt={brand.name}
                className="w-14 h-14 rounded-full border-2 border-[#3A3B3C]"
              />
              {brand.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="ml-3">
              <div className="flex items-center">
                <h3 className="font-semibold text-white">{brand.name}</h3>
                {brand.isVerified && (
                  <Shield size={14} className="ml-1 text-blue-500" />
                )}
              </div>
              <p className="text-gray-400 text-sm">{brand.category}</p>
              <div className="flex items-center text-gray-400 text-xs mt-1">
                <MapPin size={12} className="mr-1" />
                <span>{brand.location}</span>
                <span className="mx-2">•</span>
                <Users size={12} className="mr-1" />
                <span>{brand.followers?.length || 0} followers</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <button 
                onClick={() => {
                  setSelectedBrandId(brand.id);
                  setSelectedBrandForPost(brand.id);
                  setShowCreatePostModal(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Post
              </button>
            ) : (
              <button 
                onClick={() => onFollowBrand(brand.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
                  isFollowing 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            
            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3A3B3C] rounded-lg">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mb-3 line-clamp-2">{brand.description}</p>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedBrandId(brand.id)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            View Page
          </button>
          
          <div className="flex items-center space-x-4">
            {brand.website && (
              <a 
                href={brand.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <Globe size={16} />
              </a>
            )}
            {isAdmin && (
              <button 
                onClick={() => setEditingBrand(brand)}
                className="text-gray-400 hover:text-white"
              >
                <Edit size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Render brand page
  const renderBrandPage = () => {
    if (!selectedBrand) return null;
    
    const isFollowing = isFollowingBrand(selectedBrand.id);
    const isAdmin = isBrandAdmin(selectedBrand.id);
    
    return (
      <div className="bg-[#242526] rounded-xl overflow-hidden">
        {/* Cover Image */}
        <div className="relative h-48 bg-gradient-to-r from-blue-900 to-purple-900">
          {selectedBrand.coverImage && (
            <img 
              src={selectedBrand.coverImage} 
              alt={selectedBrand.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute bottom-4 left-4 flex items-end">
            <div className="relative">
              <img 
                src={selectedBrand.profileImage} 
                alt={selectedBrand.name}
                className="w-24 h-24 rounded-full border-4 border-[#242526]"
              />
              {selectedBrand.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
            <div className="ml-4 mb-2">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-white">{selectedBrand.name}</h1>
                {selectedBrand.isVerified && (
                  <Shield size={20} className="ml-2 text-blue-500" />
                )}
              </div>
              <p className="text-gray-300">{selectedBrand.category} • {selectedBrand.followers?.length || 0} followers</p>
            </div>
          </div>
          
          <div className="absolute bottom-4 right-4 flex space-x-2">
            {isAdmin && (
              <button 
                onClick={() => {
                  setSelectedBrandForPost(selectedBrand.id);
                  setShowCreatePostModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center"
              >
                <Plus size={18} className="mr-2" />
                Create Post
              </button>
            )}
            
            <button 
              onClick={() => onFollowBrand(selectedBrand.id)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                isFollowing 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            
            <button 
              onClick={() => onMessage(selectedBrand.id)}
              className="px-4 py-2 bg-[#3A3B3C] hover:bg-[#4E4F50] text-white rounded-lg font-medium flex items-center"
            >
              <MessageCircle size={18} className="mr-2" />
              Message
            </button>
            
            {currentUser?.role === 'admin' && (
              <button 
                onClick={() => onVerifyBrand(selectedBrand.id)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                  selectedBrand.isVerified 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {selectedBrand.isVerified ? 'Verified' : 'Verify'}
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-[#3A3B3C] px-6">
          <div className="flex space-x-6">
            {(['feed', 'events', 'about', 'followers'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300 border-transparent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'feed' && (
            <div>
              {brandPosts.length > 0 ? (
                brandPosts.map(post => {
                  const author = {
                    ...selectedBrand,
                    type: 'brand' as const,
                    name: selectedBrand.name,
                    profileImage: selectedBrand.profileImage,
                    isVerified: selectedBrand.isVerified,
                    id: selectedBrand.id,
                    followers: selectedBrand.followers || []
                  };
                  
                  return (
                    <Post
                      key={post.id}
                      post={post}
                      author={author}
                      currentUser={currentUser}
                      users={users}
                      onProfileClick={onProfileClick}
                      onReact={onReact}
                      onShare={onShare}
                      onViewImage={() => {}}
                      onOpenComments={onOpenComments}
                      onVideoClick={() => {}}
                      onViewProduct={() => {}}
                      onGroupClick={() => {}}
                      onPlayAudioTrack={onPlayAudioTrack}
                      onFollow={() => onFollowBrand(selectedBrand.id)}
                      isFollowing={isFollowing}
                      onHashtagClick={() => {}}
                      onDeletePost={isAdmin ? onDeletePost : undefined}
                      isAdmin={currentUser?.role === 'admin'}
                    />
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-[#3A3B3C] rounded-full flex items-center justify-center mb-4">
                    <FileText size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                  <p className="text-gray-400 mb-6">This brand hasn't posted anything yet.</p>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setSelectedBrandForPost(selectedBrand.id);
                        setShowCreatePostModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      Create First Post
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                <p className="text-gray-300">{selectedBrand.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {selectedBrand.location && (
                  <div className="flex items-center">
                    <MapPin size={18} className="text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-400 text-sm">Location</p>
                      <p className="text-white">{selectedBrand.location}</p>
                    </div>
                  </div>
                )}
                
                {selectedBrand.category && (
                  <div className="flex items-center">
                    <TrendingUp size={18} className="text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-400 text-sm">Category</p>
                      <p className="text-white">{selectedBrand.category}</p>
                    </div>
                  </div>
                )}
                
                {selectedBrand.website && (
                  <div className="flex items-center">
                    <Globe size={18} className="text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-400 text-sm">Website</p>
                      <a 
                        href={selectedBrand.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {selectedBrand.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}
                
                {selectedBrand.contactEmail && (
                  <div className="flex items-center">
                    <Mail size={18} className="text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white">{selectedBrand.contactEmail}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <div className="pt-6 border-t border-[#3A3B3C]">
                  <button 
                    onClick={() => setEditingBrand(selectedBrand)}
                    className="px-4 py-2 bg-[#3A3B3C] hover:bg-[#4E4F50] text-white rounded-lg font-medium"
                  >
                    Edit Brand Info
                  </button>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'events' && (
            <div>
              {brandEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {brandEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      currentUser={currentUser}
                      onJoinEvent={() => {}}
                      onProfileClick={onProfileClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-[#3A3B3C] rounded-full flex items-center justify-center mb-4">
                    <Calendar size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No events yet</h3>
                  <p className="text-gray-400">This brand hasn't created any events yet.</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'followers' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedBrand.followers?.map(followerId => {
                  const follower = users.find(u => u.id === followerId);
                  if (!follower) return null;
                  
                  return (
                    <div key={follower.id} className="bg-[#3A3B3C] rounded-lg p-4">
                      <div className="flex items-center">
                        <img 
                          src={follower.profileImage} 
                          alt={follower.name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="ml-3">
                          <h4 className="font-medium text-white">{follower.name}</h4>
                          <p className="text-gray-400 text-sm">{follower.followers?.length || 0} followers</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Brands</h1>
        <p className="text-gray-400">Discover and follow your favorite brands</p>
      </div>
      
      {/* Search and Filters */}
      <div className="bg-[#242526] rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="verified">Verified</option>
            </select>
            
            <button 
              onClick={() => setShowCreateBrandModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center"
            >
              <Plus size={18} className="mr-2" />
              Create Brand
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brands List */}
        <div className="lg:col-span-1">
          <div className="bg-[#242526] rounded-xl p-4 mb-4">
            <h2 className="text-lg font-semibold text-white mb-4">All Brands ({filteredBrands.length})</h2>
            <div className="space-y-3">
              {filteredBrands.length > 0 ? (
                filteredBrands.map(renderBrandCard)
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-[#3A3B3C] rounded-full flex items-center justify-center mb-4">
                    <TrendingUp size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No brands found</h3>
                  <p className="text-gray-400 mb-4">Try adjusting your search or filters</p>
                  <button 
                    onClick={() => setShowCreateBrandModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Create First Brand
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Brand Page or Empty State */}
        <div className="lg:col-span-2">
          {selectedBrand ? (
            renderBrandPage()
          ) : (
            <div className="bg-[#242526] rounded-xl p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-[#3A3B3C] rounded-full flex items-center justify-center mb-6">
                <Crown size={32} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Welcome to Brands</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Discover amazing brands, follow your favorites, and see their latest updates all in one place.
              </p>
              <button 
                onClick={() => setShowCreateBrandModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-lg"
              >
                Create Your Brand
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Brand Modal */}
      {showCreateBrandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#242526] rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create Brand Page</h3>
                <button 
                  onClick={() => setShowCreateBrandModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Brand Name *</label>
                  <input
                    type="text"
                    id="brandName"
                    className="w-full px-4 py-2.5 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter brand name"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Category *</label>
                  <select
                    id="brandCategory"
                    className="w-full px-4 py-2.5 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="Business">Business</option>
                    <option value="Technology">Technology</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Health & Wellness">Health & Wellness</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Description</label>
                  <textarea
                    id="brandDescription"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Tell us about your brand..."
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Location</label>
                  <input
                    type="text"
                    id="brandLocation"
                    className="w-full px-4 py-2.5 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="City, Country"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Website</label>
                  <input
                    type="url"
                    id="brandWebsite"
                    className="w-full px-4 py-2.5 bg-[#3A3B3C] border border-[#3A3B3C] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button 
                  onClick={() => setShowCreateBrandModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const brandData = {
                      name: (document.getElementById('brandName') as HTMLInputElement)?.value,
                      category: (document.getElementById('brandCategory') as HTMLSelectElement)?.value,
                      description: (document.getElementById('brandDescription') as HTMLTextAreaElement)?.value,
                      location: (document.getElementById('brandLocation') as HTMLInputElement)?.value,
                      website: (document.getElementById('brandWebsite') as HTMLInputElement)?.value,
                    };
                    handleCreateBrand(brandData);
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Create Brand
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Post Modal */}
      {showCreatePostModal && selectedBrandForPost && currentUser && (
        <CreatePostModal
          currentUser={currentUser}
          users={users}
          onClose={() => {
            setShowCreatePostModal(false);
            setSelectedBrandForPost(null);
          }}
          onCreatePost={handleBrandPost}
        />
      )}
    </div>
  );
};

export default BrandsPage;
