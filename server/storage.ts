import {
  users,
  products,
  categories,
  subcategories,
  cartItems,
  wishlistItems,
  orders,
  orderItems,
  contactInquiries,
  productReviews,
  productQuestions,
  type User,
  type UpsertUser,
  type Product,
  type InsertProduct,
  type Category,
  type InsertCategory,
  type Subcategory,
  type InsertSubcategory,
  type CartItem,
  type InsertCartItem,
  type WishlistItem,
  type InsertWishlistItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type ContactInquiry,
  type InsertContactInquiry,
  type ProductReview,
  type InsertProductReview,
  type ProductQuestion,
  type InsertProductQuestion,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ilike, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  createUser(user: User): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Subcategory operations
  getSubcategories(categoryId?: string): Promise<Subcategory[]>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  
  // Product operations
  getProducts(filters?: {
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    isDeal?: boolean;
  }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getFeaturedProducts(): Promise<Product[]>;
  getDealProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Cart operations
  getCartItems(userId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  // Wishlist operations
  getWishlistItems(userId: string): Promise<(WishlistItem & { product: Product })[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: string, productId: string): Promise<void>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  addOrderItems(orderItems: InsertOrderItem[]): Promise<OrderItem[]>;
  getOrders(userId: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]>;
  getOrder(id: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] }) | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
  // Contact operations
  createContactInquiry(inquiry: InsertContactInquiry): Promise<ContactInquiry>;
  
  // Review operations
  getProductReviews(productId: string): Promise<ProductReview[]>;
  createProductReview(review: InsertProductReview): Promise<ProductReview>;
  
  // Q&A operations
  getProductQuestions(productId: string): Promise<ProductQuestion[]>;
  createProductQuestion(question: InsertProductQuestion): Promise<ProductQuestion>;
  updateProductQuestion(id: string, data: Partial<ProductQuestion>): Promise<ProductQuestion | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(userData: User): Promise<User> {
    const [user] = await db.insert(users).values({
      id: userData.id,
      email: userData.email,
      name: userData.name || '',
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      passwordHash: 'guest',
      provider: userData.provider,
    }).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values([{
        id: crypto.randomUUID(),
        ...userData,
      }])
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  // Subcategory operations
  async getSubcategories(categoryId?: string): Promise<Subcategory[]> {
    let query = db.select().from(subcategories);
    if (categoryId) {
      query = query.where(eq(subcategories.categoryId, categoryId)) as any;
    }
    return await query.orderBy(asc(subcategories.name));
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const [created] = await db.insert(subcategories).values(subcategory).returning();
    return created;
  }

  // Product operations
  async getProducts(filters?: {
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    isDeal?: boolean;
  }): Promise<Product[]> {
    let query = db.select().from(products);
    const conditions = [];

    if (filters?.search) {
      conditions.push(ilike(products.name, `%${filters.search}%`));
    }
    if (filters?.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    if (filters?.subcategoryId) {
      conditions.push(eq(products.subcategoryId, filters.subcategoryId));
    }
    if (filters?.minPrice) {
      conditions.push(sql`${products.price} >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice) {
      conditions.push(sql`${products.price} <= ${filters.maxPrice}`);
    }
    if (filters?.featured !== undefined) {
      conditions.push(eq(products.featured, filters.featured));
    }
    if (filters?.isDeal !== undefined) {
      conditions.push(eq(products.isDeal, filters.isDeal));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.featured, true))
      .orderBy(desc(products.createdAt))
      .limit(6);
  }

  async getDealProducts(): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(
        eq(products.isDeal, true),
        sql`${products.dealExpiry} > NOW()`
      ))
      .orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  // Cart operations
  async getCartItems(userId: string): Promise<(CartItem & { product: Product })[]> {
    return await db.select({
      id: cartItems.id,
      userId: cartItems.userId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      createdAt: cartItems.createdAt,
      product: products,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.createdAt));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const [existing] = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.userId, item.userId),
        eq(cartItems.productId, item.productId)
      ));

    if (existing) {
      // Update quantity
      const [updated] = await db.update(cartItems)
        .set({ quantity: (existing.quantity || 0) + (item.quantity || 1) })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new item
      const [created] = await db.insert(cartItems).values(item).returning();
      return created;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db.update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Wishlist operations
  async getWishlistItems(userId: string): Promise<(WishlistItem & { product: Product })[]> {
    return await db.select({
      id: wishlistItems.id,
      userId: wishlistItems.userId,
      productId: wishlistItems.productId,
      createdAt: wishlistItems.createdAt,
      product: products,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));
  }

  async addToWishlist(item: InsertWishlistItem): Promise<WishlistItem> {
    // Check if item already exists
    const [existing] = await db.select().from(wishlistItems)
      .where(and(
        eq(wishlistItems.userId, item.userId),
        eq(wishlistItems.productId, item.productId)
      ));

    if (existing) {
      return existing;
    }

    const [created] = await db.insert(wishlistItems).values(item).returning();
    return created;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await db.delete(wishlistItems)
      .where(and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.productId, productId)
      ));
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async addOrderItems(orderItemsData: InsertOrderItem[]): Promise<OrderItem[]> {
    return await db.insert(orderItems).values(orderItemsData).returning();
  }

  async getOrders(userId: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]> {
    const userOrders = await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db.select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          createdAt: orderItems.createdAt,
          product: products,
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, order.id));

        return { ...order, orderItems: items };
      })
    );

    return ordersWithItems;
  }

  async getOrder(id: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      price: orderItems.price,
      createdAt: orderItems.createdAt,
      product: products,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, order.id));

    return { ...order, orderItems: items };
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  // Contact operations
  async createContactInquiry(inquiry: InsertContactInquiry): Promise<ContactInquiry> {
    const [created] = await db.insert(contactInquiries).values(inquiry).returning();
    return created;
  }

  // Review operations
  async getProductReviews(productId: string): Promise<ProductReview[]> {
    return await db.select()
      .from(productReviews)
      .where(eq(productReviews.productId, productId))
      .orderBy(desc(productReviews.createdAt));
  }

  async createProductReview(review: InsertProductReview): Promise<ProductReview> {
    const [created] = await db.insert(productReviews).values(review).returning();
    return created;
  }

  // Q&A operations
  async getProductQuestions(productId: string): Promise<ProductQuestion[]> {
    return await db.select()
      .from(productQuestions)
      .where(and(
        eq(productQuestions.productId, productId),
        eq(productQuestions.isPublic, true)
      ))
      .orderBy(desc(productQuestions.createdAt));
  }

  async createProductQuestion(question: InsertProductQuestion): Promise<ProductQuestion> {
    const [created] = await db.insert(productQuestions).values(question).returning();
    return created;
  }

  async updateProductQuestion(id: string, data: Partial<ProductQuestion>): Promise<ProductQuestion | undefined> {
    const [updated] = await db.update(productQuestions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productQuestions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
