// Manual Jest mock — @react-native-documents/picker cần native TurboModule
// thật, throw ngay khi import dưới Node/Jest. Không màn hình nào gọi pick() ở
// module scope (chỉ gọi khi người dùng bấm nút), nên chỉ cần import an toàn —
// pick() thật sự được gọi thì throw lỗi rõ ràng thay vì lỗi native khó hiểu.
const errorCodes = {
  OPERATION_CANCELED: 'OPERATION_CANCELED',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
  NULL_PRESENTER: 'NULL_PRESENTER',
};

function isErrorWithCode(error) {
  return Boolean(error) && typeof error.code === 'string';
}

function pick() {
  throw new Error(
    '@react-native-documents/picker bị mock trong Jest. pick() thật không chạy được dưới Node.',
  );
}

const types = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
};

module.exports = { pick, types, errorCodes, isErrorWithCode };
