

# Class & Data Design — mac-shop (server/src/models)

Updated: 2026-05-19

Mục tiêu: cung cấp mô tả chi tiết các entity (Mongoose models), controllers, services và relationships để sinh sơ đồ class/ER (Mermaid-ready). Phần nội dung dưới đây được sinh từ mã nguồn trong `server/src/`.

FORMAT: mỗi class (Models / Controllers / Services / Utils) được mô tả theo định dạng yêu cầu:
ClassName
├── Fields
│  - [visibility] fieldName: Type
└── Methods
	- [visibility] methodName(param: Type): ReturnType

Notes:
- Visibility: schema fields mặc định là `+`. Fields có `select: false` hoặc nhạy cảm được ghi `-`.
- Embedded subdocuments được liệt kê với tên `Parent_SubdocName` và đánh dấu là composition.
- Controllers methods use `(req: Request, res: Response): Promise<void>` signature when exported handlers.

---

User
├── Fields
│  - + _id: ObjectId
│  - + fullName: String
│  - + email: String
│  - - password: String
│  - + phone: String
│  - + isAdmin: Boolean
│  - + isActive: Boolean
│  - + wishlist: Array<ObjectId> (ref: product)
│  - + typeLogin: String ('email'|'google')
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema instance/static methods defined in source)

ApiKey
├── Fields
│  - + _id: ObjectId
│  - + userId: String (ref: user)
│  - + publicKey: String
│  - + privateKey: String
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

Brand
├── Fields
│  - + _id: ObjectId
│  - + name: String
│  - + slug: String
│  - + description: String
│  - + logo: String
│  - + isActive: Boolean
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

ProductType
├── Fields
│  - + _id: ObjectId
│  - + code: String
│  - + name: String
│  - + attributesTemplate: Array<ProductType_Attribute>
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

ProductType_Attribute
├── Fields
│  - + key: String
│  - + label: String
│  - + inputType: String ('text'|'number'|'select')
│  - + required: Boolean
│  - + placeholder: String
│  - + options: Array<String>
│  - + order: Number
└── Methods
	- (subdoc)

Product
├── Fields
│  - + _id: ObjectId
│  - + name: String
│  - + brand: String
│  - + category: ObjectId (ref: category)
│  - + price: Number
│  - + discount: Number
│  - + costPrice: Number
│  - + priceDiscount: Number
│  - + images: Array<String>
│  - + stock: Number
│  - + componentType: String
│  - + attributes: Mixed
│  - + colorOptions: Array<Product_ColorOption> (embedded)
│  - + reviews: Array<Product_Review> (embedded)
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

Product_ColorOption
├── Fields
│  - + key: String
│  - + name: String
│  - + image: String
│  - + price: Number
│  - + isDefault: Boolean
└── Methods
	- (embedded subdoc)

Product_Review
├── Fields
│  - + userId: String (ref: user)
│  - + orderId: String (ref: payments)
│  - + rating: Number
│  - + comment: String
│  - + images: Array<String>
│  - + fullName: String
│  - + adminReply: Object { adminId: String (ref:user), adminName: String, message: String, repliedAt: Date }
│  - + createdAt: Date
└── Methods
	- (embedded subdoc)

Category
├── Fields
│  - + _id: ObjectId
│  - + name: String
│  - + slug: String
│  - + description: String
│  - + image: String
│  - + isActive: Boolean
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

Cart
├── Fields
│  - + _id: ObjectId
│  - + userId: String (ref: user)
│  - + product: Array<Cart_ProductItem>
│  - + totalPrice: Number
│  - + totalPriceAfterDiscount: Number
│  - + discountAmount: Number
│  - + couponId: String (ref: coupon) | null
│  - + couponCode: String
│  - + fullName: String
│  - + phone: String
│  - + address: String
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

Cart_ProductItem
├── Fields
│  - + productId: String (ref: product)
│  - + quantity: Number
│  - + selectedColorKey: String
│  - + selectedColorName: String
│  - + selectedColorHex: String
│  - + selectedColorImage: String
│  - + unitPrice: Number
│  - + finalUnitPrice: Number
└── Methods
	- (embedded subdoc)

Coupon
├── Fields
│  - + _id: ObjectId
│  - + code: String
│  - + type: String ('PERCENT'|'FIXED')
│  - + value: Number
│  - + minOrderValue: Number
│  - + maxDiscount: Number
│  - + totalUsageLimit: Number
│  - + perUserUsageLimit: Number
│  - + usedCount: Number
│  - + startAt: Date
│  - + endAt: Date
│  - + status: String ('ACTIVE'|'INACTIVE')
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

CouponUsage
├── Fields
│  - + _id: ObjectId
│  - + couponId: String (ref: coupon)
│  - + userId: String (ref: user)
│  - + orderId: String (ref: payments) | null
│  - + usedAt: Date
│  - + discountAmount: Number
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

OTP
├── Fields
│  - + _id: ObjectId
│  - + email: String
│  - + otp: String (hashed)
│  - + time: Date (TTL index)
│  - + type: String
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

