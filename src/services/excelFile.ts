import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { read, utils } from 'xlsx';

/**
 * Wrapper RN-only (native file picker + fetch/blob/FileReader) — cô lập phần
 * không unit test được bằng Jest, tách khỏi logic thuần trong ExcelImportService.
 * Trả về null nếu người dùng huỷ chọn file.
 */
export async function pickAndReadExcelRows(): Promise<
  Record<string, unknown>[] | null
> {
  let picked;
  try {
    [picked] = await pick({ type: [types.xlsx, types.xls] });
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }

  const response = await fetch(picked.uri);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error('Không đọc được file'));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.readAsDataURL(blob);
  });

  const workbook = read(base64, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  return utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
}
