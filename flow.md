# mac-shop — Luồng hoạt động hệ thống (Chi tiết để vẽ sơ đồ)

Tài liệu này mô tả các luồng nghiệp vụ chính của hệ thống `mac-shop` ở mức đủ chi tiết để bạn vẽ sơ đồ sequence/architecture (frontend, backend, DB, dịch vụ thứ ba).

## 1. Kiến trúc tổng quan
- Frontend (Browser): React + Vite (thư mục `client/`). Axios wrapper: `client/src/Config/request.jsx`.
- Backend: Express + Mongoose (thư mục `server/`). Controllers ở `server/src/controllers/`, middleware auth ở `server/src/auth/checkAuth.js`.
- Database: MongoDB (collections: users, products, cart, orders, payments, coupons, productType, couponUsage...).
- Media: Cloudinary (upload hình ảnh).
- Payment Gateway: VNPay (redirect + IPN/callback).
- Email: Nodemailer (gửi xác nhận, reset password).
- AI: Google Generative API (Chatbot).
- Optional: Redis (cache/OTP), socket server (realtime updates).

---

## 2. Luồng chính (mô tả chi tiết từng bước)

### A. Duyệt & tìm kiếm sản phẩm (Browse/Search)
- Actors: Visitor → Browser → React client → Server → MongoDB.
- Steps:
	1. Browser tải bundle React (index.html, JS).
	2. Client gọi GET `/api/products` hoặc `/api/products/search?q=...&page=...`.
	3. Server (products.controller) nhận query, build Mongoose query (text search, filters, price range) và áp dụng giá sau discount (price * (1 - discount/100)).
	4. MongoDB trả kết quả; server populate brand/productType nếu cần; trả JSON về client.
	5. Client render danh sách, phân trang, lazy-load ảnh (Cloudinary URLs).
- Endpoints gợi ý: `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`.

### B. Xem chi tiết sản phẩm
- Steps:
	1. Client gọi `GET /api/products/:id`.
	2. Server tìm product, populate `productType` (attributesTemplate), tính giá sau giảm, trả chi tiết product + gallery hình ảnh (Cloudinary).
	3. Client hiển thị thuộc tính động (theo template), biến thể, nút `Add to Cart`.

### C. Thêm vào giỏ hàng & quản lý cart
- Flows:
	- Nếu user logged-in: `POST /api/cart` để thêm/merge item vào collection `cart` theo `userId`.
	- Nếu guest: lưu localStorage và đồng bộ khi login/checkout.
	- Lấy cart: `GET /api/cart` — server trả items + totals (tính bằng discounted price).

### D. Áp dụng coupon
- Steps:
	1. Client gửi `POST /api/cart/apply-coupon { code }`.
	2. `couponService` kiểm tra: tồn tại, status = ACTIVE, `endAt > now`, usage limit chưa vượt.
	3. Tính amount giảm (percent hoặc fixed), cập nhật cart, trả totals mới.
	4. Remove coupon: `POST /api/cart/remove-coupon`.

### E. Thanh toán (Checkout) — VNPay (chi tiết)
- Mô tả tổng quan: Partial checkout (chỉ selectedCartIds) → tạo Payment record (PENDING) → redirect VNPay → VNPay callback/IPN → verify → update Payment + tạo Order → giảm stock → xóa cart items → gửi email.
- Steps chi tiết:
	1. Client gửi `POST /api/cart/checkout` với `{ selectedCartIds, shipping, paymentMethod }`.
	2. Server validate stock & prices, tính tổng cuối cùng, tạo `Payment` record (status = PENDING), lưu `selectedCartIds` vào payment/extraData.
	3. Nếu `paymentMethod = VNPay`: server tạo URL VNPay (vnpay helper) và trả URL cho client.
	4. Client redirect người dùng đến VNPay để thanh toán.
	5. VNPay sau khi xử lý:
		 - Return URL (user-redirect): VNPay redirect user về `returnUrl` (hiển thị kết quả), nhưng cần xử lý IPN để xác nhận giao dịch.
		 - IPN/Notify (server-to-server): VNPay gửi notify/IPN tới endpoint `POST /api/payments/vnpay-ipn` (hoặc tương tự). Server verify chữ ký (hash) và trạng thái.
	6. Nếu verify thành công & trạng thái thanh toán OK: server cập nhật `Payment.status = PAID`, tạo `Order` chính thức, giảm `product.stock`, xóa items tương ứng khỏi `cart`, ghi lịch sử thanh toán, gửi email xác nhận.
	7. Nếu thất bại: update `Payment.status = FAILED`, trả thông báo cho client/admin.
