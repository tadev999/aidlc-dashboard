# User Stories & Acceptance Criteria

## US-01: Thanh toán qua Thẻ quốc tế (Visa/Mastercard)
**Là một** khách hàng đã chọn hàng,  
**Tôi muốn** nhập thông tin thẻ được mã hóa để thanh toán an toàn,  
**Để** hoàn tất đơn hàng nhanh chóng.

### Acceptance Criteria:
- Form thẻ sử dụng Stripe Elements (Client-side tokenization).
- Backend chỉ nhận token `pm_xxx`, không bao giờ nhận hay lưu số thẻ trực tiếp.
- Trả về mã lỗi thân thiện nếu thẻ hết hạn hoặc không đủ số dư.

---

## US-02: Thanh toán qua Quét mã QR (VNPay QR)
**Là một** khách hàng nội địa,  
**Tôi muốn** quét mã VietQR/VNPay từ app ngân hàng,  
**Để** thanh toán mà không cần nhập số thẻ.

### Acceptance Criteria:
- Sinh mã QR động tương ứng với mã đơn hàng và số tiền chính xác.
- Hết hạn thanh toán sau 15 phút.
- Lắng nghe Webhook IPN từ cổng thanh toán để tự động cập nhật trạng thái đơn hàng.
