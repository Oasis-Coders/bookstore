import { redirect } from 'next/navigation';

export default function LocationsPage() {
  // Locations module removed per requirement - use shelf_position in books instead
  redirect('/books');
}