- Endpoints gợi ý: `POST /api/cart/checkout`, `POST /api/payments/vnpay-ipn`, `GET /api/payments/vnpay-return`.

### F. Authentication (Đăng ký / Đăng nhập / OTP / Reset)
- Đăng ký: `POST /api/auth/register` → hash password (bcrypt) → create user → optional email confirm.
- Đăng nhập password: `POST /api/auth/login` → verify → issue JWT (RS256) → trả token (và set cookie nếu cần).
- OTP login flow:
	1. `POST /api/auth/request-otp { phone|email }` → server sinh OTP, hash lưu DB/Redis + TTL, gửi OTP qua email/SMS.
	2. `POST /api/auth/verify-otp { identifier, otp }` → server verify hash → issue JWT.
- Reset password: `POST /api/auth/forgot` → gửi link/token reset qua email.
- Middleware `checkAuth` đọc token từ `Authorization: Bearer` hoặc cookie; `authAdmin` kiểm tra role.

### G. Quản trị (Admin) & Phân hệ Quản lý Chi tiết (Admin Subsystems)
Tất cả các endpoint Admin được bảo vệ bởi middleware `checkAuth` + `authAdmin`. Dưới đây là luồng hoạt động của 12 phân hệ quản trị chính:

1. **Quản lý Hãng sản xuất (`Brand Management`)**:
   - `GET /api/admin/brands` → Lấy danh sách hãng.
   - `POST /api/admin/brands` & `PUT /api/admin/brands` → Tạo/sửa hãng, sinh slug tự động, upload logo lên Cloudinary folder `mac-shop/brands`. Tên hãng thay đổi sẽ kích hoạt **Cascade Update** cập nhật tất cả sản phẩm liên quan (`modelProduct.updateMany`).
   - `DELETE /api/admin/brands?id=...` → Xóa hãng. Kiểm tra guard rule `modelProduct.exists({ brand })` — chặn xóa nếu đang có sản phẩm liên kết.

2. **Quản lý Danh mục (`Category Management`)**:
   - `GET /api/categories?page=...&limit=...&search=...` → Lấy danh mục phân trang server-side kèm tìm kiếm debounce 300ms.
   - `POST /api/categories` & `PUT /api/categories/:id` → Tạo/sửa danh mục, đọc ảnh Base64 qua FileReader.
   - `DELETE /api/categories/:id` → Guard rule: Chặn xóa nếu `modelProduct.exists({ category: slug })` trả về `true`.

3. **Quản lý Mã giảm giá (`Coupon Management`)**:
   - `GET /api/admin/coupons` → Lấy danh sách Voucher.
   - `POST /api/admin/coupons` & `PUT /api/admin/coupons` → Thêm/sửa mã Voucher (PERCENT hoặc FIXED), cài đặt khoảng ngày `startAt` - `endAt`, hạn mức tổng `totalUsageLimit` và hạn mức/user `perUserUsageLimit`.
   - `PATCH /api/admin/coupons/status` → Bật/Tắt tức thì trạng thái `ACTIVE` / `INACTIVE`.
   - `DELETE /api/admin/coupons?id=...` → Xóa Voucher.

4. **Báo cáo Thống kê Doanh thu (`Dashboard & Analytics`)**:
   - `GET /api/get-admin-stats` → Trả về KPI Cards: Tổng users, Tổng sản phẩm, Tổng đơn hàng, Tổng doanh thu thành công.
   - `GET /api/revenue/statistics?startDate=...&endDate=...&groupBy=...` → Thống kê Doanh thu gộp (`total_revenue`), Giá vốn hàng bán (`cost_of_goods`), Lợi nhuận gộp (`gross_profit`) và Tỉ suất lợi nhuận (`profit_margin`) theo đơn hàng trạng thái `delivered`. Vẽ biểu đồ Line/Doughnut Chart (Chart.js).

