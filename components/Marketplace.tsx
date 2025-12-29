import React, { useState, useEffect, useRef } from 'react';
import { User, Product } from '../types';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_COUNTRIES } from '../constants';

// --- OSM LOCATION SEARCH COMPONENT ---
const LocationSearch: React.FC<{ value: string, onSelect: (val: string) => void }> = ({ value, onSelect }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchTimeout = useRef<any>(null);

    const handleSearch = async (q: string) => {
        if (q.length < 3) { setResults([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5`);
            const data = await res.json();
            setResults(data);
        } catch (err) {
            console.error("Location search failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setShowResults(true);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => handleSearch(val), 500);
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <input 
                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none focus:border-[#1877F2] text-sm pl-10" 
                    placeholder="Search city, street or region..." 
                    value={query} 
                    onChange={handleChange}
                    onFocus={() => setShowResults(true)}
                />
                <i className="fas fa-map-marker-alt absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
                {loading && <i className="fas fa-spinner fa-spin absolute right-4 top-1/2 -translate-y-1/2 text-[#1877F2]"></i>}
            </div>
            {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-[#242526] border border-[#3E4042] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {results.map((res, i) => (
                        <div 
                            key={i} 
                            className="p-3 hover:bg-[#3A3B3C] cursor-pointer text-white text-sm border-b border-[#3E4042] last:border-0 transition-colors"
                            onClick={() => {
                                onSelect(res.display_name);
                                setQuery(res.display_name);
                                setShowResults(false);
                            }}
                        >
                            <i className="fas fa-location-dot mr-2 text-[#B0B3B8]"></i>
                            {res.display_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- HELPER: Generate canonical URL for product ---
const generateCanonicalUrl = (productId: string, productTitle?: string) => {
    const baseUrl = 'https://unera.social';
    let slug = '';
    
    if (productTitle) {
        // Create URL-friendly slug from product title
        slug = productTitle
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60);
    }
    
    return slug 
        ? `${baseUrl}/marketplace/product/${slug}-${productId}`
        : `${baseUrl}/marketplace/product/${productId}`;
};

// --- HELPER: Generate Product Schema for SEO ---
const generateProductSchema = (product: Product) => {
    const canonicalUrl = generateCanonicalUrl(product.id.toString(), product.title);
    
    // Get currency based on location
    const countryData = MARKETPLACE_COUNTRIES.find(c => 
        product.address.toLowerCase().includes(c.name.toLowerCase())
    );
    const currency = countryData?.currency || 'USD';
    
    // Calculate rating
    const avgRating = product.ratings?.length > 0 
        ? product.ratings.reduce((a, b) => a + b, 0) / product.ratings.length 
        : 4.5;
    
    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        "name": product.title,
        "description": product.description.substring(0, 300) + (product.description.length > 300 ? '...' : ''),
        "image": product.images,
        "sku": `PROD-${product.id}`,
        "mpn": `MPN-${product.id}`,
        "brand": {
            "@type": "Brand",
            "name": product.sellerName || "Marketplace Seller"
        },
        "offers": {
            "@type": "Offer",
            "url": canonicalUrl,
            "priceCurrency": currency,
            "price": product.discountPrice || product.mainPrice,
            "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "itemCondition": "https://schema.org/UsedCondition",
            "availability": product.quantity > 0 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Person",
                "name": product.sellerName,
                "telephone": product.phoneNumber
            }
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avgRating.toFixed(1),
            "reviewCount": product.ratings?.length || 1,
            "bestRating": "5",
            "worstRating": "1"
        }
    };
    
    return productSchema;
};

// --- HELPER: Generate Breadcrumb Schema ---
const generateBreadcrumbSchema = (product?: Product) => {
    const baseUrl = 'https://unera.social';
    
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": `${baseUrl}`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Marketplace",
                "item": `${baseUrl}/marketplace`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product ? product.title : "Products",
                "item": product ? generateCanonicalUrl(product.id.toString(), product.title) : `${baseUrl}/marketplace/products`
            }
        ]
    };
    
    return breadcrumbSchema;
};

// --- HELPER: Generate LocalBusiness Schema ---
const generateLocalBusinessSchema = (product: Product) => {
    const countryData = MARKETPLACE_COUNTRIES.find(c => 
        product.address.toLowerCase().includes(c.name.toLowerCase())
    );
    
    const localBusinessSchema = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": `${product.sellerName}'s Marketplace`,
        "image": product.sellerAvatar,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": product.address.split(',')[0],
            "addressLocality": product.address.split(',')[1]?.trim() || product.address,
            "addressCountry": countryData?.name || "International"
        },
        "telephone": product.phoneNumber,
        "priceRange": "$$",
        "openingHours": "Mo-Su",
        "currenciesAccepted": countryData?.currency || "USD"
    };
    
    return localBusinessSchema;
};

// --- HELPER: Generate Deleted Product Schema (410 Gone) ---
const generateDeletedProductSchema = (productId: string) => {
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Product No Longer Available",
        "description": "This product has been removed by the seller and is no longer available for purchase.",
        "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/Discontinued"
        }
    };
};

