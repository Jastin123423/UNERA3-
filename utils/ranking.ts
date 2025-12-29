import { Post, User, Brand } from '../types';

/**
 * =======================================================
 * UNERA: FAIR, VIRAL, ANTI-MONOPOLY FEED ALGORITHM
 * =======================================================
 * This algorithm calculates a Dynamic Visibility Score (DVS) for each post
 * to create a feed that promotes growth, creator happiness, and discovery.
 *
 * DESIGN PHILOSOPHY:
 * 1. Every new user gets immediate visibility.
 * 2. No single creator dominates the feed.
 * 3. Low-follower creators are boosted.
 * 4. Engagement quality and velocity matter more than raw counts.
 * 5. Fresh content is always discoverable.
 * 6. Follower counts have logarithmic, not linear, influence.
 */

interface ScoredPost {
    post: Post;
    score: number;
    debug: {
        baseScore: number;
        finalScore: number;
        freshness: number;
        engagement: number;
        affinity: number;
        interest: number;
        boosts: {
            newUser: number;
            viral: number;
            velocity: number;
            followerInfluence: number;
            brandBoost?: number;
        };
        reason: string;
        authorType: 'user' | 'brand';
    };
}

const CONSTANTS = {
    // --- SCORE WEIGHTS ---
    WEIGHT_FRESHNESS: 1.0,
    WEIGHT_ENGAGEMENT: 1.5,
    WEIGHT_AFFINITY: 2.0,
    WEIGHT_INTEREST: 0.8,
    
    // --- ENGAGEMENT VALUES (Quality over Quantity) ---
    VAL_LIKE: 0.5,
    VAL_COMMENT: 2.0,
    VAL_REPOST: 3.0,
    VAL_SAVE: 4.0,
    VAL_WATCH_TIME_SCORE: 5.0,

    // --- TIME DECAY ---
    DECAY_LAMBDA: 0.05,

    // --- BOOSTS & MULTIPLIERS ---
    NEW_USER_BOOST_MULTIPLIER: 1.5,
    NEW_USER_DAYS_THRESHOLD: 30,
    NEW_BRAND_BOOST_MULTIPLIER: 1.3,
    NEW_BRAND_DAYS_THRESHOLD: 60,
    
    SMALL_CREATOR_FOLLOWER_THRESHOLD: 1000,
    SMALL_BRAND_FOLLOWER_THRESHOLD: 500,
    
    VIRAL_ENGAGEMENT_THRESHOLD: 50,
    VIRAL_MULTIPLIER: 1.3,

    VELOCITY_HOURS_THRESHOLD: 3,
    VELOCITY_ENGAGEMENT_THRESHOLD: 10,
    VELOCITY_MULTIPLIER: 1.4,
    
    // --- BRAND SPECIFIC ---
    BRAND_BOOST_MULTIPLIER: 1.2, // Base boost for brand posts
    FOLLOWED_BRAND_BOOST: 1.4, // Extra boost for followed brands
    VERIFIED_BRAND_BOOST: 1.1, // Extra boost for verified brands
};

// Unified author interface
interface UnifiedAuthor {
    id: number;
    name: string;
    type: 'user' | 'brand';
    profileImage: string;
    isVerified: boolean;
    joinDate: number; // Timestamp when joined/created
    followers: number[];
    following?: number[]; // Only for users
    interests?: string[]; // Only for users
    category?: string; // Only for brands
}

/**
 * Creates a unified author map from users and brands
 */
const createUnifiedAuthorMap = (users: User[], brands: Brand[]): Map<number, UnifiedAuthor> => {
    const authorMap = new Map<number, UnifiedAuthor>();
    
    // Add users to map
    users.forEach(user => {
        authorMap.set(user.id, {
            id: user.id,
            name: user.name,
            type: 'user',
            profileImage: user.profileImage,
            isVerified: user.isVerified || false,
            joinDate: user.joinedDate ? new Date(user.joinedDate).getTime() : Date.now(),
            followers: user.followers || [],
            following: user.following || [],
            interests: user.interests || []
        });
    });
    
    // Add brands to map
    brands.forEach(brand => {
        authorMap.set(brand.id, {
            id: brand.id,
            name: brand.name,
            type: 'brand',
            profileImage: brand.profileImage,
            isVerified: brand.isVerified || false,
            joinDate: brand.createdAt || Date.now(),
            followers: brand.followers || [],
            category: brand.category
        });
    });
    
    return authorMap;
};

/**
 * Calculates the Dynamic Visibility Score (DVS) for a single post relative to a viewer.
 */
