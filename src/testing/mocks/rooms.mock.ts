import { SelectableRoom } from '../../app/core/models/classroom.model';

export type { SelectableRoom };

/**
 * Mock data for selectable rooms in Booking Forms.
 * Each room has its fixed capacity, image, rate, and color identity.
 * TODO: Replace with ClassroomApiService when backend is ready.
 */
export const MOCK_SELECTABLE_ROOMS: SelectableRoom[] = [
  {
    id: 'nook-1',
    name: 'Nook 1',
    maxCapacity: 20,
    image: '/images/rooms/room-design.jpg',
    hourlyRate: 50,
    colorTheme: 'brown', // Yellow theme
    accentColor: '#f5b921'
  },
  {
    id: 'nook-2',
    name: 'Nook 2',
    maxCapacity: 40,
    image: '/images/rooms/room-workshop.jpg',
    hourlyRate: 75,
    colorTheme: 'blue', // Blue theme
    accentColor: '#3b82f6'
  },
  {
    id: 'studio-a',
    name: 'Studio A',
    maxCapacity: 15,
    image: '/images/rooms/room-studio.jpg',
    hourlyRate: 60,
    colorTheme: 'purple', // Purple theme
    accentColor: '#7c3aed'
  },
  {
    id: 'nook-3',
    name: 'Nook 3',
    maxCapacity: 20,
    image: '/images/rooms/room-design.jpg',
    hourlyRate: 50,
    colorTheme: 'orange', // Orange theme
    accentColor: '#f97316'
  },
  {
    id: 'hub-1',
    name: 'Innovation Hub',
    maxCapacity: 50,
    image: '/images/rooms/room-workshop.jpg',
    hourlyRate: 80,
    colorTheme: 'emerald', // Emerald theme
    accentColor: '#10b981'
  },
  {
    id: 'studio-b',
    name: 'Lab A',
    maxCapacity: 15,
    image: '/images/rooms/room-studio.jpg',
    hourlyRate: 60,
    colorTheme: 'rose', // Rose theme
    accentColor: '#ec4899'
  }
];