5. **Quản lý Khuyến mãi (`Flash Sale Management`)**:
   - `GET /api/admin/flash-sales` → Lấy danh sách các đợt Flash Sale kèm trạng thái real-time (`UPCOMING`, `ACTIVE`, `SOLD_OUT`, `EXPIRED`, `INACTIVE`).
   - `POST /api/admin/flash-sales` & `PUT /api/admin/flash-sales/:id` → Cấu hình giá sale (`flashSalePrice < price`) và số lượng suất mở bán (`quantity`).
   - Integration: Khi mua hàng, giá Flash Sale được ưu tiên tuyệt đối. Vòng đời đơn hàng tự động tăng `soldQuantity` khi đặt hàng thành công và giảm `soldQuantity` khi hủy đơn.

6. **Quản lý Loại sản phẩm & Mẫu thuộc tính (`ProductType & Schema Engine`)**:
   - `GET /api/admin/product-types` → Lấy danh sách loại sản phẩm kèm mảng mẫu thuộc tính (`attributesTemplate`).
   - `POST /api/admin/product-types` & `PUT /api/admin/product-types/:id` → Thiết kế mẫu thông số kỹ thuật động (key, label, type: text/number/select/boolean, unit, options).
   - `DELETE /api/admin/product-types/:id` → Chặn xóa nếu còn sản phẩm dùng `componentType === code`.

7. **Quản lý Tin nhắn Đơn hàng (`Message Management`)**:
   - `GET /api/get-order-admin` → Lọc các đơn hàng có `contactMessages.length > 0`.
   - `POST /api/order-contact-reply` → Admin phản hồi tin nhắn 2 chiều trực tiếp trong Modal Chat đơn hàng.
   - `DELETE /api/order-contact-message` → Xóa tin nhắn rác/vi phạm bằng toán tử `$pull`.

8. **Quản lý Đơn hàng (`Order Management`)**:
   - `GET /api/get-order-admin` → Danh sách đơn hàng kèm lọc trạng thái và hiển thị Tag VIP.
   - `POST /api/update-status-order` → Chuyển trạng thái đơn. Khi đơn sang `delivered`, gọi `vipTierService.updateCustomerTier` để tích lũy doanh số năm và nâng hạng VIP (`tierCounted = true`). Nếu rời `delivered`, gọi `revertCustomerTier` hoàn tác chi tiêu.
   - `POST /api/create-user-from-order` → Tự tạo tài khoản mới từ đơn vãng lai, sinh mật khẩu ngẫu nhiên và gửi mail cho khách.

9. **Quản lý Sản phẩm (`Product Management & UpsertProduct`)**:
   - `GET /api/all-product` → Danh sách sản phẩm kèm bộ lọc Hãng/Loại/Danh mục.
   - `POST /api/add-product` & `POST /api/edit-product` → Form động tự sinh ô input thông số kỹ thuật theo `attributesTemplate` của `ProductType`. BE validate qua `normalizeSpecificationsByTemplate`.
   - Luồng Duplicate Product: Copy dữ liệu sản phẩm cũ, xóa `_id` để tạo nhanh sản phẩm tương tự.

10. **Quản lý Đánh giá & Phản hồi (`Review Management`)**:
    - `GET /api/admin/reviews` → Flatten toàn bộ mảng `reviews` từ tất cả sản phẩm thành bảng danh sách duy nhất.
    - `POST /api/admin/reviews/reply` → Trả lời/sửa phản hồi của Admin (`adminReply`) hiển thị trực tiếp trên trang Chi tiết sản phẩm.
    - `DELETE /api/admin/reviews` → Xóa đánh giá bằng `$pull`.

11. **Quản lý Người dùng & Phân quyền (`User Management`)**:
    - `GET /api/get-all-users` → Bảng tài khoản, hiển thị Hạng VIP, Chi tiêu năm, quyền Admin và trạng thái.
    - `PATCH /api/update-user-role` & `PATCH /api/update-user-status` → Phân quyền Admin / Khóa tài khoản. Cờ bảo vệ ngăn Admin tự hạ quyền hoặc tự khóa tài khoản của chính mình (`isCurrentUserSelected`).
    - `POST /api/admin/create-user` → Tạo tài khoản Admin/User mới với validate SĐT VN.

12. **Quản lý Bậc hạng VIP (`VipTier Management`)**:
    - `GET /api/admin/vip-tiers` → Tự động seed 5 bậc mặc định (`none`, `dong`, `bac`, `vang`, `kimcuong`) nếu bảng rỗng.
    - `POST /api/admin/vip-tiers` & `PUT /api/admin/vip-tiers/:id` → Cấu hình mức chi tiêu tối thiểu năm (`minSpending`), % chiết khấu (`discountRate`) và bảng màu Hex Palette.
    - `DELETE /api/admin/vip-tiers/:id` → Không thể xóa hạng `'none'`. Khi xóa tier khác, tự động chuyển toàn bộ user thuộc tier đó về `'none'`.

