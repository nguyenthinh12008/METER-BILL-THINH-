import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import LoadingDots from '../components/LoadingDots';
import type { ImportDuplicateMode } from '../repositories/CustomerRepository';
import {
  classifyRows,
  importValidRows,
  previewDuplicates,
  type ClassifyResult,
  type ImportSummary,
} from '../services/ExcelImportService';
import { pickAndReadExcelRows } from '../services/excelFile';

interface DuplicatePreview {
  toCreateCount: number;
  toUpdateCount: number;
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'preview'; result: ClassifyResult; duplicatePreview: DuplicatePreview }
  | { kind: 'importing' }
  | { kind: 'done'; summary: ImportSummary }
  | { kind: 'error'; message: string };

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ImportCustomerScreen(): React.JSX.Element {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [onDuplicate, setOnDuplicate] = useState<ImportDuplicateMode>('skip');

  const handlePick = async () => {
    setStage({ kind: 'loading' });
    try {
      const rows = await pickAndReadExcelRows();
      if (rows == null) {
        setStage({ kind: 'idle' });
        return;
      }
      const result = classifyRows(rows);
      const { toCreateCount, toUpdateCount } = previewDuplicates(
        result.valid.map(row => row.customer),
      );
      setStage({ kind: 'preview', result, duplicatePreview: { toCreateCount, toUpdateCount } });
    } catch (error) {
      setStage({ kind: 'error', message: toMessage(error) });
    }
  };

  const handleConfirm = (result: ClassifyResult) => {
    setStage({ kind: 'importing' });
    try {
      const summary = importValidRows(result.valid, { onDuplicate });
      setStage({ kind: 'done', summary });
    } catch (error) {
      setStage({ kind: 'error', message: toMessage(error) });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import khách hàng từ Excel</Text>
      <Text style={styles.hint}>
        File cần có các cột: Mã khách hàng, Họ tên, Địa chỉ, Số điện thoại, Mã
        đồng hồ, Loại dịch vụ (Điện/Nước). Cũng chấp nhận file export điện lực
        dạng Mã Sổ GCS/Mã Khang/Tên Khang/ID Hóa đơn/Loại Hóa đơn/Số tiền —
        các cột này là tuỳ chọn.
      </Text>

      {stage.kind === 'idle' || stage.kind === 'preview' || stage.kind === 'error' ? (
        <>
          <Text style={styles.label}>Nếu mã khách hàng đã tồn tại:</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[
                styles.toggleButton,
                onDuplicate === 'skip' && styles.toggleButtonActive,
              ]}
              onPress={() => setOnDuplicate('skip')}>
              <Text
                style={[
                  styles.toggleButtonText,
                  onDuplicate === 'skip' && styles.toggleButtonTextActive,
                ]}>
                Bỏ qua
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                onDuplicate === 'update' && styles.toggleButtonActive,
              ]}
              onPress={() => setOnDuplicate('update')}>
              <Text
                style={[
                  styles.toggleButtonText,
                  onDuplicate === 'update' && styles.toggleButtonTextActive,
                ]}>
                Cập nhật
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {stage.kind === 'idle' ? (
        <Pressable style={styles.primaryButton} onPress={handlePick}>
          <Text style={styles.primaryButtonText}>Chọn file Excel</Text>
        </Pressable>
      ) : null}

      {stage.kind === 'loading' || stage.kind === 'importing' ? (
        <View style={styles.loading}>
          <LoadingDots
            label={stage.kind === 'loading' ? 'Đang đọc file Excel...' : 'Đang import dữ liệu...'}
          />
        </View>
      ) : null}

      {stage.kind === 'error' ? (
        <>
          <Text style={styles.errorText}>{stage.message}</Text>
          <Pressable style={styles.primaryButton} onPress={handlePick}>
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </Pressable>
        </>
      ) : null}

      {stage.kind === 'preview' ? (
        <>
          <Text style={styles.summaryText}>
            {stage.result.valid.length} dòng hợp lệ · {stage.result.invalid.length}{' '}
            dòng lỗi
          </Text>
          {stage.duplicatePreview.toUpdateCount > 0 ? (
            <Text style={styles.summaryText}>
              Trong đó: {stage.duplicatePreview.toCreateCount} tạo mới,{' '}
              {stage.duplicatePreview.toUpdateCount} đã tồn tại (sẽ{' '}
              {onDuplicate === 'update' ? 'được cập nhật' : 'bị bỏ qua'})
            </Text>
          ) : null}
          {stage.result.invalid.length > 0 ? (
            <FlatList
              style={styles.errorList}
              data={stage.result.invalid}
              keyExtractor={item => String(item.rowNumber)}
              renderItem={({ item }) => (
                <Text style={styles.errorRow}>
                  Dòng {item.rowNumber}: {item.reasons.join(', ')}
                </Text>
              )}
            />
          ) : null}
          <Pressable
            style={[
              styles.primaryButton,
              stage.result.valid.length === 0 && styles.buttonDisabled,
            ]}
            onPress={() => handleConfirm(stage.result)}
            disabled={stage.result.valid.length === 0}>
            <Text style={styles.primaryButtonText}>
              Xác nhận import {stage.result.valid.length} khách hàng
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setStage({ kind: 'idle' })}>
            <Text style={styles.secondaryButtonText}>Chọn file khác</Text>
          </Pressable>
        </>
      ) : null}

      {stage.kind === 'done' ? (
        <>
          <Text style={styles.summaryText}>
            Đã tạo {stage.summary.createdCount} khách hàng.
          </Text>
          {stage.summary.updatedCount > 0 ? (
            <Text style={styles.summaryText}>
              Đã cập nhật {stage.summary.updatedCount} khách hàng.
            </Text>
          ) : null}
          {stage.summary.importedInvoiceCount > 0 ? (
            <Text style={styles.summaryText}>
              Đã ghi {stage.summary.importedInvoiceCount} hóa đơn lịch sử.
            </Text>
          ) : null}
          {stage.summary.skippedDuplicateCount > 0 ? (
            <Text style={styles.summaryText}>
              Bỏ qua {stage.summary.skippedDuplicateCount} mã đã tồn tại:{' '}
              {stage.summary.skippedDuplicateCodes.join(', ')}
            </Text>
          ) : null}
          {stage.summary.errorCount > 0 ? (
            <Text style={styles.errorText}>
              {stage.summary.errorCount} dòng lỗi khi lưu.
            </Text>
          ) : null}
          <Pressable
            style={styles.primaryButton}
            onPress={() => setStage({ kind: 'idle' })}>
            <Text style={styles.primaryButtonText}>Import file khác</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    marginBottom: 16,
    color: '#666',
    fontSize: 13,
  },
  label: {
    marginBottom: 4,
    fontSize: 13,
    color: '#666',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  toggleButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  loading: {
    marginTop: 24,
  },
  summaryText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
  },
  errorList: {
    marginTop: 8,
    maxHeight: 220,
  },
  errorRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    color: '#b91c1c',
    fontSize: 13,
  },
});

export default ImportCustomerScreen;