Payments
├── Fields
│  - + _id: ObjectId
│  - + userId: String (ref: user)
│  - + products: Array<Payments_Product>
│  - + fullName: String
│  - + phone: Number
│  - + address: String
│  - + typePayments: String ('COD'|'MOMO'|'VNPAY')
│  - + statusOrder: String ('pending'|'completed'|'shipping'|'delivered'|'cancelled')
│  - + totalPrice: Number
│  - + totalPriceBeforeDiscount: Number
│  - + discountAmount: Number
│  - + couponId: String (ref: coupon)
│  - + couponCode: String
│  - + productReviews: Array<Payments_ProductReview>
│  - + contactMessages: Array<Payments_ContactMessage>
│  - + createdAt: Date
│  - + updatedAt: Date
└── Methods
	- (no schema methods)

Payments_Product
├── Fields
│  - + productId: String (ref: product)
│  - + quantity: Number
│  - + selectedColorKey: String
│  - + selectedColorName: String
│  - + selectedColorHex: String
│  - + selectedColorImage: String
│  - + unitPrice: Number
└── Methods
	- (embedded subdoc)

Payments_ProductReview
├── Fields
│  - + productId: String (ref: product)
│  - + rating: Number
│  - + comment: String
│  - + images: Array<String>
│  - + createdAt: Date
└── Methods
	- (embedded subdoc)

Payments_ContactMessage
├── Fields
│  - + senderType: String ('user'|'admin')
│  - + senderId: String (ref: user)
│  - + senderName: String
│  - + message: String
│  - + createdAt: Date
└── Methods
	- (embedded subdoc)

---

SERVICES / UTILITIES

CouponService (server/src/services/couponService.js)
├── Fields
│  - (module functions; no persisted fields)
└── Methods
	- + normalizeCode(code: String): String
	- + computeDiscount(opts: { type: String, value: Number, cartTotal: Number, maxDiscount?: Number }): { discount: Number, finalTotal: Number }
	- + validateCouponForCart(opts: { couponCode: String, userId: String, cartTotal: Number }): Promise<{ coupon: Object, discount: Number, finalTotal: Number }>
	- + recalculateCartTotals(opts: { cart: Object, userId: String }): Promise<{ applied: Boolean, error?: Error }>
	- + recordCouponUsage(opts: { couponId: String, userId: String, orderId?: String, discountAmount: Number }): Promise<void>

TokenService (server/src/services/tokenSevices.js)
├── Fields
│  - (uses ApiKey model)
└── Methods
	- + createApiKey(userId: String): Promise<ApiKeyDocument>
	- + createToken(payload: any): Promise<String>
	- + createRefreshToken(payload: any): Promise<String>
	- + verifyToken(token: String): Promise<Object>

MailForgotPassword / EmailService (server/src/services/MailForgotPassword.js)
├── Fields
│  - (uses OAuth2 env config)
└── Methods
	- + send(email: String, otp: String): Promise<void>

CloudinaryService (server/src/utils/cloudinary.js)
├── Fields
│  - + cloudinary: configured client
└── Methods
	- + uploadToCloudinary(buffer: Buffer, folder?: String): Promise<String>
	- + uploadMultipleToCloudinary(buffers: Array<Buffer>, folder?: String): Promise<Array<String>>

---

CONTROLLERS (exported instances; methods signatures simplified)

UsersController
├── Fields
│  - (module helpers: getCookieConfig, setAuthCookies, clearAuthCookies)
└── Methods
	- + register(req: Request, res: Response): Promise<void>
	- + login(req: Request, res: Response): Promise<void>
	- + loginGoogle(req: Request, res: Response): Promise<void>
	- + loginAdmin(req: Request, res: Response): Promise<void>
	- + authUser(req: Request, res: Response): Promise<void>
	- + logout(req: Request, res: Response): Promise<void>
	- + refreshToken(req: Request, res: Response): Promise<void>
	- + getAdminStats(req: Request, res: Response): Promise<void>
	- + getAllUser(req: Request, res: Response): Promise<void>
	- + updateUserRole(req: Request, res: Response): Promise<void>
	- + updateUserStatus(req: Request, res: Response): Promise<void>
	- + changePassword(req: Request, res: Response): Promise<void>
	- + sendMailForgotPassword(req: Request, res: Response): Promise<void>
	- + verifyOtp(req: Request, res: Response): Promise<void>
	- + updateInfoUser(req: Request, res: Response): Promise<void>
	- + updatePassword(req: Request, res: Response): Promise<void>
	- + authAdmin(req: Request, res: Response): Promise<void>
Dependencies: modelUser, modelPayments, modelApiKey, modelOtp, TokenService, MailForgotPassword

BrandsController
├── Methods
	- + createBrand(req: Request, res: Response): Promise<void>
	- + getBrands(req: Request, res: Response): Promise<void>
	- + updateBrand(req: Request, res: Response): Promise<void>
	- + deleteBrand(req: Request, res: Response): Promise<void>
Dependencies: modelBrand, modelProduct