---

### H. Chatbot AI
- Flow:
	1. Client gửi `POST /api/ai/chat { sessionId, message }`.
	2. Server forward tới Google Generative / Chatbot util và nhận phản hồi.
	3. Server trả response cho client; có thể lưu conversation vào DB.

### I. Quản lý đơn hàng (Order lifecycle)
- Trạng thái phổ biến: CREATED / PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED → CANCELLED / REFUNDED.
- Trạng thái chuyển đổi bởi: payment confirmation, admin actions, shipping update, refund.

### J. Webhook, Cron, Background jobs
- IPN từ VNPay → update payment (asynchronous).
- Cron job / scheduled task: mark coupon expired (`endAt < now`) thành INACTIVE.
- Background job: gửi email, generate invoice PDF, reconcile payments.

### K. Xử lý lỗi & logging
- Server trả chuẩn hóa `ErrorResponse` (core classes), client hiển thị toast/alert.
- Retry idempotent operations; log đầy đủ cho payment/callback.

---

## 3. Các sequence mẫu (dùng để vẽ sơ đồ nhanh)

- Sequence A — Checkout → VNPay → Callback:
	1. Client POST `/api/cart/checkout` → Server: create Payment (PENDING) → return VNPay URL.
	2. Client redirect → VNPay (user nhập thông tin) → VNPay trả về `returnUrl` và gửi IPN.
	3. Server nhận IPN → verify signature → nếu OK: Payment → PAID; create Order; giảm stock; send email.

- Sequence B — OTP login:
	1. Client POST `/api/auth/request-otp` → Server generate OTP, send email/SMS.
	2. Client POST `/api/auth/verify-otp` with OTP → Server verify → issue JWT.

- Sequence C — Admin upload & create product:
	1. Admin UI POST `/api/uploads` (file) → Server upload Cloudinary → return `secure_url`.
	2. Admin POST `/api/products` with image URLs → Server validate productType attributes → save product.

---

## 4. Ghi chú khi vẽ sơ đồ
- Vẽ các hộp chính: Browser (Client), API Server (Express), MongoDB, Cloudinary, VNPay, Email provider, Google AI.
- Dùng mũi tên thẳng cho HTTP sync requests; dùng mũi tên đứt đoạn cho async callbacks (VNPay IPN, email gửi, webhook).
- Gắn nhãn lên mũi tên: endpoint + payload tóm tắt (ví dụ `POST /api/cart/checkout {selectedCartIds, shipping}`).
- Đánh dấu các thay đổi trạng thái ở DB (Payment.status, Order.status, Product.stock) khi vẽ sequence.

## 5. Tệp tham khảo để tra endpoint / controller
- `server/src/controllers/` (các controllers chính: products.controller, cart.controller, payments.controller, auth.controller)
- `server/src/auth/checkAuth.js` (middleware auth)
- `client/src/Config/request.jsx` (axios wrapper + interceptors)
- `client/src/store/Provider.jsx` (quản lý selectedCartIds)

---

Nếu bạn muốn, tôi có thể chuyển một luồng cụ thể thành sơ đồ mermaid hoặc PlantUML (ví dụ: Checkout→VNPay hoặc OTP login). Chỉ chọn luồng nào bạn muốn vẽ trước.

## 6. Bổ sung chi tiết để vẽ Flowchart & Activity Diagram

6.1 Swimlanes đề xuất
- User (Browser)
- Frontend (React)
- API Server (Express)
- Background Worker / Cron
- Database (MongoDB)
- Payment Gateway (VNPay)
- Media Service (Cloudinary)
- Email/SMS Provider
- Cache/OTP Store (Redis)

6.2 Ký hiệu & quy ước khi vẽ
- Start/End: vòng tròn; Process: hộp chữ nhật (ghi endpoint hoặc hành động); Decision: kim cương (ghi điều kiện guard); DB: hình trụ; External service: biểu tượng đám mây; Async callback/webhook: mũi tên đứt nét.
- Ghi rõ endpoint và payload tóm tắt trên mũi tên, và đánh số bước để dễ tham chiếu.