const calculatePostScore = (
    post: Post, 
    viewer: User | null, 
    author: UnifiedAuthor, 
    allBrands: Brand[] = [] // Pass brands for brand-specific calculations
): ScoredPost['debug'] & { score: number } => {
    const now = Date.now();
    const postTime = post.createdAt || now;
    const hoursSinceCreation = Math.max(0, (now - postTime) / (1000 * 60 * 60));

    // --- 1. Freshness Score (Time Decay) ---
    const freshnessScore = Math.exp(-CONSTANTS.DECAY_LAMBDA * hoursSinceCreation);

    // --- 2. Engagement Score (Quality & Velocity) ---
    const rawEngagementValue = 
        (post.reactions.length * CONSTANTS.VAL_LIKE) + 
        (post.comments.length * CONSTANTS.VAL_COMMENT) + 
        (post.shares * CONSTANTS.VAL_REPOST) +
        ((post.views || 0) * (CONSTANTS.VAL_WATCH_TIME_SCORE / 100));

    let viralMultiplier = 1.0;
    if (rawEngagementValue > CONSTANTS.VIRAL_ENGAGEMENT_THRESHOLD) {
        viralMultiplier = CONSTANTS.VIRAL_MULTIPLIER;
    }

    let velocityMultiplier = 1.0;
    if (hoursSinceCreation < CONSTANTS.VELOCITY_HOURS_THRESHOLD && rawEngagementValue > CONSTANTS.VELOCITY_ENGAGEMENT_THRESHOLD) {
        velocityMultiplier = CONSTANTS.VELOCITY_MULTIPLIER;
    }
    const engagementScore = rawEngagementValue * viralMultiplier * velocityMultiplier;

    // --- 3. Affinity Score (Relationship Strength) ---
    let affinityScore = 1.0;
    if (viewer && viewer.id !== author.id) {
        const isFollowing = viewer.following.includes(author.id);
        
        if (author.type === 'user') {
            // User-to-user affinity
            if (isFollowing && author.followers.includes(viewer.id)) {
                affinityScore = 2.0; // Mutual follow
            } else if (isFollowing) {
                affinityScore = 1.5; // One-way follow
            }
        } else {
            // User-to-brand affinity
            if (isFollowing) {
                affinityScore = 1.8; // Following a brand (stronger than following a user)
            }
        }
    }

    // --- 4. Interest Score (Content Relevance) ---
    let interestScore = 0;
    if (viewer?.interests && post.tags) {
        const matches = post.tags.filter(tag => viewer.interests?.includes(tag.toLowerCase())).length;
        interestScore = matches * 0.5;
    }

    // --- BASE SCORE CALCULATION ---
    const baseScore = 
        (freshnessScore * CONSTANTS.WEIGHT_FRESHNESS) +
        (engagementScore * CONSTANTS.WEIGHT_ENGAGEMENT) +
        (affinityScore * CONSTANTS.WEIGHT_AFFINITY) +
        (interestScore * CONSTANTS.WEIGHT_INTEREST);

    // --- APPLY BOOST MULTIPLIERS ---
    
    let creatorBoost = 1.0;
    let brandBoost = 1.0;
    
    if (author.type === 'user') {
        // User-specific boosts
        const daysOnPlatform = (now - author.joinDate) / (1000 * 60 * 60 * 24);
        if (daysOnPlatform < CONSTANTS.NEW_USER_DAYS_THRESHOLD) {
            creatorBoost = CONSTANTS.NEW_USER_BOOST_MULTIPLIER;
        }
        
        // Small creator boost
        if (author.followers.length < CONSTANTS.SMALL_CREATOR_FOLLOWER_THRESHOLD) {
            creatorBoost *= 1.2;
        }
    } else {
        // Brand-specific boosts
        const brandDaysActive = (now - author.joinDate) / (1000 * 60 * 60 * 24);
        
        // New brand boost
        if (brandDaysActive < CONSTANTS.NEW_BRAND_DAYS_THRESHOLD) {
            brandBoost *= CONSTANTS.NEW_BRAND_BOOST_MULTIPLIER;
        }
        
        // Small brand boost
        if (author.followers.length < CONSTANTS.SMALL_BRAND_FOLLOWER_THRESHOLD) {
            brandBoost *= 1.25;
        }
        
        // Verified brand boost
        if (author.isVerified) {
            brandBoost *= CONSTANTS.VERIFIED_BRAND_BOOST;
        }
        
        // Base brand boost
        brandBoost *= CONSTANTS.BRAND_BOOST_MULTIPLIER;
        
        // Followed brand extra boost (checked separately)
        if (viewer && viewer.following.includes(author.id)) {
            brandBoost *= CONSTANTS.FOLLOWED_BRAND_BOOST;
        }
        
        creatorBoost = brandBoost;
    }
    
    // Logarithmic Follower Influence (Anti-Monopoly)
    const followerInfluence = 1 / Math.log10(author.followers.length + 10);
    const finalCreatorBoost = creatorBoost * followerInfluence;
    
    // --- FINAL DVS CALCULATION ---
    const finalScore = baseScore * finalCreatorBoost + (Math.random() * 0.1);

    // --- DEBUG & REASONING ---
    let reason = "Standard Rank.";
    if (author.type === 'user') {
        if (creatorBoost > CONSTANTS.NEW_USER_BOOST_MULTIPLIER * 0.9) reason = "New User Boost.";
        else if (viralMultiplier > 1.0) reason = "High Engagement (Viral).";
        else if (velocityMultiplier > 1.0) reason = "Trending (High Velocity).";
        else if (affinityScore > 1.5) reason = "Mutual Follow.";
        else if (affinityScore > 1.0) reason = "You Follow Them.";
    } else {
        if (brandBoost > CONSTANTS.BRAND_BOOST_MULTIPLIER * 1.5) reason = "Followed Brand Boost.";
        else if (brandDaysActive < CONSTANTS.NEW_BRAND_DAYS_THRESHOLD) reason = "New Brand Boost.";
        else if (author.isVerified) reason = "Verified Brand.";
        else reason = "Brand Content.";
        
        if (viewer && viewer.following.includes(author.id)) {
            reason += " (Following)";
        }
    }

    return {
        score: finalScore,
        baseScore: baseScore,
        finalScore: finalScore,
        freshness: freshnessScore,
        engagement: engagementScore,
        affinity: affinityScore,
        interest: interestScore,
        boosts: {
            newUser: author.type === 'user' ? creatorBoost : 1.0,
            viral: viralMultiplier,
            velocity: velocityMultiplier,
            followerInfluence: followerInfluence,
            brandBoost: author.type === 'brand' ? brandBoost : undefined
        },
        reason: reason,
        authorType: author.type
    };
};

