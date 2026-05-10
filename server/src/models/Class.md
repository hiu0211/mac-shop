
# Class & Data Design — mac-shop (server/src/models)

Mục tiêu: cung cấp mô tả chi tiết các entity (Mongoose models) và bảng thiết kế dữ liệu (theo form STT / Tên trường / Kiểu dữ liệu / Độ dài / Mô tả) để một agent có thể sinh sơ đồ class/ER và SQL DDL.

Tổng quan hệ thống:
- Backend: Node.js + Express
- Database: MongoDB (Mongoose schemas). Trong bảng dưới đây, cột "Kiểu dữ liệu" ghi cả kiểu Mongo và gợi ý kiểu SQL tương ứng.

Hướng dẫn vẽ sơ đồ class/ER:
- Mỗi Mongoose model coi như một Entity class (box). Liệt kê fields bên trong box.
- Các embedded subdocuments (ví dụ: `product.colorOptions`, `product.reviews`, `cart.product`, `payments.products`) hiển thị dưới dạng composition (filled diamond) từ parent → subdoc (1→0..n).
- Các field có `ref` (ví dụ `userId`, `productId`, `couponId`) hiển thị là association (arrow) tới collection tham chiếu; thêm multiplicity khi xác định được (ví dụ user 1 → payments 0..n).
- Các controllers (ví dụ `ProductsController`) vẽ dưới dạng stereotype «service» với dependency arrows tới models chúng dùng.

---

## Model: user (collection `user`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId (Mongo) / CHAR(24) (SQL) | 24 | Khóa chính document (do Mongo tạo) |
| 2 | fullName | String / VARCHAR | 255 | Tên đầy đủ người dùng |
| 3 | email | String / VARCHAR | 255 | Email (unique nếu cần) |
| 4 | password | String / VARCHAR | 255 | Hash mật khẩu |
| 5 | phone | String / VARCHAR | 50 | Số điện thoại (lưu dưới dạng chuỗi) |
| 6 | isAdmin | Boolean / BOOLEAN | - | Cờ admin (true/false) |
| 7 | isActive | Boolean / BOOLEAN | - | Tài khoản có hoạt động |
| 8 | wishlist | Array<ObjectId> / JSON or relation | - | Danh sách product ids (ref `product`) |
| 9 | typeLogin | String / VARCHAR | 20 | 'email' hoặc 'google' |
|10 | createdAt | Date / TIMESTAMP | - | Tạo lúc |
|11 | updatedAt | Date / TIMESTAMP | - | Cập nhật lúc |

Quan hệ:
- `user._id` được tham chiếu bởi: `cart.userId`, `payments.userId`, `apikey.userId`, `coupon_usage.userId`, `otp.email` (theo email), `product.reviews.userId`, `payments.contactMessages.senderId`.

---

## Model: apikey (collection `apikey`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | userId | String(ObjectId) / CHAR(24) | 24 | Ref → `user._id` |
| 3 | publicKey | String / TEXT | 2048 | Khóa public của API key |
| 4 | privateKey | String / TEXT | 2048 | Khóa private (bảo mật) |
| 5 | createdAt | Date / TIMESTAMP | - | Thời gian tạo |
| 6 | updatedAt | Date / TIMESTAMP | - | Thời gian cập nhật |

Quan hệ:
- `apikey.userId` → `user._id` (1 user có thể có nhiều api keys).

---

## Model: brand (collection `brand`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | name | String / VARCHAR | 255 | Tên hãng |
| 3 | slug | String / VARCHAR | 255 | Chuỗi slug lowercase, unique, index |
| 4 | description | String / TEXT | - | Mô tả |
| 5 | isActive | Boolean / BOOLEAN | - | Flag kích hoạt |
| 6 | createdAt | Date / TIMESTAMP | - | |
| 7 | updatedAt | Date / TIMESTAMP | - | |

Quan hệ:
- `product.brand` lưu tên hãng (string). Controller cập nhật products khi brand.name thay đổi (không dùng ObjectId ref).

---