6.3 Các decision points bắt buộc (hãy hiện rõ trên sơ đồ)
- Kiểm tra `stock >= requestedQty` → nếu NO: hiển thị lỗi & abort.
- Coupon hợp lệ? (active + not expired + usage limit còn) → nếu NO: báo lỗi hoặc ignore coupon.
- Payment method = VNPay? → phân nhánh sync (redirect) vs offline/other.
- IPN signature valid? → nếu NO: giữ payment PENDING, log, retry/alert.
- Idempotency key tồn tại? → tránh duplicate order/payment.

6.4 Luồng Checkout (chi tiết cho activity diagram)
- Bắt đầu → Validate Cart Items (stock & prices)
	- Nếu fail → Show error → End.
	- Nếu ok → Create `Payment` (status=PENDING, store `selectedCartIds`, idempotencyKey)
	- Nếu paymentMethod = VNPay → Build VNPay URL → Respond URL → Client redirect → VNPay xử lý (user-facing)
	- VNPay gửi IPN (async) → Server verify signature
			• Nếu verify OK & code success → Update Payment = PAID → Create `Order` → Reduce stock (transaction/atomic) → Delete cart items → Publish event `order.created` → Send email invoice → End.
			• Nếu verify FAIL → Log + Retry policy → After retries or TTL expire -> Payment = FAILED/CANCELLED -> Notify user/admin.
	- Nếu user trở lại trên `returnUrl` trước IPN → hiển thị trạng thái tạm thời (PENDING) kèm hướng dẫn.

6.5 Activity cho OTP login
- Request OTP → Server generate OTP & save hash (Redis/DB) with TTL → Send OTP via Email/SMS → User nhập OTP → Server verify → If OK issue JWT & create session → Else retry/lock after N attempts.

6.6 Order state machine (thể hiện bằng state diagram hoặc activity)
- States: CREATED → PENDING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED
- Transitions / Events:
	- checkout_initiated -> PENDING_PAYMENT
	- payment_confirmed -> PAID
	- admin_start_fulfillment -> PROCESSING
	- carrier_mark_shipped -> SHIPPED
	- delivery_confirmed -> DELIVERED
	- cancel_requested -> CANCELLED (allowed from CREATED/PENDING/PROCESSING depending policy)

6.7 Mẫu payload (gợi ý để ghi trên mũi tên sơ đồ)
- POST /api/cart/checkout
	{
		"selectedCartIds": ["cid1","cid2"],
		"shipping": {"name":"Nguyen A","address":"...","phone":"..."},
		"paymentMethod": "VNPay",
		"idempotencyKey": "uuid-v4"
	}
- Payment record (example):
	{
		"_id": "pay_abc",
		"userId": "usr_123",
		"amount": 1250000,
		"currency": "VND",
		"status": "PENDING",
		"extraData": {"selectedCartIds": [...], "idempotencyKey": "..."}
	}
- VNPay IPN (tóm tắt): `vnp_TxnRef`, `vnp_Amount`, `vnp_ResponseCode`, `vnp_SecureHash`.

6.8 Idempotency, timeouts & retry policies (ghi rõ trên sơ đồ như annotations)
- Sử dụng `idempotencyKey` cho endpoint checkout để tránh tạo nhiều payment/order khi client retry.
- Payment PENDING TTL: đề xuất 30–60 phút; sau TTL, background job cancel payment và release reserved stock.
- Webhook retry: nếu signature hoặc xử lý thất bại, log và retry theo exponential backoff; alert admin nếu quá nhiều lỗi.

6.9 Phạm vi sơ đồ đề xuất (giúp chia độ phức tạp)
- Sơ đồ A (Overview Architecture): thành phần hệ thống và luồng HTTP cơ bản.
- Sơ đồ B (Checkout Sequence): sequence-detail giữa Browser → Server → VNPay → IPN → DB.
- Sơ đồ C (Order Lifecycle): state machine cho order.

---

Nếu bạn muốn, tôi sẽ ngay lập tức chuyển `Sequence A — Checkout` thành sơ đồ mermaid chi tiết kèm swimlanes, hoặc dựng PlantUML. Chọn 1 trong: `Checkout (VNPay)`, `OTP login`, `Admin upload product`, hoặc `Order lifecycle`.

## 7. Luồng tương tác người dùng — chi tiết (dùng để vẽ Activity Diagram)

