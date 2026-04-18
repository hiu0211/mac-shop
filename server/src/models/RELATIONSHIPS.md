# Moi Quan He Giua Cac Model Trong Du An Mac-Shop

## 1. Bang Tong Quan Model

| Model | Mo ta | File |
| --- | --- | --- |
| User | Nguoi dung he thong | users.model.js |
| Product | San pham ban hang | products.model.js |
| Cart | Gio hang tam truoc khi thanh toan | cart.model.js |
| Payments | Don hang da tao/thanh toan | payments.model.js |
| Brand | Thuong hieu san pham | brand.model.js |
| Coupon | Ma giam gia | coupon.model.js |
| ProductType | Loai san pham va template thuoc tinh dong | productType.model.js |
| CouponUsage | Lich su su dung coupon theo user | couponUsage.model.js |
| ApiKey | Cap khoa RSA cho user | apiKey.model.js |
| OTP | Ma xac thuc OTP co TTL | otp.model.js |
| ProductReview (embedded) | Danh gia duoc nhung trong product/payments, khong la collection rieng | products.model.js, payments.model.js |

## 2. Dinh Nghia Tung Model

### 2.1 User (users.model.js)

- Quan he chinh:
	- User <-> ApiKey: 1-1 theo business rule (schema chua unique userId nen can enforce them neu can chac)
	- User -> Cart: 1-n
	- User -> Payments: 1-n
	- User -> CouponUsage: 1-n
	- User -> OTP: 1-n logic theo email
	- User -> ProductReview (embedded): 1-n thong qua `products.reviews.userId`
- Mongoose ref trong du an:

```js
// apiKey.model.js
userId: { type: String, require: true, ref: 'user' }

// cart.model.js
userId: { type: String, require: true, ref: 'user' }

// payments.model.js
userId: { type: String, require: true, ref: 'user' }
contactMessages: [{ senderId: { type: String, required: true, ref: 'user' } }]

// couponUsage.model.js
userId: { type: String, required: true, ref: 'user' }

// otp.model.js (lien ket logic theo email)
email: { type: String, require: true, ref: 'user' }
```

- Sequelize tuong duong:

```js
User.hasOne(ApiKey, { foreignKey: 'userId' });
User.hasMany(Cart, { foreignKey: 'userId' });
User.hasMany(Payments, { foreignKey: 'userId' });
User.hasMany(CouponUsage, { foreignKey: 'userId' });
```

### 2.2 Product (products.model.js)

- Quan he chinh:
	- Product <-> Cart: n-n logic qua mang `cart.product[]` (moi item co `productId`)
	- Product <-> Payments: lien ket logic qua `payments.products` (snapshot don hang) va `payments.productReviews[].productId`
	- Brand -> Product: 1-n logic qua truong chuoi `product.brand` (khong dung ObjectId ref)
	- ProductType -> Product: 1-n logic qua `product.componentType = productType.code`
	- ProductReview (embedded) thuoc Product
- Mongoose ref trong du an:

```js
// cart.model.js
product: [{ productId: { type: String, required: true, ref: 'product' }, quantity: Number }]

// payments.model.js
productReviews: [{ productId: { type: String, required: true, ref: 'product' } }]

// products.model.js (embedded review)
reviews: [{
	userId: { type: String, required: true, ref: 'user' },
	orderId: { type: String, required: true, ref: 'payments' },
	adminReply: { adminId: { type: String, default: '', ref: 'user' } }
}]
```

- Sequelize tuong duong:

```js
Product.belongsTo(Brand, { foreignKey: 'brandId' });
Brand.hasMany(Product, { foreignKey: 'brandId' });
Product.belongsTo(ProductType, { foreignKey: 'productTypeId' });
ProductType.hasMany(Product, { foreignKey: 'productTypeId' });
```

- Ghi chu:
	- Mac-shop hien luu `brand` va `componentType` dang string, khong phai foreign key that su.

### 2.3 Cart (cart.model.js)

- Quan he chinh:
	- Cart <- User: n-1
	- Cart -> Product item: 1-n (moi cart co nhieu product item)
	- Cart <- Coupon: n-1 (tu chon)
- Mongoose ref trong du an:

```js
userId: { type: String, require: true, ref: 'user' }
product: [{ productId: { type: String, required: true, ref: 'product' }, quantity: { type: Number, required: true } }]
couponId: { type: String, default: null, ref: 'coupon' }
```

- Sequelize tuong duong:

```js
Cart.belongsTo(User, { foreignKey: 'userId' });
Cart.belongsTo(Coupon, { foreignKey: 'couponId' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });
```

### 2.4 Payments (payments.model.js)

