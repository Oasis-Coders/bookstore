export type NavItem = {
  href: string;
  label: string;
  labelZh: string;
  roles?: string[];
};

export const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', labelZh: '总览' },
  { href: '/books', label: 'Books', labelZh: '书库' },
  { href: '/purchase-orders', label: 'Purchase Orders', labelZh: '采购单' },
  { href: '/suppliers', label: 'Suppliers', labelZh: '供应商' },
  { href: '/locations', label: 'Locations', labelZh: '库位' },
  { href: '/sales', label: 'Sales', labelZh: '销售' },
  { href: '/reports', label: 'Reports', labelZh: '报表' },
  { href: '/settings', label: 'Settings', labelZh: '设置' },
  { href: '/admin/users', label: 'Users', labelZh: '人员', roles: ['super_admin'] },
  { href: '/admin/history', label: 'Audit Log', labelZh: '操作记录', roles: ['admin', 'super_admin'] },
];

export const appConfig = {
  name: '活水书房管理系统',
  nameEn: 'COCM Bookshop',
  shortName: '活水书房',
  shortNameEn: 'COCM Bookshop',
  description: 'Bookstore inventory, purchasing, and accounting',
  descriptionZh: '书店库存、采购与账务管理',
  defaultCurrency: 'GBP',
};
