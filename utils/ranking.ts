import { Post, User } from '../types';

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
        };
        reason: string;
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
    VAL_SAVE: 4.0, // (Simulated via other interactions for now)
    VAL_WATCH_TIME_SCORE: 5.0, // (Simulated via views)

    // --- TIME DECAY ---
    // Higher lambda = faster decay. Value of 0.05 means content loses ~50% of its freshness value in 14 hours.
    DECAY_LAMBDA: 0.05, 

    // --- BOOSTS & MULTIPLIERS ---
    NEW_USER_BOOST_MULTIPLIER: 1.5, // 50% boost
    NEW_USER_DAYS_THRESHOLD: 30,
    
    SMALL_CREATOR_FOLLOWER_THRESHOLD: 1000,
    
    VIRAL_ENGAGEMENT_THRESHOLD: 50, // e.g., 20 likes + 10 comments
    VIRAL_MULTIPLIER: 1.3,

    VELOCITY_HOURS_THRESHOLD: 3,
    VELOCITY_ENGAGEMENT_THRESHOLD: 10,
    VELOCITY_MULTIPLIER: 1.4,
};

/**
 * Calculates the Dynamic Visibility Score (DVS) for a single post relative to a viewer.
 */
const calculatePostScore = (post: Post, viewer: User | null, author: User): ScoredPost['debug'] & { score: number } => {
    const now = Date.now();
    const postTime = post.createdAt || now;
    const hoursSinceCreation = Math.max(0, (now - postTime) / (1000 * 60 * 60));

    // --- 1. Freshness Score (Time Decay) ---
    // Formula: e^(-λ * hours)
    const freshnessScore = Math.exp(-CONSTANTS.DECAY_LAMBDA * hoursSinceCreation);

    // --- 2. Engagement Score (Quality & Velocity) ---
    const rawEngagementValue = 
        (post.reactions.length * CONSTANTS.VAL_LIKE) + 
        (post.comments.length * CONSTANTS.VAL_COMMENT) + 
        (post.shares * CONSTANTS.VAL_REPOST) +
        ((post.views || 0) * (CONSTANTS.VAL_WATCH_TIME_SCORE / 100)); // Simulate watch time from views

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
    let affinityScore = 1.0; // Base for stranger
    if (viewer && viewer.id !== author.id) {
        const isFollowing = viewer.following.includes(author.id);
        // Mutual follow check
        if (isFollowing && author.followers.includes(viewer.id)) {
            affinityScore = 2.0;
        } else if (isFollowing) {
            affinityScore = 1.5;
        }
    }

    // --- 4. Interest Score (Content Relevance) ---
    let interestScore = 0;
    if (viewer?.interests && post.tags) {
        const matches = post.tags.filter(tag => viewer.interests?.includes(tag.toLowerCase())).length;
        interestScore = matches * 0.5; // Each matching tag adds 0.5 to the score
    }

    // --- BASE SCORE CALCULATION ---
    const baseScore = 
        (freshnessScore * CONSTANTS.WEIGHT_FRESHNESS) +
        (engagementScore * CONSTANTS.WEIGHT_ENGAGEMENT) +
        (affinityScore * CONSTANTS.WEIGHT_AFFINITY) +
        (interestScore * CONSTANTS.WEIGHT_INTEREST);

    // --- APPLY BOOST MULTIPLIERS ---
    
    // a. New & Small User Boost
    let creatorBoost = 1.0;
    const daysOnPlatform = author.joinedDate ? (now - new Date(author.joinedDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
    if (daysOnPlatform < CONSTANTS.NEW_USER_DAYS_THRESHOLD) {
        creatorBoost = CONSTANTS.NEW_USER_BOOST_MULTIPLIER;
    }
    
    // b. Logarithmic Follower Influence (Anti-Monopoly)
    const followerInfluence = 1 / Math.log10(author.followers.length + 10);
    const finalCreatorBoost = creatorBoost * followerInfluence;
    
    // --- FINAL DVS CALCULATION ---
    const finalScore = baseScore * finalCreatorBoost + (Math.random() * 0.1); // Add small randomness

    // --- DEBUG & REASONING ---
    let reason = "Standard Rank.";
    if (creatorBoost > 1.0) reason = "New User Boost.";
    else if (viralMultiplier > 1.0) reason = "High Engagement (Viral).";
    else if (velocityMultiplier > 1.0) reason = "Trending (High Velocity).";
    else if (affinityScore > 1.5) reason = "Mutual Follow.";
    else if (affinityScore > 1.0) reason = "You Follow Them.";

    return {
        score: finalScore,
        baseScore: baseScore,
        finalScore: finalScore,
        freshness: freshnessScore,
        engagement: engagementScore,
        affinity: affinityScore,
        interest: interestScore,
        boosts: {
            newUser: creatorBoost,
            viral: viralMultiplier,
            velocity: velocityMultiplier,
            followerInfluence: followerInfluence,
        },
        reason: reason
    };
};

/**
 * Main function to sort the feed.
 * It now also handles Diversity Control by penalizing creators seen too often in one session.
 */
export const rankFeed = (posts: Post[], viewer: User | null, users: User[]): Post[] => {
    const userMap = new Map<number, User>();
    users.forEach(u => userMap.set(u.id, u));
    
    const authorSeenCount = new Map<number, number>();

    const scoredPosts: ScoredPost[] = posts
        .map(post => {
            const author = userMap.get(post.authorId);
            if (!author) return null; // Skip posts from non-existent authors

            const { score, ...debugInfo } = calculatePostScore(post, viewer, author);
            return { post, score, debug: debugInfo };
        })
        .filter((p): p is ScoredPost => p !== null)
        .sort((a, b) => b.score - a.score)
        .map(sp => {
            // Apply Diversity Boost/Penalty after initial sorting
            const authorId = sp.post.authorId;
            const timesSeen = authorSeenCount.get(authorId) || 0;
            
            // Formula: 1 / (1 + count_of_author_posts_seen_in_session)
            const diversityBoost = 1 / (1 + timesSeen);
            
            sp.score *= diversityBoost;
            sp.debug.reason += ` Diversity factor: ${diversityBoost.toFixed(2)}.`;
            
            authorSeenCount.set(authorId, timesSeen + 1);
            return sp;
        });

    // Final sort after applying diversity penalty
    scoredPosts.sort((a, b) => b.score - a.score);

    // For debugging: Log the top 5 posts and their scores
    console.group("--- UNERA Feed Ranking ---");
    console.log("Top 5 posts for viewer:", viewer?.name || "Guest");
    scoredPosts.slice(0, 5).forEach((sp, index) => {
        console.log(
            `#${index + 1}: Post ${sp.post.id} (Score: ${sp.score.toFixed(4)}) - Reason: ${sp.debug.reason}`,
            // FIX: The original code `sp.post.content?.substring(0, 50)` was causing a TypeScript error "This expression is not callable". This is likely due to a toolchain issue with optional chaining inside object literals. Using `|| ''` provides a safer fallback and resolves the issue.
            { postContent: (sp.post.content || "").substring(0, 50), debug: sp.debug }
        );
    });
    console.groupEnd();

    return scoredPosts.map(sp => sp.post);
};