ProductTypeController
├── Methods
	- + create(req: Request, res: Response): Promise<void>
	- + getAll(req: Request, res: Response): Promise<void>
	- + update(req: Request, res: Response): Promise<void>
	- + delete(req: Request, res: Response): Promise<void>
	- + checkCodeExists(req: Request, res: Response): Promise<void>
Dependencies: modelProductType, modelProduct

ProductsController
├── Methods
	- + addProduct(req: Request, res: Response): Promise<void>
	- + uploadImage(req: Request, res: Response): Promise<void>
	- + getProducts(req: Request, res: Response): Promise<void>
	- + getProductById(req: Request, res: Response): Promise<void>
	- + getAllProduct(req: Request, res: Response): Promise<void>
	- + editProduct(req: Request, res: Response): Promise<void>
	- + deleteProduct(req: Request, res: Response): Promise<void>
	- + searchProduct(req: Request, res: Response): Promise<void>
	- + filterProduct(req: Request, res: Response): Promise<void>
Dependencies: modelProduct, modelProductType, modelCategory, CloudinaryService

CartController
├── Methods
	- + addToCart(req: Request, res: Response): Promise<void>
	- + getCart(req: Request, res: Response): Promise<void>
	- + deleteProductCart(req: Request, res: Response): Promise<void>
	- + updateInfoUserCart(req: Request, res: Response): Promise<void>
	- + updateQuantity(req: Request, res: Response): Promise<void>
Dependencies: modelCart, modelProduct, CouponService

CouponsController
├── Methods
	- + createCoupon(req: Request, res: Response): Promise<void>
	- + listCoupons(req: Request, res: Response): Promise<void>
	- + getCoupon(req: Request, res: Response): Promise<void>
	- + updateCoupon(req: Request, res: Response): Promise<void>
	- + updateCouponStatus(req: Request, res: Response): Promise<void>
	- + deleteCoupon(req: Request, res: Response): Promise<void>
	- + validateCoupon(req: Request, res: Response): Promise<void>
	- + applyCoupon(req: Request, res: Response): Promise<void>
	- + removeCoupon(req: Request, res: Response): Promise<void>
	- + getAvailableCoupons(req: Request, res: Response): Promise<void>
	- + recordCouponUsage(opts: { couponId: String, userId: String, orderId?: String, discountAmount: Number }): Promise<void>
Dependencies: modelCoupon, modelCouponUsage, modelCart, CouponService

PaymentsController
├── Methods
	- + payment(req: Request, res: Response): Promise<void>
	- (other internal payment handlers and helpers exist in file)
Dependencies: modelPayments, modelCart, modelProduct, modelUser, modelCoupon, modelCouponUsage, CouponService, VNPay

CategoriesController
├── Methods
	- + create(req: Request, res: Response): Promise<void>
	- + getAll(req: Request, res: Response): Promise<void>
	- + getById(req: Request, res: Response): Promise<void>
	- + update(req: Request, res: Response): Promise<void>
	- + delete(req: Request, res: Response): Promise<void>
	- + getAllActive(req: Request, res: Response): Promise<void>
Dependencies: modelCategory, modelProduct

RevenueController
├── Methods
	- + getRevenueStatistics(req: Request, res: Response): Promise<void>
Dependencies: modelPayments, modelProduct, modelUser

WishlistController
├── Methods
	- + getWishlist(req: Request, res: Response): Promise<void>
	- + addWishlist(req: Request, res: Response): Promise<void>
	- + removeWishlist(req: Request, res: Response): Promise<void>
Dependencies: modelUser, modelProduct

---

RELATIONSHIPS (tóm tắt — dùng để vẽ biểu đồ)

SourceRelationshipTargetMultiplicityNote
User - - → ApiKey : 1 → 0..* (apiKey.userId ref user)
User → Cart : 1 → 0..* (cart.userId ref user)
User → Payments : 1 → 0..* (payments.userId ref user)
User → CouponUsage : 1 → 0..* (couponUsage.userId ref user)
User - - → OTP : 1 → 0..* (linked by email value)
Product ◆→ Product_ColorOption : 1 → 0..* (embedded)
Product ◆→ Product_Review : 1 → 0..* (embedded)
Product → Category : * → 1 (product.category ref category)
Product - - → Brand : * → 1 (brand stored as String)
ProductType - - → Product : 1 → 0..* (product.componentType == productType.code)
Cart → Product (via cart.product[].productId) : 1 → 0..*
Payments → Product (via payments.products[].productId) : 1 → 0..*
Payments → Coupon : * → 1 (payments.couponId)
Cart → Coupon : * → 1 (cart.couponId)
Coupon → CouponUsage : 1 → 0..*
Controllers/Services ⇢ Models : controllers and services depend on respective models

Legend:
- ◆→ composition (embedded subdoc)
- → association (ObjectId ref)
- - → logical link (string/code match)
- ⇢ dependency (module uses another module)

---

Next steps you may want:
- Export Mermaid `classDiagram` from these class blocks (I can generate it).
- Generate SQL DDL mapping for relational export.

File updated: [server/src/models/Class.md](server/src/models/Class.md)