- Quan he chinh:
	- Payments <- User: n-1
	- Payments <- Coupon: n-1 (tu chon)
	- Payments -> Product: n-n logic qua mang snapshot `products` va danh gia `productReviews`
	- Payments -> User (contact message): n-n logic qua `contactMessages[].senderId`
- Mongoose ref trong du an:

```js
userId: { type: String, require: true, ref: 'user' }
products: { type: Array, require: true, ref: 'cart' }
couponId: { type: String, default: null, ref: 'coupon' }
productReviews: [{ productId: { type: String, required: true, ref: 'product' } }]
contactMessages: [{ senderId: { type: String, required: true, ref: 'user' } }]
```

- Sequelize tuong duong:

```js
Payments.belongsTo(User, { foreignKey: 'userId' });
Payments.belongsTo(Coupon, { foreignKey: 'couponId' });
Payments.belongsToMany(Product, { through: 'payment_items', foreignKey: 'paymentId' });
```

- Ghi chu:
	- `statusOrder`: pending, completed, shipping, delivered, cancelled.
	- `typePayments`: COD, MOMO, VNPAY.

### 2.5 Brand (brand.model.js)

- Quan he chinh:
	- Brand -> Product: 1-n logic (theo ten brand trong `products.brand`)
- Mongoose hien trang:

```js
// products.model.js
brand: { type: String, required: true, trim: true }
```

- Sequelize tuong duong:

```js
Brand.hasMany(Product, { foreignKey: 'brandId' });
Product.belongsTo(Brand, { foreignKey: 'brandId' });
```

- Ghi chu:
	- Controller dang dong bo ten brand khi doi ten (`updateMany` tren products theo brand name).
	- Khong cho xoa brand neu con product dang su dung.

### 2.6 Coupon (coupon.model.js)

- Quan he chinh:
	- Coupon -> Cart: 1-n
	- Coupon -> Payments: 1-n
	- Coupon -> CouponUsage: 1-n
- Mongoose ref trong du an:

```js
// cart.model.js
couponId: { type: String, default: null, ref: 'coupon' }

// payments.model.js
couponId: { type: String, default: null, ref: 'coupon' }

// couponUsage.model.js
couponId: { type: String, required: true, ref: 'coupon' }
```

- Sequelize tuong duong:

```js
Coupon.hasMany(Cart, { foreignKey: 'couponId' });
Coupon.hasMany(Payments, { foreignKey: 'couponId' });
Coupon.hasMany(CouponUsage, { foreignKey: 'couponId' });
```

- Ghi chu:
	- Status co `ACTIVE/INACTIVE`.
	- Co usage limits: total/per-user va bo dem `usedCount`.

### 2.7 ProductType (productType.model.js)

- Quan he chinh:
	- ProductType -> Product: 1-n logic qua `products.componentType` so khop `productType.code`
- Mongoose hien trang:

```js
// products.model.js
componentType: { type: String, trim: true, lowercase: true, default: '' }

// productType.model.js
code: { type: String, required: true, unique: true, index: true }
```

- Sequelize tuong duong:

```js
ProductType.hasMany(Product, { foreignKey: 'productTypeId' });
Product.belongsTo(ProductType, { foreignKey: 'productTypeId' });
```

- Ghi chu:
	- `attributesTemplate` luu danh sach field dong.
	- Controller khong cho xoa product type neu da co product dang dung code do.

### 2.8 CouponUsage (couponUsage.model.js)

- Quan he chinh:
	- CouponUsage <- Coupon: n-1
	- CouponUsage <- User: n-1
	- CouponUsage <- Payments: n-1 logic qua `orderId`
- Mongoose ref trong du an:

```js
couponId: { type: String, required: true, ref: 'coupon' }
userId: { type: String, required: true, ref: 'user' }
orderId: { type: String, default: null, ref: 'payments' }
```

- Sequelize tuong duong:

```js
CouponUsage.belongsTo(Coupon, { foreignKey: 'couponId' });
CouponUsage.belongsTo(User, { foreignKey: 'userId' });
CouponUsage.belongsTo(Payments, { foreignKey: 'orderId' });
```

- Ghi chu:
	- Co index ket hop `{ couponId: 1, userId: 1 }` de toi uu tra cuu.

### 2.9 ApiKey (apiKey.model.js)

- Quan he chinh:
	- ApiKey <- User: n-1 trong schema, nhung business mong muon 1-1
- Mongoose ref trong du an:

```js
userId: { type: String, require: true, ref: 'user' }
```

- Sequelize tuong duong:

```js
ApiKey.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(ApiKey, { foreignKey: 'userId' });
```

