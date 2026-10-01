// Manual Jest mock — @op-engineering/op-sqlite yêu cầu native TurboModule thật,
// throw ngay khi import dưới Node/Jest. File này (đặt tại __mocks__/<package> ở
// root repo) được Jest tự dùng cho mọi import package này trong test, không cần
// gọi jest.mock() thủ công ở từng file test.
//
// open() trả về một DB rỗng (executeSync luôn trả rows: []) thay vì throw —
// từ Phase 3, Screen dùng CustomerRepository() không truyền db (mặc định
// getDatabase() thật) ngay ở module scope, và __tests__/App.test.tsx render cả
// cây App (bao gồm CustomerListScreen, initial route) qua react-test-renderer,
// nên open() phải an toàn khi gọi thật chứ không được throw.
//
// Test cho database/repository/service vẫn PHẢI dùng
// src/test-utils/sqliteTestDb.ts (better-sqlite3, inject qua constructor) để
// kiểm tra logic SQL thật — DB rỗng ở đây chỉ để các test render UI (smoke
// test) không crash, không dùng để verify hành vi dữ liệu.
function createEmptyResult() {
  return { rows: [], rowsAffected: 0, insertId: undefined };
}

function open() {
  return {
    executeSync: createEmptyResult,
    close: () => {},
  };
}

module.exports = { open };
