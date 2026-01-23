# Auth Flow - Logic đăng nhập chi tiết

## Tổng quan
Hệ thống yêu cầu user phải có **đầy đủ 4 thông tin** để vào home:
1. **Wallet Address** (Địa chỉ ví)
2. **Email**
3. **Username**
4. **Display Name**

## Các Case đăng nhập

### Case 1: User mới chưa từng đăng nhập

#### Case 1a: User mới hoàn toàn
**Flow:**
1. User đăng nhập bằng email hoặc wallet (qua Dynamic Labs)
2. Hệ thống kiểm tra DB → không tìm thấy user
3. Tạo user mới với thông tin hiện có (wallet/email)
4. Hiển thị `ProfileSetupModal` yêu cầu điền:
   - Username (nếu chưa có)
   - Display Name (nếu chưa có)
   - Email (nếu đăng nhập bằng wallet)
   - Wallet (nếu đăng nhập bằng email)
5. User điền đầy đủ thông tin → Lưu vào DB với `is_profile_complete = true`
6. Chuyển hướng đến `/home`

#### Case 1b: User đã có email/wallet trong DB nhưng chưa đầy đủ thông tin
**Scenario:** User đã đăng nhập trước đó nhưng chưa hoàn tất profile, sau đó xóa cache và đăng nhập lại.

**Flow:**
1. User đăng nhập bằng email hoặc wallet
2. Hệ thống kiểm tra DB → tìm thấy user với email/wallet
3. Kiểm tra user có đầy đủ thông tin chưa:
   - Thiếu wallet? → Yêu cầu link wallet
   - Thiếu email? → Cập nhật email từ Dynamic
   - Thiếu username? → Hiển thị ProfileSetupModal
   - Thiếu display_name? → Hiển thị ProfileSetupModal
4. User điền đầy đủ thông tin còn thiếu
5. Cập nhật DB với `is_profile_complete = true`
6. Chuyển hướng đến `/home`

**Ví dụ cụ thể:**
- Lần 1: User login bằng email, link wallet, nhưng chưa điền username → DB có email + wallet
- User xóa cache và đăng nhập lại
- Lần 2: User login bằng email/wallet → Hệ thống nhận ra user và yêu cầu điền username + display_name

### Case 2: User cũ đã từng đăng nhập đầy đủ

**Flow:**
1. User đăng nhập bằng email hoặc wallet
2. Hệ thống kiểm tra DB → tìm thấy user
3. Kiểm tra `has_all_info = wallet && email && username && display_name`
4. Nếu `has_all_info = true` → Chuyển hướng thẳng đến:
   - `/admin` nếu `role = admin`
   - `/home` nếu `role = user`
5. **KHÔNG** hiển thị ProfileSetupModal
6. **KHÔNG** yêu cầu link thêm email/wallet

## Logic kiểm tra trong code

### API: `/api/users/verify-auth`
```typescript
// Kiểm tra conflict giữa email và wallet
- Nếu email thuộc user A nhưng wallet thuộc user B → CONFLICT
- Nếu email hoặc wallet chưa có trong DB → is_new = true
- Nếu email và wallet khớp cùng 1 user → verified = true

// Kiểm tra profile complete
const hasAllInfo = user.wallet_address && user.email && 
                   user.username && user.display_name;
```

### API: `/api/users/profile` (PUT)
```typescript
// Cập nhật profile và đánh dấu complete
const hasAllInfo = finalWallet && finalEmail && 
                   finalUsername && finalDisplayName;
updateData.is_profile_complete = hasAllInfo;
```

### Component: `AuthProvider.tsx`
```typescript
// Kiểm tra profile đầy đủ
const hasAllInfo = existingUser.wallet_address && existingUser.email && 
                   existingUser.username && existingUser.display_name;

if (!hasAllInfo) {
  // Hiển thị ProfileSetupModal
  setShowProfileSetup(true);
} else {
  // Redirect đến home/admin
  window.location.href = user.role === 'admin' ? '/admin' : '/home';
}
```