/**
 * Main function to sort the feed with unified author recognition.
 */
export const rankFeed = (
    posts: Post[], 
    viewer: User | null, 
    users: User[],
    brands: Brand[] = [] // Add brands parameter
): Post[] => {
    // Create unified author map
    const authorMap = createUnifiedAuthorMap(users, brands);
    
    const authorSeenCount = new Map<number, number>();

    const scoredPosts: ScoredPost[] = posts
        .map(post => {
            const author = authorMap.get(post.authorId);
            if (!author) {
                console.warn(`No author found for post ${post.id} with authorId ${post.authorId}`);
                return null;
            }

            const { score, ...debugInfo } = calculatePostScore(post, viewer, author, brands);
            return { post, score, debug: debugInfo };
        })
        .filter((p): p is ScoredPost => p !== null)
        .sort((a, b) => b.score - a.score)
        .map(sp => {
            // Apply Diversity Boost/Penalty after initial sorting
            const authorId = sp.post.authorId;
            const timesSeen = authorSeenCount.get(authorId) || 0;
            
            const diversityBoost = 1 / (1 + timesSeen);
            sp.score *= diversityBoost;
            
            // Update reason with diversity factor
            const author = authorMap.get(authorId);
            const authorType = author?.type === 'brand' ? 'Brand' : 'User';
            sp.debug.reason += ` ${authorType} diversity: ${diversityBoost.toFixed(2)}.`;
            
            authorSeenCount.set(authorId, timesSeen + 1);
            return sp;
        });

    // Final sort after applying diversity penalty
    scoredPosts.sort((a, b) => b.score - a.score);

    // Enhanced debugging with brand recognition
    console.group("--- UNERA Feed Ranking (Unified Authors) ---");
    console.log("Viewer:", viewer?.name || "Guest");
    console.log("Total posts:", posts.length);
    console.log("Total authors in map:", authorMap.size);
    console.log("Brands in system:", brands.length);
    
    // Log brand posts separately for clarity
    const brandPosts = scoredPosts.filter(sp => {
        const author = authorMap.get(sp.post.authorId);
        return author?.type === 'brand';
    });
    
    console.log("Brand posts found:", brandPosts.length);
    
    console.log("Top 10 posts:");
    scoredPosts.slice(0, 10).forEach((sp, index) => {
        const author = authorMap.get(sp.post.authorId);
        console.log(
            `#${index + 1}: ${author?.type === 'brand' ? '📢' : '👤'} ${author?.name} - Score: ${sp.score.toFixed(4)}`,
            {
                postId: sp.post.id,
                authorType: author?.type,
                reason: sp.debug.reason,
                content: (sp.post.content || "").substring(0, 50),
                boosts: sp.debug.boosts
            }
        );
    });
    
    // Specifically show brand posts ranking
    if (brandPosts.length > 0) {
        console.log("Brand posts in feed:");
        brandPosts.forEach((sp, index) => {
            const author = authorMap.get(sp.post.authorId);
            console.log(
                `Brand #${index + 1}: ${author?.name} at position ${scoredPosts.indexOf(sp) + 1}`,
                {
                    score: sp.score.toFixed(4),
                    reason: sp.debug.reason,
                    brandBoost: sp.debug.boosts.brandBoost
                }
            );
        });
    }
    
    console.groupEnd();

    return scoredPosts.map(sp => sp.post);
};