Phần này mô tả chi tiết từng bước mà người dùng tương tác trực tiếp với hệ thống, gồm hành động UI, endpoint gọi, quyết định (decision points), và phản hồi dự kiến. Dùng phần này để vẽ activity diagram với swimlanes: User, Frontend, API Server, Background Worker, Database, External Services.

### 7.1 Onboarding: Đăng ký / Xác thực / Đăng nhập
- User action: mở trang Register → điền form → nhấn `Đăng ký`.
	- Frontend: validate client-side, POST `/api/auth/register {name,email,password}`.
	- Server: validate, tạo user (status = UNVERIFIED or ACTIVE), hash password, tạo emailToken nếu cần, gửi email xác thực.
	- Response: 201 Created + message. UI: show check-email notice.
	- Decision: email tồn tại? → 400 `email_exists` (hiển thị lỗi).
- Email verify:
	- User click link `GET /api/auth/verify-email?token=...` → Server verify token → set user.status = ACTIVE → optional redirect login.
- Login (password):
	- POST `/api/auth/login {email,password}` → Server verify → issue JWT (in response or set httpOnly cookie) + user profile.
	- Decision: credentials invalid → 401; account locked → 423.
- Logout:
	- Frontend clear token (and call `POST /api/auth/logout` nếu server lưu session).
- OTP flow (alternate): request OTP `POST /api/auth/request-otp` → server store OTP hash in Redis/DB with TTL → send SMS/email → user submit OTP `POST /api/auth/verify-otp` → server verify → issue JWT.

### 7.2 Duyệt & Tìm kiếm sản phẩm (UI interactions)
- User types search / applies filters / sorts.
	- Frontend debounces input, calls `GET /api/products?q=...&category=...&page=...&sort=...`.
	- Server returns `{items, total, page, perPage}` with discounted price fields (`finalPrice`).
	- Frontend: render results, show skeleton while loading, show suggestion if no results.
	- Decision: result size > X → switch to server-side pagination/infinite scroll.

### 7.3 Xem chi tiết sản phẩm
- User clicks product → Frontend `GET /api/products/:id`.
	- Server returns product detail + `attributesTemplate`, `variants[]`, `stock`, `gallery[]`, `finalPrice`.
	- Frontend renders dynamic attributes per template, variant selector, stock badge (In stock / Out of stock / Low stock).
	- Decision: `stock === 0` → disable `Add to Cart` and show `Notify me` option.

### 7.4 Thêm vào giỏ hàng (Guest vs Logged-in)
- Guest flow:
	- Action: click `Add to Cart` → Frontend update localStorage `guestCart` (shape: [{productId,variantId,qty,timestamp}]) → optimistic UI.
	- When user later logs in: Frontend POST `/api/cart/merge` with guest items → Server merge (dedupe by product+variant) → return merged cart.
- Logged-in flow:
	- Action: click `Add to Cart` → Frontend POST `/api/cart {productId,variantId,qty}`.
	- Server validate stock, create/update cart item linked to `userId`, return updated cart.
	- UI: show toast success; on failure show server error and rollback optimistic change.
- Update quantity: PATCH `/api/cart/:itemId {qty}` → server validate maxQty, return updated item/totals.
- Remove item: DELETE `/api/cart/:itemId` → server remove and return new totals.

### 7.5 Áp coupon & Tính toán tổng
- Client POST `/api/cart/apply-coupon {code}` → Server `couponService` validate (active, not expired, minValue, usageLimit) → if OK compute `discountAmount` and `newTotals` → return updated cart totals.
	- Decision: coupon invalid → 400 + message.

### 7.6 Checkout (chi tiết cho Activity Diagram — user-facing steps)
- Pre-check on client: ensure `selectedCartIds` present, shipping address valid, payment method chosen.
- Request: POST `/api/cart/checkout` payload:
	{
		"selectedCartIds": ["cid1","cid2"],
		"shipping": {"name":"Nguyen A","address":"...","phone":"..."},
		"paymentMethod": "VNPay",
		"idempotencyKey": "uuid-v4"
	}
- Server actions (atomic/semi-atomic):
	1. Validate idempotencyKey (if exists, return existing Payment/Order status to avoid duplicates).
	2. Fetch cart items, re-calc prices (apply discount), validate `stock >= qty` for each item.
		 - If any fail → return 409 with `insufficient_stock` and list of items.
	3. Reserve stock or decrement `available` with a reservation record (store reservation TTL).
	4. Create `Payment` document (status = PENDING) with `extraData` (selectedCartIds, idempotencyKey, userId, shipping, totals).
	5. If `paymentMethod = VNPay` → build VNPay payment URL and return `{paymentUrl}` to client. If COD or offline → create `Order` (status = CREATED) and return order summary.