### Component: `ProfileSetupModal.tsx`
- Hiển thị thông tin đã có (wallet, email) dưới dạng readonly
- Yêu cầu điền username và display_name
- Kiểm tra username có trùng trong DB không
- Lưu đầy đủ thông tin và đánh dấu profile complete

## Các tình huống đặc biệt

### 1. User login bằng email trước, sau đó link wallet
**Flow:**
1. Login email → Tạo user với email, chưa có wallet
2. Hiển thị `AutoWalletConnect` yêu cầu link wallet
3. User link wallet → Cập nhật wallet vào DB
4. Kiểm tra còn thiếu username/display_name → Hiển thị ProfileSetupModal
5. User điền đầy đủ → Vào home

### 2. User login bằng wallet trước, sau đó hệ thống lấy email từ Dynamic
**Flow:**
1. Login wallet → Tạo user với wallet, chưa có email
2. Dynamic trả về email → Cập nhật email vào DB
3. Kiểm tra còn thiếu username/display_name → Hiển thị ProfileSetupModal
4. User điền đầy đủ → Vào home

### 3. Email và wallet không khớp (CONFLICT)
**Scenario:** User đã có tài khoản với email A + wallet B, nhưng bây giờ login với email A + wallet C

**Flow:**
1. Login với email A + wallet C
2. `/api/users/verify-auth` phát hiện:
   - Email A thuộc user có wallet B
   - Wallet C không thuộc user có email A
3. Trả về `conflict = true`
4. Hiển thị alert: "Email và ví không khớp với tài khoản. Vui lòng đăng nhập lại với thông tin đúng."
5. Logout user
6. User phải login lại với đúng email + wallet

## Database Schema

### Bảng `users`
```sql
- id (uuid, PK)
- wallet_address (text, unique) -- BẮT BUỘC
- email (text)                  -- BẮT BUỘC
- username (text, unique)       -- BẮT BUỘC
- display_name (text)           -- BẮT BUỘC
- is_profile_complete (boolean) -- true khi có đủ 4 trường trên
- role (text) -- 'user' | 'admin'
- status (text) -- 'active' | 'suspended'
- created_at, updated_at
```

## Middleware Protection

### `/home`, `/profile`, `/create`, `/marketplace`, etc.
- Kiểm tra user đã authenticated (`isAuthenticated = true`)
- Kiểm tra profile complete (`isProfileComplete = true`)
- Nếu không đủ điều kiện → Redirect về `/login`

### `/admin`
- Kiểm tra `isAdmin = true`
- Kiểm tra profile complete
- Nếu không đủ điều kiện → Redirect về `/login`

## Testing Checklist

### ✅ Case 1a: User mới hoàn toàn
- [ ] Login bằng email mới → Yêu cầu link wallet → Điền username/display_name → Vào home
- [ ] Login bằng wallet mới → Lấy email từ Dynamic → Điền username/display_name → Vào home

### ✅ Case 1b: User đã có email/wallet nhưng chưa đủ thông tin
- [ ] Login lần 1 bằng email + wallet, không điền username
- [ ] Xóa cache, logout
- [ ] Login lần 2 bằng email → Yêu cầu điền username/display_name → Vào home

### ✅ Case 2: User cũ đã đủ thông tin
- [ ] User đã có đầy đủ wallet, email, username, display_name
- [ ] Login bằng email → Vào thẳng home (không hiện popup)
- [ ] Login bằng wallet → Vào thẳng home (không hiện popup)

### ✅ Conflict Detection
- [ ] User A có email1 + wallet1
- [ ] Login với email1 + wallet2 → Hiển thị conflict alert → Logout

## Summary

**Quy tắc vàng:** User chỉ được vào `/home` khi có **ĐẦY ĐỦ 4 thông tin**:
1. ✅ Wallet Address
2. ✅ Email  
3. ✅ Username
4. ✅ Display Name

Nếu thiếu bất kỳ thông tin nào → Hiển thị `ProfileSetupModal` yêu cầu điền đủ.