## Model: productType (collection `productType`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | code | String / VARCHAR | 100 | Mã loại (lowercase, unique, index) |
| 3 | name | String / VARCHAR | 255 | Tên loại |
| 4 | attributesTemplate | Array<subdoc> / JSON | - | Template thuộc tính động (mảng các object) |
| 5 | createdAt | Date / TIMESTAMP | - | |
| 6 | updatedAt | Date / TIMESTAMP | - | |

Subdocument `attributesTemplate` (mỗi phần tử):
| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | key | String / VARCHAR | 100 | Khóa thuộc tính (lowercase, match pattern) |
| 2 | label | String / VARCHAR | 255 | Nhãn hiển thị |
| 3 | inputType | String / VARCHAR | 20 | 'text'|'number'|'select' |
| 4 | required | Boolean / BOOLEAN | - | Bắt buộc hay không |
| 5 | placeholder | String / VARCHAR | 255 | Placeholder |
| 6 | options | Array<String> / JSON | - | Danh sách option (nếu select) |
| 7 | order | Number / INT | - | Vị trí sắp xếp |

Quan hệ:
- `product.componentType` map tới `productType.code` (liên kết logic, không phải ref DB).

---

## Model: product (collection `product`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | name | String / VARCHAR | 255 | Tên sản phẩm |
| 3 | brand | String / VARCHAR | 255 | Tên hãng (lưu chuỗi) |
| 4 | price | Number / DECIMAL(12,2) | - | Giá gốc |
| 5 | discount | Number / INT | - | Phần trăm giảm (0-100) |
| 6 | costPrice | Number / DECIMAL(12,2) | - | Giá vốn |
| 7 | priceDiscount | Number / DECIMAL(12,2) | - | Legacy: giá đã giảm |
| 8 | images | Array<String> / JSON | - | Mảng URL ảnh |
| 9 | stock | Number / INT | - | Số lượng tồn kho |
|10 | componentType | String / VARCHAR | 100 | Mã loại sản phẩm (maps to productType.code) |
|11 | attributes | Mixed / JSON | - | Thuộc tính động (object hoặc JSON) |
|12 | colorOptions | Array<subdoc> / JSON | - | Mảng color options (subdocs) |
|13 | reviews | Array<subdoc> / JSON | - | Mảng đánh giá (embedded subdocs) |
|14 | createdAt | Date / TIMESTAMP | - | |
|15 | updatedAt | Date / TIMESTAMP | - | |

Subdocument `colorOptions`:
| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | key | String | 100 | Key nội bộ, lowercase |
| 2 | name | String | 100 | Tên màu |
| 3 | image | String | 1024 | URL ảnh màu |
| 4 | price | Number / DECIMAL | - | Giá riêng cho màu (nếu khác) |
| 5 | isDefault | Boolean | - | Flag mặc định |

Subdocument `reviews`:
| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | userId | ObjectId / CHAR(24) | 24 | Ref → `user` |
| 2 | orderId | ObjectId / CHAR(24) | 24 | Ref → `payments` |
| 3 | rating | Number / INT | - | 1..5 |
| 4 | comment | String / TEXT | - | Nội dung đánh giá |
| 5 | images | Array<String> / JSON | - | Ảnh đánh giá |
| 6 | fullName | String / VARCHAR | 255 | Tên người đánh giá (snapshot) |
| 7 | adminReply | Object / JSON | - | { adminId, adminName, message, repliedAt } |
| 8 | createdAt | Date / TIMESTAMP | - | Thời điểm đánh giá |

Quan hệ:
- `product` tham chiếu bởi `cart.product[].productId` và `payments.products[].productId`.

---

## Model: cart (collection `cart`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | userId | ObjectId / CHAR(24) | 24 | Ref → `user` |
| 3 | product | Array<subdoc> / JSON | - | Mảng cart items (subdocs) |
| 4 | totalPrice | Number / DECIMAL(12,2) | - | Tổng giá (snapshot) |
| 5 | totalPriceAfterDiscount | Number / DECIMAL | - | Tổng sau áp dụng coupon |
| 6 | discountAmount | Number / DECIMAL | - | Tổng tiền giảm |
| 7 | couponId | ObjectId / CHAR(24) | 24 | Ref → `coupon` (nullable) |
| 8 | couponCode | String / VARCHAR | 100 | Mã coupon đang áp dụng |
| 9 | fullName | String / VARCHAR | 255 | Tên nhận hàng |
|10 | phone | String / VARCHAR | 50 | SĐT liên hệ |
|11 | address | String / TEXT | - | Địa chỉ giao hàng |
|12 | createdAt | Date / TIMESTAMP | - | |
|13 | updatedAt | Date / TIMESTAMP | - | |

