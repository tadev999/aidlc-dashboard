# Thiết Kế Kiến Trúc Module Thanh Toán

## Sơ đồ luồng xử lý (Payment Flow)
1. Frontend gửi yêu cầu tạo phiên thanh toán `POST /api/v1/payments/intent`.
2. Payment Service sinh mã giao dịch duy nhất kèm `Idempotency-Key`.
3. Gọi cổng thanh toán (Stripe/VNPay) để lấy Client Secret hoặc QR Payload.
4. Client hoàn tất xác thực (3D-Secure nếu có).
5. Webhook nhận kết quả từ Gateway, xác minh chữ ký RSA/HMAC, cập nhật trạng thái đơn hàng và gửi Email biên nhận.

## Bảo mật & Phòng chống Gian lận
- Xác thực chữ ký Webhook bắt buộc (HMAC SHA-256).
- Rate limit tối đa 10 yêu cầu/phút trên mỗi tài khoản.
- Mã hóa toàn bộ dữ liệu nhạy cảm trên đường truyền (TLS 1.3) và trong cơ sở dữ liệu (AES-256).
