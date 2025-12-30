import React, { useState, useEffect } from 'react';
import { User, Post as PostType, Brand, Comment, ReactionType } from '../types';

// Temporary Post component with proper styling
const Post: React.FC<any> = ({ 
  post, 
  author, 
  currentUser, 
  onProfileClick, 
  onReact, 
  onShare, 
  onOpenComments, 
  onPlayAudioTrack, 
  onFollow, 
  isFollowing, 
  onDeletePost, 
  isAdmin 
}) => {
  return (
    <div className="bg-[#242526] rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <img 
          src={author.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}&background=random&color=fff`} 
          alt={author.name}
          className="w-12 h-12 rounded-full cursor-pointer border-2 border-gray-600"
          onClick={() => onProfileClick(author.id)}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span 
              className="font-semibold cursor-pointer hover:underline text-white"
              onClick={() => onProfileClick(author.id)}
            >
              {author.name}
            </span>
            {author.isVerified && (
              <i className="fas fa-check-circle text-blue-500 text-sm"></i>
            )}
            {!isFollowing && (
              <button
                onClick={onFollow}
                className="ml-2 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
              >
                Follow
              </button>
            )}
          </div>
          <div className="text-gray-400 text-sm">
            {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => onDeletePost?.(post.id)}
            className="text-gray-400 hover:text-red-500"
          >
            <i className="fas fa-trash"></i>
          </button>
        )}
      </div>
      
      {post.content && (
        <div className="mb-4">
          <p className="whitespace-pre-wrap text-gray-100">{post.content}</p>
        </div>
      )}
      
      {post.image && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img 
            src={post.image} 
            alt="Post content" 
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}
      
      <div className="flex items-center justify-between border-t border-gray-700 pt-4">
        <button
          onClick={() => onReact(post.id, 'like')}
          className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <i className="fas fa-heart"></i>
          <span>{post.reactions?.length || 0}</span>
        </button>
        <button
          onClick={() => onShare(post.id)}
          className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors"
        >
          <i className="fas fa-share"></i>
          <span>Share</span>
        </button>
        <button
          onClick={onOpenComments}
          className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition-colors"
        >
          <i className="fas fa-comment"></i>
          <span>{post.comments?.length || 0}</span>
        </button>
      </div>
    </div>
  );
};

// Temporary CreatePostModal component
const CreatePostModal: React.FC<any> = ({ currentUser, onClose, onCreatePost }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreatePost(content, null, 'text', 'public', null, null, [], null, null);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#242526] rounded-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <img
              src={currentUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'User')}&background=random&color=fff`}
              alt={currentUser?.username}
              className="w-12 h-12 rounded-full border-2 border-gray-600"
            />
            <div>
              <div className="font-semibold text-white">{currentUser?.username}</div>
              <select className="text-sm bg-[#3A3B3C] border border-gray-600 rounded px-2 py-1 text-white">
                <option value="public">Public</option>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          
          <textarea
            className="w-full bg-transparent border-0 text-xl min-h-[200px] resize-none focus:outline-none placeholder-gray-500 text-white"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
          
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-green-500">
                <i className="fas fa-image text-green-500"></i>
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-500">
                <i className="fas fa-video text-red-500"></i>
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-yellow-500">
                <i className="fas fa-music text-yellow-500"></i>
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-500">
                <i className="fas fa-file text-blue-500"></i>
              </button>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                disabled={isSubmitting || !content.trim()}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Temporary CommentsSheet component
const CommentsSheet: React.FC<any> = ({ post, currentUser, users, onClose, onProfileClick }) => {
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    const comment = {
      id: Date.now(),
      postId: post.id,
      userId: currentUser.id,
      content: newComment,
      createdAt: new Date().toISOString(),
      likes: []
    };
    
    setComments([comment, ...comments]);
    setNewComment('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
      <div className="bg-[#242526] w-full max-w-2xl h-[80vh] rounded-t-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Comments</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto h-[calc(80vh-120px)]">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-comment-slash text-4xl mb-4"></i>
              <p className="text-lg">No comments yet</p>
              <p className="text-sm mt-2">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: any) => {
                const author = users.find((u: any) => u.id === comment.userId);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <img
                      src={author?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.username || 'User')}&background=random&color=fff`}
                      alt={author?.username}
                      className="w-10 h-10 rounded-full cursor-pointer border border-gray-600"
                      onClick={() => onProfileClick?.(author?.id)}
                    />
                    <div className="flex-1">
                      <div className="bg-[#3A3B3C] rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-semibold text-sm cursor-pointer hover:underline text-white"
                            onClick={() => onProfileClick?.(author?.id)}
                          >
                            {author?.username || 'Unknown User'}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-100">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-2">
                        <button className="text-xs text-gray-400 hover:text-white">
                          Like
                        </button>
                        <button className="text-xs text-gray-400 hover:text-white">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-3">
            <img
              src={currentUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.username || 'User')}&background=random&color=fff`}
              alt={currentUser?.username}
              className="w-10 h-10 rounded-full border border-gray-600"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                className="flex-1 bg-[#3A3B3C] border border-gray-600 rounded-full px-4 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-10 h-10 rounded-full flex items-center justify-center text-white"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions remain the same as before
const generateBrandSlug = (brand: Brand) => {
    return `${brand.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${brand.id}`;
};

const generateBrandCanonicalUrl = (brand: Brand) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/brand/${generateBrandSlug(brand)}`;
};

const generatePostCanonicalUrl = (post: PostType) => {
    const baseUrl = window.location.origin;
    
    let slug = '';
    if (post.content && post.content.length > 0) {
        slug = post.content
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 60);
    }
    
    return slug 
        ? `${baseUrl}/post/${slug}-${post.id}`
        : `${baseUrl}/post/${post.id}`;
};

// SEO Manager Component (simplified)
const BrandSEOManager: React.FC<{
    brand?: Brand;
    posts?: PostType[];
    isBrandPage?: boolean;
}> = ({ brand, posts = [], isBrandPage = false }) => {
    useEffect(() => {
        if (isBrandPage && brand) {
            document.title = `${brand.name} - Brand Page | unera.social`;
            
            let description = brand.description || `${brand.name} on unera.social. Follow for updates and community engagement.`;
            if (description.length > 155) {
                description = description.substring(0, 155) + '...';
            }
            
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
        }
        
        return () => {
            // Cleanup if needed
        };
    }, [brand, isBrandPage]);
    
    return null;
};

// Main BrandsPage Component with fixed styling
interface BrandsPageProps {
    currentUser: User | null;
    brands: Brand[];
    posts: PostType[];
    users: User[];
    onCreateBrand: (brandData: Partial<Brand>) => void;
    onFollowBrand: (brandId: number) => void;
    onProfileClick: (userId: number) => void;
    onPostAsBrand: (brandId: number, content: any) => void;
    onReact: (postId: number, type: ReactionType) => void;
    onShare: (postId: number) => void;
    onOpenComments: (postId: number) => void;
    onUpdateBrand: (brandId: number, data: Partial<Brand>) => void;
    onDeleteBrand: (brandId: number) => void;
    onMessage: (brandId: number) => void;
    onDeletePost?: (postId: number) => void;
    onVerifyBrand?: (brandId: number) => void;
    initialBrandId?: number | null;
    onPlayAudioTrack?: (track: any) => void;
}

export const BrandsPage: React.FC<BrandsPageProps> = ({
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
    onDeletePost,
    onVerifyBrand,
    initialBrandId = null,
    onPlayAudioTrack
}) => {
    const [activeBrandId, setActiveBrandId] = useState<number | null>(initialBrandId);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [selectedBrandForPost, setSelectedBrandForPost] = useState<number | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // Brand creation form state
    const [newBrandName, setNewBrandName] = useState('');
    const [newBrandCategory, setNewBrandCategory] = useState('Business');
    const [newBrandDescription, setNewBrandDescription] = useState('');
    const [newBrandLocation, setNewBrandLocation] = useState('');
    const [newBrandWebsite, setNewBrandWebsite] = useState('');
    const [newBrandContactEmail, setNewBrandContactEmail] = useState('');
    const [newBrandContactPhone, setNewBrandContactPhone] = useState('');
    
    const activeBrand = activeBrandId ? brands.find(b => b.id === activeBrandId) : null;
    const brandPosts = activeBrand ? posts.filter(p => p.authorId === activeBrand.id) : [];
    
    // Filter brands based on search and category
    const filteredBrands = brands.filter(brand => {
        if (searchQuery && !brand.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (selectedCategory !== 'all' && brand.category !== selectedCategory) {
            return false;
        }
        return true;
    });
    
    // Get unique categories from brands
    const brandCategories = Array.from(new Set(brands.map(b => b.category))).filter(Boolean);
    
    // Handle brand creation
    const handleCreateBrand = () => {
        if (!newBrandName.trim()) {
            alert('Please enter a brand name');
            return;
        }
        
        onCreateBrand({
            name: newBrandName,
            category: newBrandCategory,
            description: newBrandDescription,
            location: newBrandLocation,
            website: newBrandWebsite,
            contactEmail: newBrandContactEmail,
            contactPhone: newBrandContactPhone
        });
        
        setShowCreateBrandModal(false);
        // Reset form
        setNewBrandName('');
        setNewBrandCategory('Business');
        setNewBrandDescription('');
        setNewBrandLocation('');
        setNewBrandWebsite('');
        setNewBrandContactEmail('');
        setNewBrandContactPhone('');
    };
    
    // Initialize with sample data if empty (for testing)
    const displayBrands = filteredBrands.length > 0 ? filteredBrands : [
        {
            id: 1,
            name: 'Sample Brand 1',
            category: 'Technology',
            description: 'A sample technology brand',
            location: 'San Francisco, CA',
            profileImage: 'https://ui-avatars.com/api/?name=Sample+Brand+1&background=random&color=fff',
            coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            followers: [1],
            isVerified: true,
            adminId: 1,
            createdAt: new Date().toISOString(),
            website: 'https://example.com',
            contactEmail: 'contact@example.com',
            contactPhone: '+1234567890'
        },
        {
            id: 2,
            name: 'Sample Brand 2',
            category: 'Fashion',
            description: 'A sample fashion brand',
            location: 'New York, NY',
            profileImage: 'https://ui-avatars.com/api/?name=Sample+Brand+2&background=random&color=fff',
            coverImage: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            followers: [1, 2],
            isVerified: false,
            adminId: 2,
            createdAt: new Date().toISOString(),
            website: 'https://example2.com',
            contactEmail: 'contact@example2.com',
            contactPhone: '+9876543210'
        }
    ];
    
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Load Font Awesome icons */}
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            
            <BrandSEOManager
                brand={activeBrand || undefined}
                posts={brandPosts}
                isBrandPage={!!activeBrand}
            />
            
            {!activeBrand ? (
                // Brands Directory View
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Brands Directory</h1>
                            <p className="text-gray-400 mt-2">Discover and follow brands on unera.social</p>
                        </div>
                        <button
                            onClick={() => setShowCreateBrandModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                        >
                            <i className="fas fa-plus"></i> Create Brand Page
                        </button>
                    </div>
                    
                    {/* Search and Filter */}
                    <div className="bg-gray-800 rounded-xl p-4 mb-8">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                    <input
                                        type="text"
                                        placeholder="Search brands..."
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <select
                                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="all">All Categories</option>
                                    {brandCategories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                                <div className="flex bg-gray-700 rounded-lg overflow-hidden">
                                    <button
                                        className={`px-4 py-3 ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <i className="fas fa-th-large"></i>
                                    </button>
                                    <button
                                        className={`px-4 py-3 ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <i className="fas fa-list"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Brands Grid/List */}
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                        {displayBrands.map(brand => (
                            <div
                                key={brand.id}
                                className={`bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 ${viewMode === 'list' ? 'flex' : ''}`}
                                onClick={() => setActiveBrandId(brand.id)}
                            >
                                <div className={`relative ${viewMode === 'list' ? 'w-32 flex-shrink-0' : 'h-48'}`}>
                                    <img
                                        src={brand.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}
                                        alt={`${brand.name} cover`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute -bottom-6 left-6">
                                        <img
                                            src={brand.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(brand.name)}&background=random&color=fff&size=150`}
                                            alt={brand.name}
                                            className="w-20 h-20 rounded-full border-4 border-gray-800 object-cover"
                                        />
                                    </div>
                                </div>
                                <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : 'pt-10'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-white">{brand.name}</h3>
                                                {brand.isVerified && (
                                                    <i className="fas fa-check-circle text-blue-500"></i>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-sm mt-1">{brand.category}</p>
                                            <p className="text-gray-300 mt-2 line-clamp-2">
                                                {brand.description || 'No description provided'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFollowBrand(brand.id);
                                            }}
                                            className={`px-4 py-2 rounded-lg font-semibold ${currentUser && brand.followers?.includes(currentUser.id) ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                        >
                                            {currentUser && brand.followers?.includes(currentUser.id) ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                                        <span>
                                            <i className="fas fa-users mr-1"></i>
                                            {brand.followers?.length || 0} followers
                                        </span>
                                        <span>
                                            <i className="fas fa-map-marker-alt mr-1"></i>
                                            {brand.location || 'Online'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Single Brand View
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <button
                        onClick={() => setActiveBrandId(null)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
                    >
                        <i className="fas fa-arrow-left"></i>
                        Back to Brands
                    </button>
                    
                    {/* Brand Header */}
                    <div className="bg-gray-800 rounded-xl overflow-hidden mb-8 shadow-lg">
                        <div className="relative h-64">
                            <img
                                src={activeBrand.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80'}
                                alt={`${activeBrand.name} cover`}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
                                    <img
                                        src={activeBrand.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeBrand.name)}&background=random&color=fff&size=150`}
                                        alt={activeBrand.name}
                                        className="w-32 h-32 rounded-full border-4 border-white object-cover"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h1 className="text-3xl font-bold text-white">{activeBrand.name}</h1>
                                            {activeBrand.isVerified && (
                                                <i className="fas fa-check-circle text-blue-500 text-2xl"></i>
                                            )}
                                        </div>
                                        <p className="text-gray-300">{activeBrand.category}</p>
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <button
                                                onClick={() => onFollowBrand(activeBrand.id)}
                                                className={`px-6 py-2 rounded-lg font-semibold ${currentUser && activeBrand.followers?.includes(currentUser.id) ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                            >
                                                {currentUser && activeBrand.followers?.includes(currentUser.id) ? 'Following' : 'Follow'}
                                            </button>
                                            <button
                                                onClick={() => onMessage(activeBrand.id)}
                                                className="px-6 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white"
                                            >
                                                Message
                                            </button>
                                            {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                                <button
                                                    onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                                    className="px-6 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <i className="fas fa-plus mr-2"></i>
                                                    Create Post
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Brand Info */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">About</h3>
                                    <p className="text-gray-300 whitespace-pre-wrap">
                                        {activeBrand.description || 'No description provided.'}
                                    </p>
                                    <div className="flex flex-wrap gap-4 mt-6">
                                        {activeBrand.website && (
                                            <a
                                                href={activeBrand.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                                            >
                                                <i className="fas fa-globe"></i>
                                                Website
                                            </a>
                                        )}
                                        {activeBrand.location && (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <i className="fas fa-map-marker-alt"></i>
                                                {activeBrand.location}
                                            </div>
                                        )}
                                        {activeBrand.contactEmail && (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <i className="fas fa-envelope"></i>
                                                {activeBrand.contactEmail}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">Brand Stats</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gray-700 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-white">{activeBrand.followers?.length || 0}</div>
                                            <div className="text-gray-400 text-sm">Followers</div>
                                        </div>
                                        <div className="bg-gray-700 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-white">{brandPosts.length}</div>
                                            <div className="text-gray-400 text-sm">Posts</div>
                                        </div>
                                    </div>
                                    <div className="mt-6">
                                        <h4 className="font-bold text-white mb-2">Admin Actions</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const newName = prompt('Enter new brand name:', activeBrand.name);
                                                            if (newName) {
                                                                onUpdateBrand(activeBrand.id, { name: newName });
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm text-white"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                                                    >
                                                        Post
                                                    </button>
                                                </>
                                            )}
                                            {currentUser?.role === 'admin' && onVerifyBrand && (
                                                <button
                                                    onClick={() => onVerifyBrand(activeBrand.id)}
                                                    className={`px-3 py-1 rounded text-sm ${activeBrand.isVerified ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                                >
                                                    {activeBrand.isVerified ? 'Unverify' : 'Verify'}
                                                </button>
                                            )}
                                            {currentUser?.role === 'admin' && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this brand?')) {
                                                            onDeleteBrand(activeBrand.id);
                                                            setActiveBrandId(null);
                                                        }
                                                    }}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Brand Posts */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Posts</h2>
                            {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                <button
                                    onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                                >
                                    <i className="fas fa-plus"></i> Create Post
                                </button>
                            )}
                        </div>
                        
                        {brandPosts.length > 0 ? (
                            <div className="space-y-6">
                                {brandPosts.map(post => (
                                    <Post
                                        key={post.id}
                                        post={post}
                                        author={{ ...activeBrand, type: 'brand' }}
                                        currentUser={currentUser}
                                        onProfileClick={onProfileClick}
                                        onReact={onReact}
                                        onShare={onShare}
                                        onOpenComments={() => setActiveCommentsPostId(post.id)}
                                        onPlayAudioTrack={onPlayAudioTrack}
                                        onFollow={() => onFollowBrand(activeBrand.id)}
                                        isFollowing={currentUser ? activeBrand.followers?.includes(currentUser.id) || false : false}
                                        onDeletePost={onDeletePost}
                                        isAdmin={currentUser?.role === 'admin'}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-800 rounded-xl">
                                <i className="fas fa-newspaper text-6xl text-gray-600 mb-4"></i>
                                <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
                                <p className="text-gray-400 mb-6">This brand hasn't posted anything yet</p>
                                {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                    <button
                                        onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                                    >
                                        Create First Post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Create Brand Modal */}
            {showCreateBrandModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">Create Brand Page</h2>
                            <button
                                onClick={() => setShowCreateBrandModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white">Brand Name *</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                    placeholder="Enter brand name"
                                    value={newBrandName}
                                    onChange={(e) => setNewBrandName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white">Category</label>
                                <select
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                    value={newBrandCategory}
                                    onChange={(e) => setNewBrandCategory(e.target.value)}
                                >
                                    <option value="Business">Business</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Education">Education</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Health">Health</option>
                                    <option value="Fashion">Fashion</option>
                                    <option value="Food">Food</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-white">Description</label>
                                <textarea
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 h-32 text-white"
                                    placeholder="Describe your brand..."
                                    value={newBrandDescription}
                                    onChange={(e) => setNewBrandDescription(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-white">Location</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                        placeholder="City, Country"
                                        value={newBrandLocation}
                                        onChange={(e) => setNewBrandLocation(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-white">Website</label>
                                    <input
                                        type="url"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                        placeholder="https://example.com"
                                        value={newBrandWebsite}
                                        onChange={(e) => setNewBrandWebsite(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-white">Contact Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                        placeholder="contact@brand.com"
                                        value={newBrandContactEmail}
                                        onChange={(e) => setNewBrandContactEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-white">Contact Phone</label>
                                    <input
                                        type="tel"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white"
                                        placeholder="+1234567890"
                                        value={newBrandContactPhone}
                                        onChange={(e) => setNewBrandContactPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                                <button
                                    onClick={() => setShowCreateBrandModal(false)}
                                    className="px-6 py-3 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateBrand}
                                    className="px-6 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Create Brand
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Create Post Modal for Brand */}
            {selectedBrandForPost && (
                <CreatePostModal
                    currentUser={currentUser!}
                    onClose={() => setSelectedBrandForPost(null)}
                    onCreatePost={(content, file, type, visibility, location, feeling, taggedUsers, background, linkPreview) => {
                        onPostAsBrand(selectedBrandForPost, {
                            text: content,
                            file,
                            type,
                            visibility,
                            location,
                            feeling,
                            taggedUsers,
                            background,
                            linkPreview
                        });
                        setSelectedBrandForPost(null);
                    }}
                />
            )}
            
            {/* Comments Sheet */}
            {activeCommentsPostId && (
                <CommentsSheet
                    post={posts.find(p => p.id === activeCommentsPostId)!}
                    currentUser={currentUser || { id: 1, username: 'Guest', profilePicture: '' }}
                    users={users}
                    onClose={() => setActiveCommentsPostId(null)}
                    onProfileClick={onProfileClick}
                />
            )}
        </div>
    );
};
