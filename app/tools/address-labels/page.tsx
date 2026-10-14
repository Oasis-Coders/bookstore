import { AppShell } from '@/components/layout/app-shell';
import { AddressLabelsClient } from './address-labels-client';

/** 地址标签打印：LL21 版式，手动填写五行英国邮寄地址 + 选择打印份数 */
export default function AddressLabelsPage() {
  return (
    <AppShell title="Address Labels" titleZh="地址标签打印">
      <AddressLabelsClient />
    </AppShell>
  );
}
