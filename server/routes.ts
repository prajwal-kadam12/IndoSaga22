import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import sharp from "sharp";
import { storage } from "./storage";
import { 
  insertProductSchema, 
  insertCategorySchema, 
  insertCartItemSchema,
  insertWishlistItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertContactInquirySchema,
  insertUserSchema,
  insertProductReviewSchema,
  insertSubcategorySchema,
  insertProductQuestionSchema
} from "@shared/schema";
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendEmail, createAppointmentConfirmationEmail, createSupportTicketConfirmationEmail } from "./email-service";
// import { auth } from "express-openid-connect"; // Using client-side Auth0 instead

// Initialize Razorpay conditionally - prefer test keys for development
let razorpay: Razorpay | null = null;
const keyId = process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_SECRET;

if (keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  console.log(`Razorpay initialized with ${keyId.includes('test') ? 'test' : 'live'} credentials`);
}

// Auth0 configuration
const baseURL = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';
const auth0Config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: baseURL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : undefined,
  routes: {
    logout: '/logout',
    callback: '/callback'
  }
};

console.log('Auth0 Config:', {
  baseURL: auth0Config.baseURL,
  callbackURL: `${baseURL}/callback`,
  clientID: auth0Config.clientID ? 'Set' : 'Not set',
  issuerBaseURL: auth0Config.issuerBaseURL
});

