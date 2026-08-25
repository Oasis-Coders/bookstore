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
];

export const appConfig = {
  name: '活水书室管理系统',
  nameEn: 'Living Water Bookstore',
  description: 'Bookstore inventory, purchasing, and accounting',
  defaultCurrency: 'GBP',
};