- Frontend: redirect user to VNPay paymentUrl or show order confirmation for offline payment.

### 7.7 Payment callback (VNPay IPN/Return) → Order creation
- IPN endpoint: `POST /api/payments/vnpay-ipn` (server-to-server)
	- Server verify `vnp_SecureHash` and `vnp_ResponseCode`.
	- Find `Payment` by `vnp_TxnRef` or `idempotencyKey`.
	- Decision: Payment already PAID? → idempotent response (200 OK, ignore duplicate).
	- If valid & success:
		 1. Update `Payment.status = PAID`.
		 2. Create `Order` from `Payment.extraData` (items, shipping, totals).
		 3. Commit stock decrement permanently (ensure atomicity/transaction); remove `cart` items.
		 4. Publish `order.created` event to Background Worker (for email, invoice generation, analytics).
		 5. Send confirmation email to user.
	- If signature invalid or failure: log, set `Payment.status = FAILED` or leave PENDING for retries, alert admin if repeated.
- Return URL (user redirect): `GET /api/payments/vnpay-return` shows user-friendly status: SUCCESS / PENDING / FAILED (based on Payment record).

### 7.8 Theo dõi đơn hàng & Notifications
- User UI: `GET /api/orders` paginated and `GET /api/orders/:id`.
- Order contains `history[]` with timestamped transitions.
- Real-time: WebSocket/SSE subscription `ws://.../orders` or push notification when `order.created`, `order.shipped`, `order.delivered`.

### 7.9 Hủy đơn / Trả hàng / Hoàn tiền
- Cancel request:
	- Allowed windows: CREATED or PENDING_PAYMENT or PROCESSING (configurable).
	- Client POST `/api/orders/:id/cancel` → Server check order state, if allowed set `status = CANCELLED` and if Payment.PAID initiate refund flow.
- Return & refund:
	- Client POST `/api/orders/:id/returns {items,reason}` → create `ReturnRequest` (status = PENDING) → Admin approve → process refund (call VNPay refund API or record manual refund) → Update `Order` and `Payment`.

### 7.10 Wishlist & Compare
- Wishlist (persisted for logged-in): POST `/api/wishlist {productId}`; GET `/api/wishlist`.
- Guest wishlist stored in localStorage; prompt login to save.
- Compare: frontend-only list (limit 3–4 items) + optional server-saved comparison via `POST /api/compare`.

### 7.11 Build PC (flow người dùng tương tác)
- User selects components via UI component filters.
	- For each selection, client validates compatibility (basic rules) and updates total price (sum of `finalPrice`).
	- Save configuration: POST `/api/builds {name,components:[{productId,componentType}],notes}`.
	- Add whole build to cart: POST `/api/cart` with `bundle` payload representing build items.

### 7.12 Tài khoản & Hồ sơ người dùng
- Update profile: PUT `/api/users/me {name,phone}` → returns updated profile.
- Manage addresses: CRUD endpoints `/api/users/addresses`.
- Change password: POST `/api/auth/change-password {currentPassword,newPassword}` → validate current first.

### 7.13 Email / In-app notifications (user-facing)
- Events that trigger notifications: account verification, order confirmation, shipping update, refund processed, coupon applied/expired.
- Email template keys: {{user.name}}, {{order.id}}, {{order.total}}, {{shipment.tracking}}.

### 7.14 Quy ước khi vẽ Activity Diagram cho từng luồng
- Swimlanes: đặt các actions tương ứng vào lanes: User, Frontend, API, DB, External Services.
- Ghi decision points: stock check, coupon validity, payment method, payment verify.
- Ghi idempotencyKey và reservation TTL như annotation gần bước `checkout`.
- Với VNPay: mô tả rõ hai luồng song song — user-redirect (synchronous) và IPN (asynchronous) — vẽ IPN bằng mũi tên đứt nét.

---

Phần trên đã hoàn thiện chi tiết các luồng tương tác người dùng để bạn vẽ activity diagram hoặc flow chart. Tôi đã cập nhật các endpoint, payload mẫu, decision points, và nơi cần annotates idempotency và retry.