- Ghi chu:
	- Neu muon bat buoc 1-1 that su, can them unique index cho `userId`.

### 2.10 OTP (otp.model.js)

- Quan he chinh:
	- OTP -> User: lien ket logic theo email
- Mongoose ref trong du an:

```js
email: { type: String, require: true, ref: 'user' }
time: { type: Date, default: Date.now(), index: { expires: 300 } }
```

- Sequelize tuong duong:

```js
Otp.belongsTo(User, { foreignKey: 'email', targetKey: 'email' });
```

- Ghi chu:
	- OTP tu dong het han sau 300 giay (TTL index).

### 2.11 ProductReview (embedded)

- Quan he chinh:
	- ProductReview <- User: n-1 qua `reviews.userId`
	- ProductReview <- Payments: n-1 qua `reviews.orderId`
	- ProductReview <- Product: n-1 qua `payments.productReviews.productId`
- Mongoose hien trang:

```js
// products.model.js
reviews: [{ userId: { ref: 'user' }, orderId: { ref: 'payments' }, ... }]

// payments.model.js
productReviews: [{ productId: { ref: 'product' }, ... }]
```

- Ghi chu:
	- Khong la model/collection doc lap.
	- Dang duoc nhung de de truy van theo ngu canh san pham va don hang.

## 3. ER Diagram (ASCII)

```text
										+----------------+
										|      User      |
										+---+---+---+----+
														|   |   |
					(1-1 logic)       |   |   | (1-n)
														|   |   +--------------------+
														|   |                        |
														v   v                        v
										+------+-----+              +----------+
										|   ApiKey   |              |   OTP    |
										+------------+              +----------+


			+----------------+      (1-n)      +----------------+
			|     Brand      | ----------------> |    Product     |
			+----------------+                   +----+-------+---+
						 (logic by product.brand string)    |       |
																				|       |
										 (1-n logic)          |       | (embedded)
			+----------------+ -----------------------+       v
			|  ProductType   |                           +-----------+
			+----------------+                           |  Reviews  |
					 (logic by code/componentType)          +-----+-----+
																				| (n-1)
																				v
																		+--------+
																		| User   |


	+--------+      (1-n)      +----------------+
	| User   | ----------------> |      Cart      |
	+--------+                   +--------+-------+
																				|
																				| (contains many productId)
																				v
																		+--------+
																		| Product|
																		+--------+
																				^
																				|
												(1-n optional)        |
	+--------+ -----------------------------+
	| Coupon |
	+--------+


	+--------+      (1-n)      +----------------+
	| User   | ----------------> |    Payments    |
	+--------+                   +----+-------+---+
																				|       |
								(1-n optional)|       | (n-n logic via products snapshot)
																				v       v
																		 +------+ +--------+
																		 |Coupon| |Product |
																		 +------+ +--------+


	+--------+      (1-n)      +----------------+
	| Coupon | ----------------> |  CouponUsage   |
	+--------+                   +--------+-------+
																				 ^
																				 |
												(1-n)       |
	+--------+ --------------------------+
	| User   |
	+--------+
```

## 4. Dac Diem Chinh

1. He thong dung Mongoose va tham chieu qua `ref`, khong dung Sequelize associations that su.
2. `User` la trung tam, lien ket voi ApiKey, Cart, Payments, CouponUsage va OTP.
3. `Coupon` di qua 3 luong quan trong: Cart, Payments, CouponUsage.
4. `Brand` va `ProductType` dang lien ket voi Product theo truong string (logic relation), khong phai foreign key ObjectId.
5. Product reviews dang duoc embed trong Product/Payments thay vi tach collection rieng.
6. Co mot so quan he duoc enforce bang controller (rename brand, chan xoa productType dang su dung) thay vi rang buoc schema.

## 5. Dinh Nghia Trong sync.js

Mac-shop hien tai khong co file `sync.js` trong model layer vi du an dung MongoDB + Mongoose.

Thay vao do, cac quan he duoc khai bao truc tiep trong schema qua `ref`:

- ApiKey <-> User: `apiKey.model.js` (`userId ref user`)
- Cart <-> User/Product/Coupon: `cart.model.js`
- Payments <-> User/Coupon/Product: `payments.model.js`
- CouponUsage <-> Coupon/User/Payments: `couponUsage.model.js`
- OTP <-> User (logic theo email): `otp.model.js`
- Brand <-> Product (logic): `brand.model.js` + `products.model.js` + `brands.controller.js`
- ProductType <-> Product (logic): `productType.model.js` + `products.model.js` + `productType.controller.js`

Neu can mot file `sync.js` giong web-pc, do se la tai lieu map quan he (document-only), khong can thiet cho Mongoose runtime.
