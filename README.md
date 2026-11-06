# AI-DLC Interactive Dashboard

Trung tâm điều khiển và trực quan hóa tương tác hai chiều (Two-Way Interactive Control Plane) cho các AI Coding Agents hoạt động theo framework **[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows)** và **Google DeepMind Antigravity**.

---

## 🌟 Tính Năng Nổi Bật

### 1. Hai góc nhìn cho PO và DEV (Dual Persona Views)
* 👔 **PO View (Dành cho Product Owner / Business):**
  * Theo dõi tiến độ trực quan (% hoàn thành, số lượng tasks).
  * Vòng đời sản phẩm tinh gọn: *Inception* (Khởi tạo & Đặc tả) $\rightarrow$ *Construction* (Lập trình & Test) $\rightarrow$ *Operations* (Bàn giao).
  * **Interactive Approval Gate Card**: Thẻ phê duyệt nổi bật khi Agent chạm trạm dừng, cung cấp nút **`Phê duyệt & Tiếp tục`** và **`Yêu cầu sửa đổi`** kèm form nhập góp ý.
  * Danh sách Features & User Stories, xem trước tài liệu bàn giao (`user-stories.md`, `architecture-design.md`) trực tiếp trên web.
* 💻 **DEV View (Dành cho Developer / Tech Lead / Architect):**
  * Stage graph thực tế được đọc từ `aidlc-state.md` (hỗ trợ scope rút gọn/custom), với danh sách cố định chỉ là fallback cho dữ liệu cũ.
  * **Stage Navigator (Jump Stage)**: yêu cầu được chuyển tới `aidlc engine`, không tự sửa state file.
  * Bảng điều khiển Unit of Work (Tasks) tương tác thời gian thực.
  * **Live Audit Trail Console**: Stream log sự kiện từ thư mục `audit/` theo thời gian thực (hỗ trợ lọc theo `INFO`, `DECISION`, `GATE`, `APPROVAL`, `TOOL_CALL`).
  * Trình xem mã nguồn trực tiếp file `aidlc-state.md`.

### 2. Tự động hóa & Khả năng tương tác thời gian thực (Real-time Live Sync)
* **File Watcher (`chokidar`)**: Theo dõi thư mục `aidlc/` trong dự án và đồng bộ qua WebSocket tức thời.
* **Engine-first control**: approve, request changes, next và jump đều gọi AI-DLC engine; dashboard không tự tạo trạng thái giả trong project thật.
* **Conflict protection**: action gửi kèm phiên bản state đang hiển thị, tránh ghi đè khi agent vừa cập nhật workflow.
* **Tích hợp sẵn bộ Demo 1-Click**: Tự động sinh dữ liệu mẫu AI-DLC intent (Module thanh toán Checkout) và nút **`Simulate Step`** để mô phỏng từng bước hành vi của Agent.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Động

### Cách 1: Khởi động chế độ Production (Khuyên dùng)
```bash
# Cài đặt dependencies (nếu chưa cài)
npm install

# Build giao diện frontend
npm run build

# Khởi động Dashboard server
npm start
```
Hệ thống sẽ chạy tại: **`http://localhost:3300`** và tự động mở trình duyệt.

### Cách 2: Khởi động chế độ Development (Hot Reload)
```bash
npm run dev
```
* **Frontend Vite (Hot Reload):** `http://localhost:5173`
* **Backend API & WebSocket Server:** `http://localhost:3300`

### Cách 3: Chạy qua CLI
```bash
node bin/aidlc-dashboard.js --port 3300
```
Tùy chọn:
* `-p, --port <port>`: Đổi cổng chạy (mặc định: 3300).
* `-w, --workspace <path>`: Chỉ định thư mục dự án cần theo dõi.
* `--no-open`: Không tự động bật trình duyệt.
* `--demo`: Tự động tạo thư mục AI-DLC mẫu nếu chưa có.

Khi chạy project thật, hãy bảo đảm đã cài `aidlc` và chạy `aidlc config` trong
workspace. Chế độ mặc định là `ENGINE MODE`: dashboard chỉ điều khiển qua
`aidlc engine` và không sửa trực tiếp `aidlc-state.md`. Cờ `--demo` mới bật
`DEMO FILE MODE`, chỉ dành cho dữ liệu mô phỏng.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
aidlc-dashboard/
├── bin/
│   └── aidlc-dashboard.js         # Entry point CLI (npx aidlc-dashboard)
├── server/
│   ├── index.js                   # Express Server + WebSocket Gateway
│   ├── aidlcParser.js             # Bộ phân tích aidlc-state.md & audit logs
│   ├── controller.js              # Xử lý Approve Gate, Request Changes, Jump Stage
│   ├── watcher.js                 # File Watcher (chokidar) theo dõi aidlc/
│   └── mockDataGenerator.js       # Bộ sinh dữ liệu mẫu & mô phỏng hành vi Agent
├── src/
│   ├── components/
│   │   ├── Header.jsx             # Thanh điều hướng, chọn Intent & chuyển PO/DEV
│   │   ├── PoView.jsx             # Giao diện dành riêng cho Product Owner
│   │   ├── DevView.jsx            # Giao diện kỹ thuật cho Developer & Tech Lead
│   │   ├── GateApprovalModal.jsx  # Hộp thoại phê duyệt hoặc yêu cầu chỉnh sửa
│   │   └── ArtifactModal.jsx      # Trình đọc tài liệu specs & requirements
│   ├── App.jsx                    # Root React App
│   ├── main.jsx                   # React Entry
│   └── index.css                  # Tailwind styles
├── aidlc/                         # Thư mục State & Audit mẫu chuẩn AWS AI-DLC
├── AIDLC_DASHBOARD_SPEC.md        # Tài liệu kiến trúc & đặc tả kỹ thuật chi tiết
├── package.json
└── vite.config.mjs
```