// --- PRODUCT DETAIL MODAL with Schema Implementation ---
interface ProductDetailModalProps {
    product: Product;
    currentUser: User | null;
    onClose: () => void;
    onMessage: (sellerId: number) => void;
    isDeleted?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
    product, 
    currentUser, 
    onClose, 
    onMessage,
    isDeleted = false 
}) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    
    const countryData = MARKETPLACE_COUNTRIES.find(c => product.address.toLowerCase().includes(c.name.toLowerCase()));
    const symbol = countryData ? countryData.symbol : '$';
    const hasDiscount = !!product.discountPrice;

    // Generate canonical URL
    const canonicalUrl = generateCanonicalUrl(product.id.toString(), product.title);

    // Generate Schema based on deletion status
    const productSchema = isDeleted 
        ? generateDeletedProductSchema(product.id.toString())
        : generateProductSchema(product);
    
    const breadcrumbSchema = generateBreadcrumbSchema(product);
    const localBusinessSchema = isDeleted ? null : generateLocalBusinessSchema(product);

    return (
        <>
            {/* Canonical Link Tag */}
            <link rel="canonical" href={canonicalUrl} />
            
            {/* JSON-LD Schema for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            {!isDeleted && localBusinessSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
                />
            )}
            
            {/* 410 Status Meta for Deleted Products */}
            {isDeleted && (
                <meta name="robots" content="noindex, follow" />
            )}
            
            {/* Modal UI */}
            <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-0 md:p-4 animate-fade-in font-sans">
                <div className="bg-[#242526] w-full max-w-[1100px] md:rounded-2xl overflow-hidden flex flex-col md:flex-row h-full md:h-[90vh] relative shadow-2xl border border-[#3E4042]">
                    <button onClick={onClose} className="absolute top-4 right-4 z-30 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md">
                        <i className="fas fa-times text-xl"></i>
                    </button>

                    {isDeleted ? (
                        // Deleted Product View (410 Gone)
                        <div className="w-full flex flex-col items-center justify-center p-10 text-center">
                            <div className="w-32 h-32 bg-[#242526] rounded-full flex items-center justify-center mb-6 border-4 border-[#F02849]">
                                <i className="fas fa-trash-alt text-5xl text-[#F02849]"></i>
                            </div>
                            <h1 className="text-3xl font-bold text-[#E4E6EB] mb-4">Product No Longer Available</h1>
                            <p className="text-[#B0B3B8] text-lg mb-2 max-w-lg">
                                This product has been permanently removed by the seller and is no longer available for purchase.
                            </p>
                            <p className="text-[#90949C] text-sm mb-8">
                                The listing was removed on {new Date(product.date || Date.now()).toLocaleDateString()}
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={onClose}
                                    className="px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold transition-all"
                                >
                                    Browse Other Products
                                </button>
                                <button 
                                    onClick={() => window.location.href = 'https://unera.social/marketplace'}
                                    className="px-6 py-3 bg-[#3A3B3C] hover:bg-[#4E4F50] text-white rounded-xl font-bold transition-all"
                                >
                                    Go to Marketplace
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Active Product View
                        <>
                            {/* Left: Image Gallery */}
                            <div className="w-full md:w-[60%] bg-[#18191A] flex flex-col relative border-r border-[#3E4042]">
                                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                                    <img 
                                        src={product.images[activeImageIndex]} 
                                        alt={`${product.title} - View ${activeImageIndex + 1}`} 
                                        className="max-w-full max-h-full object-contain transition-all duration-300"
                                        loading="lazy"
                                    />
                                    
                                    {product.images.length > 1 && (
                                        <>
                                            <button 
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 rounded-full text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                                onClick={() => setActiveImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                                                aria-label="Previous image"
                                            >
                                                <i className="fas fa-chevron-left text-xl"></i>
                                            </button>
                                            <button 
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 rounded-full text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                                onClick={() => setActiveImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                                                aria-label="Next image"
                                            >
                                                <i className="fas fa-chevron-right text-xl"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                                {/* Thumbnails */}
                                <div className="h-24 bg-[#242526]/50 backdrop-blur-sm flex items-center gap-3 px-4 overflow-x-auto border-t border-[#3E4042] scrollbar-hide">
                                    {product.images.map((img, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`h-16 min-w-[64px] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${activeImageIndex === idx ? 'border-[#1877F2] scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            onClick={() => setActiveImageIndex(idx)}
                                            aria-label={`View image ${idx + 1}`}
                                        >
                                            <img src={img} className="h-full w-full object-cover" alt={`Thumbnail ${idx + 1}`} loading="lazy" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Details */}
                            <div className="w-full md:w-[40%] flex flex-col h-full bg-[#242526] relative">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Hidden meta for SEO */}
                                    <div className="hidden" aria-hidden="true">
                                        <h1>{product.title}</h1>
                                        <span>Price: {symbol}{hasDiscount ? product.discountPrice?.toFixed(2) : product.mainPrice.toFixed(2)}</span>
                                        <span>Location: {product.address}</span>
                                        <span>Category: {MARKETPLACE_CATEGORIES.find(c => c.id === product.category)?.name}</span>
                                        <span>URL: {canonicalUrl}</span>
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <img src={product.sellerAvatar} alt={`${product.sellerName}'s profile`} className="w-12 h-12 rounded-full object-cover border-2 border-[#1877F2] flex-shrink-0" loading="lazy" />
                                                <div className="overflow-hidden">
                                                    <h2 className="text-[#E4E6EB] font-bold text-lg leading-tight truncate">{product.sellerName}</h2>
                                                    <p className="text-[#B0B3B8] text-xs truncate">Seller • Active in Marketplace</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <a 
                                                    href={`tel:${product.phoneNumber}`}
                                                    className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#45BD62] text-[#45BD62] hover:text-white flex items-center justify-center transition-all shadow-md no-underline"
                                                    title="Call Seller"
                                                    aria-label={`Call ${product.sellerName} at ${product.phoneNumber}`}
                                                >
                                                    <i className="fas fa-phone-alt text-lg"></i>
                                                </a>
                                                <button 
                                                    onClick={() => onMessage(product.sellerId)} 
                                                    className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#1877F2] text-[#1877F2] hover:text-white flex items-center justify-center transition-all shadow-md"
                                                    title="Message Seller"
                                                    aria-label={`Message ${product.sellerName}`}
                                                >
                                                    <i className="fab fa-facebook-messenger text-lg"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-[#E4E6EB] leading-snug mb-2">{product.title}</h3>
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-[#F02849] font-bold text-3xl">{symbol}{hasDiscount ? product.discountPrice?.toFixed(2) : product.mainPrice.toFixed(2)}</span>
                                            {hasDiscount && <span className="text-[#B0B3B8] text-lg line-through">{symbol}{product.mainPrice.toFixed(2)}</span>}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 p-4 bg-[#3A3B3C]/50 rounded-2xl border border-[#3E4042]">
                                            <i className="fas fa-location-dot text-[#1877F2] mt-1"></i>
                                            <div>
                                                <p className="text-[#E4E6EB] font-bold text-sm">Location</p>
                                                <p className="text-[#B0B3B8] text-sm leading-relaxed">{product.address}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[#E4E6EB] font-bold text-lg mb-2">Description</h4>
                                            <div className="text-[#B0B3B8] text-[15px] leading-relaxed whitespace-pre-wrap bg-[#18191A] p-4 rounded-xl border border-[#3E4042]">
                                                {product.description}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#18191A] p-4 rounded-xl border border-[#3E4042] text-center">
                                            <span className="block text-[#B0B3B8] text-[10px] uppercase font-bold tracking-wider mb-1">Category</span>
                                            <span className="block text-[#E4E6EB] font-bold">{MARKETPLACE_CATEGORIES.find(c => c.id === product.category)?.name}</span>
                                        </div>
                                        <div className="bg-[#18191A] p-4 rounded-xl border border-[#3E4042] text-center">
                                            <span className="block text-[#B0B3B8] text-[10px] uppercase font-bold tracking-wider mb-1">Status</span>
                                            <span className="block text-[#45BD62] font-bold uppercase text-xs">{product.quantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

interface MarketplacePageProps {
    currentUser: User | null;
    products: Product[];
    onNavigateHome: () => void;
    onCreateProduct: (productData: Partial<Product>) => void;
    onViewProduct: (product: Product) => void;
    onDeleteProduct?: (productId: number) => void;
    deletedProducts?: Product[]; // List of deleted products to show 410 pages
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ 
    currentUser, 
    products, 
    onNavigateHome, 
    onCreateProduct, 
    onViewProduct,
    onDeleteProduct,
    deletedProducts = []
}) => {
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSellModal, setShowSellModal] = useState(false);
    const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
    
    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [desc, setDesc] = useState('');
    const [address, setAddress] = useState('');
    const [mainPrice, setMainPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [phone, setPhone] = useState('');
    const [images, setImages] = useState<{id: number, data: string}[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-detect user country for filtering if logged in
    useEffect(() => {
        if (currentUser && selectedCountry === 'all') {
            const userCountry = MARKETPLACE_COUNTRIES.find(c => currentUser.nationality?.toLowerCase().includes(c.name.toLowerCase()));
            if (userCountry) setSelectedCountry(userCountry.code);
        }
        if (currentUser) {
            setPhone(currentUser.phone || '');
        }
    }, [currentUser]);

    const handleSellClick = () => {
        if (!currentUser) {
            alert("Please log in to sell products.");
            return;
        }
        setShowSellModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (images.length + e.target.files.length > 10) {
                alert("Maximum 10 images allowed for a professional listing");
                return;
            }
            Array.from(e.target.files).forEach((file: any) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) {
                        setImages(prev => [...prev, { id: Date.now() + Math.random(), data: ev.target!.result as string }]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (id: number) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category || !desc || !address || !mainPrice || !phone || images.length === 0) {
            alert("Please fill all required fields and upload at least one image.");
            return;
        }

        // Extract country code from address if possible
        const detectedCountry = MARKETPLACE_COUNTRIES.find(c => address.toLowerCase().includes(c.name.toLowerCase()))?.code || 'US';

        const newProduct: Partial<Product> = {
            title,
            category,
            description: desc,
            country: detectedCountry,
            address,
            mainPrice: parseFloat(mainPrice),
            discountPrice: discountPrice ? parseFloat(discountPrice) : null,
            quantity: parseInt(quantity),
            phoneNumber: phone,
            images: images.map(i => i.data),
            status: 'active',
            views: 0,
            ratings: [], 
            comments: [],
            date: Date.now()
        };

        onCreateProduct(newProduct);
        setShowSellModal(false);
        // Reset
        setTitle(''); setCategory(''); setDesc(''); setMainPrice(''); setDiscountPrice(''); setImages([]); setAddress('');
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            return;
        }
        
        setDeletingProductId(productId);
        
        try {
            // Simulate API call to mark product as deleted
            // In real implementation, this would update the product status to 'deleted'
            if (onDeleteProduct) {
                onDeleteProduct(productId);
                
                // Show success message
                alert("Product has been permanently deleted.");
                
                // Add to deleted products list (for 410 handling)
                const deletedProduct = products.find(p => p.id === productId);
                if (deletedProduct) {
                    // You would typically update this in your backend
                    console.log("Product marked as deleted:", deletedProduct);
                }
            }
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert("Failed to delete product. Please try again.");
        } finally {
            setDeletingProductId(null);
        }
    };

    // Filtering logic (exclude deleted products)
    const activeProducts = products.filter(p => p.status !== 'deleted');
    const filteredProducts = activeProducts.filter(p => {
        if (selectedCountry !== 'all' && p.country !== selectedCountry) return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const activeCountry = MARKETPLACE_COUNTRIES.find(c => c.code === selectedCountry) || MARKETPLACE_COUNTRIES[0];

    // Generate canonical URL for marketplace page
    const marketplaceCanonicalUrl = 'https://unera.social/marketplace';
    let filteredCanonicalUrl = marketplaceCanonicalUrl;
    
    // Add filters to canonical URL for better SEO
    if (selectedCountry !== 'all' || selectedCategory !== 'all' || searchQuery) {
        const params = new URLSearchParams();
        if (selectedCountry !== 'all') params.append('country', selectedCountry);
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery) params.append('q', searchQuery);
        filteredCanonicalUrl = `${marketplaceCanonicalUrl}?${params.toString()}`;
    }

    // Generate JSON-LD schemas for all products (for collection page)
    const generateProductCollectionSchema = () => {
        const baseUrl = 'https://unera.social';
        
        return {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Marketplace Products - unera.social",
            "description": "Buy and sell products on unera.social marketplace. Find electronics, fashion, home goods, and more.",
            "url": filteredCanonicalUrl,
            "numberOfItems": filteredProducts.length,
            "itemListElement": filteredProducts.map((product, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Product",
                    "name": product.title,
                    "url": generateCanonicalUrl(product.id.toString(), product.title),
                    "description": product.description.substring(0, 150) + (product.description.length > 150 ? '...' : ''),
                    "image": product.images[0],
                    "offers": {
                        "@type": "Offer",
                        "price": product.discountPrice || product.mainPrice,
                        "priceCurrency": MARKETPLACE_COUNTRIES.find(c => 
                            product.address.toLowerCase().includes(c.name.toLowerCase())
                        )?.currency || "USD",
                        "availability": product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                    }
                }
            }))
        };
    };

    return (
        <>
            {/* Canonical Link for Marketplace Page */}
            <link rel="canonical" href={filteredCanonicalUrl} />
            
            {/* JSON-LD Schema for entire marketplace page */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema()) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProductCollectionSchema()) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ 
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "unera.social Marketplace",
                        "url": "https://unera.social",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://unera.social/marketplace?q={search_term_string}",
                            "query-input": "required name=search_term_string"
                        }
                    })
                }}
            />

            <div className="min-h-screen bg-[#18191A] font-sans pb-20">
                {/* Hidden SEO elements */}
                <div className="hidden" aria-hidden="true">
                    <h1>Marketplace - Buy & Sell Products on unera.social</h1>
                    <p>Browse thousands of products including electronics, fashion, home goods, and more. Buy and sell safely with our community.</p>
                    <span>Current location: {activeCountry.name}</span>
                    <span>Total active products: {filteredProducts.length}</span>
                </div>

                {/* Header */}
                <div className="bg-[#242526] sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-md border-b border-[#3E4042]">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={onNavigateHome} aria-label="Go back to home">
                        <div className="w-10 h-10 rounded-full bg-[#3A3B3C] flex items-center justify-center group-hover:bg-[#4E4F50] transition-colors">
                            <i className="fas fa-arrow-left text-[#E4E6EB]"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#E4E6EB]">Marketplace</h2>
                            <p className="text-[#B0B3B8] text-xs">unera.social</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-[#3A3B3C] px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer hover:bg-[#4E4F50] transition-colors" 
                             onClick={() => setSelectedCountry('all')}
                             aria-label={`Current location: ${activeCountry.name}. Click to view worldwide`}>
                            <span className="text-lg">{activeCountry.flag}</span>
                            <span className="text-sm font-bold text-[#E4E6EB]">{activeCountry.code === 'all' ? 'Worldwide' : activeCountry.name}</span>
                            <i className="fas fa-chevron-down text-[#B0B3B8] text-[10px]"></i>
                        </div>
                        <button onClick={handleSellClick} 
                                className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                aria-label="Sell a product">
                            <i className="fas fa-plus"></i> Sell
                        </button>
                    </div>
                </div>

                {/* Sticky Search & Discovery */}
                <div className="sticky top-[64px] z-40 bg-[#18191A]/80 backdrop-blur-xl pt-3 pb-3 border-b border-[#3E4042]/50 px-4 space-y-4">
                    <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-3">
                        <div className="flex-1 bg-[#242526] rounded-xl flex items-center px-4 py-3 border border-[#3E4042] focus-within:border-[#1877F2] transition-colors">
                            <i className="fas fa-search text-[#B0B3B8] mr-3"></i>
                            <input 
                                type="text" 
                                placeholder="What are you looking for?" 
                                className="bg-transparent text-[#E4E6EB] outline-none flex-1 text-[15px] placeholder-[#B0B3B8]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search products"
                            />
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" role="tablist">
                            <button 
                                onClick={() => setSelectedCategory('all')}
                                className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap text-sm transition-all border ${
                                    selectedCategory === 'all' 
                                    ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-lg shadow-blue-500/20' 
                                    : 'bg-[#242526] text-[#B0B3B8] border-[#3E4042] hover:bg-[#3A3B3C]'
                                }`}
                                role="tab"
                                aria-selected={selectedCategory === 'all'}
                                aria-label="Show all categories"
                            >
                                All
                            </button>
                            {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap text-sm transition-all border ${
                                        selectedCategory === cat.id 
                                        ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-lg shadow-blue-500/20' 
                                        : 'bg-[#242526] text-[#B0B3B8] border-[#3E4042] hover:bg-[#3A3B3C]'
                                    }`}
                                    role="tab"
                                    aria-selected={selectedCategory === cat.id}
                                    aria-label={`Filter by ${cat.name}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="max-w-[1400px] mx-auto px-4 mt-6">
                    {/* Show deleted products notice if viewing deleted product */}
                    {deletedProducts.length > 0 && (
                        <div className="mb-6 p-4 bg-[#3A3B3C] border border-[#F02849]/30 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-exclamation-triangle text-[#F02849] text-xl"></i>
                                <div>
                                    <h3 className="text-[#E4E6EB] font-bold">Previously Viewed Product Unavailable</h3>
                                    <p className="text-[#B0B3B8] text-sm">The product you were looking for has been permanently deleted.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Location Banner */}
                    {currentUser && (
                        <div className="mb-6 p-4 bg-[#263951] rounded-2xl border border-[#2D88FF]/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#1877F2]/20 flex items-center justify-center text-[#1877F2]">
                                    <i className="fas fa-location-dot text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-[#E4E6EB] font-bold">Local Findings</h3>
                                    <p className="text-[#B0B3B8] text-sm">Showing products available near <span className="text-[#1877F2] font-semibold">{currentUser.nationality || 'you'}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCountry('all')} 
                                    className="text-[#1877F2] font-bold text-sm hover:underline"
                                    aria-label="Change location filter">
                                Change
                            </button>
                        </div>
                    )}

                    {/* Products Grid */}
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" role="list">
                            {filteredProducts.map(product => {
                                const pCountry = MARKETPLACE_COUNTRIES.find(c => product.address.toLowerCase().includes(c.name.toLowerCase()));
                                const symbol = pCountry ? pCountry.symbol : '$';
                                const canonicalUrl = generateCanonicalUrl(product.id.toString(), product.title);
                                
                                return (
                                    <article 
                                        key={product.id} 
                                        className="bg-[#242526] rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border border-[#3E4042] flex flex-col group relative"
                                        itemScope
                                        itemType="https://schema.org/Product"
                                    >
                                        {/* Hidden structured data */}
                                        <meta itemProp="url" content={canonicalUrl} />
                                        <meta itemProp="name" content={product.title} />
                                        
                                        <div 
                                            className="relative aspect-square overflow-hidden bg-[#18191A]"
                                            onClick={() => onViewProduct(product)}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`View ${product.title} for ${symbol}${product.mainPrice}`}
                                        >
                                            <img 
                                                src={product.images[0]} 
                                                alt={`${product.title} - Main image`} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                loading="lazy"
                                                itemProp="image"
                                            />
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1">
                                                <i className="fas fa-location-dot text-[#1877F2]"></i>
                                                <span className="truncate max-w-[80px]">{product.address.split(',')[0]}</span>
                                            </div>
                                            
                                            {/* Delete button (only for product owner) */}
                                            {currentUser && currentUser.id === product.sellerId && onDeleteProduct && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteProduct(product.id);
                                                    }}
                                                    disabled={deletingProductId === product.id}
                                                    className="absolute top-3 right-3 bg-black/70 hover:bg-red-500/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all backdrop-blur-sm"
                                                    aria-label={`Delete ${product.title}`}
                                                    title="Delete product permanently"
                                                >
                                                    {deletingProductId === product.id ? (
                                                        <i className="fas fa-spinner fa-spin text-xs"></i>
                                                    ) : (
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col">
                                            <h3 className="text-[#E4E6EB] font-bold text-sm line-clamp-2 mb-2 min-h-[40px]" itemProp="name">
                                                {product.title}
                                            </h3>
                                            <div className="mt-auto">
                                                <div className="flex items-center justify-between">
                                                    <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
                                                        <meta itemProp="priceCurrency" content={pCountry?.currency || 'USD'} />
                                                        <meta itemProp="price" content={String(product.mainPrice)} />
                                                        <meta itemProp="availability" content={product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
                                                        <span className="text-[#F02849] font-black text-lg">
                                                            {symbol}{product.mainPrice.toFixed(0)}
                                                        </span>
                                                    </div>
                                                    <div 
                                                        className="w-8 h-8 rounded-lg bg-[#3A3B3C] group-hover:bg-[#1877F2] flex items-center justify-center text-[#B0B3B8] group-hover:text-white transition-colors"
                                                        onClick={() => onViewProduct(product)}
                                                        role="button"
                                                        aria-label="View product details"
                                                    >
                                                        <i className="fas fa-chevron-right text-xs"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-24 h-24 bg-[#242526] rounded-full flex items-center justify-center mb-6 border border-[#3E4042]">
                                <i className="fas fa-store-slash text-4xl text-[#3E4042]"></i>
                            </div>
                            <h3 className="text-[#E4E6EB] font-bold text-xl mb-2">No items found in this area</h3>
                            <p className="text-[#B0B3B8] max-w-xs mb-8">Try adjusting your filters or expanding your location to see more results.</p>
                            <button onClick={() => {setSelectedCountry('all'); setSelectedCategory('all'); setSearchQuery('');}} 
                                    className="px-8 py-3 bg-[#3A3B3C] text-[#E4E6EB] rounded-xl font-bold hover:bg-[#4E4F50] transition-colors"
                                    aria-label="Clear all filters">
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Sell Modal with SEO-friendly form */}
                {showSellModal && (
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-[#242526] w-full max-w-[700px] rounded-3xl border border-[#3E4042] flex flex-col max-h-[90vh] shadow-2xl animate-slide-up">
                            <div className="p-6 border-b border-[#3E4042] flex justify-between items-center bg-[#1C1D1E] rounded-t-3xl">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#E4E6EB]">Create Listing</h2>
                                    <p className="text-[#B0B3B8] text-sm">Sell to your local community on unera.social</p>
                                </div>
                                <button onClick={() => setShowSellModal(false)} 
                                        className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-all"
                                        aria-label="Close sell modal">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar" aria-label="Create product listing form">
                                {/* Images Section */}
                                <div>
                                    <label className="block text-[#E4E6EB] font-bold mb-3 flex items-center gap-2">
                                        <i className="fas fa-images text-[#1877F2]"></i> Product Photos (Max 10)
                                    </label>
                                    <div 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className={`border-2 border-dashed border-[#3E4042] bg-[#18191A] hover:bg-[#242526] hover:border-[#1877F2] rounded-2xl p-10 text-center cursor-pointer transition-all group`}
                                        role="button"
                                        aria-label="Upload product images"
                                        tabIndex={0}
                                    >
                                        <i className="fas fa-cloud-upload-alt text-5xl text-[#3E4042] group-hover:text-[#1877F2] mb-4 transition-colors"></i>
                                        <p className="text-[#E4E6EB] font-bold">Click to upload high-quality images</p>
                                        <p className="text-[#B0B3B8] text-xs mt-1">Upload at least one clear photo of your item</p>
                                    </div>
                                    <input type="file" 
                                           ref={fileInputRef} 
                                           className="hidden" 
                                           multiple 
                                           accept="image/*" 
                                           onChange={handleFileChange}
                                           aria-label="Select product images" />
                                    
                                    {images.length > 0 && (
                                        <div className="grid grid-cols-5 gap-3 mt-6">
                                            {images.map(img => (
                                                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-[#3E4042] group shadow-sm">
                                                    <img src={img.data} alt="Uploaded product image" className="w-full h-full object-cover" loading="lazy" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeImage(img.id)} 
                                                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
                                                        aria-label="Remove image"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold flex items-center gap-2">
                                        <i className="fas fa-tag text-[#1877F2]"></i> Basic Information
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2] transition-colors" 
                                            placeholder="Product Name *" 
                                            value={title} 
                                            onChange={e => setTitle(e.target.value)} 
                                            required 
                                            aria-label="Product name"
                                            aria-required="true"
                                        />
                                        <select 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2] transition-colors" 
                                            value={category} 
                                            onChange={e => setCategory(e.target.value)}
                                            required
                                            aria-label="Product category"
                                            aria-required="true"
                                        >
                                            <option value="">Select Category *</option>
                                            {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold flex items-center gap-2">
                                        <i className="fas fa-location-dot text-[#1877F2]"></i> Location & Contact
                                    </label>
                                    <LocationSearch value={address} onSelect={setAddress} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input 
                                            type="tel" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                            placeholder="WhatsApp / Phone Number *" 
                                            value={phone} 
                                            onChange={e => setPhone(e.target.value)} 
                                            required 
                                            aria-label="Contact phone number"
                                            aria-required="true"
                                        />
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B3B8] font-bold">$</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 pl-8 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                                    placeholder="Main Price *" 
                                                    value={mainPrice} 
                                                    onChange={e => setMainPrice(e.target.value)} 
                                                    required 
                                                    aria-label="Product price"
                                                    aria-required="true"
                                                />
                                            </div>
                                            <input 
                                                type="number" 
                                                className="w-24 bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                                placeholder="Qty" 
                                                value={quantity} 
                                                onChange={e => setQuantity(e.target.value)}
                                                aria-label="Product quantity"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold flex items-center gap-2">
                                        <i className="fas fa-align-left text-[#1877F2]"></i> Professional Description
                                    </label>
                                    <textarea 
                                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-2xl p-5 text-[#E4E6EB] outline-none focus:border-[#1877F2] h-48 resize-none transition-colors" 
                                        placeholder="Provide detailed information about your product, condition, features, and why people should buy it... *" 
                                        value={desc} 
                                        onChange={e => setDesc(e.target.value)}
                                        required
                                        aria-label="Product description"
                                        aria-required="true"
                                    ></textarea>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3"
                                    aria-label="Publish product listing"
                                >
                                    <i className="fas fa-check-circle"></i> Publish Professional Listing
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