Subdocument cart item (`cart.product[]`):
| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | productId | ObjectId / CHAR(24) | 24 | Ref → `product` |
| 2 | quantity | Number / INT | - | Số lượng |
| 3 | selectedColorKey | String | 100 | Key màu được chọn |
| 4 | selectedColorName | String | 100 | Tên màu |
| 5 | selectedColorHex | String | 20 | Mã màu (hex) |
| 6 | selectedColorImage | String | 1024 | Ảnh màu |
| 7 | unitPrice | Number / DECIMAL | - | Giá đơn vị snapshot |
| 8 | finalUnitPrice | Number / DECIMAL | - | Giá đơn vị sau discount snapshot |

Quan hệ:
- `cart.userId` → `user._id` (1 user thường có 0..1 cart theo logic app)

---

## Model: coupon (collection `coupon`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | code | String / VARCHAR | 100 | Mã coupon (uppercase, index) |
| 3 | type | String / VARCHAR | 10 | 'PERCENT' or 'FIXED' |
| 4 | value | Number / DECIMAL | - | Giá trị giảm (số hoặc %) |
| 5 | minOrderValue | Number / DECIMAL | - | Giá trị đơn tối thiểu để áp dụng |
| 6 | maxDiscount | Number / DECIMAL | - | Giảm tối đa (nếu percent) |
| 7 | totalUsageLimit | Number / INT | - | Tổng số lần có thể dùng |
| 8 | perUserUsageLimit | Number / INT | - | Số lần tối đa 1 user dùng |
| 9 | usedCount | Number / INT | - | Đếm đã dùng |
|10 | startAt | Date / TIMESTAMP | - | Bắt đầu áp dụng |
|11 | endAt | Date / TIMESTAMP | - | Kết thúc |
|12 | status | String / VARCHAR | 20 | 'ACTIVE' / 'INACTIVE' |
|13 | createdAt | Date / TIMESTAMP | - | |
|14 | updatedAt | Date / TIMESTAMP | - | |

Quan hệ:
- `coupon_usage.couponId` liên kết tới coupon; `cart.couponId` và `payments.couponId` tham chiếu tới coupon khi áp dụng.

---

## Model: coupon_usage (collection `coupon_usage`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | couponId | ObjectId / CHAR(24) | 24 | Ref → `coupon` |
| 3 | userId | ObjectId / CHAR(24) | 24 | Ref → `user` |
| 4 | orderId | ObjectId / CHAR(24) | 24 | Ref → `payments` (nullable) |
| 5 | usedAt | Date / TIMESTAMP | - | Thời điểm dùng coupon |
| 6 | discountAmount | Number / DECIMAL | - | Số tiền đã giảm |
| 7 | createdAt | Date / TIMESTAMP | - | |
| 8 | updatedAt | Date / TIMESTAMP | - | |

Index: composite index (couponId, userId) tồn tại trong schema.

---

## Model: otp (collection `otp`)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | email | String / VARCHAR | 255 | Email người dùng (ref theo giá trị email) |
| 3 | otp | String / VARCHAR | 255 | Hash OTP |
| 4 | time | Date / TIMESTAMP (TTL) | - | Thời gian sinh; TTL index expires: 300s |
| 5 | type | String / VARCHAR | 50 | Loại OTP (ví dụ 'forgot-password') |
| 6 | createdAt | Date / TIMESTAMP | - | |
| 7 | updatedAt | Date / TIMESTAMP | - | |

---

## Model: payments (collection `payments`) — (Đơn hàng)

| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | _id | ObjectId / CHAR(24) | 24 | PK |
| 2 | userId | ObjectId / CHAR(24) | 24 | Ref → `user` |
| 3 | products | Array<subdoc> / JSON | - | Mảng order lines (snapshot) |
| 4 | fullName | String / VARCHAR | 255 | Tên người nhận |
| 5 | phone | Number / BIGINT or VARCHAR | - | SĐT (schema dùng Number) |
| 6 | address | String / TEXT | - | Địa chỉ giao hàng |
| 7 | typePayments | String / VARCHAR | 20 | 'COD'|'MOMO'|'VNPAY' |
| 8 | statusOrder | String / VARCHAR | 20 | 'pending'|'completed'|'shipping'|'delivered'|'cancelled' |
| 9 | totalPrice | Number / DECIMAL(12,2) | - | Tổng đơn hàng (sau giảm) |
|10 | totalPriceBeforeDiscount | Number / DECIMAL | - | Tổng trước giảm |
|11 | discountAmount | Number / DECIMAL | - | Tổng tiền giảm |
|12 | couponId | ObjectId / CHAR(24) | 24 | Ref → `coupon` |
|13 | couponCode | String / VARCHAR | 100 | Mã coupon đã áp dụng |
|14 | productReviews | Array<subdoc> / JSON | - | Reviews ghi trong đơn (snapshot) |
|15 | contactMessages | Array<subdoc> / JSON | - | Tin nhắn liên hệ giữa user/admin |
|16 | createdAt | Date / TIMESTAMP | - | |
|17 | updatedAt | Date / TIMESTAMP | - | |

Subdocument `payments.products` (order line):
| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | productId | ObjectId / CHAR(24) | 24 | Ref → `product` |
| 2 | quantity | Number / INT | - | Số lượng |
| 3 | selectedColorKey | String | 100 | Key màu |
| 4 | selectedColorName | String | 100 | Tên màu |
| 5 | selectedColorHex | String | 20 | Mã màu |
| 6 | selectedColorImage | String | 1024 | Ảnh màu |
| 7 | unitPrice | Number / DECIMAL | - | Giá đơn vị (snapshot) |

Subdocument `contactMessages`:
| STT | Tên trường | Kiểu dữ liệu | Độ dài | Mô tả |
|-----|------------|--------------|--------|-------|
| 1 | senderType | String | 10 | 'user'|'admin' |
| 2 | senderId | ObjectId / CHAR(24) | 24 | Ref → `user` |
| 3 | senderName | String | 255 | Tên người gửi |
| 4 | message | String / TEXT | - | Nội dung |
| 5 | createdAt | Date / TIMESTAMP | - | Thời điểm gửi |

Quan hệ:
- `payments.userId` → `user._id` (1 user nhiều đơn hàng)
- `payments.products[].productId` → `product._id`

---

## Controllers (tóm tắt) — dùng để vẽ phần service/logic layer trong class diagram
- `BrandsController` — create/get/update/delete brand; cập nhật `product.brand` khi brand đổi.
- `ProductsController` — CRUD sản phẩm, upload ảnh (cloudinary), format output, search/filter.
- `CartController` — add/get/update/delete cart items, tính toán giá snapshot, áp coupon (dùng `couponService`).
- `CouponsController` — CRUD coupon, validate/apply/remove coupon, ghi `coupon_usage`.
- `PaymentsController` — xử lý thanh toán (COD, VNPAY), tạo order (`payments`), xử lý callback VNPAY, quản lý reviews & contact messages.
- `ProductTypeController` — CRUD productType, validate attributesTemplate.
- `RevenueController` — thống kê doanh thu (dùng `payments`, `product`, `user`).
- `UsersController` — auth/register/login/refresh/logout, manage users, API keys, OTP.
- `WishlistController` — quản lý wishlist (lưu trong `user.wishlist`).

---

Gợi ý tiếp theo (tùy bạn chọn agent thực hiện):
- Sinh sơ đồ Mermaid class/ER dựa trên các entity và quan hệ ở trên.
- Sinh SQL DDL (MySQL / Postgres) mapping từ các bảng đã mô tả.
- Nếu cần, tôi sẽ xuất file Mermaid hoặc SQL và/hoặc vẽ sơ đồ tự động.