// Image similarity matching function
async function findSimilarProductsByImage(imageBuffer: Buffer) {
  try {
    // Extract basic image properties for analysis
    const image = sharp(imageBuffer);
    const { width, height, channels } = await image.metadata();
    
    // Get dominant colors and basic properties
    const { dominant } = await image.stats();
    
    // Get all products and categories from storage
    const allProducts = await storage.getProducts({});
    const allCategories = await storage.getCategories();
    
    // Create a category lookup map
    const categoryMap = new Map();
    allCategories.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });
    
    // For now, implement a simple similarity algorithm based on:
    // 1. Product categories (furniture types are visually similar)
    // 2. Random selection with weighted preferences
    // 3. Featured products get higher priority
    
    // Simulate AI-based categorization based on image properties
    let detectedCategory = '';
    const aspectRatio = width && height ? width / height : 1;
    
    // Enhanced heuristic based on image properties and available categories
    const availableCategories = allCategories.map(cat => cat.name);
    console.log('Available categories:', availableCategories);
    
    if (aspectRatio > 1.5) {
      // Wide images likely to be sofas, dining tables
      const wideCategories = availableCategories.filter(cat => 
        cat.toLowerCase().includes('sofa') || 
        cat.toLowerCase().includes('dining') ||
        cat.toLowerCase().includes('table')
      );
      detectedCategory = wideCategories.length > 0 ? 
        wideCategories[Math.floor(Math.random() * wideCategories.length)] : 
        availableCategories[0];
    } else if (aspectRatio < 0.8) {
      // Tall images likely to be wardrobes, chairs
      const tallCategories = availableCategories.filter(cat => 
        cat.toLowerCase().includes('wardrobe') || 
        cat.toLowerCase().includes('chair') ||
        cat.toLowerCase().includes('cabinet')
      );
      detectedCategory = tallCategories.length > 0 ? 
        tallCategories[Math.floor(Math.random() * tallCategories.length)] : 
        availableCategories[0];
    } else {
      // Square-ish images could be any furniture - try all categories
      detectedCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    }
    
    console.log(`Detected furniture category: ${detectedCategory} (aspect ratio: ${aspectRatio.toFixed(2)})`);
    
    // Filter products by detected category or similar categories
    let exactMatches = allProducts.filter(product => {
      const productCategoryName = categoryMap.get(product.categoryId);
      return productCategoryName === detectedCategory;
    });
    
    let partialMatches = allProducts.filter(product => {
      const productCategoryName = categoryMap.get(product.categoryId);
      return productCategoryName && detectedCategory && (
        productCategoryName.toLowerCase().includes(detectedCategory.toLowerCase()) ||
        detectedCategory.toLowerCase().includes(productCategoryName.toLowerCase())
      );
    });
    
    let featuredProducts = allProducts.filter(p => p.featured);
    
    // Combine results: exact matches first, then partial matches, then featured products
    let similarProducts = [
      ...exactMatches,
      ...partialMatches.filter(p => !exactMatches.find(ep => ep.id === p.id)),
      ...featuredProducts.filter(p => !exactMatches.find(ep => ep.id === p.id) && !partialMatches.find(pm => pm.id === p.id))
    ];
    
    // If still no matches, return a diverse selection of all products
    if (similarProducts.length === 0) {
      console.log('No category matches found, returning diverse selection');
      similarProducts = allProducts.slice(0, 8);
    }
    
    console.log(`Found ${exactMatches.length} exact matches, ${partialMatches.length} partial matches, ${featuredProducts.length} featured products`);
    console.log('Category map:', Array.from(categoryMap.entries()));
    console.log('Products with categories:', allProducts.slice(0, 3).map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId, categoryName: categoryMap.get(p.categoryId) })));
    
    // Sort by relevance (featured first, then by category match, then randomize)
    similarProducts.sort((a, b) => {
      // Featured products get highest priority
      if (a.featured !== b.featured) {
        return b.featured ? 1 : -1;
      }
      
      // Then prioritize exact category matches
      const aCategoryName = categoryMap.get(a.categoryId);
      const bCategoryName = categoryMap.get(b.categoryId);
      const aExactMatch = aCategoryName === detectedCategory;
      const bExactMatch = bCategoryName === detectedCategory;
      
      if (aExactMatch !== bExactMatch) {
        return bExactMatch ? 1 : -1;
      }
      
      // Random shuffle for similar products
      return Math.random() - 0.5;
    });
    
    // Return top 6-8 similar products
    return similarProducts.slice(0, 8);
    
  } catch (error) {
    console.error('Error in image similarity analysis:', error);
    // Fallback: return featured products
    return await storage.getFeaturedProducts();
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Use session middleware for client-side Auth0 integration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key', 
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  
  console.log('Using client-side Auth0 authentication');

  // Configure multer for image uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Client-side Auth0 handles authentication - no server routes needed

  // Logout route
  app.get('/logout', (req, res) => {
    (req as any).session = null;
    res.redirect('/');
  });

  // API logout endpoint for proper session clearing
  app.post('/api/auth/logout', (req, res) => {
    try {
      // Destroy the session completely
      if ((req as any).session) {
        (req as any).session.destroy((err: any) => {
          if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ message: 'Logout failed' });
          }
          
          // Clear the session cookie
          res.clearCookie('connect.sid');
          res.json({ success: true, message: 'Logged out successfully' });
        });
      } else {
        res.json({ success: true, message: 'No active session' });
      }
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // Profile route (protected)
  app.get('/profile', async (req, res) => {
    const user = (req as any).session?.user;
    if (!user) {
      return res.redirect('/login');
    }

    try {
      // Check if user exists in database, create if not
      const [existingUser] = await db.select().from(users).where(eq(users.email, user.email));
      
      if (!existingUser && user.email) {
        // Create new user from session
        const [newUser] = await db.insert(users).values({
          id: user.sub || crypto.randomUUID(),
          email: user.email,
          name: user.name || '',
          firstName: user.given_name || '',
          lastName: user.family_name || '',
          profileImageUrl: user.picture || '',
          provider: user.provider || 'demo'
        }).returning();
        
        return res.json(newUser);
      }

      res.json(existingUser);
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Failed to get profile' });
    }
  });

  // Sync Auth0 user with server session
  app.post('/api/auth/sync', async (req, res) => {
    try {
      const { user, localCartItems = [] } = req.body;
      
      if (!user || !user.email) {
        return res.status(400).json({ message: 'Invalid user data' });
      }
      
      // Store user in session
      (req as any).session.user = {
        id: user.sub || crypto.randomUUID(),
        email: user.email,
        name: user.name || '',
        firstName: user.given_name || '',
        lastName: user.family_name || '',
        profileImageUrl: user.picture || '',
        provider: 'auth0'
      };
      
      // Check if user exists in database, create if not
      let existingUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
      let dbUser;
      
      if (existingUser.length === 0) {
        const [newUser] = await db.insert(users).values({
          id: user.sub || crypto.randomUUID(),
          email: user.email,
          name: user.name || '',
          firstName: user.given_name || '',
          lastName: user.family_name || '',
          profileImageUrl: user.picture || '',
          provider: 'auth0'
        }).returning();
        dbUser = newUser;
      } else {
        dbUser = existingUser[0];
      }
      
      // Migrate localStorage cart items to authenticated user's cart
      if (localCartItems.length > 0 && dbUser) {
        console.log(`Migrating ${localCartItems.length} localStorage cart items to authenticated user`);
        
        for (const localItem of localCartItems) {
          try {
            // Validate and add each item to the authenticated user's cart
            const cartData = {
              userId: dbUser.id,
              productId: localItem.productId || localItem.id,
              quantity: localItem.quantity || 1
            };
            
            // Validate the cart item data
            const validatedCartData = insertCartItemSchema.parse(cartData);
            await storage.addToCart(validatedCartData);
            
            console.log(`Migrated item: ${cartData.productId} (qty: ${cartData.quantity})`);
          } catch (itemError) {
            console.error('Error migrating cart item:', itemError, localItem);
            // Continue with other items even if one fails
          }
        }
        
        console.log('Cart migration completed');
      }
      
      res.json(dbUser);
    } catch (error) {
      console.error('Auth sync error:', error);
      res.status(500).json({ message: 'Failed to sync authentication' });
    }
  });

  // Check authentication status
  app.get('/api/auth/me', async (req, res) => {
    try {      
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get complete user data from database
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user.email)).limit(1);
        
        if (dbUser) {
          // Merge session data with database data
          const completeUser = {
            ...user,
            name: dbUser.name || user.name,
            phone: dbUser.phone || '',
            address: dbUser.address || '',
            firstName: dbUser.firstName || user.given_name,
            lastName: dbUser.lastName || user.family_name,
            profileImageUrl: dbUser.profileImageUrl || user.picture
          };
          
          res.json(completeUser);
        } else {
          // Return session data if no database record
          res.json(user);
        }
      } catch (dbError) {
        console.error('Database error in auth/me:', dbError);
        // Fallback to session data
        res.json(user);
      }
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ message: 'Authentication error' });
    }
  });

  // Update user profile
  app.put('/api/auth/profile', async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, email, phone, address } = req.body;
      
      // Update user in database
      await storage.upsertUser({
        email: email || user.email,
        name: name || user.name,
        phone: phone || '',
        address: address || '',
        firstName: user.given_name || '',
        lastName: user.family_name || '',
        profileImageUrl: user.picture || '',
        provider: user.provider || 'auth0'
      });

      // Update session data
      (req as any).session.user = {
        ...user,
        name: name || user.name,
        email: email || user.email,
        phone: phone || '',
        address: address || ''
      };

      res.json({ 
        success: true, 
        message: "Profile updated successfully",
        user: (req as any).session.user
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  // Subcategories
  app.get("/api/subcategories", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const subcategories = await storage.getSubcategories(categoryId as string);
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.post("/api/subcategories", async (req, res) => {
    try {
      const subcategoryData = insertSubcategorySchema.parse(req.body);
      const subcategory = await storage.createSubcategory(subcategoryData);
      res.json(subcategory);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid subcategory data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create subcategory" });
      }
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { search, categoryId, subcategoryId, minPrice, maxPrice, featured, isDeal } = req.query;
      const filters = {
        search: search as string,
        categoryId: categoryId as string,
        subcategoryId: subcategoryId as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        featured: featured === 'true',
        isDeal: isDeal === 'true',
      };
      
      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getFeaturedProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching featured products:", error);
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/deals", async (req, res) => {
    try {
      const products = await storage.getDealProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching deal products:", error);
      res.status(500).json({ message: "Failed to fetch deal products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  // Image search endpoint
  app.post("/api/products/search-by-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log("Processing image search request...");
      
      // Process the uploaded image using Sharp for analysis
      const imageBuffer = req.file.buffer;
      const imageMetadata = await sharp(imageBuffer).metadata();
      
      console.log("Image metadata:", {
        format: imageMetadata.format,
        width: imageMetadata.width,
        height: imageMetadata.height,
        size: req.file.size
      });

      // For now, implement a simple similarity search based on product categories and features
      // In a production system, you'd use AI/ML services like Google Vision API, AWS Rekognition, etc.
      const similarProducts = await findSimilarProductsByImage(imageBuffer);
      
      console.log(`Found ${similarProducts.length} similar products`);
      res.json(similarProducts);
    } catch (error) {
      console.error("Error processing image search:", error);
      res.status(500).json({ message: "Failed to process image search" });
    }
  });

  // Cart operations - require authentication for persistent cart
  app.get("/api/cart", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        // Get user from database first
        const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
        if (dbUser) {
          const cartItems = await storage.getCartItems(dbUser.id);
          return res.json(cartItems);
        }
      }
      // Return empty cart for non-authenticated users
      res.json([]);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
        if (dbUser) {
          const cartData = insertCartItemSchema.parse({ ...req.body, userId: dbUser.id });
          const cartItem = await storage.addToCart(cartData);
          return res.json(cartItem);
        }
      }
      // For non-authenticated users, return success and let frontend handle localStorage
      res.json({ success: true, message: "Item added to cart" });
    } catch (error) {
      console.error("Error adding to cart:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid cart data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add to cart" });
      }
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        const { quantity } = req.body;
        const cartItem = await storage.updateCartItem(req.params.id, quantity);
        if (!cartItem) {
          return res.status(404).json({ message: "Cart item not found" });
        }
        return res.json(cartItem);
      }
      // For non-authenticated users, return success and let frontend handle localStorage
      res.json({ success: true, message: "Cart item updated" });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        await storage.removeFromCart(req.params.id);
        return res.json({ message: "Item removed from cart" });
      }
      // For non-authenticated users, return success and let frontend handle localStorage
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  // Wishlist operations - require authentication for persistent wishlist
  app.get("/api/wishlist", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
        if (dbUser) {
          const wishlistItems = await storage.getWishlistItems(dbUser.id);
          return res.json(wishlistItems);
        }
      }
      // Return empty wishlist for non-authenticated users
      res.json([]);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/wishlist", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
        if (dbUser) {
          const wishlistData = insertWishlistItemSchema.parse({ ...req.body, userId: dbUser.id });
          const wishlistItem = await storage.addToWishlist(wishlistData);
          return res.json(wishlistItem);
        }
      }
      // For non-authenticated users, return 401 to trigger frontend localStorage fallback
      res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid wishlist data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add to wishlist" });
      }
    }
  });

  app.delete("/api/wishlist/:productId", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (user) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
        if (dbUser) {
          await storage.removeFromWishlist(dbUser.id, req.params.productId);
          return res.json({ message: "Item removed from wishlist" });
        }
      }
      // For non-authenticated users, return 401 to trigger frontend localStorage fallback  
      res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  // Protected checkout route - requires authentication
  app.get("/checkout", (req, res) => {
    const user = (req as any).session?.user;
    if (!user) {
      // Redirect to home page - client-side Auth0 will handle authentication
      return res.redirect('/?auth=required&returnTo=/checkout');
    }
    res.redirect('/?page=checkout');
  });

  // Helpdesk/Support endpoints  
  app.post('/api/support/tickets', async (req, res) => {
    try {
      const { customerName, customerEmail, customerPhone, subject, message, priority = 'medium' } = req.body;
      
      if (!customerName || !customerEmail || !subject || !message) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // In a real implementation, this would save to a support ticket database
      const ticketId = `TICKET-${Date.now()}`;
      
      const ticketData = {
        ticketId,
        customerName,
        customerEmail,
        subject: subject,
        priority
      };
      
      console.log('Support ticket created:', ticketData);

      // Send confirmation email
      try {
        const emailParams = createSupportTicketConfirmationEmail(ticketData);
        const emailSent = await sendEmail(emailParams);
        
        if (emailSent) {
          console.log('Support ticket confirmation email sent to:', customerEmail);
        } else {
          console.log('Failed to send support ticket confirmation email');
        }
      } catch (emailError) {
        console.error('Error sending support ticket confirmation email:', emailError);
        // Don't fail the whole request if email fails
      }

      res.json({ 
        success: true, 
        ticketId,
        message: 'Support ticket created successfully'
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });

  app.post('/api/helpdesk/chat', async (req, res) => {
    try {
      const { message, ticketId } = req.body;
      const user = (req as any).session?.user;
      
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      // In a real implementation, this would save to chat history and potentially notify support staff
      const chatMessage = {
        id: Date.now().toString(),
        message,
        sender: 'customer',
        timestamp: new Date().toISOString(),
        senderName: user?.name || user?.email || 'Customer'
      };

      console.log('Chat message sent:', chatMessage);

      res.json(chatMessage);
    } catch (error) {
      console.error('Error sending chat message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get('/api/helpdesk/tickets', async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // In a real implementation, this would fetch from database
      // For now, return empty array
      res.json([]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ message: 'Failed to fetch tickets' });
    }
  });

  // Appointment booking endpoints
  app.post('/api/appointments', async (req, res) => {
    try {
      const user = (req as any).session?.user;

      const { 
        customerName, 
        customerEmail, 
        customerPhone, 
        appointmentDate, 
        appointmentTime,
        meetingType = 'virtual_showroom',
        notes,
        date,
        time,
        type 
      } = req.body;

      // Handle both old and new format
      const finalDate = date || appointmentDate;
      const finalTime = time || appointmentTime;
      const finalType = type || meetingType;

      if (!customerName || !customerEmail || !finalDate || !finalTime) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const appointmentId = `APT-${Date.now()}`;
      
      // In a real implementation, this would save to database
      const appointment = {
        id: appointmentId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        date: finalDate,
        time: finalTime,
        type: finalType,
        status: 'scheduled',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        userId: user?.id || 'guest'
      };

      console.log('Appointment booked:', appointment);

      // Send confirmation email
      try {
        const emailParams = createAppointmentConfirmationEmail(appointment);
        const emailSent = await sendEmail(emailParams);
        
        if (emailSent) {
          console.log('Appointment confirmation email sent to:', customerEmail);
        } else {
          console.log('Failed to send appointment confirmation email');
        }
      } catch (emailError) {
        console.error('Error sending appointment confirmation email:', emailError);
        // Don't fail the whole request if email fails
      }

      res.json(appointment);
    } catch (error) {
      console.error('Error booking appointment:', error);
      res.status(500).json({ message: 'Failed to book appointment' });
    }
  });

  app.get('/api/appointments', async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // In a real implementation, this would fetch from database
      // For now, return empty array
      res.json([]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  // Video call endpoints
  app.post('/api/video-call/start', async (req, res) => {
    try {
      const user = (req as any).session?.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { appointmentId } = req.body;
      
      // In a real implementation, this would:
      // 1. Validate the appointment
      // 2. Generate WebRTC connection details
      // 3. Notify the shop owner
      
      const sessionId = `VIDEO-${Date.now()}`;
      
      console.log('Video call started:', {
        sessionId,
        appointmentId,
        customer: user.name || user.email
      });

      res.json({
        success: true,
        sessionId,
        message: 'Video call session started'
      });
    } catch (error) {
      console.error('Error starting video call:', error);
      res.status(500).json({ message: 'Failed to start video call' });
    }
  });

  // Orders - require authentication
  
  // GET orders for authenticated user
  app.get("/api/orders", async (req, res) => {
    const user = (req as any).session?.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const orders = await storage.getOrders(dbUser.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get a specific order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // POST new order
  app.post("/api/orders", async (req, res) => {
    const user = (req as any).session?.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.email, user?.email || ''));
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Extract order items from request body
      const { orderItems: orderItemsData, ...orderData } = req.body;
      
      // Create the main order
      const orderToCreate = insertOrderSchema.parse({ ...orderData, userId: dbUser.id });
      const order = await storage.createOrder(orderToCreate);
      
      // Create order items if they exist
      if (orderItemsData && orderItemsData.length > 0) {
        const orderItems = orderItemsData.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }));
        
        await storage.addOrderItems(orderItems);
      }
      
      // Clear the user's cart after successful order creation
      await storage.clearCart(dbUser.id);

      // Send order confirmation email
      try {
        const { createOrderConfirmationEmail, sendEmail } = await import("./email-service");
        
        // Get complete order with items for email
        const completeOrder = await storage.getOrder(order.id);
        
        const emailData = createOrderConfirmationEmail(completeOrder, dbUser.email);
        const emailSent = await sendEmail(emailData);
        
        if (emailSent) {
          console.log(`✅ Order confirmation email processed successfully for order ${order.id}`);
          console.log(`📧 Customer ${dbUser.email} should check their email and console logs above for order details`);
        } else {
          console.log(`⚠️  Order confirmation email logged to console for order ${order.id}`);
        }
      } catch (emailError) {
        console.error("Error sending order confirmation email:", emailError);
        // Don't fail the order creation if email fails
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid order data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  // POST direct checkout order (for guest users and authenticated users)
  app.post("/api/orders/direct-checkout", async (req, res) => {
    try {
      const { orderItems: orderItemsData, customerEmail, ...orderData } = req.body;
      
      // For direct checkout, we might not have a logged-in user session
      const user = (req as any).session?.user;
      let userId = null;
      
      // If user is authenticated, link the order to their account
      if (user) {
        const [dbUser] = await db.select().from(users).where(eq(users.email, user.email || ''));
        if (dbUser) {
          userId = dbUser.id;
        }
      }
      
      // Create the main order with or without user association
      const orderToCreate = insertOrderSchema.parse({ 
        ...orderData, 
        userId,
        paymentStatus: orderData.paymentStatus || 'paid' // Default to paid for successful payments
      });
      const order = await storage.createOrder(orderToCreate);
      
      // Create order items if they exist
      if (orderItemsData && orderItemsData.length > 0) {
        const orderItems = orderItemsData.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }));
        
        await storage.addOrderItems(orderItems);
      }
      
      // Clear the user's cart if they are authenticated
      if (userId) {
        await storage.clearCart(userId);
      }

      // Send order confirmation email
      try {
        const { createOrderConfirmationEmail, sendEmail } = await import("./email-service");
        
        // Get complete order with items for email
        const completeOrder = await storage.getOrder(order.id);
        
        // Use customer email from request or user email if available
        const emailAddress = customerEmail || user?.email;
        
        if (emailAddress) {
          const emailData = createOrderConfirmationEmail(completeOrder, emailAddress);
          const emailSent = await sendEmail(emailData);
          
          if (emailSent) {
            console.log(`✅ Order confirmation email processed successfully for order ${order.id}`);
            console.log(`📧 Customer ${emailAddress} should check their email and console logs above for order details`);
          } else {
            console.log(`⚠️  Order confirmation email logged to console for order ${order.id}`);
          }
        } else {
          console.log(`No email address available for order confirmation ${order.id}`);
        }
      } catch (emailError) {
        console.error("Error sending order confirmation email:", emailError);
        // Don't fail the order creation if email fails
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error creating direct checkout order:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid order data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  // Razorpay configuration endpoint
  app.get("/api/payment/config", (req, res) => {
    try {
      const keyId = process.env.RAZORPAY_TEST_KEY_ID || process.env.RAZORPAY_KEY_ID;
      if (!keyId) {
        return res.status(500).json({ message: "Razorpay not configured" });
      }
      res.json({ 
        key: keyId,
        enabled: !!razorpay 
      });
    } catch (error) {
      console.error("Error fetching payment config:", error);
      res.status(500).json({ message: "Failed to fetch payment configuration" });
    }
  });

  // Razorpay API routes
  app.post("/api/create-razorpay-order", async (req, res) => {
    try {
      if (!razorpay) {
        return res.status(500).json({ message: "Razorpay not configured" });
      }

      const { amount, currency = 'INR' } = req.body;
      
      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: `order_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.post("/api/verify-razorpay-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(sign.toString())
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        res.json({ success: true, message: "Payment verified successfully" });
      } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Contact form
  app.post("/api/contact", async (req, res) => {
    try {
      const contactData = insertContactInquirySchema.parse(req.body);
      const inquiry = await storage.createContactInquiry(contactData);
      
      // Send email notification to owner
      try {
        const { createContactInquiryNotificationEmail, sendEmail } = await import("./email-service");
        const emailData = createContactInquiryNotificationEmail(inquiry);
        const emailSent = await sendEmail(emailData);
        
        if (emailSent) {
          console.log(`Email notification sent to owner for inquiry ${inquiry.id}`);
        } else {
          console.log(`Email notification failed for inquiry ${inquiry.id} (SendGrid may not be configured)`);
        }
      } catch (emailError) {
        console.error("Error sending owner notification email:", emailError);
        // Don't fail the API call if email fails - inquiry is still saved
      }
      
      res.json(inquiry);
    } catch (error) {
      console.error("Error creating contact inquiry:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create contact inquiry" });
      }
    }
  });

  // Product Reviews
  app.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({ message: "Failed to fetch product reviews" });
    }
  });

  // Upload review images
  app.post("/api/products/:productId/reviews/upload-images", upload.array('images', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No images uploaded" });
      }

      // Create reviews-images directory if it doesn't exist
      const fs = await import('fs/promises');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'reviews');
      
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      const imageUrls: string[] = [];

      // Save each uploaded image
      for (const file of files) {
        const filename = `review_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${file.mimetype.split('/')[1]}`;
        const filepath = path.join(uploadsDir, filename);
        
        await fs.writeFile(filepath, file.buffer);
        imageUrls.push(`/uploads/reviews/${filename}`);
      }

      // Store image metadata in JSON file for backup/reference
      const metadataFile = path.join(uploadsDir, 'images_metadata.json');
      let metadata = [];
      
      try {
        const existingMetadata = await fs.readFile(metadataFile, 'utf-8');
        metadata = JSON.parse(existingMetadata);
      } catch {
        // File doesn't exist yet, start with empty array
      }

      // Add new image metadata
      metadata.push({
        productId: req.params.productId,
        uploadedAt: new Date().toISOString(),
        images: imageUrls
      });

      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
      
      res.json({ imageUrls });
    } catch (error) {
      console.error("Error uploading review images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  app.post("/api/products/:productId/reviews", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      const reviewData = insertProductReviewSchema.parse({
        ...req.body,
        productId: req.params.productId,
        userId: user?.id || null,
      });
      
      const review = await storage.createProductReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating product review:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid review data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product review" });
      }
    }
  });

  // Product Q&A
  app.get("/api/products/:productId/questions", async (req, res) => {
    try {
      const questions = await storage.getProductQuestions(req.params.productId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching product questions:", error);
      res.status(500).json({ message: "Failed to fetch product questions" });
    }
  });

  app.post("/api/products/:productId/questions", async (req, res) => {
    try {
      const user = (req as any).session?.user;
      const questionData = insertProductQuestionSchema.parse({
        ...req.body,
        productId: req.params.productId,
        userId: user?.id || null,
      });
      
      const question = await storage.createProductQuestion(questionData);
      res.json(question);
    } catch (error) {
      console.error("Error creating product question:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid question data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product question" });
      }
    }
  });

  // Update product question (for owners to add answers)
  app.put("/api/products/questions/:questionId", async (req, res) => {
    try {
      const questionData = req.body;
      const question = await storage.updateProductQuestion(req.params.questionId, {
        ...questionData,
        answeredAt: questionData.answer ? new Date() : undefined
      });
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(question);
    } catch (error) {
      console.error("Error updating product question:", error);
      res.status(500).json({ message: "Failed to update product question" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}