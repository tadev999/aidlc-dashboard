const fs = require('fs');
const path = require('path');

function createSampleAidlcStructure(workspaceRoot) {
  const aidlcDir = path.join(workspaceRoot, 'aidlc');
  const spaceDir = path.join(aidlcDir, 'spaces', 'ecommerce-core');
  const intentId = '261105-payment-checkout';
  const intentDir = path.join(spaceDir, 'intents', intentId);
  const auditDir = path.join(intentDir, 'audit');
  const artifactsDir = path.join(intentDir, 'artifacts');

  fs.mkdirSync(auditDir, { recursive: true });
  fs.mkdirSync(artifactsDir, { recursive: true });

  // 1. Create aidlc-state.md
  const stateContent = `---
intent: ${intentId}
space: ecommerce-core
phase: inception
stage: technical-design
status: WAITING_APPROVAL
active_agent: Antigravity Architect
last_updated: "${new Date().toISOString()}"
gate:
  name: "Technical Design & Security Gate"
  prompt: "Kiến trúc luồng thanh toán Stripe & VNPay cùng sơ đồ Database Schema đã hoàn thành. Cần PO và Tech Lead phê duyệt trước khi chuyển sang Construction."
  summary: |
    - Đã phân rã 5 User Stories cho tính năng thanh toán giỏ hàng.
    - Đã xác thực bảo mật chuẩn PCI-DSS (không lưu CVV, token hóa thẻ).
    - Cần xác nhận phương án xử lý Webhook khi mạng chập chờn (Retry exponential backoff).
---

# AI-DLC State Manifest: ${intentId}

**Phase**: Inception
**Stage**: Technical-Design
**Status**: WAITING_APPROVAL
**Active Agent**: Antigravity Architect (Google DeepMind)

## Executive Summary for PO
Dự án đã hoàn thành phân tích yêu cầu nghiệp vụ và thiết kế kiến trúc kỹ thuật. Tất cả 5 user stories chính đã được ánh xạ vào thiết kế API. Hiện hệ thống đang tạm dừng tại **Cổng Phê Duyệt Kỹ Thuật (Approval Gate)** để nhận ý kiến từ PO và Tech Lead trước khi các agents bắt đầu viết mã nguồn.

### Approval Gate Prompt
Kiến trúc luồng thanh toán Stripe & VNPay cùng sơ đồ Database Schema đã hoàn thành. Cần PO và Tech Lead phê duyệt trước khi chuyển sang Construction.

### Summary for Human Review
1. **User Stories:** Đã đặc tả chi tiết 5 kịch bản thanh toán (Thẻ tín dụng, QR Code VNPay, Xử lý giao dịch lỗi, Hoàn tiền, Webhook notify).
2. **Kiến trúc:** Áp dụng mô hình Idempotent Consumer để chống thanh toán trùng lặp.
3. **Bảo mật:** Đảm bảo chuẩn OWASP Top 10 API Security.

## Units of Work (Tasks)
- [x] UoW-1: Phân tích tài liệu yêu cầu & xác định User Stories (PO Review)
- [x] UoW-2: Thiết kế ERD Database Schema & Migration files
- [x] UoW-3: Thiết kế OpenAPI 3.0 Spec cho Payment Endpoints
- [-] UoW-4: Viết bộ kiểm thử Test Harness & Mock Payment Gateway
- [ ] UoW-5: Thực thi Payment Controller & Service Logic
- [ ] UoW-6: Tích hợp Webhook Handler & Event Idempotency
- [ ] UoW-7: Kiểm thử tự động E2E & Báo cáo bàn giao
`;

  fs.writeFileSync(path.join(intentDir, 'aidlc-state.md'), stateContent, 'utf-8');

  // 2. Create audit log shard
  const now = new Date();
  const t = (offsetSec) => new Date(now.getTime() - offsetSec * 1000).toISOString();

  const auditContent = `# Audit Trail: Intent ${intentId}
Clone: host-macbook-clone-01

- [${t(1200)}] [INFO] [System] Khởi tạo không gian làm việc AI-DLC Intent '${intentId}' tại space 'ecommerce-core'
- [${t(1100)}] [INFO] [Antigravity Orchestrator] Tiếp nhận yêu cầu: Xây dựng Module thanh toán tích hợp đa cổng (Stripe & VNPay)
- [${t(950)}] [DECISION] [Antigravity Architect] Lựa chọn cấu trúc Idempotency-Key trong Header để chống double-spending
- [${t(800)}] [INFO] [Antigravity Subagent-Requirements] Hoàn thành phân tích 5 User Stories và acceptance criteria
- [${t(600)}] [INFO] [Antigravity Subagent-Spec] Sinh file OpenAPI spec: /artifacts/payment-api-spec.yaml
- [${t(300)}] [DECISION] [Security Auditor Agent] Kiểm tra tuân thủ OWASP API Security: Passed with 0 critical issues
- [${t(120)}] [GATE] [AIDLC Engine] Chạm trạm dừng: 'Technical Design & Security Gate' -> Đặt trạng thái WAITING_APPROVAL
- [${t(30)}] [INFO] [System] Chờ tín hiệu phê duyệt từ PO / Tech Lead qua Interactive Dashboard
`;

  fs.writeFileSync(path.join(auditDir, 'macbook-clone-01.md'), auditContent, 'utf-8');

  // 3. Create Artifact: User Stories
  const userStoriesContent = `# User Stories & Acceptance Criteria

## US-01: Thanh toán qua Thẻ quốc tế (Visa/Mastercard)
**Là một** khách hàng đã chọn hàng,  
**Tôi muốn** nhập thông tin thẻ được mã hóa để thanh toán an toàn,  
**Để** hoàn tất đơn hàng nhanh chóng.

### Acceptance Criteria:
- Form thẻ sử dụng Stripe Elements (Client-side tokenization).
- Backend chỉ nhận token \`pm_xxx\`, không bao giờ nhận hay lưu số thẻ trực tiếp.
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
`;

  fs.writeFileSync(path.join(artifactsDir, 'user-stories.md'), userStoriesContent, 'utf-8');

  // 4. Create Artifact: Architecture Design
  const archContent = `# Thiết Kế Kiến Trúc Module Thanh Toán

## Sơ đồ luồng xử lý (Payment Flow)
1. Frontend gửi yêu cầu tạo phiên thanh toán \`POST /api/v1/payments/intent\`.
2. Payment Service sinh mã giao dịch duy nhất kèm \`Idempotency-Key\`.
3. Gọi cổng thanh toán (Stripe/VNPay) để lấy Client Secret hoặc QR Payload.
4. Client hoàn tất xác thực (3D-Secure nếu có).
5. Webhook nhận kết quả từ Gateway, xác minh chữ ký RSA/HMAC, cập nhật trạng thái đơn hàng và gửi Email biên nhận.

## Bảo mật & Phòng chống Gian lận
- Xác thực chữ ký Webhook bắt buộc (HMAC SHA-256).
- Rate limit tối đa 10 yêu cầu/phút trên mỗi tài khoản.
- Mã hóa toàn bộ dữ liệu nhạy cảm trên đường truyền (TLS 1.3) và trong cơ sở dữ liệu (AES-256).
`;

  fs.writeFileSync(path.join(artifactsDir, 'architecture-design.md'), archContent, 'utf-8');

  return {
    space: 'ecommerce-core',
    intentId,
    intentDir
  };
}

module.exports = {
  createSampleAidlcStructure
};
