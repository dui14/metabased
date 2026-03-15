# Feature Workflow

## 1. Muc tieu
Dam bao mo rong backend an toan cho MetaBased ma khong pha vo contracts hien tai.

## 2. Quy trinh
1. Doc context bat buoc:
- `ai-context/system-overview.md`
- `ai-context/architecture.md`
- `ai-context/database-relations.md`
- `api/api-contract.md`
- spec feature lien quan trong `spec/features/*`

2. Xac dinh pham vi feature
- Tac dong endpoint nao
- Bang DB nao su dung
- Co cache hoac blockchain/storage lien quan khong

3. Thiet ke thay doi
- Input/output contract
- Permission model
- Caching keys/TTL/invalidation
- Failure handling

4. Implement backend
- Route handlers
- Service/query updates
- Migration chi khi bat buoc

5. Validate
- Unit + integration tests
- Error path va edge cases
- Performance smoke test

6. Document
- Update file spec lien quan
- Update `api/api-contract.md` neu co endpoint moi

## 3. Definition of done
- API contract ro rang
- Co test cho success/error
- Co cache invalidation dung
- Co security checks day du
- Co cap nhat docs
